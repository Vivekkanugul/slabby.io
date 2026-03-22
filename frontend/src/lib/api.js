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

export default api;
