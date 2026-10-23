import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConversionStaffOverview } from '../components/ConversionStaffOverview';
import { partnersApi } from '@/features/partners/api/partners.api';
import { useAuth } from '@/features/auth/hooks/useAuth';

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/features/partners/api/partners.api', () => ({
  partnersApi: {
    getProjects: vi.fn(),
  },
}));

vi.mock('@/features/rbac/api/temporary-roles.api', () => ({
  temporaryRolesApi: {
    getMyRequests: vi.fn().mockResolvedValue([]),
  },
}));

describe('ConversionStaffOverview Pagination Suite', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  const mockProjects = Array.from({ length: 25 }, (_, i) => ({
    id: `proj-${i + 1}`,
    name: `Enterprise Modernization Project ${i + 1}`,
    status: 'IN_PROGRESS',
    targetFramework: 'React 19 + Tailwind',
    partnerName: `Partner Org ${i + 1}`,
    screensCompleted: i * 2,
    screensTotal: 50,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: 'staff-1', role: 'CONVERSION_STAFF' },
    });
    (partnersApi.getProjects as any).mockResolvedValue(mockProjects);
  });

  it('renders paginated projects table with default page size 10 and navigates pages', async () => {
    render(<ConversionStaffOverview />, { wrapper: createWrapper() });

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Enterprise Modernization Project 1')).toBeInTheDocument();
    });

    // Default rows per page is 10
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('25').length).toBeGreaterThan(0);

    // First page contains Project 1, but not Project 11
    expect(screen.getByText('Enterprise Modernization Project 1')).toBeInTheDocument();
    expect(screen.queryByText('Enterprise Modernization Project 11')).not.toBeInTheDocument();

    // Click Next button
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);

    // Now on Page 2: Project 11 should be present, Project 1 should not
    expect(screen.getByText('Enterprise Modernization Project 11')).toBeInTheDocument();
    expect(screen.queryByText('Enterprise Modernization Project 1')).not.toBeInTheDocument();
    expect(screen.getAllByText('20').length).toBeGreaterThan(0);

    // Change page size to 5
    const pageSizeSelect = screen.getByRole('combobox');
    fireEvent.change(pageSizeSelect, { target: { value: '5' } });

    // Should reset to page 1 with 5 items per page
    expect(screen.getByText('Enterprise Modernization Project 1')).toBeInTheDocument();
    expect(screen.queryByText('Enterprise Modernization Project 6')).not.toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
  });
});
