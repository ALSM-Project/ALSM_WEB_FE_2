import { unavailableSupportAdapter } from './support.api';
import { createMockSupportAdapter } from './support.mock';

// There is no HTTP activation switch. Production builds always remain unavailable.
export const createSupportAdapter = () =>
  import.meta.env.MODE === 'development' &&
  import.meta.env.DEV &&
  import.meta.env.VITE_SUPPORT_VIEW_MOCK === 'true'
    ? createMockSupportAdapter()
    : unavailableSupportAdapter;
