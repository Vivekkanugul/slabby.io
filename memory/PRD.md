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

### Session 6 (Current)
- [x] Removed landing page gaps - continuous flowing design
- [x] Removed "Made with Emergent" watermark
- [x] Removed "traders online" badge
- [x] Built immersive Live Razz experience with:
  - 3D flip card animations
  - Random suspenseful reveal
  - Winner celebration with particles
  - Provably fair verification UI

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
