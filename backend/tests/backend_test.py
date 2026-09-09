"""Elite AI Basketball Coach - backend API tests."""
import os
import io
import time
import uuid
import base64
import random
import pytest
import requests
from PIL import Image, ImageDraw


def make_test_image_b64(w=512, h=512):
    """Generate a real image with visual features (shapes, edges) — a stick figure with a ball."""
    img = Image.new("RGB", (w, h), (245, 245, 235))
    d = ImageDraw.Draw(img)
    # court floor
    d.rectangle([0, h * 3 // 4, w, h], fill=(200, 150, 100))
    # stick figure
    cx = w // 2
    d.ellipse([cx - 40, 60, cx + 40, 140], outline=(0, 0, 0), width=4)  # head
    d.line([cx, 140, cx, 320], fill=(0, 0, 0), width=6)  # torso
    d.line([cx, 200, cx - 80, 260], fill=(0, 0, 0), width=6)  # left arm
    d.line([cx, 200, cx + 80, 120], fill=(0, 0, 0), width=6)  # right arm (shooting)
    d.line([cx, 320, cx - 60, 460], fill=(0, 0, 0), width=6)  # left leg
    d.line([cx, 320, cx + 60, 460], fill=(0, 0, 0), width=6)  # right leg
    # basketball above hand
    d.ellipse([cx + 60, 80, cx + 140, 160], fill=(230, 110, 40), outline=(0, 0, 0), width=3)
    d.line([cx + 100, 80, cx + 100, 160], fill=(0, 0, 0), width=2)
    d.line([cx + 60, 120, cx + 140, 120], fill=(0, 0, 0), width=2)
    # hoop
    d.rectangle([w - 100, 100, w - 40, 180], outline=(200, 50, 50), width=4)
    d.ellipse([w - 100, 170, w - 40, 200], outline=(255, 100, 0), width=4)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"

TEST_EMAIL = "smoke@test.com"
TEST_PASS = "test1234"


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def token(s):
    r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASS}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}


