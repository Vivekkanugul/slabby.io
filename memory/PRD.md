# CardWise - Advanced Collectible Card Analytics Platform PRD

## Original Problem Statement
Build the most analytical collectible card platform in the market with features no competitor has:
- Portfolio tracking with risk metrics
- Marketplace with buy/sell
- AI prediction analytics
- What-If Scenario Simulator
- Social Sentiment Heatmap
- Grade Probability Calculator
- Portfolio Stress Testing
- Cross-Sport Arbitrage Finder
- Smart Alerts with Context

## Competitive Differentiators (UNIQUE TO CARDWISE)
1. **What-If Simulator** - Model trade, injury, award, retirement scenarios
2. **Social Sentiment Heatmap** - Real-time Twitter/Reddit buzz visualization
3. **Grade Probability Calculator** - AI-predicted grading outcomes with ROI
4. **Portfolio Stress Test** - Market crash/boom scenario modeling
5. **Arbitrage Finder** - Cross-sport value comparison
6. **Smart Alerts with Context** - Not just "price dropped" but WHY

## User Personas
1. **Casual Collectors** - Track collections, browse marketplace
2. **Serious Investors** - Advanced analytics, AI predictions, risk analysis
3. **Professional Traders** - Arbitrage opportunities, stress testing

## Tech Stack
- Frontend: React 19, Tailwind CSS, Shadcn/UI, Recharts
- Backend: FastAPI, MongoDB, JWT
- AI: OpenAI GPT-5.2 via Emergent integrations
- Deployment: Emergent platform

## What's Been Implemented (March 22, 2026)

### Core Features
- [x] JWT authentication (register/login)
- [x] Cards API with 10 mock cards (Basketball, Baseball, Football)
- [x] Marketplace listings
- [x] Portfolio management (add/remove, P&L tracking)
- [x] Transaction history
- [x] AI Predictions (mock + GPT-5.2)
- [x] Market overview statistics

### Advanced Analytics (NEW)
- [x] **What-If Simulator** (`/analytics/simulator`)
  - 9 scenario types: Trade, Injury, Award, Championship, Retirement, Hall of Fame, Regrade Up/Down, Scandal
  - AI-powered price impact predictions
  - Historical precedent analysis
  - Confidence scores and timeframe estimates

- [x] **Social Sentiment Heatmap** (`/analytics` → Sentiment tab)
  - Real-time sentiment scores per card
  - Twitter, Reddit, News sentiment breakdown
  - 24h mention counts
  - Hot/Warm/Cold buzz indicators
  - Trending topics

- [x] **Grade Probability Calculator** (`/analytics/grading`)
  - PSA 10/9/8/7/6 probability breakdown
  - Expected value per grade
  - ROI calculations including grading costs
  - Grade/Hold recommendation

- [x] **Portfolio Stress Test** (`/analytics/stress-test`)
  - 5 scenarios: Market Crash, Economic Recession, Category Decline, Grading Scandal, Market Boom
  - Severity slider (5-50%)
  - Impact by holding breakdown
  - Risk assessment (max drawdown, concentration, diversification)
  - AI recommendations

- [x] **Arbitrage Finder** (`/analytics` → Arbitrage tab)
  - Undervalued/overvalued opportunities
  - Fair value calculations
  - Comparable cards analysis
  - Market efficiency score

- [x] **Smart Alerts** (`/analytics` → Alerts tab)
  - Price drop/surge with context
  - Volatility warnings
  - Market insights
  - Recommended actions

### Frontend Pages
- [x] Landing page with hero, features, CTAs
- [x] Auth pages (Login/Register)
- [x] Dashboard with portfolio stats, charts, AI signals
- [x] Marketplace with search, filters, grid/list views
- [x] Card detail with price history, AI prediction
- [x] Portfolio page with holdings table, transactions
- [x] AI Insights page with buy/sell signals
- [x] **Analytics Hub** with tabs for all advanced features
- [x] **What-If Simulator** page
- [x] **Grade Calculator** page
- [x] **Stress Test** page
- [x] Profile settings page

### API Endpoints
#### Core
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/cards` - List cards with filters
- `GET /api/cards/trending` - Top trending cards
- `GET /api/cards/{id}` - Card details
- `GET /api/cards/{id}/price-history` - 90-day price history
- `GET /api/marketplace/listings` - Marketplace listings
- `POST /api/marketplace/list` - Create listing
- `POST /api/marketplace/buy` - Buy from listing
- `GET /api/portfolio` - User portfolio
- `GET /api/portfolio/summary` - Portfolio summary with risk metrics
- `POST /api/portfolio/add` - Add card to portfolio
- `DELETE /api/portfolio/{id}` - Remove from portfolio
- `GET /api/transactions` - Transaction history
- `GET /api/predictions` - AI predictions
- `GET /api/predictions/{id}` - Card prediction
- `POST /api/predictions/analyze` - GPT-5.2 AI analysis

#### Advanced Analytics (NEW)
- `POST /api/analytics/what-if` - Run scenario simulation
- `GET /api/analytics/sentiment/{card_id}` - Card sentiment with 24h history
- `GET /api/analytics/sentiment-heatmap` - Market-wide sentiment
- `POST /api/analytics/grade-probability` - Grade probability calculator
- `POST /api/analytics/stress-test` - Portfolio stress test
- `GET /api/analytics/arbitrage` - Arbitrage opportunities
- `GET /api/analytics/smart-alerts` - Smart alerts with context
- `GET /api/analytics/portfolio-metrics` - Advanced portfolio analytics

## Data Sources (MOCKED)
- eBay API → mock card prices and sales history
- Sports Stats API → mock player performance metrics
- Twitter/Reddit → mock sentiment analysis data

## Next Steps (P1)
- [ ] Real eBay API integration
- [ ] Real-time price updates via WebSocket
- [ ] Real social media sentiment API
- [ ] Email notifications for alerts

## Notes
- All external APIs are MOCKED with realistic sample data
- GPT-5.2 integration active for AI analysis feature
- Dark fintech theme with cyan accent for AI features
