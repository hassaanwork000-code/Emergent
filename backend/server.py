from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import logging
import uuid
import json
import re
import hashlib
import base64
from datetime import datetime, timezone, timedelta, date

import jwt
import bcrypt
import requests
import emoji
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query, UploadFile, File, Request
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

from seed_data import (
    ARCHETYPES, DAILY_1PCT, BADGES, STREAK_MILESTONES, SKILLS, PLAYERS,
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------------- DB ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALGORITHM = "HS256"
AI_MODEL = ("anthropic", "claude-sonnet-5")

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------------- Storage ----------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "elite-ai-bball"
storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------- Auth helpers ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def public_user(u: dict) -> dict:
    return {"id": u["id"], "email": u["email"], "name": u.get("name"),
            "profile": u.get("profile"), "created_at": u.get("created_at")}


async def _user_from_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await _user_from_token(authorization[7:])


# ---------------- AI helpers ----------------
def _extract_json(text: str):
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


async def ai_text(system_message: str, user_text: str, session_id: str, image_base64: Optional[str] = None,
                  images: Optional[List[str]] = None) -> str:
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system_message).with_model(*AI_MODEL)
    file_contents = []
    if image_base64:
        file_contents.append(ImageContent(image_base64=image_base64))
    if images:
        for im in images:
            file_contents.append(ImageContent(image_base64=im))
    msg = UserMessage(text=user_text, file_contents=file_contents) if file_contents else UserMessage(text=user_text)
    resp = await chat.send_message(msg)
    return resp if isinstance(resp, str) else str(resp)


def profile_block(u: dict) -> str:
    p = u.get("profile") or {}
    return (f"PLAYER PROFILE: name={u.get('name')}, position={p.get('position')}, "
            f"dominant_hand={p.get('dominant_hand')}, level={p.get('level')}/{p.get('experience')}, "
            f"primary_archetype={p.get('primary_archetype')}, secondary={p.get('secondary_archetype')}, "
            f"target={p.get('target_archetype')}, goals={p.get('goals')}, strengths={p.get('strengths')}, "
            f"weaknesses={p.get('weaknesses')}, training={p.get('training_time_min')}min x {p.get('training_days')} days, "
            f"equipment={p.get('equipment')}, court_access={p.get('court_access')}.")


COACH_SYSTEM = (
    "You are Elite Coach, an AI basketball trainer and player development analyst who knows THIS player deeply.\n"
    "{profile}\n"
    "RULES: never generic; follow PROBLEM -> WHY -> FIX -> DRILL -> REPS; keep replies 4-8 short lines unless asked "
    "for a plan; always reference the player's archetype and weaknesses; quality reps over volume; use correct "
    "basketball terms (drop, ghost, snake, hedge, hip flip); never fabricate stats or claim to see unseen video; "
    "state confidence HIGH/MEDIUM/LOW when relevant. Be direct, specific, athletic, no fluff."
)


def clean_for_tts(text: str) -> str:
    text = emoji.replace_emoji(text, replace="")
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"`{1,3}[^`]*`{1,3}", "", text)
    text = re.sub(r"[*_#>~|]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------------- Models ----------------
class SignupBody(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class OnboardingBody(BaseModel):
    age: Optional[int] = None
    height: Optional[str] = None
    position: str
    dominant_hand: str
    experience: str
    level: str
    court_access: str
    equipment: List[str] = []
    training_time_min: int = 45
    training_days: int = 4
    primary_archetype: str
    secondary_archetype: Optional[str] = None
    target_archetype: Optional[str] = None
    goals: List[str] = []
    strengths: List[str] = []
    weaknesses: List[str] = []


class ChatBody(BaseModel):
    message: str
    session_id: Optional[str] = None


class ShotLogBody(BaseModel):
    zone: str
    shot_type: str
    made: bool
    dribble_count: int = 0
    contested: bool = False


class VideoAnalyzeBody(BaseModel):
    image_base64: str
    mode: str


class TrainingPlanBody(BaseModel):
    minutes: int = 30
    focus: str = "auto"


class TTSBody(BaseModel):
    text: str
    voice: str = "onyx"


class VideoFramesBody(BaseModel):
    frames: List[str]
    mode: str
    video_path: Optional[str] = None


class ChallengeBody(BaseModel):
    makes: int
    attempts: int
    duration_sec: int = 60
    mode: str = "rapid-fire"


class WorkoutBody(BaseModel):
    type: str = "training"
    date: Optional[str] = None


# ---------------- Streak / helpers ----------------
async def insert_workout(user_id: str, wtype: str):
    await db.workouts.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id,
        "date": date.today().isoformat(), "type": wtype, "created_at": now_iso(),
    })


