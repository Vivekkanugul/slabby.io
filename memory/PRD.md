# Slabby - Trading & Razz Platform
**Project Marvel - Event-Sourced Architecture**

## Overview
Slabby is a premier P2P trading and provably fair razz (raffle) platform for collectible cards. Built with event-sourced architecture for complete audit trails and transparency.

## Core Features

### 1. Authentication
- JWT-based authentication
- User registration with email/password
- Profile management with display names
- Token stored as `slabby_token` in localStorage

### 2. Wallet System
- Digital wallet for each user
- Deposit/withdraw functionality (MOCKED - Stripe integration pending)
- Balance tracking: available, pending, escrow
- Full transaction history
- Event-sourced ledger

### 3. Card Marketplace
- List cards for sale with details:
  - Title, player name, team, year, set
  - Category (basketball, baseball, football, hockey, pokemon, other)
  - Condition (raw, PSA 10/9/8, BGS 10/9.5)
  - Asking price
  - Images
- Draft → Published workflow
- Search and filter by category
- Card status: draft, available, in_trade, in_razz, sold

### 4. P2P Trading
- Multi-asset trade support (cards + cash)
- Trade types: cards_only, cash_only, cards_and_cash, cash_for_cards
- Trade workflow: pending → countered → accepted/rejected → in_escrow → completed
- Escrow protection for both parties

### 5. Provably Fair Razz (Raffle)
- Cryptographically verifiable drawings
- Server seed hash published before draw
- Formula: `Winner = SHA256(server_seed + client_seed) mod total_spots`
- Full verification endpoint for completed razzes
- Spot purchasing with wallet balance
- Max spots per user limit

### 6. Admin Portal
- Platform statistics dashboard
- User management (suspend/unsuspend)
- Event log viewer
- Role-based access (admin, super_admin)

## Technical Architecture

### Backend (FastAPI)
```
/app/backend/
├── server.py           # Main app with lifespan
├── routes/
│   ├── auth.py         # Authentication endpoints
│   ├── cards.py        # Card CRUD
│   ├── trades.py       # P2P trading
│   ├── razz.py         # Razz (raffle) system
│   ├── wallet.py       # Banking/payments
│   └── admin.py        # Admin portal
├── services/
│   ├── event_store.py  # Append-only event log
│   ├── user_service.py
│   ├── card_service.py
│   ├── trade_service.py
│   ├── razz_service.py
│   └── wallet_service.py
└── models/
    ├── events.py       # Base event schemas
    ├── user.py
    ├── card.py
    ├── trade.py
    ├── razz.py
    ├── wallet.py
    └── admin.py
```

### Frontend (React)
```
/app/frontend/src/
├── pages/
│   ├── Landing.js      # Slabby hero page
│   ├── Login.js
│   ├── Register.js
│   ├── Marketplace.js  # Card browse & listing
│   ├── CardDetail.js
│   ├── Trades.js       # P2P trade management
│   ├── Razz.js         # Raffle browse & purchase
│   └── Wallet.js       # Banking
├── components/
│   └── Layout/Navbar.js # Slabby navigation
└── lib/api.js          # API client
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Cards
- `GET /api/cards` - Browse marketplace
- `GET /api/cards/my-cards` - User's cards
- `POST /api/cards` - Create card (draft)
- `POST /api/cards/{id}/publish` - Publish to marketplace

### Trades
- `POST /api/trades` - Create trade offer
- `GET /api/trades` - User's trades
- `POST /api/trades/{id}/accept` - Accept trade
- `POST /api/trades/{id}/reject` - Reject trade
- `POST /api/trades/{id}/counter` - Counter offer

### Razz
- `POST /api/razz` - Create razz (draft)
- `GET /api/razz` - Browse active razzes
- `POST /api/razz/{id}/publish` - Activate razz
- `POST /api/razz/{id}/purchase` - Buy spots
- `POST /api/razz/{id}/draw` - Execute draw (host only)
- `GET /api/razz/{id}/verify` - Verify fairness

### Wallet
- `GET /api/wallet` - Get wallet
- `POST /api/wallet/deposit` - Deposit funds (MOCKED)
- `POST /api/wallet/withdraw` - Withdraw funds (MOCKED)
- `GET /api/wallet/transactions` - Transaction history

## Design
- Brand color: Orange `#FF6B00`
- Dark theme: `#05050A` background
- Slabby logo: Orange gradient "S" badge
- Navigation: Marketplace, Trades, Razz, Wallet

## Status

### Completed (P0)
- [x] Event-sourced data architecture
- [x] User authentication (JWT)
- [x] Wallet system with transactions
- [x] Card marketplace (CRUD + publish)
- [x] P2P trade framework
- [x] Provably fair razz engine
- [x] Frontend with Slabby branding

### Pending (P1)
- [ ] Stripe Connect integration for real payments
- [ ] eBay API for market data (user lacks credentials)
- [ ] Real-time notifications (WebSocket)

### Future (P2)
- [ ] Mobile-responsive design refinements
- [ ] Advanced search filters
- [ ] Trade history analytics
- [ ] Razz statistics dashboard

## MOCKED Integrations
⚠️ **Stripe Connect**: Wallet deposits/withdrawals are MOCKED. Balance updates are instant without real payment processing. Production deployment requires Stripe Connect integration.

## Test Credentials
See `/app/memory/test_credentials.md`
