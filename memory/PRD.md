# CardWise - Collectible Card Platform PRD

## Original Problem Statement
Build a full-featured collectible card platform with:
- Portfolio tracking
- Marketplace (buy/sell cards)
- AI prediction analytics
- Real-time prices and transaction history
- Advanced ML predictions for card value movements

## User Personas
1. **Casual Collectors** - Track personal collections, browse marketplace
2. **Serious Investors** - Portfolio analytics, AI predictions, buy/sell signals

## Core Requirements (Static)
- Web-only React frontend with dark fintech theme
- FastAPI backend with MongoDB
- JWT authentication
- GPT-5.2 for AI-powered analysis
- Mocked external APIs (eBay, Sports Stats, Social Sentiment)

## What's Been Implemented (March 22, 2026)

### Backend (/app/backend/server.py)
- [x] JWT authentication (register/login)
- [x] Cards API with 10 mock cards (Basketball, Baseball, Football)
- [x] Marketplace listings API
- [x] Portfolio management (add/remove cards, P&L tracking)
- [x] Transaction history
- [x] AI Predictions API (mock + GPT-5.2 integration)
- [x] Market overview statistics
- [x] Price history endpoint

### Frontend (/app/frontend/src/)
- [x] Landing page with hero, features, CTAs
- [x] Auth pages (Login/Register)
- [x] Dashboard with portfolio stats, chart, AI signals
- [x] Marketplace with search, filters, grid/list views
- [x] Card detail with price history chart, AI prediction
- [x] Portfolio page with holdings table, transactions
- [x] AI Insights page with buy/sell signals
- [x] Profile settings page

### Design
- [x] Dark fintech theme (#05050A background)
- [x] Unbounded font for headings, IBM Plex Sans for body
- [x] Cyan (#00E5FF) for AI elements
- [x] Green/Red for profit/loss indicators
- [x] Glass morphism navigation
- [x] Card hover effects

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] User authentication
- [x] View cards in marketplace
- [x] Portfolio tracking
- [x] AI predictions display

### P1 (High Priority)
- [ ] Real eBay API integration
- [ ] Real-time price updates via WebSocket
- [ ] User-to-user marketplace transactions
- [ ] Email notifications for price alerts

### P2 (Medium Priority)
- [ ] Sports stats API integration
- [ ] Twitter/Reddit sentiment analysis
- [ ] Advanced portfolio analytics (charts, trends)
- [ ] Watchlist functionality
- [ ] Price alerts

### P3 (Nice to Have)
- [ ] Mobile app (React Native)
- [ ] Social features (follow, share)
- [ ] Card grading estimation
- [ ] Market news feed

## Tech Stack
- Frontend: React 19, Tailwind CSS, Shadcn/UI, Recharts
- Backend: FastAPI, MongoDB, JWT
- AI: OpenAI GPT-5.2 via Emergent integrations
- Deployment: Emergent platform

## API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/cards` - List all cards with filters
- `GET /api/cards/trending` - Top trending cards
- `GET /api/cards/{id}` - Card details
- `GET /api/cards/{id}/price-history` - Price history
- `GET /api/marketplace/listings` - Marketplace listings
- `POST /api/marketplace/list` - Create listing
- `POST /api/marketplace/buy` - Buy from listing
- `GET /api/portfolio` - User portfolio
- `GET /api/portfolio/summary` - Portfolio summary
- `POST /api/portfolio/add` - Add card to portfolio
- `DELETE /api/portfolio/{id}` - Remove from portfolio
- `GET /api/transactions` - Transaction history
- `GET /api/predictions` - AI predictions
- `GET /api/predictions/{id}` - Card prediction
- `POST /api/predictions/analyze` - AI analysis
- `GET /api/stats/market-overview` - Market stats
