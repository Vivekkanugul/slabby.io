# Slabby Test Credentials

## Test User Account
- **Email**: trader@slabby.com
- **Password**: password123
- **Status**: Active
- **Notes**: Pre-created test account with wallet balance

## Additional Test Accounts
Created during testing:
- slabby_test@test.com / password123

## JWT Token
Tokens expire after 24 hours. Stored in localStorage as `slabby_token`.

## Admin Access
No admin accounts seeded yet. To create:
1. Register a new user
2. Manually update their role in MongoDB: `db.users.updateOne({email: "..."}, {$set: {role: "admin"}})`

## API Testing
```bash
# Login and get token
API_URL=https://card-terminal-2.preview.emergentagent.com
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"trader@slabby.com","password":"password123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Use token for authenticated requests
curl -s "$API_URL/api/wallet" -H "Authorization: Bearer $TOKEN"
```
