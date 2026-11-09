import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { tokenStore } from '../../src/services/api/tokenStore';
import { apiClient } from '../../src/services/api/apiClient';
import { createHttpSupportAdapter } from '../../src/features/support/api/support.api';
import { SupportPortalPage } from '../../src/features/support/pages/SupportPortalPage';

const suite = process.env.ALSM_UC66_HTTP_TEST === 'owned-local-only' ? describe : describe.skip;
suite(
  'UC66-05A real Frontend adapter + UI + authenticated disposable Backend (jsdom, not native browser)',
  () => {
    const org = '333333333333333333333333';
    const mainCase = process.env.ALSM_UC66_HTTP_SCENARIO === 'lost-enter' ? it.skip : it;
    const lostEnterCase = process.env.ALSM_UC66_HTTP_SCENARIO === 'lost-enter' ? it : it.skip;
    const api = createHttpSupportAdapter();
    beforeAll(async () => {
      if (process.env.ALSM_UC66_HTTP_TEST !== 'owned-local-only') return;
      // Verify the test-owned server marker before sending even the synthetic login.
      const probe = await fetch('http://127.0.0.1:3016/api/v1/__uc66_test_identity');
      expect(probe.headers.get('x-uc66-owned-test')).toMatch(/^alsm_uc66_05a_[a-f0-9]{32}$/);
      expect(import.meta.env.VITE_API_BASE_URL).toBe('http://127.0.0.1:3016/api/v1');
    });
    afterEach(() => cleanup());
    async function signIn() {
      const tokens = await apiClient.post<{ accessToken: string; refreshToken: string }>(
        '/auth/login',
        { email: 'uc66-05a@example.invalid', password: 'Owned-UC66-05A-Only!' },
      );
      tokenStore.setTokens(tokens);
    }
    function mount() {
      const query = new QueryClient({
        defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
      });
      render(
        <StrictMode>
          <QueryClientProvider client={query}>
            <SupportPortalPage adapter={api} />
          </QueryClientProvider>
        </StrictMode>,
      );
    }
    async function search() {
      const input = await screen.findByLabelText('Organisation search');
      fireEvent.change(input, { target: { value: 'UC66 Customer' } });
      fireEvent.click(screen.getByRole('button', { name: 'Search Organisations' }));
      await screen.findByRole('button', { name: 'Enter Organisation UC66 Customer Example' });
    }
    async function enter() {
      await search();
      fireEvent.click(
        screen.getByRole('button', { name: 'Enter Organisation UC66 Customer Example' }),
      );
    }
    mainCase(
      'runs all resource UI flows, 25-Project pagination, Exit and reload recovery over real HTTP without mocked authority',
      async () => {
        await signIn();
        mount();
        await enter();
        await screen.findByText('Read-only Support View');
        fireEvent.click(screen.getByRole('button', { name: 'Load Projects' }));
        await screen.findByRole('button', { name: 'Inspect projects 200000000000000000000001' });
        fireEvent.click(screen.getByRole('button', { name: 'Open project Project 01' }));
        await screen.findByRole('region', { name: 'Diagnostic detail' });
        expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
        await within(screen.getByRole('tabpanel', { name: 'Projects' })).findByText('Project 11', {
          exact: true,
        });
        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
        await within(screen.getByRole('tabpanel', { name: 'Projects' })).findByText('Project 25', {
          exact: true,
        });
        expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'First page' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Open project Project 01' }));
        await screen.findByRole('region', { name: 'Diagnostic detail' });
        for (const [kind, label, id] of [
          ['screens', 'Screens', '300000000000000000000001'],
          ['programs', 'Programs', '300000000000000000000002'],
          ['findings', 'Findings', '600000000000000000000001'],
          ['conversion-logs', 'Conversion Logs', '400000000000000000000001'],
          ['error-logs', 'Error Logs', '700000000000000000000001'],
        ]) {
          fireEvent.click(screen.getByRole('tab', { name: label }));
          fireEvent.click(await screen.findByRole('button', { name: `Inspect ${kind} ${id}` }));
          await screen.findByRole('region', { name: 'Diagnostic detail' });
          fireEvent.click(screen.getByRole('button', { name: 'Close detail' }));
        }
        fireEvent.click(screen.getByRole('button', { name: 'Exit Organisation' }));
        await screen.findByText('Exit confirmed. Returned to the Support Portal.');
        await enter();
        await screen.findByText('Read-only Support View');
        cleanup();
        mount(); // Same real persisted original staff session; volatile workspace is gone.
        await search();
        fireEvent.click(
          screen.getByRole('button', { name: 'Recover Organisation UC66 Customer Example' }),
        );
        await screen.findByRole('region', { name: 'Recovery result' });
        expect(screen.queryByText('Read-only Support View')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Resume recovered context' }));
        await screen.findByText('Read-only Support View');
        expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Exit Organisation' }));
        await screen.findByText('Exit confirmed. Returned to the Support Portal.');
      },
    );
    lostEnterCase(
      'recovers an uncertain Enter through pure durable evidence and explicit resume (requires harness fault armed)',
      async () => {
        await signIn();
        mount();
        await enter();
        await screen.findByText(/Outcome unconfirmed\. The operation may have committed/);
        expect(screen.getByLabelText('Recovery Organisation ID')).toHaveValue(org);
        fireEvent.click(screen.getByRole('button', { name: 'Inspect recovery' }));
        await screen.findByText('Original operation: COMMITTED');
        fireEvent.click(screen.getByRole('button', { name: 'Resume recovered context' }));
        await screen.findByText('Read-only Support View');
        fireEvent.click(screen.getByRole('button', { name: 'Exit Organisation' }));
        await screen.findByText('Exit confirmed. Returned to the Support Portal.');
      },
    );
  },
);
