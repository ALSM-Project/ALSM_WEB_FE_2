import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TeamPerformancePage from './TeamPerformancePage';
import { teamPerformanceService, type ManagedTeam, type SalesTeamReport } from '../services/team-performance.service';

vi.mock('../services/team-performance.service', () => ({ teamPerformanceService: { listTeams: vi.fn(), sales: vi.fn() } }));
const identity = vi.hoisted(() => ({ id: 'manager-a', isActive: true }));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: identity, isLoading: false, error: null }) }));
const team: ManagedTeam = { id: 'team-a', organizationId: 'org-a', kind: 'SALES', name: 'Persisted Sales Team', revision: 2 };
const unavailable = { available: false as const, reason: 'Persisted source is unavailable.' };
const metrics = { leadCount: unavailable, conversionRate: unavailable, revenueGenerated: unavailable };
const report: SalesTeamReport = { team, asOf: '2026-10-17T00:00:00Z', period: { days: 7, start: '2026-10-10T00:00:00Z', end: '2026-10-17T00:00:00Z', basis: 'ROLLING_UTC', boundaries: '[start,end)' }, metrics, members: [{ userId: 'staff-a', fullName: 'Persisted salesperson', metrics }] };
const clients: QueryClient[] = [];
function show(url = '/team-performance?teamId=team-a&days=7') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}><TeamPerformancePage /></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  vi.clearAllMocks(); identity.id = 'manager-a'; identity.isActive = true;
  vi.mocked(teamPerformanceService.listTeams).mockResolvedValue([team]);
  vi.mocked(teamPerformanceService.sales).mockImplementation(async (_team, days) => ({ ...report, period: { ...report.period, days } }));
});
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0; });
describe('persisted sales team reporting', () => {
  it('shows server-computed distinct team totals, conversion credit and confirmed VND revenue', async () => {
    const values = (count: number, rate: number, amount: number) => ({ leadCount: { available: true as const, value: count, unit: 'COUNT' as const }, conversionRate: { available: true as const, value: rate, unit: 'PERCENT' as const }, revenueGenerated: { available: true as const, value: amount, unit: 'VND' as const } });
    vi.mocked(teamPerformanceService.sales).mockResolvedValue({ ...report, metrics: values(3, 200 / 3, 400000), members: [{ userId: 'a', fullName: 'Seller A', metrics: values(2, 0, 125000) }, { userId: 'b', fullName: 'Seller B', metrics: values(2, 100, 275000), currentMember: false }] });
    show();
    const totals = await screen.findByRole('row', { name: /Team totals/ });
    expect(within(totals).getByText('3')).toBeInTheDocument();
    expect(within(totals).getByText('66.67%')).toBeInTheDocument();
    expect(within(totals).getByText('400,000 VND')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Seller A/ })).toHaveTextContent('0%');
    expect(screen.getByRole('row', { name: /Seller B/ })).toHaveTextContent('100%');
    expect(screen.getByText('Historical contributor')).toBeInTheDocument();
    expect(screen.getByText(/A reassigned lead can appear/)).toBeInTheDocument();
  });
  it('distinguishes real zero data from an undefined conversion denominator', async () => {
    vi.mocked(teamPerformanceService.sales).mockResolvedValue({ ...report, members: [], metrics: { leadCount: { available: true, value: 0, unit: 'COUNT' }, revenueGenerated: { available: true, value: 0, unit: 'VND' }, conversionRate: { available: false, code: 'NO_ASSIGNED_LEADS', reason: 'No distinct leads entered the cohort.' } } });
    show();
    const totals = await screen.findByRole('row', { name: /Team totals/ });
    expect(within(totals).getByText('0')).toBeInTheDocument();
    expect(within(totals).getByText('0 VND')).toBeInTheDocument();
    expect(within(totals).getByText('Not applicable')).toHaveAttribute('title', 'No distinct leads entered the cohort.');
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });
  it.each(['/team-performance', '/organisations/teams'])('integrates real API contracts and honest unavailable cells at %s', async (path) => {
    show(`${path}?teamId=team-a&days=7`);
    expect(await screen.findByText('Persisted salesperson')).toBeInTheDocument();
    expect(teamPerformanceService.listTeams).toHaveBeenCalledWith('SALES', undefined);
    expect(teamPerformanceService.sales).toHaveBeenCalledWith(team, 7);
    expect(screen.getAllByText('Unavailable')).toHaveLength(6);
    expect(screen.getByRole('region', { name: 'Sales metric availability' })).toHaveTextContent('Conversion rate of leads assigned during the selected period');
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'View conversion queue' })).toHaveAttribute('href', '/queue');
  });
  it('supports 7/30 filters and multiple authorized teams', async () => {
    const second = { ...team, id: 'team-b', name: 'Second Sales Team' };
    vi.mocked(teamPerformanceService.listTeams).mockResolvedValue([team, second]);
    vi.mocked(teamPerformanceService.sales).mockImplementation(async (selected, days) => ({ ...report, team: selected, period: { ...report.period, days } }));
    show(); await screen.findByText('Persisted salesperson');
    fireEvent.change(screen.getByLabelText('Reporting period'), { target: { value: '30' } });
    await waitFor(() => expect(teamPerformanceService.sales).toHaveBeenCalledWith(team, 30));
    fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'team-b' } });
    expect(await screen.findByRole('heading', { name: 'Second Sales Team — sales comparison' })).toBeInTheDocument();
    expect(teamPerformanceService.sales).toHaveBeenCalledWith(second, 30);
  });
  it('does not request a foreign or no-longer-managed team from a URL', async () => {
    show('/team-performance?teamId=foreign');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable in your management scope');
    expect(teamPerformanceService.sales).not.toHaveBeenCalled();
  });
  it('shows loading and empty authorized teams without fake statistics', async () => {
    vi.mocked(teamPerformanceService.listTeams).mockResolvedValue([]); show('/team-performance');
    expect(screen.getByRole('status')).toHaveTextContent('Loading authorized teams');
    expect(await screen.findByText(/No authorized Sales teams/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('shows empty assigned staff distinctly from unavailable data', async () => {
    vi.mocked(teamPerformanceService.sales).mockResolvedValue({ ...report, members: [] }); show();
    expect(await screen.findByText('No active salespeople are explicitly assigned to this team.')).toBeInTheDocument();
    expect(screen.getByText(/Revenue Generated unavailable/)).toBeInTheDocument();
  });
  it('removes cached report data when refreshed management scope is denied', async () => {
    show(); await screen.findByText('Persisted salesperson');
    vi.mocked(teamPerformanceService.listTeams).mockRejectedValue(new Error('Management scope revoked'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Management scope revoked');
    expect(screen.queryByText('Persisted salesperson')).not.toBeInTheDocument();
  });
  it('keeps backend report errors distinct from empty or zero-valued results', async () => {
    vi.mocked(teamPerformanceService.sales).mockRejectedValue(new Error('Reporting storage unavailable')); show();
    expect(await screen.findByRole('alert')).toHaveTextContent('Reporting storage unavailable');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('rejects unsupported URL periods without requesting a report', async () => {
    show('/team-performance?teamId=team-a&days=8');
    expect(await screen.findByRole('alert')).toHaveTextContent('7-day or 30-day');
    await waitFor(() => expect(teamPerformanceService.listTeams).toHaveBeenCalled());
    expect(teamPerformanceService.sales).not.toHaveBeenCalled();
  });
  it('does not fetch team data for an inactive account', () => {
    identity.isActive = false; show();
    expect(screen.getByRole('alert')).toHaveTextContent('active authenticated account');
    expect(teamPerformanceService.listTeams).not.toHaveBeenCalled();
  });
});
