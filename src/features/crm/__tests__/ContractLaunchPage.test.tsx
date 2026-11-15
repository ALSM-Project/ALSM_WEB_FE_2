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
});
