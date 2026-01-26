import axios from 'axios';

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
    const token = localStorage.getItem('shm_token');
    if (token) {
      config.headers.Authorization = `Basic ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('shm_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: async (username: string, password: string) => {
    const credentials = btoa(`${username}:${password}`);
    localStorage.setItem('shm_token', credentials);
    return api.get('/user');
  },

  logout: () => {
    localStorage.removeItem('shm_token');
    window.location.href = '/login';
  },

  telegramAuth: async (initData: string, profile: string) => {
    const response = await api.post('/telegram/webapp/auth', {
      init_data: initData,
      profile: profile,
    });
    if (response.data?.session_id) {
      localStorage.setItem('shm_token', response.data.session_id);
    }
    return response;
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
    const response = await api.post('/telegram/web/auth', {
      ...userData,
      register_if_not_exists: 1,
    });
    if (response.data?.session_id) {
      localStorage.setItem('shm_token', response.data.session_id);
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
};

export const storageApi = {
  get: (name: string) => api.get(`/storage/manage/${name}`),
  download: (name: string) => api.get(`/storage/download/${name}`),
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