import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { tokenStore } from './tokenStore';

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
      const token = tokenStore.getAccessToken();
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

        if (status === 401 && !originalRequest?._retry && !originalRequest?.url?.includes('/auth/refresh')) {
          if (originalRequest) {
            originalRequest._retry = true;
          }
          const refreshToken = tokenStore.getRefreshToken();
          if (refreshToken) {
            try {
              const refreshRes = await axios.post(`${getApiBaseUrl()}/auth/refresh`, { refreshToken });
              const { accessToken, refreshToken: newRefreshToken } = refreshRes.data;
              tokenStore.setAccessToken(accessToken);
              tokenStore.setRefreshToken(newRefreshToken);
              if (originalRequest?.headers) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              }
              return this.instance(originalRequest);
            } catch {
              tokenStore.clear();
            }
          }
          if (this.onAuthFailure) {
            this.onAuthFailure();
          }
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
