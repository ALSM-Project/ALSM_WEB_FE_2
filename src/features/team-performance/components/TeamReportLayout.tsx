import { type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Card, PageHeader, Button } from '@/shared/ui';
import { conversionError } from '@/features/conversions/services/conversion-queue.service';
import { teamPerformanceService, type ManagedTeam, type ReportingDays, type TeamKind } from '../services/team-performance.service';

export interface ReportSelection { team: ManagedTeam; days: ReportingDays; userId: string }
export default function TeamReportLayout({ kind, children }: { kind: TeamKind; children: (selection: ReportSelection) => ReactNode }) {
  const { user, isLoading, error } = useAuth();
  const [params, setParams] = useSearchParams();
  const canReport = Boolean(user?.isActive && !error && !isLoading);
  const requestedDays = params.get('days') || '7';
  const days: ReportingDays = requestedDays === '30' ? 30 : 7;
  const validPeriod = requestedDays === '7' || requestedDays === '30';
  const teamId = params.get('teamId') || '';
  const organizationId = params.get('organizationId') || undefined;
  const teams = useQuery({ queryKey: ['managed-report-teams', user?.id, organizationId, kind], queryFn: () => teamPerformanceService.listTeams(kind, organizationId), enabled: canReport, retry: false, staleTime: 0, gcTime: 0, refetchOnMount: 'always' });
  const selected = teams.data?.find((team) => team.id === teamId && team.kind === kind && (!organizationId || team.organizationId === organizationId));
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };
  return <div className="space-y-6">
    <PageHeader title={kind === 'SALES' ? 'Team Performance' : 'Monitor Team Performance'} subtitle={kind === 'SALES' ? 'Sales Manager reporting for explicitly assigned teams.' : 'Team Lead monitoring for explicitly assigned conversion work.'} />
    <nav aria-label="Team performance views" className="flex gap-4 text-sm">
      <Link to="/team-performance" aria-current={kind === 'SALES' ? 'page' : undefined} className="text-blue-700 underline">Overview</Link>
      <Link to="/team-performance/monitor" aria-current={kind === 'CONVERSION' ? 'page' : undefined} className="text-blue-700 underline">Monitoring</Link>
      <Link to="/queue" className="text-blue-700 underline">View conversion queue</Link>
    </nav>
    <Card className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-semibold">Team
          <select aria-label="Team" value={teamId} disabled={!canReport || teams.isFetching || teams.isError} className="block mt-1 border rounded-lg p-2 min-w-56" onChange={(event) => update('teamId', event.target.value)}>
            <option value="">Select an authorized team</option>
            {canReport && !teams.isFetching && !teams.isError && teams.data?.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Reporting period
          <select aria-label="Reporting period" value={validPeriod ? days : ''} className="block mt-1 border rounded-lg p-2" onChange={(event) => update('days', event.target.value)}>
            {!validPeriod && <option value="">Select a supported period</option>}
            <option value="7">Last 7 days</option><option value="30">Last 30 days</option>
          </select>
        </label>
        <Button variant="outline" disabled={!canReport || teams.isFetching} onClick={() => { void teams.refetch(); }}>Refresh</Button>
      </div>
      {isLoading && <p role="status">Checking your access...</p>}
      {!isLoading && (!user?.isActive || error) && <p role="alert">An active authenticated account is required.</p>}
      {canReport && teams.isFetching && <p role="status">Loading authorized teams...</p>}
      {teams.isError && <p role="alert">Unable to load teams: {conversionError(teams.error)}</p>}
      {!validPeriod && <p role="alert">Choose the approved 7-day or 30-day reporting period.</p>}
      {canReport && !teams.isFetching && !teams.isError && teams.data?.length === 0 && <p role="status">No authorized {kind === 'SALES' ? 'Sales' : 'Conversion'} teams in this organization. An authorized administrator must explicitly assign your management scope.</p>}
      {canReport && !teams.isFetching && !teams.isError && teamId && !selected && <p role="alert">This team is unavailable in your management scope.</p>}
      {canReport && !teams.isFetching && !teams.isError && !teamId && Boolean(teams.data?.length) && <p role="status">Select an authorized team to view its report.</p>}
    </Card>
    {canReport && !teams.isFetching && !teams.isError && selected && validPeriod && <div key={`${user!.id}:${selected.organizationId}:${selected.id}:${days}`}>{children({ team: selected, days, userId: user!.id })}</div>}
  </div>;
}
