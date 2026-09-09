"""Iteration 4 — IQ Simulator, Player DNA, Archetype Lab + cross-feature/regression."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"
LONG = 40


@pytest.fixture(scope="module")
def smoke():
    r = requests.post(f"{API}/auth/login", json={"email": "smoke@test.com", "password": "test1234"}, timeout=20)
    assert r.status_code == 200
    return r.json()["token"]


def H(t): return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def fresh():
    email = f"TEST_iter4_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "pw12345", "name": "Fresh"}, timeout=20)
    assert r.status_code == 200
    token = r.json()["token"]
    ob = {"position": "PG", "dominant_hand": "right", "experience": "beginner",
          "level": "high-school", "court_access": "gym", "primary_archetype": "Playmaker",
          "secondary_archetype": "Sniper", "target_archetype": "Point Guard",
          "weaknesses": [], "goals": []}
    r2 = requests.post(f"{API}/onboarding", json=ob, headers=H(token), timeout=20)
    assert r2.status_code == 200
    return {"token": token, "email": email}


# --------------- IQ Simulator ---------------
class TestIQ:
    def test_scenarios_meta(self, smoke):
        r = requests.get(f"{API}/iq/scenarios", headers=H(smoke), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["categories"], list) and len(d["categories"]) >= 5
        assert d["difficulties"] and "Beginner" in d["difficulties"]
        assert isinstance(d["total"], int) and d["total"] > 0
        for c in d["categories"]:
            assert "key" in c and "label" in c

    def test_next_hides_answer(self, smoke):
        r = requests.get(f"{API}/iq/next", headers=H(smoke), timeout=15)
        assert r.status_code == 200
        sc = r.json()["scenario"]
        for k in ("id", "category", "difficulty", "situation", "position", "context", "options"):
            assert k in sc
        # No answer/explanation leakage
        for banned in ("correct", "best_decision", "why", "defense_giving", "should_notice", "alternatives", "game_application"):
            assert banned not in sc, f"leaked {banned}"
        # options don't reveal correctness
        for o in sc["options"]:
            assert "key" in o and "text" in o
            assert not any(bk in o for bk in ("correct", "is_correct"))

    def test_next_category_filter(self, smoke):
        r = requests.get(f"{API}/iq/next", params={"category": "pick_and_roll"}, headers=H(smoke), timeout=15)
        assert r.status_code == 200
        assert r.json()["scenario"]["category"] == "pick_and_roll"

    def test_answer_correct_grades(self, fresh):
        # get a scenario
        r = requests.get(f"{API}/iq/next", headers=H(fresh["token"]), timeout=15)
        sc = r.json()["scenario"]
        # pick option A (some may be wrong); grade must always come back
        rr = requests.post(f"{API}/iq/answer",
                          json={"scenario_id": sc["id"], "choice": "A", "time_ms": 2500, "mode": "practice"},
                          headers=H(fresh["token"]), timeout=15)
        assert rr.status_code == 200
        d = rr.json()
        assert isinstance(d["correct"], bool)
        assert isinstance(d["acceptable"], bool)
        assert d["correct_key"] in "ABCDE"
        assert d["best_decision"] and d["why"] and d["defense_giving"] and d["should_notice"]
        assert isinstance(d["alternatives"], list)
        assert d["game_application"]

    def test_answer_unknown_scenario_404(self, smoke):
        r = requests.post(f"{API}/iq/answer",
                          json={"scenario_id": "nope-xxx", "choice": "A", "time_ms": 1000, "mode": "practice"},
                          headers=H(smoke), timeout=15)
        assert r.status_code == 404

    def test_profile_updates_after_attempts(self, fresh):
        tok = fresh["token"]
        # baseline
        r0 = requests.get(f"{API}/iq/profile", headers=H(tok), timeout=15)
        assert r0.status_code == 200
        base = r0.json()
        # answer 6 different scenarios with their CORRECT keys to get high accuracy signal
        # fetch scenarios list via /iq/next repeatedly; use correct key by inspecting answer response's correct_key
        answered_ids = set()
        for i in range(6):
            n = requests.get(f"{API}/iq/next", headers=H(tok), timeout=15).json()["scenario"]
            if n["id"] in answered_ids:
                continue
            answered_ids.add(n["id"])
            # pick 'A' first; if wrong we'll follow up with correct in next scenario cycle instead
            # But to get non-zero accuracy reliably, first try 'A' and record correct_key.
            rr = requests.post(f"{API}/iq/answer",
                               json={"scenario_id": n["id"], "choice": "A", "time_ms": 3000, "mode": "practice"},
                               headers=H(tok), timeout=15).json()
        r1 = requests.get(f"{API}/iq/profile", headers=H(tok), timeout=15)
        assert r1.status_code == 200
        p = r1.json()
        assert p["total_answered"] >= 5
        # overall now non-null since >=5
        assert p["overall"] is not None
        assert 0 <= p["overall"] <= 100
        assert isinstance(p["categories"], list)
        for c in p["categories"]:
            assert "key" in c and "label" in c
            # score null when <3 attempts on that category
            assert c["score"] is None or (0 <= c["score"] <= 100)
        assert p["total_answered"] > base["total_answered"]

    def test_insights_gates_under_6(self):
        # create yet another fresh user with 0 attempts
        email = f"TEST_ins_{uuid.uuid4().hex[:8]}@example.com"
        tok = requests.post(f"{API}/auth/signup", json={"email": email, "password": "pw12345", "name": "X"}, timeout=15).json()["token"]
        # onboard so profile isn't null
        ob = {"position": "SG", "dominant_hand": "right", "experience": "beginner", "level": "hs",
              "court_access": "gym", "primary_archetype": "Sniper", "secondary_archetype": "Playmaker",
              "target_archetype": "3-and-D", "weaknesses": [], "goals": []}
        requests.post(f"{API}/onboarding", json=ob, headers=H(tok), timeout=15)
        r = requests.get(f"{API}/iq/insights", headers=H(tok), timeout=LONG)
        assert r.status_code == 200
        d = r.json()
        assert d["enough_data"] is False
        assert "message" in d and "6" in d["message"]

    def test_insights_when_enough(self, fresh):
        # fresh had 6 answered above. This calls AI (may take up to 25s).
        r = requests.get(f"{API}/iq/insights", headers=H(fresh["token"]), timeout=LONG)
        assert r.status_code == 200
        d = r.json()
        assert d["enough_data"] is True
        # Must have coach fields
        for k in ("summary", "recommended_skill", "recommended_drill", "recommended_player", "training_priority"):
            assert k in d and d[k]


# --------------- DNA ---------------
class TestDNA:
    def test_dna_shape_and_snapshot(self, smoke):
        r = requests.get(f"{API}/dna", headers=H(smoke), timeout=LONG)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["categories"], list) and len(d["categories"]) == 14, f"got {len(d['categories'])}"
        for c in d["categories"]:
            assert "key" in c and "label" in c
            assert c["score"] is None or (0 <= c["score"] <= 100)
        assert "current_label" in d and d["current_label"]
        assert "dev_index" in d
        assert "timeline" in d and isinstance(d["timeline"], list) and len(d["timeline"]) >= 1
        assert "changes" in d and isinstance(d["changes"], list)
        assert "enough_data" in d
        assert d["story"]  # always a string (either AI story or 'Not enough data yet.')

    def test_dna_fresh_shows_not_enough(self, fresh):
        r = requests.get(f"{API}/dna", headers=H(fresh["token"]), timeout=LONG)
        assert r.status_code == 200
        d = r.json()
        # Fresh user has some IQ attempts (6) via test above — basketball_iq/decision_making may be measured
        # But most 14 categories should be null (unmeasured)
        nulls = sum(1 for c in d["categories"] if c["score"] is None)
        assert nulls >= 8, f"fresh user should have many unmeasured; nulls={nulls}"
        # If enough_data False -> story must be the sentinel
        if not d["enough_data"]:
            assert "Not enough data yet" in d["story"]

    def test_dna_isolation(self, fresh, smoke):
        rf = requests.get(f"{API}/dna", headers=H(fresh["token"]), timeout=LONG).json()
        rs = requests.get(f"{API}/dna", headers=H(smoke), timeout=LONG).json()
        # Different labels/dev indexes should not equal identically for two distinct users w/ different profiles
        # Just verify no crash + timelines are per-user (fresh timeline should have exactly 1 or 2 snapshots since brand new)
        assert len(rf["timeline"]) <= 3
        # smoke has more snapshots or same, but data should differ (categories or story)
        assert rf["current_label"] != rs["current_label"] or rf["dev_index"] != rs["dev_index"] or rf["story"] != rs["story"]


# --------------- Archetype ---------------
class TestArchetype:
    def test_current(self, smoke):
        r = requests.get(f"{API}/archetype/current", headers=H(smoke), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "primary" in d and "secondary" in d and "target" in d
        assert d["confidence"] is None or (0 <= d["confidence"] <= 100)
        assert isinstance(d["supporting"], list) and isinstance(d["gaps"], list)
        assert isinstance(d["all_archetypes"], list) and len(d["all_archetypes"]) > 0

    def test_target_persists_and_returns_real_players(self, smoke):
        # pick some target from all_archetypes
        cur = requests.get(f"{API}/archetype/current", headers=H(smoke), timeout=15).json()
        target = "3-and-D" if "3-and-D" in cur["all_archetypes"] else cur["all_archetypes"][0]
        r = requests.post(f"{API}/archetype/target", json={"target": target}, headers=H(smoke), timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["target"] == target
        assert 0 <= d["fit"] <= 100
        assert isinstance(d["estimate"], bool)
        assert isinstance(d["strengths"], list)
        assert isinstance(d["gaps"], list)
        assert isinstance(d["missing_skills"], list)
        for s in d["missing_skills"]:
            assert "slug" in s and "name" in s
        assert isinstance(d["recommended_drills"], list)
        for f in d["iq_focus"]:
            assert "key" in f and "label" in f
        # Players must be REAL players from /api/players
        assert isinstance(d["players"], list)
        real_players = requests.get(f"{API}/players", headers=H(smoke), timeout=15).json()
        if isinstance(real_players, dict):
            real_players = real_players.get("players", [])
        real_ids = {p["id"] for p in real_players}
        for p in d["players"]:
            assert p["id"] in real_ids, f"player id {p['id']} not in real player list"
        assert isinstance(d["development_path"], list) and len(d["development_path"]) >= 2
        # persistence: /auth/me profile.target_archetype should be set
        me = requests.get(f"{API}/auth/me", headers=H(smoke), timeout=15).json()["user"]
        assert me["profile"].get("target_archetype") == target

    def test_build_ai(self, smoke):
        r = requests.post(f"{API}/archetype/build",
                          json={"description": "Curry shooting + Kobe footwork + Wade rim pressure"},
                          headers=H(smoke), timeout=LONG)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("desired_traits", "current_traits", "missing_traits", "training_priorities",
                  "skills_to_learn", "players_to_study", "recommended_drills", "potential_weaknesses"):
            assert k in d

    def test_experiment_ai(self, smoke):
        r = requests.post(f"{API}/archetype/experiment",
                          json={"description": "What if I became a downhill primary scorer?"},
                          headers=H(smoke), timeout=LONG)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("current_profile", "required_changes", "skills_needed",
                  "training_required", "potential_benefits", "potential_tradeoffs"):
            assert k in d


# --------------- Cross-feature: coach chat still works ---------------
class TestRegression:
    def test_coach_chat_ok(self, smoke):
        r = requests.post(f"{API}/coach/chat", json={"message": "quick tip for my pull-up"},
                          headers=H(smoke), timeout=LONG)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "reply" in d and d["reply"]

    def test_dashboard_regression(self, smoke):
        r = requests.get(f"{API}/dashboard", headers=H(smoke), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "trained_today" in d and "development_score" in d

    def test_shots_regression(self, smoke):
        r = requests.get(f"{API}/shots", headers=H(smoke), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "total" in d and "by_zone" in d

    def test_goals_regression(self, smoke):
        r = requests.get(f"{API}/goals", headers=H(smoke), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json().get("goals"), list) or isinstance(r.json(), list)


# --------------- Isolation: fresh user IQ profile empty ---------------
class TestIsolation:
    def test_fresh_iq_profile_isolated(self):
        email = f"TEST_iso_{uuid.uuid4().hex[:8]}@example.com"
        tok = requests.post(f"{API}/auth/signup", json={"email": email, "password": "pw12345", "name": "Iso"}, timeout=15).json()["token"]
        r = requests.get(f"{API}/iq/profile", headers=H(tok), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["total_answered"] == 0
        assert d["overall"] is None
        assert all(c["score"] is None for c in d["categories"])
        assert d["repeated_mistakes"] == []
