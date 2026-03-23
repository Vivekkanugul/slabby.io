"""
Test suite for CardSight API Integration
Tests: CardSight search endpoint, card data format, pricing simulation, frontend integration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "debugtest@test.com"
TEST_PASSWORD = "password123"


class TestCardsightSearchEndpoint:
    """Tests for /api/cards/search/cardsight endpoint"""
    
    def test_search_lebron_returns_results(self):
        """Test CardSight search for 'LeBron' returns properly formatted cards"""
        response = requests.get(f"{BASE_URL}/api/cards/search/cardsight", params={"q": "LeBron"})
        
        print(f"CardSight search response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "query" in data, "Response should contain 'query'"
        assert "total" in data, "Response should contain 'total'"
        assert "source" in data, "Response should contain 'source'"
        assert "cards" in data, "Response should contain 'cards'"
        
        assert data["query"] == "LeBron"
        assert data["source"] == "cardsight"
        assert data["total"] > 0, "Should return at least one card for 'LeBron'"
        
        print(f"Found {data['total']} cards for 'LeBron'")
        
    def test_cardsight_card_format(self):
        """Test CardSight cards have all required CardBase fields"""
        response = requests.get(f"{BASE_URL}/api/cards/search/cardsight", params={"q": "LeBron", "limit": 5})
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["cards"]) > 0, "Should return at least one card"
        
        card = data["cards"][0]
        
        # Required CardBase fields
        required_fields = [
            "id", "name", "player_name", "team", "year", "set_name",
            "grade", "current_price", "previous_price", "price_change_pct",
            "image_url", "category", "rarity", "last_sold", "volume_24h",
            "market_cap", "volatility_30d", "sharpe_ratio", "beta", "correlation_market"
        ]
        
        for field in required_fields:
            assert field in card, f"Card should contain '{field}'"
            
        # CardSight-specific fields
        assert "source" in card, "Card should have 'source' field"
        assert card["source"] == "cardsight", "Source should be 'cardsight'"
        assert "cardsight_id" in card, "Card should have 'cardsight_id'"
        assert "manufacturer" in card, "Card should have 'manufacturer'"
        assert "release_name" in card, "Card should have 'release_name'"
        
        # ID should be prefixed with 'cs_'
        assert card["id"].startswith("cs_"), f"CardSight card ID should start with 'cs_', got {card['id']}"
        
        print(f"Sample card: {card['name']}")
        print(f"  ID: {card['id']}")
        print(f"  Price: ${card['current_price']}")
        print(f"  Grade: {card['grade']}")
        print(f"  Category: {card['category']}")
        
    def test_cardsight_pricing_simulation(self):
        """Test that CardSight cards have simulated pricing data"""
        response = requests.get(f"{BASE_URL}/api/cards/search/cardsight", params={"q": "Jordan", "limit": 5})
        
        assert response.status_code == 200
        data = response.json()
        
        for card in data["cards"]:
            # Verify pricing fields are numeric and reasonable
            assert isinstance(card["current_price"], (int, float)), "current_price should be numeric"
            assert isinstance(card["previous_price"], (int, float)), "previous_price should be numeric"
            assert isinstance(card["price_change_pct"], (int, float)), "price_change_pct should be numeric"
            
            assert card["current_price"] > 0, "current_price should be positive"
            assert card["previous_price"] > 0, "previous_price should be positive"
            
            # Verify analytics fields
            assert 0 <= card["volatility_30d"] <= 100, "volatility should be 0-100"
            assert 0 <= card["sharpe_ratio"] <= 5, "sharpe_ratio should be reasonable"
            assert 0 <= card["beta"] <= 3, "beta should be reasonable"
            
            print(f"Card: {card['player_name'][:30]}... Price: ${card['current_price']:.2f}, Change: {card['price_change_pct']:.2f}%")
            
    def test_cardsight_category_detection(self):
        """Test that CardSight correctly detects sport categories"""
        response = requests.get(f"{BASE_URL}/api/cards/search/cardsight", params={"q": "LeBron", "limit": 20})
        
        assert response.status_code == 200
        data = response.json()
        
        categories_found = set()
        for card in data["cards"]:
            categories_found.add(card["category"])
            
        print(f"Categories found: {categories_found}")
        
        # LeBron search should primarily return Basketball cards
        basketball_count = sum(1 for c in data["cards"] if c["category"] == "Basketball")
        print(f"Basketball cards: {basketball_count}/{len(data['cards'])}")
        
    def test_search_with_limit(self):
        """Test CardSight search respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/cards/search/cardsight", params={"q": "card", "limit": 5})
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["cards"]) <= 5, f"Should return at most 5 cards, got {len(data['cards'])}"
        
    def test_search_short_query_rejected(self):
        """Test that queries less than 2 characters are rejected"""
        response = requests.get(f"{BASE_URL}/api/cards/search/cardsight", params={"q": "a"})
        
        assert response.status_code == 400, f"Expected 400 for short query, got {response.status_code}"
        
    def test_search_empty_query_rejected(self):
        """Test that empty queries are rejected"""
        response = requests.get(f"{BASE_URL}/api/cards/search/cardsight", params={"q": ""})
        
        assert response.status_code == 400, f"Expected 400 for empty query, got {response.status_code}"


