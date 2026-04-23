import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api-base';

const normalizedApiBaseUrl = getApiBaseUrl();
const TOKENS_STORAGE_KEY = 'sm_tokens';
const TOKEN_EXPIRY_KEY = 'sm_token_expiry';
const USER_STORAGE_KEY = 'sm_user';

const api = axios.create({
  baseURL: normalizedApiBaseUrl,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const normalizeRequestParams = (params: unknown) => {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return params;
  }

  const entries = Object.entries(params as Record<string, unknown>);
  return entries.reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (key === 'sortBy') {
      acc.sort_by = value;
      return acc;
    }

    if (key === 'sortOrder') {
      acc.sort_order = value;
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
};

const isTokenExpired = (): boolean => {
  if (typeof window === 'undefined') return false;
  const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiryStr) return false;
  const expiry = parseInt(expiryStr, 10);
  return Date.now() > expiry;
};

const readTokens = () => {
  if (typeof window === 'undefined') return null;

  const tokensStr = localStorage.getItem(TOKENS_STORAGE_KEY);
  if (!tokensStr) return null;

  try {
    return JSON.parse(tokensStr);
  } catch {
    return null;
  }
};

const writeTokens = (tokens: { access_token: string; refresh_token: string }, expiresInSeconds?: number) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  const expiryTime = Date.now() + ((expiresInSeconds || 3600) * 1000);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
};

const clearAuthAndRedirect = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKENS_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  const currentTokens = readTokens();
  if (!currentTokens?.refresh_token) return null;

  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${normalizedApiBaseUrl}/auth/refresh`,
        null,
        {
          params: { refresh_token: currentTokens.refresh_token },
          headers: { 'Content-Type': 'application/json' },
        }
      )
      .then((response) => {
        const accessToken = response.data?.access_token;
        if (!accessToken) return null;

        writeTokens(
          {
            access_token: accessToken,
            refresh_token: response.data?.refresh_token || currentTokens.refresh_token,
          },
          response.data?.expires_in || 3600
        );

        return accessToken as string;
      })
      .catch(() => {
        clearAuthAndRedirect();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.request.use(
  async (config) => {
    if (typeof window !== 'undefined') {
      if (isTokenExpired()) {
        const refreshedToken = await refreshAccessToken();
        if (!refreshedToken) {
          return Promise.reject({ message: 'Token expired' });
        }
      }

      const tokens = readTokens();
      if (tokens?.access_token) {
        config.headers.Authorization = `Bearer ${tokens.access_token}`;
      }
    }

    if (config.params) {
      config.params = normalizeRequestParams(config.params);
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error) || error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
      return Promise.reject({ message: 'Request cancelled', status: undefined, cancelled: true });
    }

    const flattenValidationErrors = (value: unknown): string[] => {
      if (!value) return [];

      if (typeof value === 'string') {
        return value.trim() ? [value] : [];
      }

      if (Array.isArray(value)) {
        return value.flatMap((entry) => flattenValidationErrors(entry));
      }

      if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).flatMap((entry) =>
          flattenValidationErrors(entry)
        );
      }

      return [];
    };

    let message = 'Something went wrong';
    
    const responseData = error.response?.data;
    if (responseData) {
      if (typeof responseData.message === 'string') {
        message = responseData.message;
      } else if (responseData.errors) {
        const validationMessages = flattenValidationErrors(responseData.errors);
        if (validationMessages.length) {
          message = validationMessages.join(', ');
        }
      } else if (typeof responseData.detail === 'string') {
        message = responseData.detail;
      } else if (Array.isArray(responseData.detail)) {
        // FastAPI validation errors
        message = responseData.detail.map((d: any) => 
          typeof d === 'string' ? d : (d.msg || d.message || JSON.stringify(d))
        ).join(', ');
      } else if (typeof responseData.detail === 'object') {
        const detail = responseData.detail as Record<string, unknown>;
        if (typeof detail.message === 'string') {
          message = detail.message;
        } else if (typeof detail.reason === 'string' && typeof detail.error === 'string') {
          message = `${detail.error}: ${detail.reason}`;
        } else if (typeof detail.error === 'string') {
          message = detail.error;
        } else if (typeof detail.reason === 'string') {
          message = detail.reason;
        } else {
          message = JSON.stringify(detail);
        }
      } else if (typeof responseData === 'string') {
        message = responseData;
      }
    } else if (error.request) {
      message = 'Unable to reach the server. Please check the API connection and try again.';
    } else if (error.message) {
      message = error.message;
    }
    
    if (error.response?.status === 401 && !String(error.config?.url || '').includes('/auth/refresh')) {
      clearAuthAndRedirect();
    }
    
    return Promise.reject({ message, status: error.response?.status, cancelled: false });
  }
);

export default api;