# ---------- Auth ----------
class TestAuth:
    def test_signup_new_user(self, s):
        email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/signup", json={"email": email, "password": "pass1234", "name": "Test User"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and "user" in data
        # backend lowercases email
        assert data["user"]["email"] == email.lower()
        assert data["user"]["profile"] is None

    def test_login_valid(self, s):
        r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASS}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and "user" in d

    def test_login_invalid(self, s):
        r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": "wrongwrong"}, timeout=30)
        assert r.status_code == 401

    def test_me(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["email"] == TEST_EMAIL

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401


# ---------- Onboarding ----------
class TestOnboarding:
    def test_onboarding_persists(self, s):
        # fresh user
        email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/signup", json={"email": email, "password": "pass1234", "name": "OB"}, timeout=30)
        tok = r.json()["token"]
        h = {"Content-Type": "application/json", "Authorization": f"Bearer {tok}"}
        payload = {
            "position": "PG", "dominant_hand": "right", "experience": "3-5 years", "level": "intermediate",
            "court_access": "gym", "equipment": ["ball", "cones"], "training_time_min": 45, "training_days": 4,
            "primary_archetype": "Floor General", "secondary_archetype": "Sniper", "target_archetype": "Point God",
            "goals": ["improve handle"], "strengths": ["vision"], "weaknesses": ["finishing"],
        }
        r = requests.post(f"{API}/onboarding", json=payload, headers=h, timeout=30)
        assert r.status_code == 200, r.text
        # verify persisted via /auth/me
        me = requests.get(f"{API}/auth/me", headers=h, timeout=30).json()["user"]
        assert me["profile"]["primary_archetype"] == "Floor General"
        # dashboard reflects archetype
        dash = requests.get(f"{API}/dashboard", headers=h, timeout=30).json()
        assert dash["archetype"] == "Floor General"


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_shape(self, auth_headers):
        r = requests.get(f"{API}/dashboard", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["priority", "priority_why", "shot_pct", "makes", "attempts", "streak",
                  "sessions_30d", "daily_1pct", "development_score", "archetype"]:
            assert k in d, f"missing {k}"
        # dev score formula: min(99, 50 + pct//4 + sessions*2 + streak*3)
        expected = min(99, 50 + d["shot_pct"] // 4 + d["sessions_30d"] * 2 + d["streak"] * 3)
        assert d["development_score"] == expected


# ---------- Shots ----------
class TestShots:
    def test_shot_log_and_stats(self, auth_headers):
        # log across multiple zones
        zones = [("corner-L", True), ("corner-L", False), ("wing-R", True),
                 ("top", True), ("top", False), ("paint", True), ("ft", True)]
        for z, made in zones:
            r = requests.post(f"{API}/shots/log", headers=auth_headers,
                              json={"zone": z, "shot_type": "jumper", "made": made}, timeout=30)
            assert r.status_code == 200
        r = requests.get(f"{API}/shots", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["total", "makes", "pct", "by_zone"]:
            assert k in d
        # by_zone must include our zones with makes/attempts sub-keys
        for z in ["corner-L", "wing-R", "top", "paint", "ft"]:
            assert z in d["by_zone"]
            assert "makes" in d["by_zone"][z] and "attempts" in d["by_zone"][z]


# ---------- Workouts / streak ----------
class TestWorkouts:
    def test_workout_log_streak(self, auth_headers):
        r = requests.post(f"{API}/workouts/log", headers=auth_headers, json={"type": "training"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "streak" in d and d["streak"] >= 1


# ---------- Coach chat ----------
class TestCoach:
    def test_coach_chat_and_history(self, auth_headers):
        r = requests.post(f"{API}/coach/chat", headers=auth_headers,
                          json={"message": "What should I work on today?"}, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "reply" in d and len(d["reply"]) > 10
        assert "session_id" in d
        sid = d["session_id"]
        hist = requests.get(f"{API}/coach/history", headers=auth_headers,
                            params={"session_id": sid}, timeout=30).json()
        assert len(hist["messages"]) >= 2


# ---------- Training plan ----------
class TestTrainingPlan:
    def test_plan_json_shape(self, auth_headers):
        r = requests.post(f"{API}/training/plan", headers=auth_headers,
                          json={"minutes": 30, "focus": "auto"}, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        plan = d["plan"]
        for k in ["title", "objective", "difficulty", "drills"]:
            assert k in plan
        assert 3 <= len(plan["drills"]) <= 8


# ---------- Skills ----------
class TestSkills:
    def test_skills_list(self, auth_headers):
        r = requests.get(f"{API}/skills", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        skills = r.json()["skills"]
        assert len(skills) == 24
        for s in skills:
            assert "video_id" in s

    def test_skill_detail(self, auth_headers):
        r = requests.get(f"{API}/skills/crossover", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        sk = r.json()["skill"]
        for k in ["when", "why", "how", "mistakes", "cues", "counter", "game"]:
            assert k in sk, f"missing {k}"


# ---------- Players ----------
class TestPlayers:
    def test_players_list(self, auth_headers):
        r = requests.get(f"{API}/players", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        players = r.json()["players"]
        assert len(players) >= 18

    def test_player_seed(self, auth_headers):
        r = requests.get(f"{API}/players/stephen-curry", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["source"] == "seed"

    def test_player_ai_lookup(self, auth_headers):
        r = requests.get(f"{API}/players/kyrie-irving", headers=auth_headers, timeout=90)
        assert r.status_code == 200, r.text
        assert r.json()["source"] == "ai"


# ---------- Archetypes ----------
class TestArchetypes:
    def test_archetypes(self, auth_headers):
        r = requests.get(f"{API}/archetypes", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert len(r.json()["archetypes"]) == 29


# ---------- Achievements ----------
class TestAchievements:
    def test_achievements(self, auth_headers):
        r = requests.get(f"{API}/achievements", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["streak", "sessions", "shots", "films", "coach_msgs",
                  "earned_count", "total_count", "next_streak_milestone", "badges"]:
            assert k in d
        assert d["total_count"] == 12
        first_step = [b for b in d["badges"] if b["key"] == "first_step"][0]
        # smoke@test.com is onboarded
        assert first_step["earned"] is True


# ---------- Challenge ----------
class TestChallenge:
    def test_challenge_log_and_history(self, auth_headers):
        r = requests.post(f"{API}/challenge/log", headers=auth_headers,
                          json={"makes": 12, "attempts": 20, "duration_sec": 30, "mode": "rapid-fire"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["makes"] == 12 and d["attempts"] == 20 and d["pct"] == 60
        assert "is_best" in d and "best_makes" in d
        h = requests.get(f"{API}/challenge/history", headers=auth_headers, timeout=30).json()
        assert h["total_runs"] >= 1


# ---------- Weekly report ----------
class TestWeeklyReport:
    def test_weekly(self, auth_headers):
        r = requests.get(f"{API}/report/weekly", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["week_start", "week_end", "shots_made", "shots_attempted", "shot_pct",
                  "delta_pct", "workouts", "active_days", "films", "best_challenge",
                  "streak", "improvement", "focus", "archetype"]:
            assert k in d


# ---------- TTS ----------
class TestTTS:
    def test_tts_and_cache(self, auth_headers):
        payload = {"text": "Elite coach test speech.", "voice": "onyx"}
        r1 = requests.post(f"{API}/tts", headers=auth_headers, json=payload, timeout=60)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        key = d1["key"]
        # fetch mp3
        r_audio = requests.get(f"{API}/tts/{key}.mp3", timeout=30)
        assert r_audio.status_code == 200
        assert r_audio.headers.get("content-type", "").startswith("audio/")
        assert len(r_audio.content) > 500
        # cache: second call fast + same key
        t0 = time.time()
        r2 = requests.post(f"{API}/tts", headers=auth_headers, json=payload, timeout=30)
        elapsed = time.time() - t0
        assert r2.status_code == 200
        assert r2.json()["key"] == key
        # cached should be under a few seconds
        assert elapsed < 5


# ---------- Video upload & files ----------
class TestVideo:
    def test_upload_and_serve(self, token):
        # tiny fake webm bytes
        content = b"\x1a\x45\xdf\xa3" + os.urandom(2048)
        files = {"file": ("test.webm", content, "video/webm")}
        h = {"Authorization": f"Bearer {token}"}
        r = requests.post(f"{API}/upload/video", files=files, headers=h, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        path = d["path"]

        # unauthenticated - 401
        r2 = requests.get(f"{API}/files/{path}", timeout=30)
        assert r2.status_code == 401

        # with token query
        r3 = requests.get(f"{API}/files/{path}", params={"token": token}, timeout=60)
        assert r3.status_code == 200
        assert len(r3.content) > 0

        # other user should get 404
        other_email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
        signup = requests.post(f"{API}/auth/signup",
                               json={"email": other_email, "password": "pass1234", "name": "Other"}, timeout=30)
        other_tok = signup.json()["token"]
        r4 = requests.get(f"{API}/files/{path}", params={"token": other_tok}, timeout=30)
        assert r4.status_code == 404


# ---------- Form analysis (image) ----------
class TestFormAnalysis:
    def test_form_analyze(self, auth_headers):
        b64 = make_test_image_b64()
        r = requests.post(f"{API}/analyze/form", headers=auth_headers,
                          json={"image_base64": b64, "mode": "shooting"}, timeout=180)
        assert r.status_code == 200, r.text
        result = r.json()["result"]
        for k in ["score", "breakdown", "biggest_issue", "fix", "drill"]:
            assert k in result, f"missing {k}"


# ---------- Video frames analysis ----------
class TestVideoAnalysis:
    def test_video_analyze(self, auth_headers):
        b64 = make_test_image_b64()
        r = requests.post(f"{API}/analyze/video", headers=auth_headers,
                          json={"frames": [b64, b64, b64], "mode": "shooting", "video_path": "test/path.webm"}, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "sequence" in d["result"]
