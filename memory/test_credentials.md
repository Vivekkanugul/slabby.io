# Slabby Test Credentials

## Demo User Account
- **Email**: demo@slabby.com
- **Password**: demo123
- **Balance**: $1,000 (pre-seeded)
- **Cards**: 3 pre-listed cards (Wembanyama, Doncic, Trout)
- **Role**: user

## Admin Account
- **Email**: admin@slabby.com
- **Password**: admin123
- **Balance**: $10,000 (pre-seeded)
- **Role**: admin

## Test Trader Account (created during testing)
- **Email**: trader@slabby.com
- **Password**: password123
- **Role**: user

## JWT Token Storage
Tokens stored in localStorage as `slabby_token`. Expire after 24 hours.

## API Testing
```bash
# Login as demo user
API_URL=https://card-terminal-2.preview.emergentagent.com
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@slabby.com","password":"demo123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Login as admin
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@slabby.com","password":"admin123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Get admin stats (admin only)
curl -s "$API_URL/api/admin/stats" -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Stripe Test Mode
Deposits use Stripe test mode (sk_test_emergent). Use Stripe test cards:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002

## eBay API (Not Configured)
Set `EBAY_APP_ID` in backend/.env when ready.
