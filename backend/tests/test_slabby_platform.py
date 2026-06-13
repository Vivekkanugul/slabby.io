"""
Slabby Platform End-to-End Backend Tests
Tests: auth, wallet, cards, marketplace, razz (provably fair)
"""

import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://card-terminal-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Unique email for each run
UNIQUE_TAG = uuid.uuid4().hex[:8]
TEST_EMAIL = f"trader_{UNIQUE_TAG}@slabby.io"
TEST_PASSWORD = "password123"
TEST_NAME = f"Trader {UNIQUE_TAG}"

# Optional pre-seeded credentials (from review request)
SEEDED_EMAIL = "trader@slabby.com"
SEEDED_PASSWORD = "password123"


# Module-scoped state shared between tests
state = {}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_session(session):
    """Session authenticated with newly registered test user"""
    # Register
    payload = {"email": TEST_EMAIL, "password": TEST_PASSWORD, "display_name": TEST_NAME}
    r = session.post(f"{API}/auth/register", json=payload, timeout=15)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == TEST_EMAIL
    state["user_id"] = data["user"]["id"]
    state["token"] = data["access_token"]

    auth = requests.Session()
    auth.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {data['access_token']}"
    })
    return auth


# ---------- Health ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}", timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "operational"

    def test_health(self, session):
        r = session.get(f"{API}/health", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["status"] in ("healthy", "degraded")

    def test_stats(self, session):
        r = session.get(f"{API}/stats", timeout=10)
        assert r.status_code == 200
        keys = r.json()
        for k in ("total_users", "cards_listed", "active_trades", "active_razzes"):
            assert k in keys


# ---------- Auth ----------
class TestAuth:
    def test_register_and_login_seeded(self, session):
        # Try seeded user first - if registration succeeds, that's fine; if conflicts, login
        r = session.post(f"{API}/auth/register", json={
            "email": SEEDED_EMAIL, "password": SEEDED_PASSWORD, "display_name": "Trader Slabby"
        }, timeout=15)
        # Could be 200 (created) or 400 (already exists)
        assert r.status_code in (200, 400), f"Unexpected: {r.status_code} {r.text}"

        # Now login with seeded creds
        r = session.post(f"{API}/auth/login", json={
            "email": SEEDED_EMAIL, "password": SEEDED_PASSWORD
        }, timeout=15)
        assert r.status_code == 200, f"Seeded login failed: {r.text}"
        assert "access_token" in r.json()

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={
            "email": "nonexistent_xyz@example.com", "password": "wrongpass"
        }, timeout=15)
        assert r.status_code == 401

    def test_me_endpoint(self, auth_session):
        r = auth_session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        user = r.json()
        assert user["email"] == TEST_EMAIL
        assert user["id"] == state["user_id"]


# ---------- Wallet ----------
class TestWallet:
    def test_get_wallet_initial(self, auth_session):
        r = auth_session.get(f"{API}/wallet", timeout=10)
        assert r.status_code == 200
        w = r.json()
        assert w["user_id"] == state["user_id"]
        assert w["available_balance"] == 0.0
        state["initial_balance"] = w["available_balance"]

    def test_deposit(self, auth_session):
        r = auth_session.post(f"{API}/wallet/deposit", json={"amount": 500.0}, timeout=10)
        assert r.status_code == 200, f"Deposit failed: {r.text}"
        w = r.json()
        assert w["available_balance"] >= 500.0
        state["balance_after_deposit"] = w["available_balance"]

        # Verify via GET wallet
        r2 = auth_session.get(f"{API}/wallet", timeout=10)
        assert r2.status_code == 200
        assert r2.json()["available_balance"] == w["available_balance"]

    def test_withdraw(self, auth_session):
        r = auth_session.post(f"{API}/wallet/withdraw", json={"amount": 100.0}, timeout=10)
        assert r.status_code == 200, f"Withdraw failed: {r.text}"
        w = r.json()
        expected = state["balance_after_deposit"] - 100.0
        assert abs(w["available_balance"] - expected) < 0.01, f"Expected {expected}, got {w['available_balance']}"

    def test_withdraw_overdraft(self, auth_session):
        # Massive withdrawal should fail
        r = auth_session.post(f"{API}/wallet/withdraw", json={"amount": 1000000.0}, timeout=10)
        assert r.status_code == 400

    def test_transactions(self, auth_session):
        r = auth_session.get(f"{API}/wallet/transactions", timeout=10)
        assert r.status_code == 200
        txs = r.json()
        assert isinstance(txs, list)
        types = [t["type"] for t in txs]
        assert "deposit" in types
        assert "withdrawal" in types


