import { type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowUpRight, Info, Loader2, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button, Card, PageHeader, Select } from '@/shared/ui';
import { conversionError } from '@/features/conversions/services/conversion-queue.service';
import { teamPerformanceService, type ManagedTeam, type ReportingDays, type TeamKind } from '../services/team-performance.service';

export interface ReportSelection { team: ManagedTeam; days: ReportingDays; userId: string }

export default function TeamReportLayout({ kind, children }: { kind: TeamKind; children: (selection: ReportSelection) => ReactNode }) {
  const { user, isLoading, error, hasPermission } = useAuth();
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

  const teamOptions = [
    { value: '', label: 'Select an authorized team' },
    ...(canReport && !teams.isFetching && !teams.isError && teams.data
      ? teams.data.map((team) => ({ value: team.id, label: team.name }))
      : []),
  ];

  const periodOptions = [
    ...(!validPeriod ? [{ value: '', label: 'Select a supported period' }] : []),
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
  ];

  const tabClass = (active: boolean) =>
    `py-2.5 px-1 border-b-2 text-xs sm:text-sm transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
      active
        ? 'border-[#244A70] text-[#244A70] font-semibold'
        : 'border-transparent text-[#8491A3] font-medium hover:text-[#17263A] hover:border-[#DCE3EC]'
    }`;

  return (
    <div className="space-y-5">
      <PageHeader
        title={kind === 'SALES' ? 'Team Performance' : 'Monitor Team Performance'}
        subtitle={
          kind === 'SALES'
            ? 'Review lead assignments, conversion rates, and attributed revenue across your authorized sales teams.'
            : 'Track assigned conversion job volume and current processing statuses across your authorized teams.'
        }
      />

      <nav
        aria-label="Team performance views"
        className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE3EC]"
      >
        <div className="flex items-center gap-5 sm:gap-6">
          <Link to="/team-performance" aria-current={kind === 'SALES' ? 'page' : undefined} className={tabClass(kind === 'SALES')}>
            Overview
          </Link>
          <Link to="/team-performance/monitor" aria-current={kind === 'CONVERSION' ? 'page' : undefined} className={tabClass(kind === 'CONVERSION')}>
            Monitoring
          </Link>
        </div>

        <div className="flex items-center gap-2 pb-2">
          {kind === 'SALES' && hasPermission?.('teams.manage') && (
            <Link
              to="/organisations/teams/manage"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#DCE3EC] bg-white px-3 py-1.5 text-xs font-medium text-[#17263A] shadow-2xs transition-colors hover:border-[#B8C7D9] hover:bg-[#F4F7FB]"
            >
              <Users className="w-3.5 h-3.5 text-[#244A70]" />
              <span>Manage Sales Team</span>
            </Link>
          )}
          <Link
            to="/queue"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#DCE3EC] bg-white px-3 py-1.5 text-xs font-medium text-[#244A70] shadow-2xs transition-colors hover:border-[#B8C7D9] hover:bg-[#F4F7FB]"
          >
            <span>View conversion queue</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1 sm:flex-initial">
            <Select
              label="Team"
              aria-label="Team"
              value={teamId}
              disabled={!canReport || teams.isFetching || teams.isError}
              options={teamOptions}
              onChange={(event) => update('teamId', event.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              label="Reporting period"
              aria-label="Reporting period"
              value={validPeriod ? String(days) : ''}
              options={periodOptions}
              onChange={(event) => update('days', event.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="md"
            disabled={!canReport || teams.isFetching}
            onClick={() => { void teams.refetch(); }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${teams.isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2.5 rounded-md border border-[#DCE3EC] bg-[#F4F7FB] px-4 py-3 text-sm text-[#5B6B7F]">
            <Loader2 className="w-4 h-4 animate-spin text-[#244A70] shrink-0" />
            <p role="status" className="max-w-prose">Checking your access...</p>
          </div>
        )}

        {!isLoading && (!user?.isActive || error) && (
          <div className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p role="alert" className="max-w-prose leading-relaxed">An active authenticated account is required.</p>
          </div>
        )}

        {canReport && teams.isFetching && (
          <div className="flex items-center gap-2.5 rounded-md border border-[#DCE3EC] bg-[#F4F7FB] px-4 py-3 text-sm text-[#5B6B7F]">
            <Loader2 className="w-4 h-4 animate-spin text-[#244A70] shrink-0" />
            <p role="status" className="max-w-prose">Loading authorized teams...</p>
          </div>
        )}

        {teams.isError && (
          <div className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p role="alert" className="max-w-prose leading-relaxed">Unable to load teams: {conversionError(teams.error)}</p>
          </div>
        )}

        {!validPeriod && (
          <div className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p role="alert" className="max-w-prose leading-relaxed">Choose the approved 7-day or 30-day reporting period.</p>
          </div>
        )}

        {canReport && !teams.isFetching && !teams.isError && teams.data?.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#DCE3EC] bg-[#F4F7FB]/60 px-6 py-8 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-md bg-[#EEF1F6] text-[#8491A3] flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#17263A] tracking-tight">No authorized teams assigned</h3>
            <p role="status" className="text-xs sm:text-sm text-[#8491A3] mt-1 max-w-md leading-relaxed">
              No authorized {kind === 'SALES' ? 'Sales' : 'Conversion'} teams in this organization. An authorized administrator must explicitly assign your management scope.
            </p>
          </div>
        )}

        {canReport && !teams.isFetching && !teams.isError && teamId && !selected && (
          <div className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p role="alert" className="max-w-prose leading-relaxed">This team is unavailable in your management scope.</p>
          </div>
        )}

        {canReport && !teams.isFetching && !teams.isError && !teamId && Boolean(teams.data?.length) && (
          <div className="flex items-start gap-2.5 rounded-md border border-[#DCE3EC] bg-[#F4F7FB] px-4 py-3 text-sm text-[#17263A]">
            <Info className="w-4 h-4 text-[#244A70] shrink-0 mt-0.5" />
            <p role="status" className="max-w-prose leading-relaxed">Select an authorized team to view its report.</p>
          </div>
        )}
      </Card>

      {canReport && !teams.isFetching && !teams.isError && selected && validPeriod && (
        <div key={`${user!.id}:${selected.organizationId}:${selected.id}:${days}`}>
          {children({ team: selected, days, userId: user!.id })}
        </div>
      )}
    </div>
  );
}
