import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreatePartnerProjectPage } from '../pages/staff/CreatePartnerProjectPage';
import { partnersApi } from '../api/partners.api';

vi.mock('../api/partners.api', () => ({
  partnersApi: {
    getPartners: vi.fn(),
    createProject: vi.fn(),
  },
}));

const mockPartners = [
  {
    id: 'partner-1',
    name: 'Fintech Nexus International',
    domain: 'fintechnexus.io',
    contactName: 'Alex Mercer',
    contactEmail: 'alex@fintechnexus.io',
    status: 'ACTIVE',
    engagementType: 'Dedicated Modernization',
    assignedStaffName: 'Sarah Jenkins',
    createdAt: '2026-01-15T08:00:00Z',
    activeProjectsCount: 2,
    totalConversionsCompleted: 48,
  },
  {
    id: 'partner-2',
    name: 'Pacific Heritage Life',
    domain: 'pacificheritage.com',
    contactName: 'Elena Rostova',
    contactEmail: 'elena@pacificheritage.com',
    status: 'ACTIVE',
    engagementType: 'On-Demand Batch',
    assignedStaffName: 'David Chen',
    createdAt: '2026-02-10T09:30:00Z',
    activeProjectsCount: 1,
    totalConversionsCompleted: 14,
  },
];

describe('CreatePartnerProjectPage (Web 1 Redesign)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(partnersApi.getPartners).mockResolvedValue(mockPartners as any);
    vi.mocked(partnersApi.createProject).mockResolvedValue({
      id: 'proj-new-999',
      partnerId: 'partner-1',
      partnerName: 'Fintech Nexus International',
      name: 'Treasury Settlement Modernization',
      conversionType: 'BMS_DSPF_TO_FRONTEND',
      targetFramework: 'React 19 + Tailwind CSS',
      status: 'SETUP',
      createdAt: '2026-10-21T02:00:00Z',
      updatedAt: '2026-10-21T02:00:00Z',
      screensCount: 0,
      programsCount: 0,
      completedItemsCount: 0,
      failedItemsCount: 0,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = (initialPath = '/partners/projects/new') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/partners/projects/new" element={<CreatePartnerProjectPage />} />
          <Route path="/partners/:partnerId/projects/new" element={<CreatePartnerProjectPage />} />
          <Route path="/partners/projects/:projectId" element={<div>Partner Project Overview Page</div>} />
          <Route path="/partners/projects/:projectId/upload" element={<div>Upload Source Files Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders balanced page header and Web 1 form layout', async () => {
    renderComponent();

    expect(
      await screen.findByRole('heading', { name: 'Create Partner Modernization Project' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Initiate a modernization project on behalf of an onboarded partner/i)).toBeInTheDocument();
    expect(screen.getByText('Back to Partners')).toBeInTheDocument();

    // Check form fields
    expect(screen.getByLabelText(/Target Partner Organization/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Modernization Project Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Description & Scope Notes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target Framework & Stack/i)).toBeInTheDocument();

    // Check pipeline selection cards
    expect(screen.getByText('BMS / DSPF Screens to Web')).toBeInTheDocument();
    expect(screen.getByText('COBOL to Java Microservices')).toBeInTheDocument();
  });

  it('toggles modernization domain pipeline and updates framework options', async () => {
    renderComponent();

    await screen.findByRole('heading', { name: 'Create Partner Modernization Project' });
    await screen.findByText('Fintech Nexus International (fintechnexus.io)');

    const cobolCard = screen.getByText('COBOL to Java Microservices').closest('[role="radio"]')!;
    fireEvent.click(cobolCard);

    expect(cobolCard).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Spring Boot 3.3 / Java 21 (Gradle)')).toBeInTheDocument();

    const screensCard = screen.getByText('BMS / DSPF Screens to Web').closest('[role="radio"]')!;
    fireEvent.click(screensCard);

    expect(screensCard).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('React 19 + Tailwind CSS (Strict TypeScript)')).toBeInTheDocument();
  });

  it('supports keyboard navigation on domain selection cards', async () => {
    renderComponent();

    await screen.findByRole('heading', { name: 'Create Partner Modernization Project' });
    await screen.findByText('Fintech Nexus International (fintechnexus.io)');

    const cobolCard = screen.getByText('COBOL to Java Microservices').closest('[role="radio"]')!;
    fireEvent.keyDown(cobolCard, { key: 'Enter' });

    expect(cobolCard).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Spring Boot 3.3 / Java 21 (Gradle)')).toBeInTheDocument();
  });

  it('validates required fields before submitting', async () => {
    renderComponent();

    await screen.findByRole('heading', { name: 'Create Partner Modernization Project' });

    const submitBtn = screen.getByRole('button', { name: /Create & Go to Project Overview/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Project name is required')).toBeInTheDocument();
    expect(partnersApi.createProject).not.toHaveBeenCalled();
  });

  it('submits valid form and navigates to source upload page', async () => {
    renderComponent();

    await screen.findByRole('heading', { name: 'Create Partner Modernization Project' });

    const nameInput = screen.getByLabelText(/Modernization Project Name/i);
    fireEvent.change(nameInput, { target: { value: 'Treasury Settlement Modernization' } });

    const descInput = screen.getByLabelText(/Project Description & Scope Notes/i);
    fireEvent.change(descInput, { target: { value: 'High throughput batch settlement procedures' } });

    const submitBtn = screen.getByRole('button', { name: /Create & Go to Project Overview/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(partnersApi.createProject).toHaveBeenCalledWith({
        partnerId: 'partner-1',
        partnerName: 'Fintech Nexus International',
        name: 'Treasury Settlement Modernization',
        description: 'High throughput batch settlement procedures',
        conversionType: 'BMS_DSPF_TO_FRONTEND',
        targetFramework: 'React 19 + Tailwind CSS',
      });
    });

    expect(await screen.findByText('Partner Project Overview Page')).toBeInTheDocument();
  });
});
