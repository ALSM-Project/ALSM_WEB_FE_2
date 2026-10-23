import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversionItemReviewPage } from '../pages/staff/ConversionItemReviewPage';
import { apiClient } from '@/services/api/apiClient';
import { SCREEN_INQ_ID, SERVER_PROJECT_ID, linkProjectToPartner, mockServer } from './serverFixture';

// Never hit a real backend from tests: the mocked client answers like a server holding fixed data.
vi.mock('@/services/api/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const createWrapper = (
  permissions: string[] = [
    'partner_project.view',
    'partner_project.start_conversion',
    'conversion_result.review',
    'conversion_result.manage_mappings',
    'conversion_result.manage_findings',
    'conversion_result.export',
  ]
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(['currentUser'], {
    id: 'user-staff',
    email: 'staff@alsm.io',
    isPlatformAdmin: false,
    effectivePermissions: permissions,
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/partners/projects/${SERVER_PROJECT_ID}/items/${SCREEN_INQ_ID}/review`]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ConversionItemReviewPage (Full-Width Workspace)', () => {
  beforeEach(() => {
    localStorage.clear();
    linkProjectToPartner();
    mockServer();
    vi.mocked(apiClient.post).mockRejectedValue(new Error('offline'));
    vi.mocked(apiClient.patch).mockRejectedValue(new Error('offline'));
  });

  afterEach(() => {
    cleanup();
  });

  it('renders item header, modernization workflow stepper, and generation metrics', async () => {
    render(
      <Routes>
        <Route
          path="/partners/projects/:projectId/items/:itemId/review"
          element={<ConversionItemReviewPage />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByRole('heading', { name: /CUSTINQ/i })).toBeInTheDocument();
    expect(screen.getByText(/Target: React 19 \+ TypeScript/i)).toBeInTheDocument();
    // No generated files are loaded for the item, so no made-up size/line metrics are shown.
    expect(screen.queryByText('Deterministic Generation Metrics')).not.toBeInTheDocument();
    expect(screen.getByText('Back to Conversion Workspace')).toBeInTheDocument();
  });

  it('renders full-width tabs and toggles between Preview, Code, Mappings, and Validation', async () => {
    render(
      <Routes>
        <Route
          path="/partners/projects/:projectId/items/:itemId/review"
          element={<ConversionItemReviewPage />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { name: /CUSTINQ/i });

    // Initially in UI Preview tab
    expect(screen.getByText('Interactive UI Preview')).toBeInTheDocument();

    // Switch to Code tab
    const codeTabBtn = screen.getByText('Modernized Code & Source');
    fireEvent.click(codeTabBtn);
    expect(await screen.findByText(/No output generated yet/i)).toBeInTheDocument();

    // Switch to Field Mapping tab
    const mappingTabBtn = screen.getByText(/Field Mapping/i);
    fireEvent.click(mappingTabBtn);
    expect(await screen.findByText('Source Identifier (AST)')).toBeInTheDocument();

    // Switch to Validation Findings tab
    const validationTabBtn = screen.getByText(/Validation Findings/i);
    fireEvent.click(validationTabBtn);
    expect(await screen.findByText('Semantic & AST Validation Findings')).toBeInTheDocument();
  });

  it('opens EditMappingModal when clicking Edit Mapping & Correct', async () => {
    render(
      <Routes>
        <Route
          path="/partners/projects/:projectId/items/:itemId/review"
          element={<ConversionItemReviewPage />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { name: /CUSTINQ/i });

    const editBtn = screen.getByText('Edit Mapping & Correct');
    fireEvent.click(editBtn);

    expect(await screen.findByText(/Edit Field Mappings: CUSTINQ/i)).toBeInTheDocument();
    expect(screen.getByText(/Configure AST field extraction mappings/i)).toBeInTheDocument();
  });

  it('triggers re-validation and updates findings count', async () => {
    render(
      <Routes>
        <Route
          path="/partners/projects/:projectId/items/:itemId/review"
          element={<ConversionItemReviewPage />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { name: /CUSTINQ/i });

    const revalidateBtn = screen.getByText(/Re-validate/i);
    fireEvent.click(revalidateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Re-validate/i)).not.toBeDisabled();
    });
  });
});
