# Slabby - Product Requirements Document

## Overview
**Slabby** is a world-class P2P trading and Razz (raffle) platform for collectible cards. Built with Apple-standard UI/UX, Event-Sourced Architecture, and provably fair cryptographic systems.

## Brand
- **Name**: Slabby
- **Primary Color**: `#BCFF00` (Lime Green)
- **Theme**: Dark fintech aesthetic with glass-morphism and Framer Motion animations

## Tech Stack
- **Frontend**: React, TailwindCSS, Framer Motion, Shadcn/UI
- **Backend**: FastAPI (Event-Sourced Architecture)
- **Database**: MongoDB (Event Store)
- **Payments**: Stripe Connect

## Core Features

### 1. Landing Page ✅
- Continuous flowing design (no section gaps)
- Bento grid layout for steps/testimonials
- Live stats from API
- Horizontal card scroll preview
- Parallax background effects

### 2. Live Razz Platform ✅
- Real-time card flip animations
- Suspenseful random reveal order
- Winner celebration with particle effects
- Crown icon on winning spot
- "Verify Fairness" provably fair verification
- Browse/Live view toggle
- Progress bars showing spots filled

### 3. Marketplace ✅
- Card listings with pricing
- Filter and search
- Card detail view

### 4. Wallet ✅
- Stripe Connect deposits
- Balance display
- Transaction history

### 5. P2P Trading (Scaffolded)
- Trade proposals
- Multi-card + cash offers
- Escrow system

## Architecture

### Event-Sourced Backend
All mutations are stored as immutable events:
- UserCreated, CardListed, TradePropoed, RazzCreated, etc.
- State reconstructed from event log
- Full audit trail

### Key API Endpoints
- `/api/auth/*` - Authentication
- `/api/cards/*` - Card CRUD
- `/api/razz/*` - Razz operations
- `/api/wallet/*` - Wallet/payments
- `/api/trades/*` - P2P trades
- `/api/uploads/` - Image uploads

## Completed Work (December 2025)

### Session 1-5
- [x] Complete backend refactor to Event-Sourced Architecture
- [x] Stripe Connect integration with webhooks
- [x] Demo account seeding (demo@slabby.com, admin@slabby.com)
- [x] Apple-standard UI redesign with #BCFF00 theme
- [x] Rich landing page with live stats

### Session 6
- [x] Removed landing page gaps - continuous flowing design
- [x] Removed "Made with Emergent" watermark
- [x] Removed "traders online" badge
- [x] Built immersive Live Razz experience with:
  - 3D flip card animations
  - Random suspenseful reveal
  - Winner celebration with particles
  - Provably fair verification UI

### Session 7 (December 13, 2025)
- [x] **Complete Landing Page Rebuild** - Clean, Apple-level polished design
  - Particle field with cursor interaction
  - 3D floating card carousel
  - Smooth animated stat counters
  - Mobile-optimized with touch support
- [x] **Backend Integrations for Go-Live**:
  - **eBay Service** (`/api/ebay/*`) - Price comparison, listing lookup, market analysis
  - **PSA/BGS/CGC Verification** (`/api/verification/*`) - Card grade verification
  - **USPS Shipping** (`/api/shipping/*`) - Labels, tracking, rate calculation, address validation
  - **Stripe Enhanced** (`/api/payments/*`) - Connect payouts, escrow, transfers

## Backend API Endpoints (Go-Live Ready)

### Card Verification (`/api/verification/`)
- `POST /verify` - Verify PSA/BGS/CGC cert number
- `GET /verify/{company}/{cert}` - Quick verification
- `GET /card/{card_id}` - Get saved verification
- `GET /status` - Service status

### Shipping (`/api/shipping/`)
- `GET /rates` - Get all shipping rates
- `POST /label` - Create shipping label (PDF)
- `GET /track/{tracking}` - Track shipment
- `POST /validate-address` - Validate/standardize address
- `GET /shipment/{id}` - Get shipment details

### eBay (`/api/ebay/`)
- `GET /search` - Search eBay listings
- `GET /item/{id}` - Get item details
- `GET /price-analysis` - Market price analysis

### Payments (`/api/payments/`)
- `POST /deposit` - Create deposit checkout
- `POST /connect/create` - Create seller Connect account
- `POST /connect/onboarding` - Get onboarding link
- `POST /escrow/create` - Create escrow payment
- `POST /escrow/{id}/release` - Release to seller
- `POST /escrow/{id}/refund` - Refund to buyer
- `POST /transfer` - Direct transfer to seller
- `POST /payout` - Payout to bank
- `GET /balance` - Get user balance

## Pending Tasks

### P0 (Critical)
- [ ] Integrate ImageUploader.js into card creation flow
- [ ] Integrate InteractiveCard.js into Marketplace/Landing
- [ ] Wire uploads.py to actually save files

### P1 (High Priority)
- [ ] Mobile responsive refinements
- [ ] Admin Portal UI (backend routes exist)
- [ ] WebSocket real-time notifications (backend exists)
- [ ] P2P Trade Service UI
- [ ] Stripe Connect payouts/withdrawals

### P2 (Backlog)
- [ ] eBay API integration (pending user credentials)

## Test Credentials
- **User**: demo@slabby.com / demo123
- **Admin**: admin@slabby.com / admin123

## File Structure
```
/app/
├── backend/
│   ├── server.py (FastAPI with routers)
│   ├── seed_accounts.py
│   ├── models/ (Pydantic models)
│   ├── routes/ (auth, cards, trades, razz, wallet, admin, payments, websocket, uploads)
│   └── services/ (Event store, business logic)
├── frontend/
│   ├── src/
│   │   ├── components/ (ImageUploader.js, InteractiveCard.js, ui/)
│   │   ├── pages/ (Landing.js, Marketplace.js, Wallet.js, Razz.js, etc.)
│   │   ├── context/ (AuthContext.js)
│   │   └── lib/api.js
└── memory/
    ├── PRD.md
    └── test_credentials.md
```
