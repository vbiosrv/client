import axios from 'axios';
import { getCookie, setCookie, removeCookie, extendCookie, getPartnerCookie, removePartnerCookie } from './cookie';

// API client for SHM backend
export const api = axios.create({
  baseURL: '/shm/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getCookie();
    if (token) {
      config.headers['session-id'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Extend cookie on each successful response
    extendCookie();
    return response;
  },
  (error) => {
    const isAuthRequest = error.config?.url?.includes('/auth');
    if (error.response?.status === 401 && !isAuthRequest) {
      removeCookie();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: async (username: string, password: string) => {
    const response = await api.post('/user/auth', { login: username, password });
    const sessionId = response.data?.session_id || response.data?.id;
    if (sessionId) {
      setCookie(sessionId);
    }
    return api.get('/user');
  },

  logout: () => {
    removeCookie();
    window.location.href = '/login';
  },

  telegramWidgetAuth: async (userData: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
  }) => {
    const partnerId = getPartnerCookie();
    const response = await api.post('/telegram/web/auth', {
      ...userData,
      register_if_not_exists: 1,
      ...(partnerId && { partner_id: partnerId }),
    });
    const sessionId = response.data?.session_id || response.data?.id;
    if (sessionId) {
      setCookie(sessionId);
      // Remove partner cookie after successful auth/registration
      if (partnerId) {
        removePartnerCookie();
      }
    }
    return response;
  },

  register: async (username: string, password: string) => {
    const partnerId = getPartnerCookie();
    const data: Record<string, string> = { login: username, password };
    if (partnerId) {
      data.partner_id = partnerId;
    }
    const response = await api.put('/user', data);
    // Remove partner cookie after successful registration
    if (partnerId) {
      removePartnerCookie();
    }
    return response;
  },

  getCurrentUser: () => api.get('/user'),
};

// User API
export const userApi = {
  getProfile: () => api.get('/user'),
  updateProfile: (data: Record<string, unknown>) => api.post('/user', data),
  changePassword: (password: string) => api.post('/user/passwd', { password }),
  getServices: () => api.get('/user/service'),
  stopService: (userServiceId: number) => api.post('/user/service/stop', { user_service_id: userServiceId }),
  getPayments: () => api.get('/user/pay'),
  getPaySystems: () => api.get('/user/pay/paysystems'),
  getForecast: () => api.get('/user/pay/forecast'),
  deleteAutopayment: (paySystem: string) => api.delete('/user/autopayment', { params: { pay_system: paySystem } }),
};

export const storageApi = {
  get: (name: string) => api.get(`/storage/manage/${name}`),
  list: () => api.get('/storage/manage'),
};

// Services API
export const servicesApi = {
  list: () => api.get('/service'),
  order_list: () => api.get('/service/order'),
  order: (serviceId: number) => api.put('/service/order', { service_id: serviceId }),
  getOrderList: () => api.get('/service/order'),
};

// Telegram API
export const telegramApi = {
  getSettings: () => api.get('/telegram/user'),
  updateSettings: (data: Record<string, unknown>) => api.post('/telegram/user', data),
};

// Promo API
export const promoApi = {
  apply: (code: string) => api.get(`/promo/apply/${code}`),
  list: () => api.get('/promo'),
};