import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreatePartnerProjectModal } from '../components/CreatePartnerProjectModal';
import { partnersApi } from '../api/partners.api';

const { mockPartner } = vi.hoisted(() => ({
  mockPartner: {
    id: 'partner-fnx-001',
    name: 'Fintech Nexus International',
    companyName: 'Fintech Nexus International Ltd.',
    contactName: 'Marcus Vance',
    contactEmail: 'm.vance@fintechnexus.io',
    domain: 'fintechnexus.io',
    status: 'ACTIVE' as const,
    engagementType: 'Dedicated Modernization',
    projectCount: 2,
    activeConversionCount: 1,
    completedExportCount: 1,
    latestActivity: '2 hours ago',
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-10-18T14:30:00Z',
  },
}));

vi.mock('../api/partners.api', () => ({
  partnersApi: {
    getPartners: vi.fn().mockResolvedValue([mockPartner]),
    createProject: vi.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 'new-proj-123',
        ...data,
        status: 'NOT_STARTED',
        screensTotal: 0,
        screensCompleted: 0,
        programsTotal: 0,
        programsCompleted: 0,
      })
    ),
  },
}));

describe('CreatePartnerProjectModal', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderModal = (props: Partial<Parameters<typeof CreatePartnerProjectModal>[0]> = {}) => {
    return render(
      <MemoryRouter>
        <CreatePartnerProjectModal
          isOpen={true}
          onClose={vi.fn()}
          partner={mockPartner}
          {...props}
        />
      </MemoryRouter>
    );
  };

  it('renders centered modal dialog with partner context and conversion options', () => {
    renderModal();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create Partner Modernization Project')).toBeInTheDocument();
    expect(screen.getByText('Fintech Nexus International')).toBeInTheDocument();
    expect(screen.getByText('BMS / DSPF Screens to Web')).toBeInTheDocument();
    expect(screen.getByText('COBOL to Java Microservices')).toBeInTheDocument();
  });

  it('validates project name before submitting', async () => {
    renderModal();

    const submitBtn = screen.getByRole('button', { name: /Create & Open Workspace/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Project name is required')).toBeInTheDocument();
    expect(partnersApi.createProject).not.toHaveBeenCalled();
  });

  it('switches pipeline mode and updates framework selection', () => {
    renderModal();

    const cobolCard = screen.getByText('COBOL to Java Microservices');
    fireEvent.click(cobolCard);

    // Target framework options switch to Spring Boot / Java 21
    expect(screen.getByText(/Spring Boot 3\.3 \/ Java 21/i)).toBeInTheDocument();
  });

  it('submits valid project and calls onSuccess callback', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    renderModal({ onClose: handleClose, onSuccess: handleSuccess });

    fireEvent.change(screen.getByLabelText(/Modernization Project Name/i), {
      target: { value: 'Customer Portal Modernization' },
    });

    const submitBtn = screen.getByRole('button', { name: /Create & Open Workspace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(partnersApi.createProject).toHaveBeenCalledWith({
        partnerId: 'partner-fnx-001',
        partnerName: 'Fintech Nexus International',
        name: 'Customer Portal Modernization',
        description: '',
        conversionType: 'BMS_DSPF_TO_FRONTEND',
        targetFramework: 'React 19 + Tailwind CSS',
      });
    });

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