async def compute_streak(user_id: str) -> int:
    docs = await db.workouts.find({"user_id": user_id}, {"_id": 0, "date": 1}).to_list(2000)
    days = set(d["date"] for d in docs if d.get("date"))
    if not days:
        return 0
    today = date.today()
    cur = today if today.isoformat() in days else today - timedelta(days=1)
    streak = 0
    while cur.isoformat() in days:
        streak += 1
        cur -= timedelta(days=1)
    return streak


async def shot_stats(user_id: str):
    docs = await db.shots.find({"user_id": user_id}, {"_id": 0}).to_list(5000)
    makes = sum(1 for d in docs if d.get("made"))
    attempts = len(docs)
    by_zone = {}
    for d in docs:
        z = d.get("zone", "unknown")
        by_zone.setdefault(z, {"makes": 0, "attempts": 0})
        by_zone[z]["attempts"] += 1
        if d.get("made"):
            by_zone[z]["makes"] += 1
    pct = round(makes / attempts * 100) if attempts else 0
    return makes, attempts, pct, by_zone


# ---------------- Health ----------------
@api_router.get("/")
async def root():
    return {"message": "Elite AI Basketball Coach API"}


# ---------------- Auth ----------------
@api_router.post("/auth/signup")
async def signup(body: SignupBody):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    doc = {"id": uid, "email": email, "name": body.name,
           "password_hash": hash_password(body.password), "google_id": None,
           "profile": None, "created_at": now_iso()}
    await db.users.insert_one(doc)
    return {"token": create_token(uid, email), "user": public_user(doc)}


@api_router.post("/auth/login")
async def login(body: LoginBody):
    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": create_token(user["id"], email), "user": public_user(user)}


class GoogleAuthBody(BaseModel):
    session_id: str


