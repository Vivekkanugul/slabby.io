# CardWise - Advanced Collectible Card Analytics Platform PRD

## Original Problem Statement
Build the most analytical collectible card platform in the market with features no competitor has:
- Portfolio tracking with risk metrics
- Marketplace with buy/sell and AI-powered valuations
- AI prediction analytics
- What-If Scenario Simulator
- Social Sentiment Heatmap
- Grade Probability Calculator
- Card Screener
- Cross-Sport Arbitrage Finder
- Smart Alerts with Context
- Watchlist with custom alerts

## User Personas
1. **Casual Collectors** - Track collections, browse marketplace
2. **Serious Investors** - Advanced analytics, AI predictions, risk analysis
3. **Professional Traders** - Arbitrage opportunities, buy/sell with profit margins

## Tech Stack
- Frontend: React 19, Tailwind CSS, Shadcn/UI, Recharts
- Backend: FastAPI, MongoDB, JWT
- AI: OpenAI GPT-5.2 via Emergent integrations
- Deployment: Emergent platform

## What's Been Implemented

### Core Features
- [x] JWT authentication (register/login)
- [x] Cards API with 10 mock cards (Basketball, Baseball, Football)
- [x] Portfolio management (add/remove, P&L tracking)
- [x] Transaction history
- [x] AI Predictions (mock + GPT-5.2)
- [x] Market overview statistics

### Trading Hub (March 22, 2026) - LATEST
- [x] **Buy Cards Tab** - Browse all cards with AI Fair Market Value, Buy Target (80-90% FMV), Profit Potential
- [x] **Sell Cards Tab** - List cards with AI Suggested Sell Range (95-105% FMV), volume data
- [x] **Active Listings Tab** - View all active marketplace listings with FMV comparison
- [x] **Expanded Card View** - FMV, Buy/Sell ranges, Confidence score, Profit Breakdown
- [x] **Sell Modal** - Set price with real-time % of FMV indicator, quantity selector
- [x] **Buy Confirmation** - Shows asking price vs FMV, potential profit calculation
- [x] **Market Valuation API** - `/api/marketplace/valuations` with algorithmic FMV calculation

### Advanced Analytics
- [x] What-If Simulator (9 scenario types)
- [x] Social Sentiment Heatmap
- [x] Grade Probability Calculator
- [x] Card Screener (replaced Stress Test)
- [x] Arbitrage Finder
- [x] Smart Alerts with Context
- [x] AI Research Terminal with Bull/Bear price targets

### Watchlist
- [x] Add/remove cards to watchlist
- [x] Custom price alerts (high/low targets)
- [x] Alert enable/disable

### Pages
- [x] Landing page, Auth (Login/Register)
- [x] Dashboard with portfolio stats, charts, AI signals
- [x] Trading Hub (Marketplace) with Buy/Sell/Listings
- [x] Card detail with price history, AI prediction
- [x] Portfolio with holdings table, transactions
- [x] Watchlist with custom alerts
- [x] AI Insights / Research page
- [x] Analytics Hub
- [x] Profile settings

### Removed
- [x] Earnings Tracker (removed per user request, March 22 2026)

## API Endpoints
### Core
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/cards`, `GET /api/cards/trending`, `GET /api/cards/{id}`, `GET /api/cards/{id}/price-history`
- `GET /api/marketplace/listings`, `POST /api/marketplace/list`, `POST /api/marketplace/buy`
- `GET /api/marketplace/valuations`, `GET /api/marketplace/valuation/{card_id}` (NEW)
- `GET /api/portfolio`, `GET /api/portfolio/summary`, `POST /api/portfolio/add`, `DELETE /api/portfolio/{id}`
- `GET /api/transactions`
- `GET /api/predictions`, `GET /api/predictions/{id}`, `POST /api/predictions/analyze`

### Analytics
- `POST /api/analytics/what-if`, `GET /api/analytics/sentiment-heatmap`
- `POST /api/analytics/grade-probability`, `GET /api/analytics/arbitrage`
- `GET /api/analytics/smart-alerts`, `GET /api/analytics/portfolio-metrics`

### Watchlist
- `GET /api/watchlist`, `POST /api/watchlist`, `PUT /api/watchlist/{id}`, `DELETE /api/watchlist/{id}`

## Data Sources (MOCKED)
- All card data mocked in MOCK_CARDS list
- Market valuations calculated algorithmically
- Social sentiment mocked

## Next Steps (Prioritized)
- [ ] P0: Replace mocked data with real MongoDB persistence
- [ ] P1: Real eBay API for accurate price history
- [ ] P1: Real sports stats API for player data
- [ ] P1: Real social media sentiment API
- [ ] P2: Real PSA population reports
- [ ] P2: Fractional Card Ownership
- [ ] P2: Real-time WebSocket price updates
- [ ] P2: Email notifications for alerts

## Notes
- All external APIs are MOCKED with realistic sample data
- GPT-5.2 integration active for AI analysis feature
- Dark fintech theme with cyan accent for AI features