class TestCardsightGradeAndRarity:
    """Test grade and rarity assignment for CardSight cards"""
    
    def test_grade_distribution(self):
        """Test that CardSight cards have valid grades"""
        response = requests.get(f"{BASE_URL}/api/cards/search/cardsight", params={"q": "rookie", "limit": 20})
        
        assert response.status_code == 200
        data = response.json()
        
        valid_grades = ["PSA 10", "PSA 9", "PSA 8", "BGS 9.5", "BGS 10"]
        grades_found = {}
        
        for card in data["cards"]:
            grade = card["grade"]
            assert grade in valid_grades, f"Invalid grade: {grade}"
            grades_found[grade] = grades_found.get(grade, 0) + 1
            
        print(f"Grade distribution: {grades_found}")
        
    def test_rarity_distribution(self):
        """Test that CardSight cards have valid rarities"""
        response = requests.get(f"{BASE_URL}/api/cards/search/cardsight", params={"q": "prizm", "limit": 20})
        
        assert response.status_code == 200
        data = response.json()
        
        valid_rarities = ["Common", "Rare", "Ultra Rare", "Legendary"]
        rarities_found = {}
        
        for card in data["cards"]:
            rarity = card["rarity"]
            assert rarity in valid_rarities, f"Invalid rarity: {rarity}"
            rarities_found[rarity] = rarities_found.get(rarity, 0) + 1
            
        print(f"Rarity distribution: {rarities_found}")


class TestAuthFlow:
    """Authentication tests with provided credentials"""
    
    def test_login_with_test_credentials(self):
        """Test login with debugtest@test.com / password123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        print(f"Login response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "access_token" in data, "Response should contain 'access_token'"
        assert "user" in data, "Response should contain 'user'"
        assert data["user"]["email"] == TEST_EMAIL
        
        print(f"Logged in as: {data['user']['name']} ({data['user']['email']})")


class TestTradingHubValuations:
    """Test Trading Hub displays cards with AI Fair Market Values"""
    
    def test_marketplace_valuations_endpoint(self):
        """Test /api/marketplace/valuations returns AI valuations"""
        response = requests.get(f"{BASE_URL}/api/marketplace/valuations")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should return at least one valuation"
        
        valuation = data[0]
        
        # Check required valuation fields
        required_fields = [
            "card_id", "card_name", "current_price", "fair_market_value",
            "buy_range", "sell_range", "confidence"
        ]
        
        for field in required_fields:
            assert field in valuation, f"Valuation should contain '{field}'"
            
        print(f"Sample valuation: {valuation['card_name']}")
        print(f"  Current Price: ${valuation['current_price']}")
        print(f"  Fair Market Value: ${valuation['fair_market_value']}")
        print(f"  Confidence: {valuation['confidence']}")


class TestLocalCardsEndpoint:
    """Test local mock cards endpoint"""
    
    def test_get_local_cards(self):
        """Test /api/cards returns local mock cards"""
        response = requests.get(f"{BASE_URL}/api/cards")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should return at least one card"
        
        # Local cards should NOT have 'source' field or it should not be 'cardsight'
        for card in data:
            if "source" in card:
                assert card["source"] != "cardsight", "Local cards should not have cardsight source"
                
        print(f"Local cards count: {len(data)}")
        
        # Check for LeBron James in local cards
        lebron_cards = [c for c in data if "LeBron" in c.get("player_name", "")]
        print(f"LeBron cards in local: {len(lebron_cards)}")


class TestPredictionsEndpoint:
    """Test AI predictions endpoint used by Research Terminal"""
    
    def test_get_predictions(self):
        """Test /api/predictions returns AI predictions"""
        response = requests.get(f"{BASE_URL}/api/predictions")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should return at least one prediction"
        
        prediction = data[0]
        
        required_fields = [
            "id", "card_id", "card_name", "signal", "confidence_score",
            "risk_score", "analysis"
        ]
        
        for field in required_fields:
            assert field in prediction, f"Prediction should contain '{field}'"
            
        print(f"Sample prediction: {prediction['card_name']}")
        print(f"  Signal: {prediction['signal']}")
        print(f"  Confidence: {prediction['confidence_score']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
