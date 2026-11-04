import { createHttpSupportAdapter, unavailableSupportAdapter } from './support.api';
import { createMockSupportAdapter } from './support.mock';

export const createSupportAdapter = () => {
  if (!__UC66_LOCAL_SERVE__ || import.meta.env.MODE !== 'development' || !import.meta.env.DEV)
    return unavailableSupportAdapter;
  // This constant is false for EVERY build, including builds with development flags.
  if (__UC66_LOCAL_SERVE__ && import.meta.env.VITE_SUPPORT_VIEW_HTTP === 'owned-local-only') {
    let url: URL;
    try {
      url = new URL(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1');
    } catch {
      return unavailableSupportAdapter;
    }
    if (
      import.meta.env.VITE_SUPPORT_VIEW_MOCK === 'true' ||
      url.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.username ||
      url.password
    )
      return unavailableSupportAdapter;
    return createHttpSupportAdapter();
  }
  return import.meta.env.VITE_SUPPORT_VIEW_MOCK === 'true'
    ? createMockSupportAdapter()
    : unavailableSupportAdapter;
};
