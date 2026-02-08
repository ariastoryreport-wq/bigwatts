import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token
api.interceptors.request.use(
  (config) => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    if (tokens.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');

      if (tokens.refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/api/token/refresh/`, {
            refresh: tokens.refresh,
          });
          const newTokens = { ...tokens, access: data.access };
          localStorage.setItem('tokens', JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('tokens');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ---- Auth API ----
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  logout: (data) => api.post('/auth/logout/', data),
  getMe: () => api.get('/auth/me/'),
  updateMe: (data) => api.patch('/auth/me/', data),
  changePassword: (data) => api.put('/auth/change-password/', data),
  updatePrestataireProfile: (data) => api.patch('/auth/prestataire-profile/', data),
  updateProprietaireProfile: (data) => api.patch('/auth/proprietaire-profile/', data),
  getDashboard: () => api.get('/auth/dashboard/'),
  getProviders: (params) => api.get('/auth/providers/', { params }),
  getUser: (id) => api.get(`/auth/users/${id}/`),
  // CS
  csGetUsers: (params) => api.get('/auth/cs/users/', { params }),
  csGetUser: (id) => api.get(`/auth/cs/users/${id}/`),
  csUpdateUser: (id, data) => api.patch(`/auth/cs/users/${id}/`, data),
};

// ---- Ads API ----
export const adsAPI = {
  getCategories: () => api.get('/ads/categories/'),
  getAds: (params) => api.get('/ads/', { params }),
  getAd: (id) => api.get(`/ads/${id}/`),
  getMyAds: () => api.get('/ads/my/'),
  createAd: (data) => api.post('/ads/create/', data),
  updateAd: (id, data) => api.patch(`/ads/${id}/update/`, data),
  deleteAd: (id) => api.delete(`/ads/${id}/delete/`),
  // Quotes
  createQuote: (data) => api.post('/ads/quotes/', data),
  getMyQuotes: () => api.get('/ads/quotes/my/'),
  getReceivedQuotes: (params) => api.get('/ads/quotes/received/', { params }),
  getQuote: (id) => api.get(`/ads/quotes/${id}/`),
  respondQuote: (id, data) => api.patch(`/ads/quotes/${id}/respond/`, data),
  // CS
  csGetAds: (params) => api.get('/ads/cs/all/', { params }),
};

// ---- Messaging API ----
export const messagingAPI = {
  getConversations: () => api.get('/messaging/conversations/'),
  getConversation: (id) => api.get(`/messaging/conversations/${id}/`),
  getMessages: (convId) => api.get(`/messaging/conversations/${convId}/messages/`),
  sendMessage: (data) => api.post('/messaging/send/', data),
  sendInConversation: (convId, data) => api.post(`/messaging/conversations/${convId}/messages/`, data),
  // CS
  csGetConversations: () => api.get('/messaging/cs/all/'),
};

// ---- Reviews API ----
export const reviewsAPI = {
  getReviews: (params) => api.get('/reviews/', { params }),
  createReview: (data) => api.post('/reviews/create/', data),
  respondReview: (id, data) => api.patch(`/reviews/${id}/respond/`, data),
  getReceivedReviews: () => api.get('/reviews/received/'),
  getWrittenReviews: () => api.get('/reviews/written/'),
};

// ---- Favorites API ----
export const favoritesAPI = {
  getFavorites: () => api.get('/favorites/'),
  toggleFavorite: (data) => api.post('/favorites/toggle/', data),
  checkFavorite: (params) => api.get('/favorites/check/', { params }),
  removeFavorite: (id) => api.delete(`/favorites/${id}/`),
};

// ---- Notifications API ----
export const notificationsAPI = {
  getNotifications: () => api.get('/notifications/'),
  getUnreadCount: () => api.get('/notifications/unread-count/'),
  markRead: (ids) => api.post('/notifications/mark-read/', { ids }),
  markSingleRead: (id) => api.post(`/notifications/${id}/read/`),
};

// ---- Tickets API ----
export const ticketsAPI = {
  createTicket: (data) => api.post('/tickets/', data),
  getMyTickets: () => api.get('/tickets/my/'),
  getTicket: (id) => api.get(`/tickets/${id}/`),
  respondTicket: (id, data) => api.post(`/tickets/${id}/respond/`, data),
  // CS
  csGetTickets: (params) => api.get('/tickets/cs/all/', { params }),
  csUpdateTicket: (id, data) => api.patch(`/tickets/cs/${id}/update/`, data),
};
