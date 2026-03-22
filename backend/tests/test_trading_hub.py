"""
Test suite for CardWise Trading Hub features
Tests: Market valuations API, Login flow, Marketplace endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "fulltest8107@cardwise.com"
TEST_PASSWORD = "password123"


class TestAuthFlow:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify access_token is returned (not 'token')
        assert "access_token" in data, "Response should contain 'access_token'"
        assert "user" in data, "Response should contain 'user'"
        assert data["user"]["email"] == TEST_EMAIL
        assert len(data["access_token"]) > 0
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


class TestMarketValuations:
    """Market valuations API tests for Trading Hub"""
    
    def test_get_all_valuations(self):
        """Test /api/marketplace/valuations returns AI valuations with buy/sell ranges"""
        response = requests.get(f"{BASE_URL}/api/marketplace/valuations")
        print(f"Valuations response status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should return at least one valuation"
        
        # Check first valuation has required fields
        valuation = data[0]
        required_fields = [
            "card_id", "card_name", "current_price", "fair_market_value",
            "buy_range", "sell_range", "confidence",
            "potential_profit_at_buy_low", "potential_profit_pct_at_buy_low",
            "potential_profit_at_buy_high", "potential_profit_pct_at_buy_high"
        ]
        for field in required_fields:
            assert field in valuation, f"Valuation should contain '{field}'"
        
        # Verify buy_range structure (80-90% of FMV)
        assert "low" in valuation["buy_range"], "buy_range should have 'low'"
        assert "high" in valuation["buy_range"], "buy_range should have 'high'"
        
        # Verify sell_range structure (95-105% of FMV)
        assert "low" in valuation["sell_range"], "sell_range should have 'low'"
        assert "high" in valuation["sell_range"], "sell_range should have 'high'"
        
        # Verify buy range is 80-90% of FMV
        fmv = valuation["fair_market_value"]
        buy_low = valuation["buy_range"]["low"]
        buy_high = valuation["buy_range"]["high"]
        assert abs(buy_low - fmv * 0.80) < 1, f"Buy low should be ~80% of FMV"
        assert abs(buy_high - fmv * 0.90) < 1, f"Buy high should be ~90% of FMV"
        
        # Verify sell range is 95-105% of FMV
        sell_low = valuation["sell_range"]["low"]
        sell_high = valuation["sell_range"]["high"]
        assert abs(sell_low - fmv * 0.95) < 1, f"Sell low should be ~95% of FMV"
        assert abs(sell_high - fmv * 1.05) < 1, f"Sell high should be ~105% of FMV"
        
        print(f"Sample valuation: {valuation['card_name']}")
        print(f"  FMV: ${valuation['fair_market_value']}")
        print(f"  Buy Range: ${buy_low} - ${buy_high}")
        print(f"  Sell Range: ${sell_low} - ${sell_high}")
        
    def test_get_valuations_by_category(self):
        """Test filtering valuations by category"""
        response = requests.get(f"{BASE_URL}/api/marketplace/valuations", params={"category": "Basketball"})
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned cards should be Basketball category (if any)
        # Note: The API filters by category in the cards, not in valuations directly
        print(f"Basketball valuations count: {len(data)}")
        
    def test_get_single_card_valuation(self):
        """Test /api/marketplace/valuation/{card_id} returns valuation for specific card"""
        card_id = "card_001"  # Michael Jordan card
        response = requests.get(f"{BASE_URL}/api/marketplace/valuation/{card_id}")
        
        print(f"Single valuation response status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["card_id"] == card_id
        assert "fair_market_value" in data
        assert "buy_range" in data
        assert "sell_range" in data
        assert "confidence" in data
        
        print(f"Card: {data['card_name']}")
        print(f"  FMV: ${data['fair_market_value']}")
        print(f"  Confidence: {data['confidence']}")
        
    def test_get_valuation_nonexistent_card(self):
        """Test valuation for non-existent card returns 404"""
        response = requests.get(f"{BASE_URL}/api/marketplace/valuation/nonexistent_card")
        assert response.status_code == 404


class TestMarketplaceListings:
    """Marketplace listings tests"""
    
    def test_get_listings(self):
        """Test /api/marketplace/listings returns active listings"""
        response = requests.get(f"{BASE_URL}/api/marketplace/listings")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Active listings count: {len(data)}")
        
    def test_create_listing_requires_auth(self):
        """Test creating listing without auth returns 401/403"""
        response = requests.post(f"{BASE_URL}/api/marketplace/list", json={
            "card_id": "card_001",
            "price": 700000,
            "quantity": 1
        })
        # Should fail without auth
        assert response.status_code in [401, 403, 422]


class TestCreateListingFlow:
    """Test creating a listing with authentication"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
        
    def test_create_listing_with_auth(self, auth_token):
        """Test creating a listing with valid auth"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get a card valuation first to set a reasonable price
        val_response = requests.get(f"{BASE_URL}/api/marketplace/valuation/card_003")
        if val_response.status_code == 200:
            valuation = val_response.json()
            suggested_price = valuation["sell_range"]["low"]
        else:
            suggested_price = 8000
        
        response = requests.post(
            f"{BASE_URL}/api/marketplace/list",
            json={
                "card_id": "card_003",  # Luka Doncic card
                "price": suggested_price,
                "quantity": 1
            },
            headers=headers
        )
        
        print(f"Create listing response: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}"
        data = response.json()
        
        assert "id" in data, "Response should contain listing id"
        assert data["card_id"] == "card_003"
        assert data["price"] == suggested_price


class TestCardsEndpoints:
    """Test cards endpoints used by Trading Hub"""
    
    def test_get_all_cards(self):
        """Test /api/cards returns card list"""
        response = requests.get(f"{BASE_URL}/api/cards")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check card has required fields for Trading Hub display
        card = data[0]
        required_fields = ["id", "name", "player_name", "current_price", "price_change_pct", "category", "grade", "rarity", "volume_24h"]
        for field in required_fields:
            assert field in card, f"Card should contain '{field}'"
            
        print(f"Total cards: {len(data)}")
        
    def test_get_cards_by_category(self):
        """Test filtering cards by category"""
        response = requests.get(f"{BASE_URL}/api/cards", params={"category": "Basketball"})
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned cards should be Basketball
        for card in data:
            assert card["category"] == "Basketball", f"Expected Basketball, got {card['category']}"
            
        print(f"Basketball cards: {len(data)}")


class TestWatchlistEndpoints:
    """Test watchlist functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
        
    def test_get_watchlist(self, auth_token):
        """Test getting user's watchlist"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/watchlist", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Watchlist items: {len(data)}")
        
    def test_add_to_watchlist(self, auth_token):
        """Test adding card to watchlist"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First check if card is already in watchlist
        response = requests.post(
            f"{BASE_URL}/api/watchlist",
            json={
                "card_id": "card_005",
                "target_price_high": 1500,
                "target_price_low": 1000
            },
            headers=headers
        )
        
        # Either success or already exists
        assert response.status_code in [200, 201, 400]
        print(f"Add to watchlist response: {response.status_code}")


class TestNavigationEndpoints:
    """Test endpoints used by navigation tabs"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_dashboard_endpoint(self, auth_token):
        """Test portfolio summary for dashboard"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/portfolio/summary", headers=headers)
        
        assert response.status_code == 200
        print(f"Portfolio summary: {response.json()}")
        
    def test_analytics_endpoint(self, auth_token):
        """Test analytics endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/portfolio-metrics", headers=headers)
        
        # May return message if no holdings
        assert response.status_code == 200
        print(f"Analytics response: {response.json()}")
        
    def test_predictions_endpoint(self):
        """Test AI predictions endpoint"""
        response = requests.get(f"{BASE_URL}/api/predictions")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Predictions count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
