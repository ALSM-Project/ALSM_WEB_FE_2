import { apiClient } from '@/services/api/apiClient';

export type TeamKind = 'SALES' | 'CONVERSION';
export type ReportingDays = 7 | 30;
export interface ManagedTeam { id: string; name: string; organizationId: string; kind: TeamKind; revision: number }
export type SalesMetric = { available: false; reason: string; code?: 'NO_ASSIGNED_LEADS' } | { available: true; value: number; unit?: 'COUNT' | 'PERCENT' | 'VND' };
export interface SalesMetrics { leadCount: SalesMetric; conversionRate: SalesMetric; revenueGenerated: SalesMetric }
export interface ReportPeriod { days: ReportingDays; start: string; end: string; basis: 'ROLLING_UTC'; boundaries: '[start,end)' }
export interface SalesTeamReport {
  team: Pick<ManagedTeam, 'id' | 'name' | 'organizationId' | 'kind'>;
  period: ReportPeriod;
  asOf: string;
  metrics: SalesMetrics;
  cohort?: 'ASSIGNMENT_START';
  conversionCredit?: 'ASSIGNEE_AT_CONVERSION';
  revenueBasis?: 'CONFIRMED_PAYMENTS_WITH_EXPLICIT_SALESPERSON';
  coverage?: 'RECORDED_EXPLICIT_SALES_ASSIGNMENTS';
  members: { userId: string; fullName: string; currentMember?: boolean; metrics: SalesMetrics }[];
}
export interface WorkloadCounts { assignedJobs: number; processingJobs: number; completedJobs: number; failedJobs: number }
export interface TeamWorkloadReport {
  team: SalesTeamReport['team'];
  period: ReportPeriod;
  asOf: string;
  coverage: 'EXPLICIT_ASSIGNMENTS_ONLY';
  jobPeriodField: 'createdAt';
  statusBasis: 'CURRENT';
  totals: WorkloadCounts;
  members: { userId: string; fullName: string; metrics: WorkloadCounts }[];
}
const organizationHeaders = (organizationId?: string) => organizationId ? { 'x-organization-id': organizationId } : undefined;
export const teamPerformanceService = {
  listTeams: (kind: TeamKind, organizationId?: string) => apiClient.get<ManagedTeam[]>('/teams', { params: { kind }, headers: organizationHeaders(organizationId) }),
  sales: (team: ManagedTeam, days: ReportingDays) => apiClient.get<SalesTeamReport>(`/teams/${encodeURIComponent(team.id)}/performance`, { params: { days }, headers: organizationHeaders(team.organizationId) }),
  workload: (team: ManagedTeam, days: ReportingDays) => apiClient.get<TeamWorkloadReport>(`/teams/${encodeURIComponent(team.id)}/workload`, { params: { days }, headers: organizationHeaders(team.organizationId) }),
};