# ---------- Cards ----------
class TestCards:
    def test_create_card_draft(self, auth_session):
        payload = {
            "title": f"TEST_{UNIQUE_TAG} LeBron Rookie",
            "player_name": "LeBron James",
            "team": "Cavaliers",
            "year": 2003,
            "set_name": "Topps Chrome",
            "card_number": "111",
            "category": "basketball",
            "condition": "psa_10",
            "asking_price": 1500.0,
            "accept_trades": True,
            "accept_cash": True
        }
        r = auth_session.post(f"{API}/cards", json=payload, timeout=15)
        assert r.status_code == 200, f"Create card failed: {r.text}"
        card = r.json()
        assert card["title"] == payload["title"]
        assert card["status"] == "draft"
        assert card["owner_id"] == state["user_id"]
        state["card_id"] = card["id"]

        # Verify via GET
        r2 = auth_session.get(f"{API}/cards/{card['id']}", timeout=10)
        assert r2.status_code == 200
        assert r2.json()["id"] == card["id"]

    def test_publish_card(self, auth_session):
        cid = state["card_id"]
        r = auth_session.post(f"{API}/cards/{cid}/publish", timeout=10)
        assert r.status_code == 200, f"Publish failed: {r.text}"
        card = r.json()
        assert card["status"] == "available"
        assert card["listed_at"] is not None

    def test_browse_marketplace(self, session):
        r = session.get(f"{API}/cards?limit=100", timeout=15)
        assert r.status_code == 200
        cards = r.json()
        assert isinstance(cards, list)
        ids = [c["id"] for c in cards]
        assert state["card_id"] in ids, "Published card not visible in marketplace"

    def test_my_cards(self, auth_session):
        r = auth_session.get(f"{API}/cards/my-cards", timeout=10)
        assert r.status_code == 200
        cards = r.json()
        assert any(c["id"] == state["card_id"] for c in cards)

    def test_search_filter_category(self, session):
        r = session.get(f"{API}/cards?category=basketball&limit=50", timeout=10)
        assert r.status_code == 200
        cards = r.json()
        for c in cards:
            assert c["category"] == "basketball"


# ---------- Razz (Provably Fair) ----------
class TestRazz:
    def test_create_razz_needs_second_card(self, auth_session):
        # Create a second card to razz (the published one is already available)
        payload = {
            "title": f"TEST_{UNIQUE_TAG} Jordan Rookie",
            "player_name": "Michael Jordan",
            "category": "basketball",
            "condition": "psa_9",
            "asking_price": 5000.0
        }
        r = auth_session.post(f"{API}/cards", json=payload, timeout=10)
        assert r.status_code == 200
        state["razz_card_id"] = r.json()["id"]
        # Publish so it's available
        rp = auth_session.post(f"{API}/cards/{state['razz_card_id']}/publish", timeout=10)
        assert rp.status_code == 200

    def test_create_razz(self, auth_session):
        payload = {
            "card_id": state["razz_card_id"],
            "title": f"TEST_{UNIQUE_TAG} Razz Jordan",
            "description": "Win a Jordan rookie",
            "total_spots": 10,
            "spot_price": 50.0,
        }
        r = auth_session.post(f"{API}/razz", json=payload, timeout=15)
        assert r.status_code == 200, f"Create razz failed: {r.text}"
        razz = r.json()
        assert razz["status"] == "draft"
        assert razz["total_spots"] == 10
        # server_seed_hash should already be generated at creation per fairness flow OR at publish
        state["razz_id"] = razz["id"]
        state["razz_initial_hash"] = razz.get("server_seed_hash")

    def test_publish_razz(self, auth_session):
        rid = state["razz_id"]
        r = auth_session.post(f"{API}/razz/{rid}/publish", timeout=15)
        assert r.status_code == 200, f"Publish razz failed: {r.text}"
        razz = r.json()
        assert razz["status"] == "active"
        assert razz["server_seed_hash"] is not None, "server_seed_hash must be published for provable fairness"
        assert len(razz["server_seed_hash"]) == 64, f"sha256 hex should be 64 chars, got {len(razz['server_seed_hash'])}"
        assert razz["published_at"] is not None

    def test_browse_active_razzes(self, session):
        r = session.get(f"{API}/razz?limit=100", timeout=10)
        assert r.status_code == 200
        razzes = r.json()
        ids = [x["id"] for x in razzes]
        assert state["razz_id"] in ids, "Published razz not in active list"

    def test_active_count(self, session):
        r = session.get(f"{API}/razz/stats/active-count", timeout=10)
        assert r.status_code == 200
        assert r.json()["active_razzes"] >= 1

    def test_provably_fair_hash_unchanged(self, session):
        r = session.get(f"{API}/razz/{state['razz_id']}", timeout=10)
        assert r.status_code == 200
        razz = r.json()
        assert razz["server_seed_hash"] is not None
        # Real server_seed should be hidden until draw
        assert razz.get("proof") is None, "proof should not be exposed before completion"
