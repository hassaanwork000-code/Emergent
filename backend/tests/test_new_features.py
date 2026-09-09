"""Iteration 2 - test only NEW features: /auth/google, /progress/trends, dashboard.trained_today."""
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
    data = r.json()
    assert "token" in data and "user" in data
    return data["token"]


@pytest.fixture(scope="module")
def fresh_user():
    """Signed-up + onboarded user with zero workouts (for nudge testing)."""
    email = f"TEST_new_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "pass1234", "name": "New User"}, timeout=30)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    # onboard
    ob = {
        "position": "SG", "dominant_hand": "right", "experience": "intermediate",
        "level": "high-school", "court_access": "gym", "primary_archetype": "sniper",
        "secondary_archetype": "playmaker", "target_archetype": "3-and-D",
        "weaknesses": ["ball-handling"], "goals": ["improve 3pt"],
    }
    r2 = requests.post(f"{API}/onboarding", json=ob,
                       headers={"Authorization": f"Bearer {token}"}, timeout=30)
    assert r2.status_code == 200, r2.text
    return {"token": token, "email": email}


# ---------- Google Auth (invalid session) ----------
class TestGoogleAuth:
    def test_google_invalid_session_returns_401(self):
        r = requests.post(f"{API}/auth/google", json={"session_id": "invalid-session-xyz-123"}, timeout=40)
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
        body = r.json()
        assert "detail" in body

    def test_google_missing_body(self):
        r = requests.post(f"{API}/auth/google", json={}, timeout=15)
        # Pydantic validation should fail
        assert r.status_code in (401, 422), r.text


# ---------- Regression: existing auth ----------
class TestAuthRegression:
    def test_login_returns_token_and_user(self, smoke_token):
        assert isinstance(smoke_token, str) and len(smoke_token) > 20

    def test_me_works(self, smoke_token):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {smoke_token}"}, timeout=15)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["email"] == "smoke@test.com"

    def test_signup_returns_token_and_user(self):
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "pw12345", "name": "Reg"}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and d["user"]["email"] == email.lower()


# ---------- Progress trends ----------
class TestProgressTrends:
    def test_trends_shape(self, smoke_token):
        r = requests.get(f"{API}/progress/trends", headers={"Authorization": f"Bearer {smoke_token}"}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "weeks" in data
        weeks = data["weeks"]
        assert isinstance(weeks, list) and len(weeks) == 8, f"expected 8 buckets, got {len(weeks)}"
        for w in weeks:
            assert "week" in w and "label" in w and "attempts" in w
            assert "fg_pct" in w
            assert w["fg_pct"] is None or isinstance(w["fg_pct"], int)
            assert isinstance(w["dev_score"], int)
            assert w["dev_score"] is not None
            assert w["dev_score"] <= 99
            assert isinstance(w["attempts"], int)

    def test_trends_requires_auth(self):
        r = requests.get(f"{API}/progress/trends", timeout=10)
        assert r.status_code in (401, 403)


# ---------- Dashboard trained_today ----------
class TestDashboardTrainedToday:
    def test_smoke_dashboard_has_trained_today(self, smoke_token):
        r = requests.get(f"{API}/dashboard", headers={"Authorization": f"Bearer {smoke_token}"}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "trained_today" in d
        assert isinstance(d["trained_today"], bool)

    def test_fresh_user_trained_today_false(self, fresh_user):
        r = requests.get(f"{API}/dashboard", headers={"Authorization": f"Bearer {fresh_user['token']}"}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d.get("trained_today") is False, f"Fresh user must have trained_today=False, got {d.get('trained_today')}"
