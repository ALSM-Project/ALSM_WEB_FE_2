import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CreateOffboardingRequestPage } from '../pages/CreateOffboardingRequestPage';
import { offboardingApprovalApi } from '../api/offboarding-approval.api';
import { partnersApi } from '@/features/partners/api/partners.api';
import { workforceApi } from '@/shared/api/workforce.api';

const mockStaff = [
  { id: 'staff-01', fullName: 'Alex Mercer', email: 'alex@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 2 },
  { id: 'staff-02', fullName: 'David Chen', email: 'david@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 1 },
  { id: 'staff-03', fullName: 'Elena Rostova', email: 'elena@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 4 },
];

const mockSummary = {
  targetUserId: 'staff-02',
  targetUserName: 'David Chen',
  targetUserEmail: 'david@alsm.io',
  targetUserRole: 'CONVERSION_STAFF',
  assignedProjects: [
    {
      id: 'proj-101',
      name: 'General Ledger COBOL Migration',
      code: 'GL-MIG-01',
      role: 'Lead Conversion Engineer',
      status: 'IN_PROGRESS',
    },
  ],
  activeSessionsCount: 2,
  apiCredentialsCount: 1,
  eligibleStaff: [
    { id: 'staff-01', fullName: 'Alex Mercer', email: 'alex@alsm.io', roles: ['CONVERSION_STAFF'] },
    { id: 'staff-03', fullName: 'Elena Rostova', email: 'elena@alsm.io', roles: ['CONVERSION_STAFF'] },
  ],
};

const createWrapper = (initialRoute = '/admin/offboarding-approvals/new') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(['currentUser'], {
    id: 'lead-01',
    fullName: 'Sarah Jenkins',
    email: 'teamlead@alsm.io',
    isPlatformAdmin: true,
    effectivePermissions: ['teams.manage', 'users.manage'],
  });

  return ({ children }: { children?: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/admin/offboarding-approvals/new" element={children} />
          <Route path="/admin/offboarding-approvals/:requestId" element={<div>Offboarding Detail Page</div>} />
          <Route path="/admin/offboarding-approvals" element={<div>Offboarding List Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('CreateOffboardingRequestPage - Staff Allocation Style User Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(workforceApi, 'searchWorkforce').mockRejectedValue(new Error('Network error'));
    vi.spyOn(partnersApi, 'getAssignableStaff').mockResolvedValue(mockStaff as any);
    vi.spyOn(offboardingApprovalApi, 'getUserOffboardingSummary').mockResolvedValue(mockSummary as any);
    vi.spyOn(offboardingApprovalApi, 'createRequest').mockResolvedValue({
      id: 'req-offboarding-99',
      targetUserId: 'staff-02',
      offboardingType: 'Resignation',
      status: 'PENDING',
    } as any);
  });

  it('renders Target Internal Staff Member section with combobox, directory table, and profile panel', async () => {
    render(<CreateOffboardingRequestPage />, { wrapper: createWrapper() });

    // Heading
    expect(await screen.findByRole('heading', { level: 1, name: /Create Offboarding Request/i })).toBeInTheDocument();
    expect(screen.getByText('Target Internal Staff Member *')).toBeInTheDocument();

    // Combobox & Table entries after staff loads
    expect(await screen.findByText('David Chen')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Target Internal Staff User \*/i })).toBeInTheDocument();
    expect(screen.getByText('Eligible Internal Staff Roster')).toBeInTheDocument();
    expect(screen.getAllByText('Alex Mercer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Elena Rostova').length).toBeGreaterThan(0);

    // Initial empty state for profile
    expect(screen.getByText('No staff member selected')).toBeInTheDocument();
  });

  it('selects an employee from table, loads live offboarding summary, and submits request', async () => {
    const summarySpy = vi.spyOn(offboardingApprovalApi, 'getUserOffboardingSummary');
    const createSpy = vi.spyOn(offboardingApprovalApi, 'createRequest');

    render(<CreateOffboardingRequestPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('David Chen')).toBeInTheDocument();

    // Click on David Chen card row or select button
    const davidRow = screen.getByTestId('offboarding-staff-card-staff-02');
    fireEvent.click(davidRow);

    // Should call live summary API
    await waitFor(() => {
      expect(summarySpy).toHaveBeenCalledWith('staff-02');
    });

    // Profile card displays selected employee details
    expect(screen.getByText('Staff Selected: David Chen')).toBeInTheDocument();

    // Live Project & Resource impact section updates
    expect(await screen.findByText('General Ledger COBOL Migration')).toBeInTheDocument();

    // Fill in required justification
    const reasonInput = screen.getByPlaceholderText(/Provide a formal justification/i);
    fireEvent.change(reasonInput, { target: { value: 'End of contract term transition' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Submit Request/i });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          targetUserId: 'staff-02',
          offboardingType: 'Resignation',
          reason: 'End of contract term transition',
        }),
      );
    });
  });
});
