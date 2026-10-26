import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PartnerProjectsPage } from '../pages/staff/PartnerProjectsPage';
import { partnersApi } from '../api/partners.api';
import { Partner, PartnerProject } from '../types/partner.types';

const mockPartners: Partner[] = [
  {
    id: 'partner-fnx-001',
    name: 'Fintech Nexus International',
    companyName: 'Fintech Nexus International Ltd.',
    contactName: 'Marcus Vance',
    contactEmail: 'm.vance@fintechnexus.io',
    domain: 'fintechnexus.io',
    status: 'ACTIVE',
    projectCount: 2,
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-10-18T14:30:00Z',
  },
];

const mockProjects: PartnerProject[] = [
  {
    id: 'proj-fnx-core-01',
    name: 'Core Banking BMS to React Migration',
    partnerId: 'partner-fnx-001',
    partnerName: 'Fintech Nexus International',
    organizationId: 'org-fnx-prod',
    conversionType: 'BMS_DSPF_TO_FRONTEND',
    targetFramework: 'React 19 + Tailwind CSS',
    status: 'IN_PROGRESS',
    screensTotal: 4,
    screensCompleted: 3,
    programsTotal: 0,
    programsCompleted: 0,
    assignedTeamLeadId: 'lead-01',
    assignedTeamLeadName: 'Sarah Jenkins',
    assignedStaffId: 'staff-01',
    assignedStaffName: 'Alex Mercer',
    createdAt: '2026-10-10T10:00:00Z',
    lastUpdated: '2026-10-18T14:00:00Z',
  },
  {
    id: 'proj-fnx-ledger-02',
    name: 'General Ledger COBOL to Java Batch',
    partnerId: 'partner-fnx-001',
    partnerName: 'Fintech Nexus International',
    organizationId: 'org-fnx-prod',
    conversionType: 'COBOL_TO_JAVA',
    targetFramework: 'Spring Boot 3.3 + Java 21',
    status: 'READY_FOR_EXPORT',
    screensTotal: 0,
    screensCompleted: 0,
    programsTotal: 8,
    programsCompleted: 8,
    assignedTeamLeadId: 'lead-01',
    assignedTeamLeadName: 'Sarah Jenkins',
    assignedStaffId: 'staff-02',
    assignedStaffName: 'David Chen',
    createdAt: '2026-10-12T10:00:00Z',
    lastUpdated: '2026-10-19T11:00:00Z',
  },
];

vi.mock('../api/partners.api', () => ({
  partnersApi: {
    getProjects: vi.fn(),
    getPartners: vi.fn(),
    createProject: vi.fn(),
  },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    hasPermission: () => true,
    user: { id: 'admin-01', name: 'Admin User', role: 'ADMIN' },
  }),
}));

describe('PartnerProjectsPage - Partner Modernization Projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(partnersApi.getProjects).mockResolvedValue(mockProjects);
    vi.mocked(partnersApi.getPartners).mockResolvedValue(mockPartners);
  });

  it('renders page header, 4 KPI metric cards, and partner projects list', async () => {
    render(
      <MemoryRouter>
        <PartnerProjectsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Partner Modernization Projects/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Core Banking BMS to React Migration')).toBeInTheDocument();
      expect(screen.getByText('General Ledger COBOL to Java Batch')).toBeInTheDocument();
    });

    // Check KPI metrics
    expect(screen.getByText('Total Partner Projects')).toBeInTheDocument();
    expect(screen.getByText('In Active Conversion')).toBeInTheDocument();
    expect(screen.getByText('Ready for Code Export')).toBeInTheDocument();
    expect(screen.getByText('Completed & Delivered')).toBeInTheDocument();

    // Verify Supervising Lead and Allocated Staff are rendered
    expect(screen.getAllByText('Sarah Jenkins').length).toBeGreaterThan(0);
    expect(screen.getByText('Alex Mercer')).toBeInTheDocument();
    expect(screen.getByText('David Chen')).toBeInTheDocument();
  });

  it('filters partner projects by search input', async () => {
    render(
      <MemoryRouter>
        <PartnerProjectsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Core Banking BMS to React Migration')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by project name/i);
    fireEvent.change(searchInput, { target: { value: 'General Ledger' } });

    expect(screen.getByText('General Ledger COBOL to Java Batch')).toBeInTheDocument();
    expect(screen.queryByText('Core Banking BMS to React Migration')).not.toBeInTheDocument();
  });

  it('filters partner projects by pipeline type', async () => {
    render(
      <MemoryRouter>
        <PartnerProjectsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Core Banking BMS to React Migration')).toBeInTheDocument();
    });

    // Click COBOL to Java 21 filter button
    const cobolFilterBtn = screen.getByRole('button', { name: /COBOL to Java 21/i });
    fireEvent.click(cobolFilterBtn);

    expect(screen.getByText('General Ledger COBOL to Java Batch')).toBeInTheDocument();
    expect(screen.queryByText('Core Banking BMS to React Migration')).not.toBeInTheDocument();
  });

  it('opens Create Partner Project modal on clicking New Partner Project button', async () => {
    render(
      <MemoryRouter>
        <PartnerProjectsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Core Banking BMS to React Migration')).toBeInTheDocument();
    });

    const newProjectBtn = screen.getByRole('button', { name: /New Partner Project/i });
    fireEvent.click(newProjectBtn);

    expect(screen.getByText('Create Partner Modernization Project')).toBeInTheDocument();
  });
});