@api_router.post("/auth/google")
async def auth_google(body: GoogleAuthBody):
    try:
        r = requests.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                         headers={"X-Session-ID": body.session_id}, timeout=30)
        r.raise_for_status()
        info = r.json()
    except Exception as e:
        logger.error(f"google session failed: {e}")
        raise HTTPException(status_code=401, detail="Google authentication failed")
    email = (info.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="No email returned from Google")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        uid = str(uuid.uuid4())
        user = {"id": uid, "email": email, "name": info.get("name") or email.split("@")[0],
                "password_hash": None, "google_id": info.get("id"), "profile": None, "created_at": now_iso()}
        await db.users.insert_one({k: v for k, v in user.items()})
    elif not user.get("google_id"):
        await db.users.update_one({"id": user["id"]}, {"$set": {"google_id": info.get("id")}})
    return {"token": create_token(user["id"], email), "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


# ---------------- Onboarding ----------------
@api_router.post("/onboarding")
async def onboarding(body: OnboardingBody, user: dict = Depends(get_current_user)):
    profile = body.model_dump()
    await db.users.update_one({"id": user["id"]}, {"$set": {"profile": profile}})
    return {"ok": True, "profile": profile,
            "primary_archetype": profile["primary_archetype"],
            "weaknesses": profile["weaknesses"], "goals": profile["goals"]}


# ---------------- Dashboard ----------------
@api_router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    p = user.get("profile") or {}
    makes, attempts, pct, by_zone = await shot_stats(user["id"])
    streak = await compute_streak(user["id"])
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    sessions_30d = await db.workouts.count_documents({"user_id": user["id"], "created_at": {"$gte": cutoff}})

    # priority: weakest zone with data, else first weakness
    priority, priority_why = None, None
    weak_zone = None
    zone_pcts = {z: (v["makes"] / v["attempts"]) for z, v in by_zone.items() if v["attempts"] >= 3}
    if zone_pcts:
        weak_zone = min(zone_pcts, key=zone_pcts.get)
    if weak_zone:
        zp = round(zone_pcts[weak_zone] * 100)
        priority = f"Attack your {weak_zone} shooting"
        priority_why = f"You're shooting {zp}% from {weak_zone} - your lowest tracked zone."
    elif p.get("weaknesses"):
        priority = f"Develop: {p['weaknesses'][0]}"
        priority_why = "This is a listed weakness in your profile - close the gap toward your target archetype."
    else:
        priority = "Log shots to unlock your priority"
        priority_why = "Track a workout so your coach can pinpoint your biggest need."

    day_of_year = datetime.now(timezone.utc).timetuple().tm_yday
    daily_1pct = DAILY_1PCT[day_of_year % len(DAILY_1PCT)]
    development_score = min(99, 50 + pct // 4 + sessions_30d * 2 + streak * 3)
    trained_today = await db.workouts.count_documents({"user_id": user["id"], "date": date.today().isoformat()}) > 0

    return {
        "priority": priority, "priority_why": priority_why,
        "shot_pct": pct, "makes": makes, "attempts": attempts,
        "streak": streak, "sessions_30d": sessions_30d, "trained_today": trained_today,
        "daily_1pct": daily_1pct, "development_score": development_score,
        "archetype": p.get("primary_archetype"), "secondary": p.get("secondary_archetype"),
        "target": p.get("target_archetype"), "name": user.get("name"),
    }


def _parse_dt(c):
    try:
        d = datetime.fromisoformat(c)
        return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d
    except Exception:
        return None


def _week_start(dt):
    days_since_sun = (dt.weekday() + 1) % 7  # Sunday-based week start
    return (dt - timedelta(days=days_since_sun)).replace(hour=0, minute=0, second=0, microsecond=0)


@api_router.get("/progress/trends")
async def progress_trends(user: dict = Depends(get_current_user)):
    uid = user["id"]
    shots = await db.shots.find({"user_id": uid}, {"_id": 0}).to_list(10000)
    workouts = await db.workouts.find({"user_id": uid}, {"_id": 0}).to_list(5000)
    cur_ws = _week_start(datetime.now(timezone.utc))
    weeks = []
    for i in range(8):
        ws = cur_ws - timedelta(weeks=(7 - i))
        we = ws + timedelta(days=7)
        wk_shots = [s for s in shots if (p := _parse_dt(s.get("created_at", ""))) and ws <= p < we]
        made = sum(1 for s in wk_shots if s.get("made"))
        att = len(wk_shots)
        fg = round(made / att * 100) if att else None
        cum_shots = [s for s in shots if (p := _parse_dt(s.get("created_at", ""))) and p < we]
        c_made = sum(1 for s in cum_shots if s.get("made"))
        c_att = len(cum_shots)
        cum_pct = round(c_made / c_att * 100) if c_att else 0
        wk_workouts = [w for w in workouts if (p := _parse_dt(w.get("created_at", ""))) and ws <= p < we]
        w_sessions = len(wk_workouts)
        w_active = len(set(w.get("date") for w in wk_workouts))
        dev = min(99, 50 + cum_pct // 4 + w_sessions * 2 + w_active * 3)
        weeks.append({"week": ws.date().isoformat(), "label": ws.strftime("%b %d"),
                      "fg_pct": fg, "dev_score": dev, "attempts": att})
    return {"weeks": weeks}


async def build_recent_context(user_id: str) -> str:
    """Summarize the player's recent training so the coach can reference real reps."""
    now = datetime.now(timezone.utc)
    wk_ago = now - timedelta(days=7)
    shots = await db.shots.find({"user_id": user_id}, {"_id": 0}).to_list(10000)
    recent_shots = [s for s in shots if (p := _parse_dt(s.get("created_at", ""))) and p >= wk_ago]
    parts = []
    if recent_shots:
        made = sum(1 for s in recent_shots if s.get("made"))
        att = len(recent_shots)
        by_zone = {}
        for s in recent_shots:
            z = s.get("zone", "?")
            by_zone.setdefault(z, [0, 0])
            by_zone[z][1] += 1
            if s.get("made"):
                by_zone[z][0] += 1
        zpct = {z: v[0] / v[1] for z, v in by_zone.items() if v[1] >= 2}
        weak = min(zpct, key=zpct.get) if zpct else None
        line = f"Last 7 days shooting: {made}/{att} ({round(made/att*100)}%)."
        if weak:
            line += f" Coldest zone: {weak} at {round(zpct[weak]*100)}%."
        parts.append(line)
    streak = await compute_streak(user_id)
    sessions_7d = await db.workouts.count_documents({"user_id": user_id, "created_at": {"$gte": wk_ago.isoformat()}})
    parts.append(f"Current streak: {streak} days. Sessions in last 7 days: {sessions_7d}.")
    last_analysis = await db.analyses.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1)
    if last_analysis:
        a = last_analysis[0]
        res = a.get("result") or {}
        parts.append(f"Most recent {a.get('kind')} {a.get('mode')} analysis scored {res.get('score')}/100; biggest issue: {res.get('biggest_issue')}.")
    ch = await db.challenges.find({"user_id": user_id}, {"_id": 0, "makes": 1}).to_list(500)
    if ch:
        parts.append(f"Best pressure run: {max(c['makes'] for c in ch)} makes.")
    return " ".join(parts) if parts else "No tracked training yet."


# ---------------- Coach ----------------
@api_router.post("/coach/chat")
async def coach_chat(body: ChatBody, user: dict = Depends(get_current_user)):
    session_id = body.session_id or f"user-{user['id']}"
    recent = await build_recent_context(user["id"])
    system = COACH_SYSTEM.format(profile=profile_block(user)) + f"\nRECENT TRAINING (reference these real reps, don't invent others): {recent}"
    # include short recent history for context
    hist = await db.messages.find({"user_id": user["id"], "session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(20)
    context = "\n".join(f"{m['role']}: {m['text']}" for m in hist[-6:])
    prompt = (f"Recent conversation:\n{context}\n\nPlayer: {body.message}" if context else body.message)
    reply = await ai_text(system, prompt, session_id)
    ts = now_iso()
    await db.messages.insert_many([
        {"id": str(uuid.uuid4()), "user_id": user["id"], "session_id": session_id, "role": "user", "text": body.message, "created_at": ts},
        {"id": str(uuid.uuid4()), "user_id": user["id"], "session_id": session_id, "role": "assistant", "text": reply, "created_at": now_iso()},
    ])
    return {"reply": reply, "session_id": session_id}


@api_router.get("/coach/history")
async def coach_history(session_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    sid = session_id or f"user-{user['id']}"
    msgs = await db.messages.find({"user_id": user["id"], "session_id": sid}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"messages": msgs, "session_id": sid}


# ---------------- Training plan ----------------
@api_router.post("/training/plan")
async def training_plan(body: TrainingPlanBody, user: dict = Depends(get_current_user)):
    p = user.get("profile") or {}
    focus = body.focus
    if focus == "auto":
        weaknesses = p.get("weaknesses") or []
        focus = weaknesses[0] if weaknesses else "shot creation"
    system = (
        "You are Elite Coach building a personalized basketball workout. Return ONLY valid JSON, no prose.\n"
        + profile_block(user)
    )
    prompt = (
        f"Build a {body.minutes}-minute workout focused on '{focus}'. "
        f"Total drill time should be about {max(6, body.minutes - 6)} minutes. Include 4-6 drills. "
        f"Every drill must tie to the player's primary_archetype ({p.get('primary_archetype')}) and address the focus/weakness. "
        'Return JSON: {"title","objective","difficulty","warmup":[],"drills":[{"name","duration_min","sets","reps","cues":[],"success"}],"cooldown":[],"coaching_note"}'
    )
    try:
        raw = await ai_text(system, prompt, f"plan-{user['id']}")
        plan = _extract_json(raw)
    except Exception as e:
        logger.error(f"plan parse failed: {e}")
        raise HTTPException(status_code=502, detail="Could not generate plan, try again")
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "focus": focus,
           "minutes": body.minutes, "plan": plan, "created_at": now_iso()}
    await db.plans.insert_one({k: v for k, v in doc.items()})
    return {"id": doc["id"], "focus": focus, "minutes": body.minutes, "plan": plan, "created_at": doc["created_at"]}


@api_router.get("/training/plans")
async def training_plans(user: dict = Depends(get_current_user)):
    plans = await db.plans.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"plans": plans}


@api_router.post("/workouts/log")
async def workouts_log(body: WorkoutBody, user: dict = Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"],
           "date": body.date or date.today().isoformat(), "type": body.type, "created_at": now_iso()}
    await db.workouts.insert_one({k: v for k, v in doc.items()})
    streak = await compute_streak(user["id"])
    return {"ok": True, "streak": streak}


# ---------------- Shots ----------------
@api_router.post("/shots/log")
async def shots_log(body: ShotLogBody, user: dict = Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "zone": body.zone,
           "shot_type": body.shot_type, "made": body.made, "dribble_count": body.dribble_count,
           "contested": body.contested, "created_at": now_iso()}
    await db.shots.insert_one({k: v for k, v in doc.items()})
    return {"ok": True}


@api_router.get("/shots")
async def get_shots(user: dict = Depends(get_current_user)):
    makes, attempts, pct, by_zone = await shot_stats(user["id"])
    return {"total": attempts, "makes": makes, "pct": pct, "by_zone": by_zone}


# ---------------- Live Shooting Sessions ----------------
class SessionShot(BaseModel):
    zone: str
    shot_type: str = "session"
    made: bool


class SessionFinishBody(BaseModel):
    shots: List[SessionShot]
    duration_sec: int = 0


@api_router.post("/sessions/finish")
async def session_finish(body: SessionFinishBody, user: dict = Depends(get_current_user)):
    if not body.shots:
        raise HTTPException(status_code=400, detail="No shots logged")
    sid = str(uuid.uuid4())
    ts = now_iso()
    by_zone = {}
    docs = []
    for s in body.shots:
        by_zone.setdefault(s.zone, {"makes": 0, "attempts": 0})
        by_zone[s.zone]["attempts"] += 1
        if s.made:
            by_zone[s.zone]["makes"] += 1
        docs.append({"id": str(uuid.uuid4()), "user_id": user["id"], "zone": s.zone,
                     "shot_type": s.shot_type, "made": s.made, "dribble_count": 0,
                     "contested": False, "session_id": sid, "created_at": ts})
    await db.shots.insert_many(docs)
    makes = sum(1 for s in body.shots if s.made)
    attempts = len(body.shots)
    pct = round(makes / attempts * 100) if attempts else 0
    weak = None
    zpct = {z: v["makes"] / v["attempts"] for z, v in by_zone.items() if v["attempts"] >= 2}
    if zpct:
        weak = min(zpct, key=zpct.get)
    # short AI recap
    try:
        sys = ("You are Elite Coach giving a 2-3 line recap of a shooting session. Be specific and encouraging "
               "but honest. No preamble.\n" + profile_block(user))
        prompt = (f"Session: {makes}/{attempts} ({pct}%). By zone: "
                  + ", ".join(f"{z} {v['makes']}/{v['attempts']}" for z, v in by_zone.items())
                  + (f". Coldest zone: {weak}." if weak else "") + " Give the recap.")
        recap = await ai_text(sys, prompt, f"session-{user['id']}")
    except Exception as e:
        logger.error(f"session recap failed: {e}")
        recap = f"Logged {makes}/{attempts} ({pct}%). Keep stacking quality reps."
    session = {"id": sid, "user_id": user["id"], "makes": makes, "attempts": attempts, "pct": pct,
               "by_zone": by_zone, "weak_zone": weak, "duration_sec": body.duration_sec,
               "recap": recap, "created_at": ts}
    await db.sessions.insert_one({k: v for k, v in session.items()})
    await insert_workout(user["id"], "session")
    session.pop("user_id", None)
    return session


@api_router.get("/sessions")
async def list_sessions(user: dict = Depends(get_current_user)):
    sess = await db.sessions.find({"user_id": user["id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(200)
    return {"sessions": sess}


@api_router.get("/sessions/{sid}")
async def get_session(sid: str, user: dict = Depends(get_current_user)):
    s = await db.sessions.find_one({"id": sid, "user_id": user["id"]}, {"_id": 0, "user_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session": s}


# ---------------- Goals ----------------
class GoalUpdateBody(BaseModel):
    text: str
    target_date: Optional[str] = None
    progress: int = 0


@api_router.get("/goals")
async def get_goals(user: dict = Depends(get_current_user)):
    profile_goals = (user.get("profile") or {}).get("goals") or []
    stored = await db.goals.find({"user_id": user["id"]}, {"_id": 0, "user_id": 0}).to_list(100)
    by_text = {g["text"]: g for g in stored}
    goals = []
    for t in profile_goals:
        g = by_text.get(t, {"text": t, "target_date": None, "progress": 0})
        goals.append(g)
    # include any custom goals not in profile
    for g in stored:
        if g["text"] not in profile_goals:
            goals.append(g)
    return {"goals": goals}


@api_router.post("/goals/update")
async def update_goal(body: GoalUpdateBody, user: dict = Depends(get_current_user)):
    progress = max(0, min(100, body.progress))
    await db.goals.update_one(
        {"user_id": user["id"], "text": body.text},
        {"$set": {"user_id": user["id"], "text": body.text, "target_date": body.target_date,
                  "progress": progress, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True, "text": body.text, "target_date": body.target_date, "progress": progress}


# ---------------- Form / Video analysis ----------------
FORM_SYSTEM = (
    "You are Elite Coach analyzing basketball {mode} form from an image. Return ONLY valid JSON, no prose. "
    "Be honest; if the player is not fully visible set confidence LOW and say so in notes. Never fabricate. "
    'JSON: {"confidence":"HIGH|MED|LOW","score":0-100,"breakdown":{"balance":0-100,"lower_body":0-100,'
    '"elbow_alignment":0-100,"release":0-100,"follow_through":0-100,"landing":0-100},'
    '"biggest_issue","why","fix","drill","notes"}'
)

VIDEO_SYSTEM = (
    "You are Elite Coach analyzing {n} sequential frames of a basketball {mode} clip (start to finish). "
    "Assess the MOTION across frames. Return ONLY valid JSON, no prose. Blurry/partial -> confidence LOW. "
    'JSON: {"confidence":"HIGH|MED|LOW","score":0-100,"breakdown":{"balance":0-100,"lower_body":0-100,'
    '"elbow_alignment":0-100,"release":0-100,"follow_through":0-100,"landing":0-100},'
    '"sequence":["phase note",...],"biggest_issue","why","fix","drill","notes"}'
)


@api_router.post("/analyze/form")
async def analyze_form(body: VideoAnalyzeBody, user: dict = Depends(get_current_user)):
    img = body.image_base64.split(",")[-1]
    system = FORM_SYSTEM.replace("{mode}", body.mode)
    try:
        raw = await ai_text(system, f"Analyze this {body.mode} form image.", f"form-{user['id']}", image_base64=img)
        result = _extract_json(raw)
    except Exception as e:
        logger.error(f"form analysis failed: {e}")
        raise HTTPException(status_code=502, detail="Analysis failed, try another photo")
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "mode": body.mode, "kind": "photo",
           "video_path": None, "result": result, "created_at": now_iso()}
    await db.analyses.insert_one({k: v for k, v in doc.items()})
    return {"id": doc["id"], "mode": body.mode, "result": result}


@api_router.post("/analyze/video")
async def analyze_video(body: VideoFramesBody, user: dict = Depends(get_current_user)):
    frames = [f.split(",")[-1] for f in body.frames][:6]
    if not frames:
        raise HTTPException(status_code=400, detail="No frames provided")
    system = VIDEO_SYSTEM.replace("{n}", str(len(frames))).replace("{mode}", body.mode)
    try:
        raw = await ai_text(system, f"Analyze these {len(frames)} sequential {body.mode} frames as one motion.",
                            f"video-{user['id']}", images=frames)
        result = _extract_json(raw)
    except Exception as e:
        logger.error(f"video analysis failed: {e}")
        raise HTTPException(status_code=502, detail="Analysis failed, try again")
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "mode": body.mode, "kind": "video",
           "video_path": body.video_path, "result": result, "created_at": now_iso()}
    await db.analyses.insert_one({k: v for k, v in doc.items()})
    await insert_workout(user["id"], "film")
    return {"id": doc["id"], "mode": body.mode, "kind": "video", "video_path": body.video_path, "result": result}


@api_router.get("/analyses")
async def get_analyses(kind: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"user_id": user["id"]}
    if kind:
        q["kind"] = kind
    analyses = await db.analyses.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"analyses": analyses}


# ---------------- Video upload / files ----------------
@api_router.post("/upload/video")
async def upload_video(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    data = await file.read()
    if len(data) > 60 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 60MB)")
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "webm"
    path = f"{APP_NAME}/videos/{user['id']}/{uuid.uuid4()}.{ext}"
    ctype = file.content_type or "video/webm"
    try:
        result = put_object(path, data, ctype)
    except Exception as e:
        logger.error(f"video upload failed: {e}")
        raise HTTPException(status_code=502, detail="Upload failed")
    canonical = result["path"]
    await db.videos.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "path": canonical,
                               "content_type": ctype, "is_deleted": False, "created_at": now_iso()})
    return {"path": canonical, "url": f"/api/files/{canonical}"}


@api_router.get("/files/{path:path}")
async def serve_file(path: str, authorization: str = Header(None), token: str = Query(None)):
    tok = None
    if authorization and authorization.startswith("Bearer "):
        tok = authorization[7:]
    elif token:
        tok = token
    if not tok:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await _user_from_token(tok)
    record = await db.videos.find_one({"path": path, "user_id": user["id"], "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, ctype = get_object(path)
    return Response(content=data, media_type=record.get("content_type", ctype),
                    headers={"Accept-Ranges": "bytes"})


# ---------------- TTS ----------------
try:
    from emergentintegrations.llm.openai import OpenAITextToSpeech
    _tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
except Exception as e:
    logger.error(f"TTS init failed: {e}")
    _tts = None


@api_router.post("/tts")
async def tts(body: TTSBody, user: dict = Depends(get_current_user)):
    text = clean_for_tts(body.text)[:4096]
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")
    key = hashlib.sha256(f"{text}|{body.voice}|1.0|tts-1|mp3".encode()).hexdigest()
    existing = await db.tts_cache.find_one({"key": key})
    if not existing:
        if not _tts:
            raise HTTPException(status_code=502, detail="TTS unavailable")
        try:
            audio = await _tts.generate_speech(text=text, model="tts-1", voice=body.voice)
        except Exception as e:
            logger.error(f"TTS gen failed: {e}")
            raise HTTPException(status_code=502, detail="TTS generation failed")
        await db.tts_cache.insert_one({"key": key, "audio_b64": base64.b64encode(audio).decode(), "created_at": now_iso()})
    return {"url": f"/api/tts/{key}.mp3", "key": key}


@api_router.get("/tts/{key}.mp3")
async def get_tts(key: str):
    doc = await db.tts_cache.find_one({"key": key})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    audio = base64.b64decode(doc["audio_b64"])
    return Response(content=audio, media_type="audio/mpeg",
                    headers={"Cache-Control": "public, max-age=31536000"})


# ---------------- Players ----------------
@api_router.get("/players")
async def get_players(user: dict = Depends(get_current_user)):
    return {"players": [{"id": p["id"], "name": p["name"], "era": p["era"],
                        "position": p["position"], "archetype": p["archetype"]} for p in PLAYERS]}


@api_router.get("/players/{pid}")
async def get_player(pid: str, user: dict = Depends(get_current_user)):
    for p in PLAYERS:
        if p["id"] == pid:
            return {"player": p, "source": "seed"}
    # AI lookup
    name = pid.replace("-", " ").title()
    system = (
        "You are a basketball historian. Return ONLY valid JSON for the requested player, real players only. "
        'JSON: {"id","name","era":"Modern|All-Time","position","archetype","traits":[6-8],"steal":[3],"study":"one line"}. '
        'If not a real known player return {"error":"unknown player"}.'
    )
    try:
        raw = await ai_text(system, f"Player: {name}", f"lookup-{user['id']}")
        data = _extract_json(raw)
    except Exception:
        raise HTTPException(status_code=404, detail="Player not found")
    if data.get("error"):
        raise HTTPException(status_code=404, detail="Unknown player")
    data.setdefault("id", pid)
    return {"player": data, "source": "ai"}


# ---------------- Skills ----------------
@api_router.get("/skills")
async def get_skills(user: dict = Depends(get_current_user)):
    return {"skills": SKILLS}


@api_router.get("/skills/{slug}")
async def get_skill(slug: str, user: dict = Depends(get_current_user)):
    for s in SKILLS:
        if s["slug"] == slug:
            return {"skill": s}
    raise HTTPException(status_code=404, detail="Skill not found")


# ---------------- Archetypes ----------------
@api_router.get("/archetypes")
async def get_archetypes(user: dict = Depends(get_current_user)):
    return {"archetypes": ARCHETYPES}


# ---------------- Achievements ----------------
@api_router.get("/achievements")
async def achievements(user: dict = Depends(get_current_user)):
    uid = user["id"]
    streak = await compute_streak(uid)
    sessions = await db.workouts.count_documents({"user_id": uid})
    shots = await db.shots.count_documents({"user_id": uid})
    films = await db.analyses.count_documents({"user_id": uid, "kind": "video"})
    coach_msgs = await db.messages.count_documents({"user_id": uid, "role": "user"})
    has_profile = bool(user.get("profile"))

    def earned(key):
        return {
            "first_step": has_profile, "streak_3": streak >= 3, "streak_7": streak >= 7,
            "streak_14": streak >= 14, "streak_30": streak >= 30, "sessions_5": sessions >= 5,
            "sessions_20": sessions >= 20, "shots_100": shots >= 100, "shots_500": shots >= 500,
            "film_1": films >= 1, "film_10": films >= 10, "coach_10": coach_msgs >= 10,
        }[key]

    badges = [{"key": k, "label": lbl, "emoji": em, "earned": earned(k)} for (k, lbl, em) in BADGES]
    earned_count = sum(1 for b in badges if b["earned"])
    next_milestone = next((m for m in STREAK_MILESTONES if m > streak), None)
    return {"streak": streak, "sessions": sessions, "shots": shots, "films": films,
            "coach_msgs": coach_msgs, "earned_count": earned_count, "total_count": len(badges),
            "next_streak_milestone": next_milestone, "badges": badges}


# ---------------- Challenge ----------------
@api_router.post("/challenge/log")
async def challenge_log(body: ChallengeBody, user: dict = Depends(get_current_user)):
    pct = round(body.makes / body.attempts * 100) if body.attempts else 0
    prev = await db.challenges.find({"user_id": user["id"]}, {"_id": 0, "makes": 1}).to_list(1000)
    best_makes = max([c["makes"] for c in prev], default=0)
    is_best = body.makes > best_makes
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "makes": body.makes, "attempts": body.attempts,
           "pct": pct, "duration_sec": body.duration_sec, "mode": body.mode, "created_at": now_iso()}
    await db.challenges.insert_one({k: v for k, v in doc.items()})
    await insert_workout(user["id"], "pressure")
    return {"makes": body.makes, "attempts": body.attempts, "pct": pct,
            "is_best": is_best, "best_makes": max(best_makes, body.makes)}


@api_router.get("/challenge/history")
async def challenge_history(user: dict = Depends(get_current_user)):
    ch = await db.challenges.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    best_makes = max([c["makes"] for c in ch], default=0)
    best_pct = max([c["pct"] for c in ch], default=0)
    return {"challenges": ch, "best_makes": best_makes, "best_pct": best_pct, "total_runs": len(ch)}


# ---------------- Weekly report ----------------
@api_router.get("/report/weekly")
async def weekly_report(user: dict = Depends(get_current_user)):
    uid = user["id"]
    p = user.get("profile") or {}
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday() + 1 if today.weekday() != 6 else 0)  # start Sunday
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7)
    prev_start = week_start - timedelta(days=7)

    def in_range(created, start, end):
        try:
            d = datetime.fromisoformat(created)
        except Exception:
            return False
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return start <= d < end

    shots = await db.shots.find({"user_id": uid}, {"_id": 0}).to_list(5000)
    wk_shots = [s for s in shots if in_range(s.get("created_at", ""), week_start, week_end)]
    prev_shots = [s for s in shots if in_range(s.get("created_at", ""), prev_start, week_start)]
    made = sum(1 for s in wk_shots if s.get("made"))
    att = len(wk_shots)
    pct = round(made / att * 100) if att else 0
    prev_att = len(prev_shots)
    prev_pct = round(sum(1 for s in prev_shots if s.get("made")) / prev_att * 100) if prev_att else None
    delta_pct = (pct - prev_pct) if prev_pct is not None else None

    workouts = await db.workouts.find({"user_id": uid}, {"_id": 0}).to_list(2000)
    wk_workouts = [w for w in workouts if in_range(w.get("created_at", ""), week_start, week_end)]
    active_days = len(set(w.get("date") for w in wk_workouts))
    films = await db.analyses.count_documents({"user_id": uid, "kind": "video",
                                              "created_at": {"$gte": week_start.isoformat(), "$lt": week_end.isoformat()}})
    ch = await db.challenges.find({"user_id": uid}, {"_id": 0}).to_list(500)
    wk_ch = [c for c in ch if in_range(c.get("created_at", ""), week_start, week_end)]
    best_challenge = max([c["makes"] for c in wk_ch], default=0)
    streak = await compute_streak(uid)

    # weakest zone
    _, _, _, by_zone = await shot_stats(uid)
    zone_pcts = {z: (v["makes"] / v["attempts"]) for z, v in by_zone.items() if v["attempts"] >= 3}
    weak_zone = min(zone_pcts, key=zone_pcts.get) if zone_pcts else None
    focus = f"Attack your {weak_zone}" if weak_zone else (f"Develop: {p['weaknesses'][0]}" if p.get("weaknesses") else "Log more shots to find your focus")

    if delta_pct is None:
        improvement = "First tracked week - this is your baseline. Keep logging."
    elif delta_pct > 0:
        improvement = f"Up {delta_pct}% on FG vs last week - trending the right way."
    elif delta_pct < 0:
        improvement = f"Down {abs(delta_pct)}% on FG vs last week - tighten your reps."
    else:
        improvement = "FG% flat vs last week - add intensity to your sessions."

    return {
        "week_start": week_start.date().isoformat(), "week_end": (week_end - timedelta(days=1)).date().isoformat(),
        "shots_made": made, "shots_attempted": att, "shot_pct": pct, "delta_pct": delta_pct,
        "workouts": len(wk_workouts), "active_days": active_days, "films": films,
        "best_challenge": best_challenge, "streak": streak, "improvement": improvement,
        "focus": focus, "archetype": p.get("primary_archetype"),
    }


# ---------------- App wiring ----------------
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
    except Exception as e:
        logger.error(f"index error: {e}")
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
