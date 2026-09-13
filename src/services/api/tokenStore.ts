const ACCESS_TOKEN_KEY = 'alsm_staff_access_token';
const REFRESH_TOKEN_KEY = 'alsm_staff_refresh_token';

export const tokenStore = {
  getAccessToken: (): string | null => {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setAccessToken: (token: string | null) => {
    try {
      if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    } catch {
      // ignore
    }
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
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};
