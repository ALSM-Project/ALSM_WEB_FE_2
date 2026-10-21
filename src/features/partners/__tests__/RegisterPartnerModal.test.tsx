import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegisterPartnerModal } from '../components/RegisterPartnerModal';
import { partnersApi } from '../api/partners.api';

vi.mock('../api/partners.api', () => ({
  partnersApi: {
    createPartner: vi.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 'new-partner-99',
        ...data,
        status: 'ACTIVE',
        projectCount: 0,
        completedExportCount: 0,
      })
    ),
  },
}));

describe('RegisterPartnerModal', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders modal dialog in center with required form fields when open', () => {
    render(<RegisterPartnerModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Register Partner Organization')).toBeInTheDocument();
    expect(screen.getByText(/Set up a new enterprise partner workspace/i)).toBeInTheDocument();

    // Field labels
    expect(screen.getByLabelText(/Organization \/ Company Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Primary Web Domain/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Representative Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Engagement Model \/ SLA Tier/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Assign Lead Conversion Specialist/i)).toBeInTheDocument();
  });

  it('does not render anything when isOpen is false', () => {
    render(<RegisterPartnerModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('validates mandatory inputs before submitting', async () => {
    render(<RegisterPartnerModal isOpen={true} onClose={vi.fn()} />);

    const submitBtn = screen.getByRole('button', { name: /Register & Setup Partner/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Organization name is required')).toBeInTheDocument();
    expect(screen.getByText('Primary domain is required')).toBeInTheDocument();
    expect(screen.getByText('Primary contact name is required')).toBeInTheDocument();
    expect(screen.getByText('Contact email is required')).toBeInTheDocument();
    expect(partnersApi.createPartner).not.toHaveBeenCalled();
  });

  it('successfully submits valid partner data, triggers onSuccess callback, and closes modal', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <RegisterPartnerModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    fireEvent.change(screen.getByLabelText(/Organization \/ Company Name/i), {
      target: { value: 'Horizon Banking Cloud' },
    });
    fireEvent.change(screen.getByLabelText(/Primary Web Domain/i), {
      target: { value: 'horizoncloud.io' },
    });
    fireEvent.change(screen.getByLabelText(/Contact Representative Name/i), {
      target: { value: 'Alex Morgan' },
    });
    fireEvent.change(screen.getByLabelText(/Contact Email Address/i), {
      target: { value: 'alex@horizoncloud.io' },
    });

    const submitBtn = screen.getByRole('button', { name: /Register & Setup Partner/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(partnersApi.createPartner).toHaveBeenCalledWith({
        name: 'Horizon Banking Cloud',
        domain: 'horizoncloud.io',
        contactName: 'Alex Morgan',
        contactEmail: 'alex@horizoncloud.io',
        engagementType: 'Dedicated Modernization',
        assignedStaffName: 'Sarah Jenkins (Sr. Conversion Specialist)',
      });
    });

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('invokes onClose when clicking Cancel button', () => {
    const handleClose = vi.fn();
    render(<RegisterPartnerModal isOpen={true} onClose={handleClose} />);

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
