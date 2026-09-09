"""Iteration 3 - test NEW features: /sessions/finish + /sessions, /goals + /goals/update,
coach_chat still returns reply+session_id, regression /dashboard fields."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def smoke_token():
    r = requests.post(f"{API}/auth/login", json={"email": "smoke@test.com", "password": "test1234"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(t): return {"Authorization": f"Bearer {t}"}


# ---------- Coach: memory-injected chat ----------
class TestCoachMemory:
    def test_chat_returns_reply_and_session_id(self, smoke_token):
        r = requests.post(f"{API}/coach/chat",
                          json={"message": "In one sentence, what should I focus on today?"},
                          headers=H(smoke_token), timeout=45)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "reply" in d and isinstance(d["reply"], str) and len(d["reply"]) > 5
        assert "session_id" in d and isinstance(d["session_id"], str)

    def test_history_persisted(self, smoke_token):
        r = requests.get(f"{API}/coach/history", headers=H(smoke_token), timeout=15)
        assert r.status_code == 200
        msgs = r.json()["messages"]
        assert isinstance(msgs, list)
        assert len(msgs) >= 2
        roles = [m["role"] for m in msgs]
        assert "user" in roles and "assistant" in roles


# ---------- Live Session ----------
class TestSessions:
    session_id = None

    def test_finish_empty_shots_400(self, smoke_token):
        r = requests.post(f"{API}/sessions/finish", json={"shots": [], "duration_sec": 0},
                          headers=H(smoke_token), timeout=15)
        assert r.status_code == 400, r.text

    def test_finish_ok(self, smoke_token):
        # baseline shot count
        base = requests.get(f"{API}/shots", headers=H(smoke_token), timeout=15).json()
        base_count = base.get("total", 0)

        shots = [
            {"zone": "top", "shot_type": "Catch & Shoot", "made": True},
            {"zone": "top", "shot_type": "Catch & Shoot", "made": False},
            {"zone": "corner-L", "shot_type": "Catch & Shoot", "made": True},
            {"zone": "corner-L", "shot_type": "Catch & Shoot", "made": True},
            {"zone": "paint", "shot_type": "Layup", "made": False},
            {"zone": "paint", "shot_type": "Layup", "made": False},
        ]
        r = requests.post(f"{API}/sessions/finish", json={"shots": shots, "duration_sec": 120},
                          headers=H(smoke_token), timeout=45)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("id", "makes", "attempts", "pct", "by_zone", "weak_zone", "duration_sec", "recap", "created_at"):
            assert k in d, f"missing {k}"
        assert d["attempts"] == 6
        assert d["makes"] == 3
        assert d["pct"] == 50
        assert d["duration_sec"] == 120
        assert isinstance(d["recap"], str) and len(d["recap"]) > 0
        assert d["weak_zone"] == "paint"  # 0/2 coldest
        TestSessions.session_id = d["id"]

        # shots collection should have grown by 6
        after = requests.get(f"{API}/shots", headers=H(smoke_token), timeout=15).json()
        assert after.get("total", 0) - base_count == 6

    def test_list_sessions_contains_new(self, smoke_token):
        r = requests.get(f"{API}/sessions", headers=H(smoke_token), timeout=15)
        assert r.status_code == 200
        sess = r.json()["sessions"]
        assert isinstance(sess, list)
        assert any(s["id"] == TestSessions.session_id for s in sess)

    def test_get_session_by_id(self, smoke_token):
        assert TestSessions.session_id is not None
        r = requests.get(f"{API}/sessions/{TestSessions.session_id}", headers=H(smoke_token), timeout=15)
        assert r.status_code == 200
        s = r.json()["session"]
        assert s["id"] == TestSessions.session_id
        assert s["attempts"] == 6

    def test_get_unknown_session_404(self, smoke_token):
        r = requests.get(f"{API}/sessions/does-not-exist-xyz", headers=H(smoke_token), timeout=15)
        assert r.status_code == 404

    def test_finish_bumped_streak_workout(self, smoke_token):
        # dashboard trained_today should be true after finishing a session
        r = requests.get(f"{API}/dashboard", headers=H(smoke_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("trained_today") is True


# ---------- Goals ----------
class TestGoals:
    def test_get_goals_seeded_from_profile(self, smoke_token):
        r = requests.get(f"{API}/goals", headers=H(smoke_token), timeout=15)
        assert r.status_code == 200
        goals = r.json()["goals"]
        assert isinstance(goals, list) and len(goals) > 0
        for g in goals:
            assert "text" in g and "target_date" in g and "progress" in g
            assert isinstance(g["progress"], int)

    def test_update_goal_persists_and_clamps(self, smoke_token):
        goals = requests.get(f"{API}/goals", headers=H(smoke_token), timeout=15).json()["goals"]
        target_text = goals[0]["text"]

        # clamp high
        r = requests.post(f"{API}/goals/update",
                          json={"text": target_text, "target_date": "2026-12-31", "progress": 250},
                          headers=H(smoke_token), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["progress"] == 100
        assert d["target_date"] == "2026-12-31"

        # follow-up GET reflects it
        after = requests.get(f"{API}/goals", headers=H(smoke_token), timeout=15).json()["goals"]
        m = next(g for g in after if g["text"] == target_text)
        assert m["progress"] == 100
        assert m["target_date"] == "2026-12-31"

        # clamp low
        r = requests.post(f"{API}/goals/update",
                          json={"text": target_text, "target_date": None, "progress": -10},
                          headers=H(smoke_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["progress"] == 0

        after2 = requests.get(f"{API}/goals", headers=H(smoke_token), timeout=15).json()["goals"]
        m2 = next(g for g in after2 if g["text"] == target_text)
        assert m2["progress"] == 0


# ---------- Regression ----------
class TestRegression:
    def test_dashboard_has_required_fields(self, smoke_token):
        r = requests.get(f"{API}/dashboard", headers=H(smoke_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "trained_today" in d and isinstance(d["trained_today"], bool)
        assert "development_score" in d and isinstance(d["development_score"], int)

    def test_me_still_works(self, smoke_token):
        r = requests.get(f"{API}/auth/me", headers=H(smoke_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["email"] == "smoke@test.com"

    def test_signup_still_works(self):
        email = f"TEST_iter3_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/signup",
                          json={"email": email, "password": "pw12345", "name": "I3"}, timeout=20)
        assert r.status_code == 200
        assert "token" in r.json()

    def test_shots_log_regression(self, smoke_token):
        r = requests.post(f"{API}/shots/log",
                          json={"zone": "top", "shot_type": "Catch & Shoot", "made": True,
                                "dribble_count": 0, "contested": False},
                          headers=H(smoke_token), timeout=15)
        assert r.status_code == 200
