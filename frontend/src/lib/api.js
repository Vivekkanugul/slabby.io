import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('slabby_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============ AUTH ============
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);

// ============ CARDS ============
export const getCards = (params) => api.get('/cards', { params });
export const getMyCards = (status) => api.get('/cards/my-cards', { params: status ? { status } : {} });
export const getTrendingCards = (category, limit) => api.get('/cards/trending', { params: { category, limit } });
export const getCard = (cardId) => api.get(`/cards/${cardId}`);
export const createCard = (data) => api.post('/cards', data);
export const updateCard = (cardId, data) => api.put(`/cards/${cardId}`, data);
export const publishCard = (cardId) => api.post(`/cards/${cardId}/publish`);
export const unlistCard = (cardId) => api.post(`/cards/${cardId}/unlist`);

// ============ TRADES ============
export const createTrade = (data) => api.post('/trades', data);
export const getMyTrades = (status, role) => api.get('/trades', { params: { status, role } });
export const getTrade = (tradeId) => api.get(`/trades/${tradeId}`);
export const counterTrade = (tradeId, data) => api.post(`/trades/${tradeId}/counter`, data);
export const acceptTrade = (tradeId) => api.post(`/trades/${tradeId}/accept`);
export const rejectTrade = (tradeId) => api.post(`/trades/${tradeId}/reject`);
export const cancelTrade = (tradeId) => api.post(`/trades/${tradeId}/cancel`);
export const getActiveTradeCount = () => api.get('/trades/stats/active-count');

// ============ RAZZ ============
export const createRazz = (data) => api.post('/razz', data);
export const getActiveRazzes = (category, limit) => api.get('/razz', { params: { category, limit } });
export const getMyRazzes = (asHost = true) => api.get('/razz/my-razzes', { params: { as_host: asHost } });
export const getRazz = (razzId) => api.get(`/razz/${razzId}`);
export const publishRazz = (razzId) => api.post(`/razz/${razzId}/publish`);
export const purchaseRazzSpots = (razzId, spotNumbers) => api.post(`/razz/${razzId}/purchase`, { spot_numbers: spotNumbers });
export const drawRazzWinner = (razzId, clientSeed) => api.post(`/razz/${razzId}/draw`, null, { params: { client_seed: clientSeed } });
export const verifyRazzFairness = (razzId) => api.get(`/razz/${razzId}/verify`);
export const cancelRazz = (razzId) => api.post(`/razz/${razzId}/cancel`);
export const getActiveRazzCount = () => api.get('/razz/stats/active-count');

// ============ WALLET ============
export const getWallet = () => api.get('/wallet');
export const depositToWallet = (amount, paymentMethodId) => api.post('/wallet/deposit', { amount, payment_method_id: paymentMethodId });
export const withdrawFromWallet = (amount) => api.post('/wallet/withdraw', { amount });
export const getWalletTransactions = (limit) => api.get('/wallet/transactions', { params: { limit } });

// ============ ADMIN ============
export const getAdminStats = () => api.get('/admin/stats');
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const suspendUser = (userId, reason) => api.post(`/admin/users/${userId}/suspend`, { reason });
export const unsuspendUser = (userId) => api.post(`/admin/users/${userId}/unsuspend`);
export const getAdminEvents = (params) => api.get('/admin/events', { params });

// ============ PLATFORM ============
export const getHealth = () => api.get('/health');
export const getPlatformStats = () => api.get('/stats');

// ============ LEGACY COMPATIBILITY ============
// These map old API calls to new ones for backward compatibility during transition
export const getPortfolio = () => getMyCards();
export const getPortfolioSummary = async () => {
  const wallet = await getWallet();
  const cards = await getMyCards();
  return {
    data: {
      total_value: wallet.data.total_balance,
      total_cards: cards.data.length,
      holdings: cards.data
    }
  };
};
export const addToPortfolio = (data) => createCard(data);
export const removeFromPortfolio = (cardId) => unlistCard(cardId);
export const getTransactions = () => getWalletTransactions(50);
export const getMarketplaceListings = (params) => getCards(params);
export const createListing = (data) => createCard(data);
export const getMarketOverview = async () => {
  const stats = await getPlatformStats();
  return {
    data: {
      total_users: stats.data.total_users,
      total_cards: stats.data.cards_listed,
      active_trades: stats.data.active_trades,
      active_razzes: stats.data.active_razzes
    }
  };
};

export default api;
