import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../../src/services/api/apiClient';
import { tokenStore } from '../../src/services/api/tokenStore';
import { SupportPortalPage } from '../../src/features/support/pages/SupportPortalPage';
import '../../src/index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
function Integration() {
  const [signedIn, setSignedIn] = useState(Boolean(tokenStore.getAccessToken()));
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState('');
  if (!__UC66_LOCAL_SERVE__ || import.meta.env.VITE_SUPPORT_VIEW_HTTP !== 'owned-local-only')
    return <p>Isolated development integration configuration required.</p>;
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-5">
      <p className="font-semibold text-amber-900">
        UC66-05A · Owned disposable environment · Production Support remains unavailable
      </p>
      {signedIn ? (
        <SupportPortalPage />
      ) : (
        <form
          className="space-y-3 max-w-sm"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            try {
              const tokens = await apiClient.post<{ accessToken: string; refreshToken: string }>(
                '/auth/login',
                { email, password },
              );
              tokenStore.setTokens(tokens);
              queryClient.clear();
              setSignedIn(true);
            } catch {
              setError('Sign-in failed.');
            }
          }}
        >
          <h1 className="text-xl font-bold">Test staff sign-in</h1>
          <label className="block">
            Email
            <input
              className="block border p-2 w-full"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block">
            Password
            <input
              className="block border p-2 w-full"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className="border p-2" type="submit">
            Sign in to isolated Backend
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </main>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Integration />
    </QueryClientProvider>
  </StrictMode>,
);
