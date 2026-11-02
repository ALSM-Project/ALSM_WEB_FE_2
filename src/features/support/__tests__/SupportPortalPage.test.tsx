import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/features/auth/api/auth.api';
import { tokenStore } from '@/services/api/tokenStore';
import { apiClient } from '@/services/api/apiClient';
import { SupportPortalPage } from '../pages/SupportPortalPage';
import { createMockSupportAdapter, MOCK_ORGANIZATIONS } from '../api/support.mock';
import { RESOURCE_LABELS, type ResourceKind } from '../api/support.types';

const auth = vi.hoisted(() => ({ user: null as UserProfile | null, error: null }));
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: auth.user, isLoading: false, error: auth.error }),
}));
const staff: UserProfile = {
  id: 'staff-original',
  email: 'support@example.invalid',
  fullName: 'Original Staff',
  isPlatformAdmin: false,
  roles: ['INTERNAL_SUPPORT'],
  effectivePermissions: ['organizations.impersonate'],
  isActive: true,
};
beforeEach(() => {
  auth.user = { ...staff };
  localStorage.clear();
  tokenStore.setTokens({
    accessToken: 'original-staff-access',
    refreshToken: 'original-staff-refresh',
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
async function enter() {
  fireEvent.change(screen.getByLabelText('Organisation search'), { target: { value: 'Example' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search Organisations' }));
  fireEvent.click(
    await screen.findByRole('button', { name: `Enter Organisation ${MOCK_ORGANIZATIONS[0].name}` }),
  );
  await screen.findByText('Read-only Support View');
}
async function openProject() {
  fireEvent.click(screen.getByRole('button', { name: 'Load Projects' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Open project Sample 1 modernization' }),
  );
  await screen.findByText('Selected Project');
}

describe('UC66-04 Internal Support Portal', () => {
  it('completes search, Enter, all metadata tabs/details, and confirmed Exit using the original identity', async () => {
    const api = createMockSupportAdapter(),
      list = vi.spyOn(api, 'list'),
      detail = vi.spyOn(api, 'detail'),
      status = vi.spyOn(api, 'context');
    render(
      <StrictMode>
        <SupportPortalPage adapter={api} />
      </StrictMode>,
    );
    await enter();
    await openProject();
    expect(
      screen.getByText('Original staff identity: support@example.invalid'),
    ).toBeInTheDocument();
    for (const kind of Object.keys(RESOURCE_LABELS) as ResourceKind[]) {
      if (kind === 'projects') continue;
      fireEvent.click(screen.getByRole('tab', { name: RESOURCE_LABELS[kind] }));
      const panel = screen.getByRole('tabpanel', { name: RESOURCE_LABELS[kind] });
      fireEvent.click(
        await within(panel).findByRole('button', { name: new RegExp(`Inspect ${kind}`) }),
      );
      await screen.findByRole('region', { name: 'Diagnostic detail' });
    }
    expect(list).toHaveBeenCalledTimes(6);
    expect(detail).toHaveBeenCalledTimes(6);
    expect(status).not.toHaveBeenCalled();
    for (const action of ['Edit', 'Delete', 'Upload', 'Convert', 'Retry', 'Mapping', 'Export'])
      expect(
        screen.queryByRole('button', { name: new RegExp(`^${action}( |$)`, 'i') }),
      ).not.toBeInTheDocument();
    expect(tokenStore.getAccessToken()).toBe('original-staff-access');
    expect(localStorage.getItem('alsm_support_view')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Exit Organisation' }));
    await screen.findByText('Exit confirmed. Returned to the Support Portal.');
    expect(screen.queryByText('Sample 1 modernization')).not.toBeInTheDocument();
    expect(screen.queryByText('Read-only Support View')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search Organisations' })).toBeInTheDocument();
    expect(screen.getByLabelText('Organisation search')).toHaveValue('');
    expect(tokenStore.getAccessToken()).toBe('original-staff-access');
  });
  it('uses exact contact-email search through the same bounded directory contract', async () => {
    const api = createMockSupportAdapter(),
      search = vi.spyOn(api, 'search');
    render(<SupportPortalPage adapter={api} />);
    fireEvent.change(screen.getByLabelText('Search by'), { target: { value: 'email' } });
    fireEvent.change(screen.getByLabelText('Organisation search'), {
      target: { value: 'manufacturing@example.invalid' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search Organisations' }));
    await screen.findByRole('button', { name: `Enter Organisation ${MOCK_ORGANIZATIONS[0].name}` });
    expect(search).toHaveBeenCalledWith(
      { query: 'manufacturing@example.invalid', field: 'email' },
      expect.any(AbortSignal),
    );
    expect(
      screen.queryByRole('button', { name: `Enter Organisation ${MOCK_ORGANIZATIONS[1].name}` }),
    ).not.toBeInTheDocument();
  });
  it.each([
    { roles: [], isPlatformAdmin: true },
    { roles: ['INTERNAL_SUPPORT'], effectivePermissions: [] },
    { roles: ['CONVERSION_STAFF'] },
    { isActive: false },
  ])('denies absent exact staff authority: %j', (override) => {
    auth.user = { ...staff, ...override };
    const api = createMockSupportAdapter(),
      search = vi.spyOn(api, 'search');
    render(<SupportPortalPage adapter={api} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Support access unavailable');
    expect(search).not.toHaveBeenCalled();
  });
  it('leaves the default adapter unavailable and never calls legacy impersonation/customer APIs', () => {
    const get = vi.spyOn(apiClient, 'get'),
      post = vi.spyOn(apiClient, 'post');
    render(<SupportPortalPage />);
    expect(screen.getByRole('button', { name: 'Search Organisations' })).toBeDisabled();
    expect(screen.getByText(/Support View is not connected yet/)).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
  it('clears on logout or profile authority loss without displaying old scoped content', async () => {
    const api = createMockSupportAdapter(),
      { rerender } = render(<SupportPortalPage adapter={api} />);
    await enter();
    await openProject();
    auth.user = { ...staff, roles: [] };
    rerender(<SupportPortalPage adapter={api} />);
    expect(screen.queryByText('Read-only Support View')).not.toBeInTheDocument();
    expect(screen.queryByText('Sample 1 modernization')).not.toBeInTheDocument();
    auth.user = { ...staff };
    rerender(<SupportPortalPage adapter={createMockSupportAdapter()} />);
    await enter();
    act(() => tokenStore.clear());
    expect(screen.queryByText('Read-only Support View')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
  it('clears a scoped view at idle expiry without background activity requests', async () => {
    const api = createMockSupportAdapter(),
      status = vi.spyOn(api, 'context'),
      list = vi.spyOn(api, 'list');
    render(<SupportPortalPage adapter={api} />);
    await enter();
    const started = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(started + 15 * 60000 + 1);
    act(() => {
      vi.advanceTimersByTime(1000);
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.queryByText('Read-only Support View')).not.toBeInTheDocument();
    expect(screen.getByText(/Support View timed out locally/)).toBeInTheDocument();
    expect(status).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });
  it('shows original uncertain references and disables further admission instead of retrying', async () => {
    const api = createMockSupportAdapter(),
      id = '11111111-1111-4111-8111-111111111111',
      operationId = '22222222-2222-4222-8222-222222222222';
    const entering = vi.spyOn(api, 'enter').mockRejectedValueOnce({
      response: {
        status: 503,
        data: {
          code: 'SUPPORT_CONTEXT_OUTCOME_UNCONFIRMED',
          details: [{ contextId: id, operationId, mutationCommitted: 'unknown' }],
        },
      },
    });
    render(<SupportPortalPage adapter={api} />);
    fireEvent.change(screen.getByLabelText('Organisation search'), {
      target: { value: 'Example' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search Organisations' }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: `Enter Organisation ${MOCK_ORGANIZATIONS[0].name}`,
      }),
    );
    await screen.findByText(/Outcome unconfirmed/);
    expect(screen.getByText(id)).toBeInTheDocument();
    expect(screen.getByText(operationId)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search Organisations' })).toBeDisabled();
    expect(entering).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /reconcil|retry/i })).not.toBeInTheDocument();
  });
  it('performs context status only on an explicit user action', async () => {
    const api = createMockSupportAdapter(),
      status = vi.spyOn(api, 'context');
    render(<SupportPortalPage adapter={api} />);
    await enter();
    expect(status).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Check Context' }));
    await waitFor(() => expect(status).toHaveBeenCalledTimes(1));
  });
});
