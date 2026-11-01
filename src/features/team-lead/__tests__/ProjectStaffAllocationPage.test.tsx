import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProjectStaffAllocationPage } from '../pages/ProjectStaffAllocationPage';
import { partnersApi } from '@/features/partners/api/partners.api';

const mockProjects = [
  {
    id: 'proj-101',
    name: 'General Ledger COBOL Migration',
    partnerId: 'partner-alpha',
    partnerName: 'Alpha Financial Corp',
    conversionType: 'COBOL_TO_JAVA',
    targetFramework: 'Spring Boot 3.0 / Java 21',
    status: 'ACTIVE',
    screensTotal: 0,
    screensCompleted: 0,
    programsTotal: 12,
    programsCompleted: 8,
    assignedTeamLeadId: 'lead-01',
    assignedTeamLeadName: 'Sarah Jenkins',
    assignedStaffId: undefined,
    assignedStaffName: undefined,
    createdAt: '2026-10-10T00:00:00.000Z',
  },
];

const mockStaff = [
  { id: 'staff-01', fullName: 'Alex Mercer', email: 'alex@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 2 },
  { id: 'staff-02', fullName: 'David Chen', email: 'david@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 1 },
  { id: 'staff-03', fullName: 'Elena Rostova', email: 'elena@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 4 },
];

const createWrapper = (initialRoute = '/team-lead/projects/proj-101/allocate') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(['currentUser'], {
    id: 'lead-01',
    fullName: 'Sarah Jenkins',
    email: 'teamlead@alsm.io',
    isPlatformAdmin: false,
    effectivePermissions: ['teams.manage', 'projects.view'],
  });

  return ({ children }: { children?: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/team-lead/projects/:projectId/allocate" element={children} />
          <Route path="/team-lead/projects" element={<div>Projects List Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ProjectStaffAllocationPage - Detailed Staff Allocation', () => {
  beforeEach(() => {
    vi.spyOn(partnersApi, 'getProjects').mockResolvedValue(mockProjects as any);
    vi.spyOn(partnersApi, 'getAssignableStaff').mockResolvedValue(mockStaff as any);
    vi.spyOn(partnersApi, 'assignProject').mockResolvedValue({
      ...mockProjects[0],
      assignedStaffId: 'staff-02',
      assignedStaffName: 'David Chen',
      staffAssignmentNote: 'Focus on financial validation first',
    } as any);
  });

  it('renders project overview, breadcrumbs, and complete staff roster', async () => {
    render(<ProjectStaffAllocationPage />, { wrapper: createWrapper() });

    // Breadcrumbs & Heading
    expect(await screen.findByRole('heading', { level: 1, name: /Allocate Conversion Staff to Project/i })).toBeInTheDocument();
    expect(screen.getAllByText('General Ledger COBOL Migration').length).toBeGreaterThan(0);
    expect(screen.getByText('Spring Boot 3.0 / Java 21')).toBeInTheDocument();
    expect(screen.getByText('Alpha Financial Corp')).toBeInTheDocument();

    // Roster count and employees
    expect(screen.getByText('Eligible Conversion Staff Roster')).toBeInTheDocument();
    expect(screen.getByText('Alex Mercer')).toBeInTheDocument();
    expect(screen.getByText('David Chen')).toBeInTheDocument();
    expect(screen.getByText('Elena Rostova')).toBeInTheDocument();

    // Workload pills
    expect(screen.getByRole('button', { name: /All \(3\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Available \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Optimal \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /High \(1\)/i })).toBeInTheDocument();
  });

  it('filters staff roster by workload capacity', async () => {
    render(<ProjectStaffAllocationPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Alex Mercer')).toBeInTheDocument();

    // Filter to Available only (workload <= 1)
    const availableBtn = screen.getByRole('button', { name: /Available \(1\)/i });
    fireEvent.click(availableBtn);

    // David Chen (load 1) should be visible; Alex (load 2) and Elena (load 4) should be hidden
    expect(screen.getByText('David Chen')).toBeInTheDocument();
    expect(screen.queryByText('Alex Mercer')).not.toBeInTheDocument();
    expect(screen.queryByText('Elena Rostova')).not.toBeInTheDocument();

    // Filter to High only (workload > 3)
    const highBtn = screen.getByRole('button', { name: /High \(1\)/i });
    fireEvent.click(highBtn);

    expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    expect(screen.queryByText('David Chen')).not.toBeInTheDocument();
  });

  it('selects an engineer, configures allocation notes and confirms assignment', async () => {
    const assignSpy = vi.spyOn(partnersApi, 'assignProject');

    render(<ProjectStaffAllocationPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('David Chen')).toBeInTheDocument();

    // Select David Chen card
    const davidCard = screen.getByTestId('staff-card-staff-02');
    fireEvent.click(davidCard);

    // Form updates with selected engineer preview
    expect(screen.getByTestId('selected-staff-badge')).toBeInTheDocument();
    expect(screen.getByText(/1 → 2 projects/i)).toBeInTheDocument();

    // Fill notes
    const textarea = screen.getByPlaceholderText(/Focus on DSPF header validation first/i);
    fireEvent.change(textarea, { target: { value: 'Focus on financial validation first' } });

    // Submit allocation
    const submitBtn = screen.getByRole('button', { name: /Confirm Staff Allocation/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith(
        'proj-101',
        expect.objectContaining({
          staffId: 'staff-02',
          staffName: 'David Chen',
          staffNote: 'Focus on financial validation first',
        })
      );
      expect(screen.getByText(/Staff member "David Chen" has been successfully assigned/i)).toBeInTheDocument();
    });
  });
});
