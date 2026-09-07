import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { tokenStore } from './tokenStore';

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;
  if (import.meta.env.DEV) return 'http://localhost:3000/api/v1';
  throw new Error('VITE_API_BASE_URL environment variable is not configured!');
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
        const status = error.response?.status;
        const message = error.response?.data?.message || 'An unexpected error occurred';

        if (status === 401 && this.onAuthFailure) {
          // Token expired or invalid session -> trigger auth failure flow (logout/redirect)
          this.onAuthFailure();
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
    return this.instance.get(url, config);
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post(url, data, config);
  }

  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.patch(url, data, config);
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.put(url, data, config);
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete(url, config);
  }
}

export const apiClient = new ApiClient();
