let inMemoryAccessToken: string | null = null;
const REFRESH_TOKEN_KEY = 'alsm_staff_refresh_token';

export const tokenStore = {
  getAccessToken: (): string | null => inMemoryAccessToken,
  setAccessToken: (token: string | null) => {
    inMemoryAccessToken = token;
  },
  getRefreshToken: (): string | null => {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setRefreshToken: (token: string | null) => {
    try {
      if (token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    } catch {
      // ignore
    }
  },
  clear: () => {
    inMemoryAccessToken = null;
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};
