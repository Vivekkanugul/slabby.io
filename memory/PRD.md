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
- External APIs: CardSight AI (7M+ card catalog)
- Deployment: Emergent platform

## What's Been Implemented

### Core Features
- [x] JWT authentication (register/login)
- [x] Cards API with 13 mock cards (Basketball, Baseball, Football, Hockey)
- [x] Portfolio management (add/remove, P&L tracking)
- [x] Transaction history
- [x] AI Predictions (mock + GPT-5.2)
- [x] Market overview statistics

### CardSight AI Integration (March 23, 2026) - LATEST
- [x] **Real Card Search** - Search 7M+ real cards from CardSight database
- [x] **API Endpoint** - `/api/cards/search/cardsight?q={query}&limit={n}` 
- [x] **Data Conversion** - CardSight results converted to CardBase format with simulated pricing
- [x] **AI Research Terminal** - Shows both local and CardSight results with Globe icon
- [x] **Trading Hub Integration** - CardSight search in Buy Cards tab
- [x] **Full Analytics** - CardSight cards get same analytics (technicals, fundamentals, price targets)
- [x] **Visual Distinction** - CardSight results show cyan styling and Globe icon

### Trading Hub (March 22, 2026)
- [x] **Buy Cards Tab** - Browse all cards with AI Fair Market Value, Buy Target (80-90% FMV), Profit Potential
- [x] **Sell Cards Tab** - List cards with AI Suggested Sell Range (95-105% FMV), volume data
- [x] **Active Listings Tab** - View all active marketplace listings with FMV comparison
- [x] **Expanded Card View** - FMV, Buy/Sell ranges, Confidence score, Profit Breakdown
- [x] **Sell Modal** - Set price with real-time % of FMV indicator, quantity selector
- [x] **Buy Confirmation** - Shows asking price vs FMV, potential profit calculation
- [x] **Market Valuation API** - `/api/marketplace/valuations` with algorithmic FMV calculation

### AI Research Terminal
- [x] **Player Search** - Search local portfolio + CardSight database
- [x] **Price Targets** - Bull/Base/Bear 12-month projections
- [x] **Technical Analysis** - RSI, MACD, Stochastic, ADX, Support/Resistance levels
- [x] **Fundamentals** - PSA Population, Scarcity Index, Liquidity Score
- [x] **Player Stats** - Game-by-game performance (NBA/MLB/NFL/NHL)
- [x] **Hold Projector** - Multi-timeframe value projections with probability distributions

### Advanced Analytics
- [x] What-If Simulator (9 scenario types)
- [x] Social Sentiment Heatmap
- [x] Grade Probability Calculator
- [x] Card Screener (replaced Stress Test)
- [x] Arbitrage Finder
- [x] Smart Alerts with Context

### Watchlist
- [x] Add/remove cards to watchlist
- [x] Custom price alerts (high/low targets)
- [x] Alert enable/disable

### Pages
- [x] Landing page, Auth (Login/Register)
- [x] Trading Hub (Marketplace) with Buy/Sell/Listings
- [x] Portfolio with holdings table, transactions, watchlist tab
- [x] AI Research Terminal
- [x] Analytics Hub
- [x] Profile settings

## API Endpoints

### Core
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/cards`, `GET /api/cards/trending`, `GET /api/cards/{id}`, `GET /api/cards/{id}/price-history`
- `GET /api/cards/search/cardsight` - **NEW** CardSight API search
- `GET /api/marketplace/listings`, `POST /api/marketplace/list`, `POST /api/marketplace/buy`
- `GET /api/marketplace/valuations`, `GET /api/marketplace/valuation/{card_id}`
- `GET /api/portfolio`, `GET /api/portfolio/summary`, `POST /api/portfolio/add`, `DELETE /api/portfolio/{id}`
- `GET /api/transactions`
- `GET /api/predictions`, `GET /api/predictions/{id}`, `POST /api/predictions/analyze`

### Analytics
- `POST /api/analytics/what-if`, `GET /api/analytics/sentiment-heatmap`
- `POST /api/analytics/grade-probability`, `GET /api/analytics/arbitrage`
- `GET /api/analytics/smart-alerts`, `GET /api/analytics/portfolio-metrics`

### Player Performance
- `GET /api/players/{card_id}/performance`
- `POST /api/projections/hold`

### Watchlist
- `GET /api/watchlist`, `POST /api/watchlist`, `PUT /api/watchlist/{id}`, `DELETE /api/watchlist/{id}`

## Data Sources
| Data Type | Source | Status |
|-----------|--------|--------|
| Card Catalog | CardSight AI API | LIVE (7M+ cards) |
| Card Pricing | Simulated from catalog data | SIMULATED |
| Player Performance | Mock engine per sport | MOCKED |
| Market Valuations | Algorithmic calculation | MOCKED |
| Social Sentiment | Mock data | MOCKED |

## 3rd Party Integrations
1. **CardSight AI** - Card catalog search (API Key in backend/.env)
2. **OpenAI GPT-5.2** - AI analysis via Emergent LLM Key

## Next Steps (Prioritized)

### P0 - High Priority
- [ ] Replace mocked user/portfolio data with real MongoDB persistence
- [ ] Resolve "Game Impact" chart replacement (user requested change)

### P1 - Medium Priority
- [ ] Real eBay API for accurate price history
- [ ] Real sports stats API for player data  
- [ ] Real social media sentiment API
- [ ] Refactor server.py (2400+ lines) into /routes, /models, /services

### P2 - Future Enhancements
- [ ] Real PSA population reports
- [ ] Fractional Card Ownership
- [ ] Real-time WebSocket price updates
- [ ] Email notifications for alerts

## Known Limitations
- CardSight API provides catalog data only (no pricing) - prices are simulated
- Player performance data is mocked, not connected to real sports APIs
- Teams set for 2026 simulation (LeBron/Luka on Lakers, Trae on Wizards)

## Test Credentials
- Email: `debugtest@test.com` / Password: `password123`
- Email: `fulltest8107@cardwise.com` / Password: `password123`

## Notes
- Dark fintech theme with cyan accent for AI features
- GPT-5.2 integration active for AI analysis feature
- CardSight integration adds real card discovery while keeping simulated analytics
