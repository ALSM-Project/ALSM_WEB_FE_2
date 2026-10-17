import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { tokenStore, type AuthTokens } from './tokenStore';

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`;
};

export interface ApiErrorResponse {
  code?: string;
  message: string;
}

class ApiClient {
  private instance: AxiosInstance;
  private onAuthFailure?: () => void;
  private onAccessDenied?: (message: string) => void;

  constructor() {
    this.instance = axios.create({
      baseURL: getApiBaseUrl(),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.instance.interceptors.request.use((config) => {
      (config as any)._authEpoch = tokenStore.epoch();
      const token = tokenStore.getAccessToken();
      (config as any)._accessToken = token;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.instance.interceptors.response.use(
      (response) => response.data,
      async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;
        const message = error.response?.data?.message || 'An unexpected error occurred';

        if (status === 401 && !originalRequest?._retry && !originalRequest?.url?.includes('/auth/refresh') && !tokenStore.requiresPasswordChange()) {
          if (originalRequest) {
            originalRequest._retry = true;
          }
          if (originalRequest?._authEpoch !== tokenStore.epoch()) return Promise.reject(error);
          try {
            const current = tokenStore.getAccessToken();
            const tokens = current && current !== originalRequest?._accessToken
              ? { accessToken: current } : await this.refreshSession();
            if (originalRequest?._authEpoch !== tokenStore.epoch()) return Promise.reject(error);
            if (tokens?.accessToken && originalRequest?.headers) {
              if (tokenStore.requiresPasswordChange()) { this.routePasswordChange(); return new Promise(() => {}); }
              originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
              return this.instance(originalRequest);
            }
          } catch (refreshError) {
            if (!tokenStore.getRefreshToken() && !tokenStore.isLogoutPending()) this.onAuthFailure?.();
            return Promise.reject(refreshError);
          }
          if (!tokenStore.isLogoutPending()) this.onAuthFailure?.();
        } else if (status === 403) {
          // Authenticated but forbidden -> DO NOT logout
          if (this.onAccessDenied) {
            this.onAccessDenied(message);
          } else {
            console.warn(`[403 Forbidden]: ${message}`);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  public refreshSession(): Promise<AuthTokens | null> {
    return tokenStore.refresh(async (refreshToken) => {
      const response = await axios.post<AuthTokens>(`${getApiBaseUrl()}/auth/refresh`, { refreshToken }, { timeout: 30000 });
      return response.data;
    });
  }

  public routePasswordChange(): void {
    const portal = import.meta.env.VITE_USER_PORTAL_URL || 'http://localhost:5173';
    const hasPassword = tokenStore.hasPassword();
    void tokenStore.handoff(({ accessToken, refreshToken }) => {
      window.location.href = `${portal}/auth/password-callback#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&has_password=${hasPassword}`;
    });
  }

  public async logout(): Promise<void> {
    return tokenStore.logout(async (refreshToken) => {
      await axios.post(`${getApiBaseUrl()}/auth/logout`, { refreshToken }, { timeout: 30000 });
    });
  }

  public setAuthFailureHandler(handler: () => void) {
    this.onAuthFailure = handler;
  }

  public setAccessDeniedHandler(handler: (message: string) => void) {
    this.onAccessDenied = handler;
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.instance.get(url, config);
    return res as unknown as T;
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.instance.post(url, data, config);
    return res as unknown as T;
  }

  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.instance.patch(url, data, config);
    return res as unknown as T;
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.instance.put(url, data, config);
    return res as unknown as T;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.instance.delete(url, config);
    return res as unknown as T;
  }
}

export const apiClient = new ApiClient();
