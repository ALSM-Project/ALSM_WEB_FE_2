import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LeadListPage } from '../pages/LeadListPage';
import { crmApi, LeadDto } from '../api/crm.api';

vi.mock('../api/crm.api', () => ({
  crmApi: {
    getLeads: vi.fn(),
  },
}));

vi.mock('../components/AddLeadModal', () => ({
  AddLeadModal: () => null,
}));

describe('LeadListPage Pagination Suite', () => {
  const mockLeads: LeadDto[] = Array.from({ length: 25 }, (_, i) => ({
    id: `lead-${i + 1}`,
    contactName: `Contact Person ${i + 1}`,
    company: `Company ${i + 1}`,
    email: `contact${i + 1}@example.com`,
    phone: `+849880000${String(i + 1).padStart(2, '0')}`,
    score: 80 - i,
    dealValue: 10000000 * (i + 1),
    stage: i % 2 === 0 ? 'NEW' : 'QUALIFIED',
    assignedToName: `Sales Rep ${i + 1}`,
    lastContactAt: '2026-11-01T00:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    source: 'WEBSITE',
  })) as unknown as LeadDto[];

  beforeEach(() => {
    vi.clearAllMocks();
    (crmApi.getLeads as any).mockResolvedValue(mockLeads);
  });

  it('renders paginated leads table and supports page navigation & page size change', async () => {
    render(
      <MemoryRouter>
        <LeadListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Contact Person 1')).toBeInTheDocument();
    });

    // Verify pagination bar
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(screen.getByText('25')).toBeInTheDocument();

    // Lead 1 is on page 1, Lead 11 is not
    expect(screen.getByText('Contact Person 1')).toBeInTheDocument();
    expect(screen.queryByText('Contact Person 11')).not.toBeInTheDocument();

    // Click Next
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);

    // Page 2 should have Lead 11, but not Lead 1
    expect(screen.getByText('Contact Person 11')).toBeInTheDocument();
    expect(screen.queryByText('Contact Person 1')).not.toBeInTheDocument();

    // Change page size to 5
    const pageSizeSelect = screen.getByRole('combobox');
    fireEvent.change(pageSizeSelect, { target: { value: '5' } });

    // Resets to Page 1 with 5 items
    expect(screen.getByText('Contact Person 1')).toBeInTheDocument();
    expect(screen.queryByText('Contact Person 6')).not.toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
  });
});
