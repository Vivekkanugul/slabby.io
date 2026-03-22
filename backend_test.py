import requests
import sys
import json
from datetime import datetime

class CardWiseAPITester:
    def __init__(self, base_url="https://cardwise-17.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_result(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {"status": "success"}
            return {}

        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}")
            return {}

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n🔐 Testing Authentication Flow...")
        
        # Generate unique test user
        timestamp = datetime.now().strftime('%H%M%S')
        test_email = f"test_user_{timestamp}@cardwise.com"
        test_password = "TestPass123!"
        test_name = f"Test User {timestamp}"

        # Test registration
        register_data = {
            "email": test_email,
            "password": test_password,
            "name": test_name
        }
        
        response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if response and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   📝 Registered user: {test_email}")
        else:
            print("   ❌ Registration failed - stopping auth tests")
            return False

        # Test login
        login_data = {
            "email": test_email,
            "password": test_password
        }
        
        response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if response and 'access_token' in response:
            self.token = response['access_token']
            print(f"   🔑 Login successful")
        else:
            print("   ❌ Login failed")
            return False

        # Test get current user
        self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )

        return True

    def test_cards_endpoints(self):
        """Test cards-related endpoints"""
        print("\n🃏 Testing Cards Endpoints...")
        
        # Get all cards
        response = self.run_test(
            "Get All Cards",
            "GET",
            "cards",
            200
        )
        
        cards = response if isinstance(response, list) else []
        if not cards:
            print("   ⚠️  No cards returned")
            return False

        # Test with filters
        self.run_test(
            "Get Cards with Category Filter",
            "GET",
            "cards?category=Basketball",
            200
        )
        
        self.run_test(
            "Get Cards with Search",
            "GET",
            "cards?search=Jordan",
            200
        )
        
        self.run_test(
            "Get Cards with Sort",
            "GET",
            "cards?sort_by=current_price&order=desc",
            200
        )

        # Get trending cards
        self.run_test(
            "Get Trending Cards",
            "GET",
            "cards/trending",
            200
        )

        # Get specific card
        if cards:
            card_id = cards[0]['id']
            self.run_test(
                "Get Specific Card",
                "GET",
                f"cards/{card_id}",
                200
            )
            
            # Get price history
            self.run_test(
                "Get Card Price History",
                "GET",
                f"cards/{card_id}/price-history",
                200
            )
            
            return card_id
        
        return None

    def test_marketplace_endpoints(self, card_id):
        """Test marketplace endpoints"""
        print("\n🏪 Testing Marketplace Endpoints...")
        
        if not self.token:
            print("   ⚠️  No auth token - skipping marketplace tests")
            return

        # Get marketplace listings
        self.run_test(
            "Get Marketplace Listings",
            "GET",
            "marketplace/listings",
            200
        )
        
        self.run_test(
            "Get Marketplace Listings with Filter",
            "GET",
            "marketplace/listings?category=Basketball",
            200
        )

        if card_id:
            # Create a listing
            listing_data = {
                "card_id": card_id,
                "price": 1000.00,
                "quantity": 1
            }
            
            self.run_test(
                "Create Marketplace Listing",
                "POST",
                "marketplace/list",
                200,
                data=listing_data
            )

    def test_portfolio_endpoints(self, card_id):
        """Test portfolio endpoints"""
        print("\n💼 Testing Portfolio Endpoints...")
        
        if not self.token:
            print("   ⚠️  No auth token - skipping portfolio tests")
            return

        # Get portfolio summary
        self.run_test(
            "Get Portfolio Summary",
            "GET",
            "portfolio/summary",
            200
        )

        # Get portfolio holdings
        self.run_test(
            "Get Portfolio Holdings",
            "GET",
            "portfolio",
            200
        )

        if card_id:
            # Add card to portfolio
            portfolio_data = {
                "card_id": card_id,
                "quantity": 2,
                "purchase_price": 500.00
            }
            
            response = self.run_test(
                "Add Card to Portfolio",
                "POST",
                "portfolio/add",
                200,
                data=portfolio_data
            )

        # Get transactions
        self.run_test(
            "Get Transaction History",
            "GET",
            "transactions",
            200
        )

    def test_ai_predictions(self, card_id):
        """Test AI prediction endpoints"""
        print("\n🤖 Testing AI Prediction Endpoints...")
        
        # Get all predictions
        self.run_test(
            "Get All AI Predictions",
            "GET",
            "predictions",
            200
        )

        if card_id:
            # Get specific card prediction
            self.run_test(
                "Get Card Prediction",
                "GET",
                f"predictions/{card_id}",
                200
            )
            
            if self.token:
                # Test AI analysis (requires auth)
                analysis_data = {"card_id": card_id}
                self.run_test(
                    "AI Card Analysis",
                    "POST",
                    "predictions/analyze",
                    200,
                    data=analysis_data
                )

    def test_stats_endpoints(self):
        """Test stats and dashboard endpoints"""
        print("\n📊 Testing Stats Endpoints...")
        
        # Get market overview
        self.run_test(
            "Get Market Overview",
            "GET",
            "stats/market-overview",
            200
        )

        # Test root endpoint
        self.run_test(
            "API Root Endpoint",
            "GET",
            "",
            200
        )

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting CardWise API Test Suite")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)

        # Test authentication first
        auth_success = self.test_auth_flow()
        
        # Test cards endpoints
        card_id = self.test_cards_endpoints()
        
        # Test marketplace (requires auth)
        self.test_marketplace_endpoints(card_id)
        
        # Test portfolio (requires auth)
        self.test_portfolio_endpoints(card_id)
        
        # Test AI predictions
        self.test_ai_predictions(card_id)
        
        # Test stats endpoints
        self.test_stats_endpoints()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            
            # Show failed tests
            failed_tests = [r for r in self.test_results if not r['success']]
            if failed_tests:
                print("\n❌ Failed Tests:")
                for test in failed_tests:
                    print(f"   • {test['test']}: {test['details']}")
            
            return 1

def main():
    tester = CardWiseAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())