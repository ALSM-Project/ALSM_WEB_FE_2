import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StaffDashboardPage from '../pages/StaffDashboardPage';
import { useAuth } from '@/features/auth/hooks/useAuth';

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/features/admin/api/admin.api', () => ({
  adminApi: {
    getOrganizations: vi.fn().mockResolvedValue([
      { id: 'org-1', name: 'Acme Corp', type: 'ENTERPRISE', status: 'ACTIVE' },
    ]),
    getEngagementTypes: vi.fn().mockResolvedValue([]),
    getAuditLogs: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/features/partners/api/partners.api', () => ({
  partnersApi: {
    getProjects: vi.fn().mockResolvedValue([
      { id: 'proj-1', name: 'WinForms Modernization', status: 'IN_PROGRESS', targetFramework: 'React' },
    ]),
    getAssignableStaff: vi.fn().mockResolvedValue([
      { id: 'staff-1', fullName: 'John Doe', email: 'john@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 1 },
    ]),
  },
}));

vi.mock('@/features/billing/api/quote.api', () => ({
  quoteApi: {
    listQuoteRequests: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

vi.mock('@/features/crm/api/crm.api', () => ({
  crmApi: {
    getReports: vi.fn().mockResolvedValue({
      monthlyRevenue: 150000,
      conversionRate: 35,
      avgDealSize: 25000,
    }),
    getLeads: vi.fn().mockResolvedValue([
      { id: 'lead-1', company: 'Global Tech', stage: 'PROPOSAL', dealValue: 30000 },
    ]),
    getPendingDiscounts: vi.fn().mockResolvedValue([]),
  },
}));

describe('Role-Based Dashboard Suite', () => {
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

  it('renders Platform Admin Overview by default for Admin and allows switching views', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        fullName: 'Administrator',
        email: 'admin@alsm.io',
        isPlatformAdmin: true,
        roles: ['ADMIN'],
        effectivePermissions: ['*'],
        isActive: true,
      },
      isLoading: false,
      hasPermission: () => true,
    } as any);

    render(<StaffDashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Platform Admin — System Overview/i)).toBeInTheDocument();

    const teamLeadBtn = screen.getByRole('button', { name: /^Team Lead$/i });
    expect(teamLeadBtn).toBeInTheDocument();

    fireEvent.click(teamLeadBtn);
    expect(screen.getByText(/Team Lead — Team Overview/i)).toBeInTheDocument();

    const staffBtn = screen.getByRole('button', { name: /^Staff$/i });
    fireEvent.click(staffBtn);
    expect(screen.getByText(/Conversion Staff — My Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/Web 1 Conversion Workspace/i)).toBeInTheDocument();

    const salesBtn = screen.getByRole('button', { name: /^Sales$/i });
    fireEvent.click(salesBtn);
    expect(screen.getByText(/Sales \/ Sales Manager — Sales Overview/i)).toBeInTheDocument();
  });

  it('renders Conversion Staff view directly for CONVERSION_STAFF without admin switch bar', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'staff-1',
        fullName: 'Nguyen Van Staff',
        email: 'staff@alsm.io',
        isPlatformAdmin: false,
        roles: ['CONVERSION_STAFF'],
        effectivePermissions: ['conversions.view'],
        isActive: true,
      },
      isLoading: false,
      hasPermission: () => true,
    } as any);

    render(<StaffDashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Conversion Staff — My Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/Web 1 Conversion Workspace/i)).toBeInTheDocument();
    expect(screen.queryByText(/Xem theo vai trò:/i)).not.toBeInTheDocument();
  });

  it('renders Team Lead view directly for TEAM_LEAD without admin switch bar', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'lead-1',
        fullName: 'Tran Van Lead',
        email: 'lead@alsm.io',
        isPlatformAdmin: false,
        roles: ['TEAM_LEAD'],
        effectivePermissions: ['team.manage'],
        isActive: true,
      },
      isLoading: false,
      hasPermission: () => true,
    } as any);

    render(<StaffDashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Team Lead — Team Overview/i)).toBeInTheDocument();
    expect(screen.queryByText(/Xem theo vai trò:/i)).not.toBeInTheDocument();
  });

  it('renders Sales view directly for SALES_MANAGER without admin switch bar', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'sales-1',
        fullName: 'Le Thi Sales',
        email: 'sales@alsm.io',
        isPlatformAdmin: false,
        roles: ['SALES_MANAGER'],
        effectivePermissions: ['crm.discounts.approve'],
        isActive: true,
      },
      isLoading: false,
      hasPermission: () => true,
    } as any);

    render(<StaffDashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Sales \/ Sales Manager — Sales Overview/i)).toBeInTheDocument();
    expect(screen.queryByText(/Xem theo vai trò:/i)).not.toBeInTheDocument();
  });
});
