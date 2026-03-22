import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cardwise_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Cards
export const getCards = (params) => api.get('/cards', { params });
export const getTrendingCards = () => api.get('/cards/trending');
export const getCard = (cardId) => api.get(`/cards/${cardId}`);
export const getCardPriceHistory = (cardId) => api.get(`/cards/${cardId}/price-history`);

// Marketplace
export const getMarketplaceListings = (params) => api.get('/marketplace/listings', { params });
export const createListing = (data) => api.post('/marketplace/list', data);
export const buyFromMarketplace = (data) => api.post('/marketplace/buy', data);
export const getMarketValuations = (params) => api.get('/marketplace/valuations', { params });
export const getCardValuation = (cardId) => api.get(`/marketplace/valuation/${cardId}`);

// Portfolio
export const getPortfolio = () => api.get('/portfolio');
export const getPortfolioSummary = () => api.get('/portfolio/summary');
export const addToPortfolio = (data) => api.post('/portfolio/add', data);
export const removeFromPortfolio = (holdingId) => api.delete(`/portfolio/${holdingId}`);
export const getTransactions = () => api.get('/transactions');

// Predictions
export const getPredictions = () => api.get('/predictions');
export const getCardPrediction = (cardId) => api.get(`/predictions/${cardId}`);
export const analyzeCardWithAI = (cardId) => api.post('/predictions/analyze', { card_id: cardId });

// Stats
export const getMarketOverview = () => api.get('/stats/market-overview');

// ============ ADVANCED ANALYTICS ============

// What-If Simulator
export const runWhatIfScenario = (data) => api.post('/analytics/what-if', data);

// Sentiment Analysis
export const getCardSentiment = (cardId) => api.get(`/analytics/sentiment/${cardId}`);
export const getSentimentHeatmap = () => api.get('/analytics/sentiment-heatmap');

// Grade Probability Calculator
export const calculateGradeProbability = (cardId, currentGrade) => 
  api.post(`/analytics/grade-probability?card_id=${cardId}&current_raw_grade=${currentGrade || 'raw'}`);

// Portfolio Stress Test
export const runStressTest = (data) => api.post('/analytics/stress-test', data);

// Arbitrage Finder
export const findArbitrageOpportunities = () => api.get('/analytics/arbitrage');

// Smart Alerts
export const getSmartAlerts = () => api.get('/analytics/smart-alerts');

// Advanced Portfolio Metrics
export const getAdvancedPortfolioMetrics = () => api.get('/analytics/portfolio-metrics');

// ============ WATCHLIST ============
export const getWatchlist = () => api.get('/watchlist');
export const addToWatchlist = (data) => api.post('/watchlist', data);
export const updateWatchlistItem = (itemId, data) => api.put(`/watchlist/${itemId}`, data);
export const removeFromWatchlist = (itemId) => api.delete(`/watchlist/${itemId}`);
export const getWatchlistAlerts = () => api.get('/watchlist/alerts');

// ============ PLAYER PERFORMANCE ============
export const getPlayerPerformance = (cardId) => api.get(`/players/${cardId}/performance`);
export const getAllPlayerPerformance = () => api.get('/players/performance/all');

export default api;
