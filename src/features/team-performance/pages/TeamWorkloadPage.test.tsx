import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TeamPerformancePage from './TeamPerformancePage';
import { teamPerformanceService, type ManagedTeam, type TeamWorkloadReport } from '../services/team-performance.service';

vi.mock('../services/team-performance.service', () => ({ teamPerformanceService: { listTeams: vi.fn(), sales: vi.fn(), workload: vi.fn() } }));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'lead', isActive: true }, isLoading: false, error: null }) }));
const team: ManagedTeam = { id: 'conversion-a', organizationId: 'org-a', kind: 'CONVERSION', name: 'Persisted Conversion Team', revision: 1 };
const report: TeamWorkloadReport = { team, period: { days: 7, start: '2026-10-10T00:00:00Z', end: '2026-10-17T00:00:00Z', basis: 'ROLLING_UTC', boundaries: '[start,end)' }, asOf: '2026-10-17T00:00:00Z', coverage: 'EXPLICIT_ASSIGNMENTS_ONLY', jobPeriodField: 'createdAt', statusBasis: 'CURRENT', totals: { assignedJobs: 9, processingJobs: 2, completedJobs: 4, failedJobs: 1 }, members: [{ userId: 'staff', fullName: 'Persisted conversion staff', metrics: { assignedJobs: 9, processingJobs: 2, completedJobs: 4, failedJobs: 1 } }] };
const clients: QueryClient[] = [];
function show(url = '/team-performance/monitor?teamId=conversion-a&days=7') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}><TeamPerformancePage /></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(teamPerformanceService.listTeams).mockResolvedValue([team]);
  vi.mocked(teamPerformanceService.workload).mockImplementation(async (selected, days) => ({ ...report, team: selected, period: { ...report.period, days } }));
});
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0; });
describe('persisted conversion team monitoring', () => {
  it('renders server totals and member breakdowns with explicit cohort meaning', async () => {
    show();
    expect(await screen.findByText('Persisted conversion staff')).toBeInTheDocument();
    expect(screen.getByLabelText('Assigned jobs total')).toHaveTextContent('9');
    expect(screen.getByLabelText('Processing jobs total')).toHaveTextContent('2');
    expect(screen.getByLabelText('Completed jobs total')).toHaveTextContent('4');
    expect(screen.getByLabelText('Failed jobs total')).toHaveTextContent('1');
    expect(screen.getByText(/Unassigned jobs are excluded/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Monitoring' })).toHaveAttribute('aria-current', 'page');
    expect(teamPerformanceService.listTeams).toHaveBeenCalledWith('CONVERSION', undefined);
    expect(teamPerformanceService.workload).toHaveBeenCalledWith(team, 7);
    expect(teamPerformanceService.sales).not.toHaveBeenCalled();
  });
  it('loads persisted 30-day URL selection and switches team and period without stale member rows', async () => {
    const second = { ...team, id: 'conversion-b', name: 'Second Conversion Team' };
    vi.mocked(teamPerformanceService.listTeams).mockResolvedValue([team, second]);
    show('/team-performance/monitor?teamId=conversion-a&days=30');
    await screen.findByText('Persisted conversion staff');
    expect(teamPerformanceService.workload).toHaveBeenCalledWith(team, 30);
    fireEvent.change(screen.getByLabelText('Reporting period'), { target: { value: '7' } });
    await waitFor(() => expect(teamPerformanceService.workload).toHaveBeenCalledWith(team, 7));
    fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'conversion-b' } });
    expect(await screen.findByRole('heading', { name: 'Second Conversion Team — assigned workload' })).toBeInTheDocument();
    expect(teamPerformanceService.workload).toHaveBeenCalledWith(second, 7);
  });
  it('does not show fabricated totals while awaiting a real report', async () => {
    vi.mocked(teamPerformanceService.workload).mockReturnValue(new Promise(() => {})); show();
    expect(await screen.findByText('Loading assigned workload...')).toBeInTheDocument();
    expect(screen.queryByLabelText('Assigned jobs total')).not.toBeInTheDocument();
  });
  it('renders a real empty assigned cohort distinctly from missing memberships', async () => {
    vi.mocked(teamPerformanceService.workload).mockResolvedValue({ ...report, totals: { assignedJobs: 0, processingJobs: 0, completedJobs: 0, failedJobs: 0 }, members: [] }); show();
    expect(await screen.findByText('No explicitly assigned jobs were created in this reporting period.')).toBeInTheDocument();
    expect(screen.getByText('No active staff are explicitly assigned to this team.')).toBeInTheDocument();
    expect(screen.getByLabelText('Assigned jobs total')).toHaveTextContent('0');
  });
  it('hides prior totals and names after management revocation and refresh', async () => {
    show(); await screen.findByText('Persisted conversion staff');
    vi.mocked(teamPerformanceService.listTeams).mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText(/No authorized Conversion teams/)).toBeInTheDocument();
    expect(screen.queryByText('Persisted conversion staff')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Assigned jobs total')).not.toBeInTheDocument();
  });
  it('treats an HTTP denial as an error without retaining a cached report', async () => {
    vi.mocked(teamPerformanceService.workload).mockRejectedValue(new Error('Team not accessible')); show();
    expect(await screen.findByRole('alert')).toHaveTextContent('Team not accessible');
    expect(screen.queryByLabelText('Assigned jobs total')).not.toBeInTheDocument();
  });
  it('does not fetch teams absent from the authoritative authorized list', async () => {
    show('/team-performance/monitor?teamId=foreign');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable in your management scope');
    expect(teamPerformanceService.workload).not.toHaveBeenCalled();
  });
  it('rejects a mismatched report instead of displaying another team data', async () => {
    vi.mocked(teamPerformanceService.workload).mockResolvedValue({ ...report, team: { ...team, organizationId: 'foreign-org' } }); show();
    expect(await screen.findByRole('alert')).toHaveTextContent('does not match');
    expect(screen.queryByText('Persisted conversion staff')).not.toBeInTheDocument();
  });
});
