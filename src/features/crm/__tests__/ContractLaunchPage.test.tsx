import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ContractLaunchPage } from '../pages/ContractLaunchPage';
import { leadsApi } from '@/features/leads/api/leads.api';

vi.mock('@/features/leads/api/leads.api', () => ({
  leadsApi: {
    list: vi.fn(),
  },
}));

vi.mock('../api/crm.api', () => ({
  crmApi: {
    adoptLegacyLead: vi.fn(),
  },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    hasPermission: () => true,
    user: { id: 'user-1', name: 'Admin' },
  }),
}));

describe('ContractLaunchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders full-width layout with search and lead list', async () => {
    vi.mocked(leadsApi.list).mockResolvedValueOnce({
      items: [
        {
          id: 'lead-1',
          companyName: 'Công Ty CP Công Nghệ Demo Toàn Trình',
          contactName: 'Nguyễn Văn Khách Hàng',
          contactEmail: 'khachhang.demo@alsm.io',
          status: 'QUALIFIED',
          createdAt: new Date().toISOString(),
        } as any,
      ],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    } as any);

    render(
      <MemoryRouter>
        <ContractLaunchPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Create a contract')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search company, contact, or email...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Công Ty CP Công Nghệ Demo Toàn Trình')).toBeInTheDocument();
    });

    expect(screen.getByText('Create Contract')).toBeInTheDocument();
    expect(screen.getByText(/Showing 1 of 1 leads/i)).toBeInTheDocument();
  });

  it('paginates leads correctly and navigates between pages', async () => {
    const mockItems = Array.from({ length: 15 }, (_, i) => ({
      id: `lead-${i + 1}`,
      companyName: `Company ${i + 1}`,
      contactName: `Contact ${i + 1}`,
      contactEmail: `contact${i + 1}@example.com`,
      status: 'QUALIFIED',
      createdAt: new Date().toISOString(),
    }));

    vi.mocked(leadsApi.list).mockResolvedValueOnce({
      items: mockItems,
      total: 15,
      page: 1,
      limit: 100,
      totalPages: 1,
    } as any);

    render(
      <MemoryRouter>
        <ContractLaunchPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Company 1')).toBeInTheDocument();
    });

    // Default pageSize = 10 -> Company 1 to 10 are visible, Company 11 is not
    expect(screen.getByText('Company 10')).toBeInTheDocument();
    expect(screen.queryByText('Company 11')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 1 to 10 of 15 leads/i)).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    // Click Next
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    nextBtn.click();

    // Page 2 shows Company 11 to 15
    await waitFor(() => {
      expect(screen.getByText('Company 11')).toBeInTheDocument();
    });
    expect(screen.getByText('Company 15')).toBeInTheDocument();
    expect(screen.queryByText('Company 1')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 11 to 15 of 15 leads/i)).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });
});
