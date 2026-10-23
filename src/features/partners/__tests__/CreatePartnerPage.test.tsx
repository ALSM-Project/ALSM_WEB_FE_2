import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreatePartnerPage } from '../pages/staff/CreatePartnerPage';
import { partnersApi } from '../api/partners.api';

vi.mock('../api/partners.api', () => ({
  partnersApi: {
    createPartner: vi.fn(),
    getAssignableStaff: vi.fn().mockResolvedValue([]),
  },
}));

describe('CreatePartnerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(partnersApi.createPartner).mockResolvedValue({
      id: 'partner-new-123',
      name: 'Pacific Heritage Life',
      domain: 'pacificheritage.com',
      contactName: 'Elena Rostova',
      contactEmail: 'elena@pacificheritage.com',
      status: 'ACTIVE',
      engagementType: 'Dedicated Modernization',
      assignedStaffName: 'Sarah Jenkins (Sr. Conversion Specialist)',
      createdAt: '2026-10-21T03:00:00Z',
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/partners/new']}>
        <Routes>
          <Route path="/partners/new" element={<CreatePartnerPage />} />
          <Route path="/partners" element={<div>Partner Directory Page</div>} />
          <Route path="/partners/:partnerId" element={<div>Partner Details Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders form elements directly without duplicate inner breadcrumb or redundant title', () => {
    renderComponent();

    // Verify absence of duplicate inner breadcrumb
    expect(screen.queryByText('New Partner Organization')).not.toBeInTheDocument();

    // Form profile sections
    expect(screen.getByText('Partner Organization Profile')).toBeInTheDocument();
    expect(screen.getByText('Primary Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Engagement Model & Staff Assignment')).toBeInTheDocument();

    // Field labels
    expect(screen.getByLabelText(/Organization \/ Company Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Primary Web Domain/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Representative Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Engagement Model \/ SLA Tier/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Assign Lead Conversion Specialist/i)).toBeInTheDocument();
  });

  it('validates required fields before submitting', async () => {
    renderComponent();

    const submitBtn = screen.getByRole('button', { name: /Register & Setup Partner/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Organization name is required')).toBeInTheDocument();
    expect(screen.getByText('Primary domain is required')).toBeInTheDocument();
    expect(screen.getByText('Primary contact name is required')).toBeInTheDocument();
    expect(screen.getByText('Contact email is required')).toBeInTheDocument();
    expect(partnersApi.createPartner).not.toHaveBeenCalled();
  });

  it('submits valid partner form and navigates to partner details', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText(/Organization \/ Company Name/i), {
      target: { value: 'Pacific Heritage Life' },
    });
    fireEvent.change(screen.getByLabelText(/Primary Web Domain/i), {
      target: { value: 'pacificheritage.com' },
    });
    fireEvent.change(screen.getByLabelText(/Contact Representative Name/i), {
      target: { value: 'Elena Rostova' },
    });
    fireEvent.change(screen.getByLabelText(/Contact Email Address/i), {
      target: { value: 'elena@pacificheritage.com' },
    });

    const submitBtn = screen.getByRole('button', { name: /Register & Setup Partner/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(partnersApi.createPartner).toHaveBeenCalledWith({
        name: 'Pacific Heritage Life',
        domain: 'pacificheritage.com',
        contactName: 'Elena Rostova',
        contactEmail: 'elena@pacificheritage.com',
        engagementType: 'Dedicated Modernization',
        assignedStaffName: '',
      });
    });

    expect(await screen.findByText('Partner Details Page')).toBeInTheDocument();
  });

  it('navigates back to partner directory when clicking cancel', async () => {
    renderComponent();

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(await screen.findByText('Partner Directory Page')).toBeInTheDocument();
  });
});
