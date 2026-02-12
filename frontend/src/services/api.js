import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout (Render cold start can take a while)
});

// Retry logic for failed requests (handles Render.com cold starts)
api.interceptors.response.use(null, async (error) => {
  const config = error.config;
  if (!config || config._retryCount >= 2) return Promise.reject(error);

  const isNetworkOrServerError =
    !error.response || error.response.status >= 500;

  if (isNetworkOrServerError && config.method === 'get') {
    config._retryCount = (config._retryCount || 0) + 1;
    const delay = config._retryCount * 2000; // 2s, then 4s
    await new Promise((r) => setTimeout(r, delay));
    return api(config);
  }
  return Promise.reject(error);
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

    // Skip redirect for auth-check requests (handled by AuthContext)
    const isAuthCheck = originalRequest?.url?.includes('/auth/me');

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
          if (!isAuthCheck) {
            window.location.href = '/login';
          }
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
  googleAuth: (data) => api.post('/auth/google/', data),
  logout: (data) => api.post('/auth/logout/', data),
  getMe: () => api.get('/auth/me/'),
  updateMe: (data) => api.patch('/auth/me/', data),
  changePassword: (data) => api.put('/auth/change-password/', data),
  deleteAccount: (data) => api.post('/auth/delete-account/', data),
  updatePrestataireProfile: (data) => api.patch('/auth/prestataire-profile/', data),
  updateProprietaireProfile: (data) => api.patch('/auth/proprietaire-profile/', data),
  getDashboard: () => api.get('/auth/dashboard/'),
  getAnalytics: () => api.get('/auth/analytics/'),
  getProviders: (params) => api.get('/auth/providers/', { params }),
  getUser: (id) => api.get(`/auth/users/${id}/`),
  getUserBadges: (id) => api.get(`/auth/users/${id}/badges/`),
  getBadges: () => api.get('/auth/badges/'),
  // Appointments
  getAppointments: (params) => api.get('/auth/appointments/', { params }),
  createAppointment: (data) => api.post('/auth/appointments/create/', data),
  updateAppointment: (id, data) => api.patch(`/auth/appointments/${id}/`, data),
  // Documents
  getDocuments: () => api.get('/auth/documents/'),
  createDocument: (data) => api.post('/auth/documents/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  deleteDocument: (id) => api.delete(`/auth/documents/${id}/`),
  // CS
  csGetUsers: (params) => api.get('/auth/cs/users/', { params }),
  csGetUser: (id) => api.get(`/auth/cs/users/${id}/`),
  csUpdateUser: (id, data) => api.patch(`/auth/cs/users/${id}/`, data),
  csDeleteUser: (id) => api.delete(`/auth/cs/users/${id}/`),
  csAssignBadge: (data) => api.post('/auth/cs/badges/assign/', data),
  // Saved aides (proprietaire)
  saveAidesResults: (data) => api.post('/auth/me/saved-aides/', data),
  clearAidesResults: () => api.delete('/auth/me/saved-aides/'),
  // Certifications
  getCertifications: () => api.get('/auth/certifications/'),
  createCertification: (data) => api.post('/auth/certifications/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  deleteCertification: (id) => api.delete(`/auth/certifications/${id}/`),
  getCertificationLogs: (id) => api.get(`/auth/certifications/${id}/logs/`),
  // CS Certifications
  csGetPendingCertifications: () => api.get('/auth/cs/certifications/pending/'),
  csGetAllCertifications: (params) => api.get('/auth/cs/certifications/', { params }),
  csReviewCertification: (id, data) => api.post(`/auth/cs/certifications/${id}/review/`, data),
};

// ---- Ads API ----
export const adsAPI = {
  getCategories: () => api.get('/ads/categories/'),
  getAds: (params) => api.get('/ads/', { params }),
  getAd: (id) => api.get(`/ads/${id}/`),
  getMyAds: () => api.get('/ads/my/'),
  createAd: (data) => {
    if (data instanceof FormData) return api.post('/ads/create/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return api.post('/ads/create/', data);
  },
  updateAd: (id, data) => {
    if (data instanceof FormData) return api.patch(`/ads/${id}/update/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return api.patch(`/ads/${id}/update/`, data);
  },
  deleteAd: (id) => api.delete(`/ads/${id}/delete/`),
  // Quotes
  createQuote: (data) => api.post('/ads/quotes/', data),
  getMyQuotes: () => api.get('/ads/quotes/my/'),
  getReceivedQuotes: (params) => api.get('/ads/quotes/received/', { params }),
  getQuote: (id) => api.get(`/ads/quotes/${id}/`),
  respondQuote: (id, data) => api.patch(`/ads/quotes/${id}/respond/`, data),
  decideQuote: (id, decision) => api.patch(`/ads/quotes/${id}/decide/`, { decision }),
  abandonQuote: (id) => api.post(`/ads/quotes/${id}/abandon/`),
  checkDuplicateQuote: (adId) => api.get('/ads/quotes/check-duplicate/', { params: { ad: adId } }),
  // CS
  csGetAds: (params) => api.get('/ads/cs/all/', { params }),
};

// ---- Messaging API ----
export const messagingAPI = {
  getConversations: () => api.get('/messaging/conversations/'),
  getConversation: (id) => api.get(`/messaging/conversations/${id}/`),
  getMessages: (convId) => api.get(`/messaging/conversations/${convId}/messages/`),
  pollMessages: (convId, afterId) => api.get(`/messaging/conversations/${convId}/poll/`, { params: { after: afterId || 0 } }),
  sendMessage: (data) => api.post('/messaging/send/', data),
  sendInConversation: (convId, data) => api.post(`/messaging/conversations/${convId}/messages/`, data),
  getUnreadTotal: () => api.get('/messaging/unread-total/'),
  // Online / Heartbeat
  heartbeat: () => api.post('/messaging/heartbeat/'),
  getOnlineStatus: (userId) => api.get(`/messaging/online/${userId}/`),
  // Block / Report
  blockUser: (userId) => api.post('/messaging/block/', { user_id: userId }),
  unblockUser: (userId) => api.post('/messaging/unblock/', { user_id: userId }),
  getBlockedUsers: () => api.get('/messaging/blocked/'),
  reportUser: (data) => api.post('/messaging/report/', data),
  // User search
  searchUsers: (q) => api.get('/messaging/users/search/', { params: { q } }),
  // CS
  csGetConversations: () => api.get('/messaging/cs/all/'),
  csGetReports: (params) => api.get('/messaging/cs/reports/', { params }),
  csReportAction: (id, data) => api.post(`/messaging/cs/reports/${id}/action/`, data),
  csGetReportStats: () => api.get('/messaging/cs/reports/stats/'),
  csGetModLog: () => api.get('/messaging/cs/modlog/'),
};

// ---- Reviews API ----
export const reviewsAPI = {
  getReviews: (params) => api.get('/reviews/', { params }),
  createReview: (data) => api.post('/reviews/create/', data),
  respondReview: (id, data) => api.patch(`/reviews/${id}/respond/`, data),
  getReceivedReviews: () => api.get('/reviews/received/'),
  getWrittenReviews: () => api.get('/reviews/written/'),
  canReview: (params) => api.get('/reviews/can-review/', { params }),
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
  getPreferences: () => api.get('/notifications/preferences/'),
  updatePreferences: (data) => api.patch('/notifications/preferences/', data),
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

// ---- Bookings API ----
export const bookingsAPI = {
  // Availability slots
  getSlots: (params) => api.get('/bookings/slots/', { params }),
  createSlot: (data) => api.post('/bookings/slots/', data),
  deleteSlot: (id) => api.delete(`/bookings/slots/${id}/`),
  // Bookings
  getBookings: (params) => api.get('/bookings/', { params }),
  createBooking: (data) => api.post('/bookings/create/', data),
  updateBooking: (id, data) => api.patch(`/bookings/${id}/`, data),
  // Payments
  payDeposit: (bookingId) => api.post(`/bookings/${bookingId}/pay-deposit/`),
};

// ---- Incentives API ----
export const incentivesAPI = {
  getIncentives: (params) => api.get('/incentives/', { params }),
  checkEligibility: (data) => api.post('/incentives/check/', data),
};

// ---- Countries API ----
export const countriesAPI = {
  getCountries: () => api.get('/countries/'),
  getCountry: (code) => api.get(`/countries/${code}/`),
  detect: () => api.get('/countries/detect/'),
};
