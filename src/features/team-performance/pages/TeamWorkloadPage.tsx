import { useQuery } from '@tanstack/react-query';
import { Card } from '@/shared/ui';
import { conversionError } from '@/features/conversions/services/conversion-queue.service';
import TeamReportLayout, { type ReportSelection } from '../components/TeamReportLayout';
import { teamPerformanceService } from '../services/team-performance.service';

function WorkloadReport({ team, days, userId }: ReportSelection) {
  const report = useQuery({ queryKey: ['conversion-team-workload', userId, team.organizationId, team.id, days], queryFn: () => teamPerformanceService.workload(team, days), retry: false, staleTime: 0, gcTime: 0, refetchOnMount: 'always' });
  if (report.isFetching) return <Card><p role="status">Loading assigned workload...</p></Card>;
  if (report.isError) return <Card><p role="alert">Unable to load workload: {conversionError(report.error)}</p></Card>;
  const data = report.data;
  if (!data || data.team.id !== team.id || data.team.organizationId !== team.organizationId || data.team.kind !== 'CONVERSION' || data.period.days !== days || data.coverage !== 'EXPLICIT_ASSIGNMENTS_ONLY' || data.jobPeriodField !== 'createdAt' || data.statusBasis !== 'CURRENT') return <p role="alert">The report does not match the selected team, period and assignment scope.</p>;
  return <Card className="space-y-4">
    <h2 className="text-lg font-bold">{data.team.name} — assigned workload</h2>
    <p className="text-sm text-slate-600">Current statuses of explicitly assigned jobs created from {new Date(data.period.start).toLocaleString()} to {new Date(data.period.end).toLocaleString()} (exclusive end; rolling UTC days). Each job counts once; retries do not add jobs.</p>
    <p className="text-sm text-slate-600">Unassigned jobs are excluded. Assigned Jobs includes all statuses; the other totals show only Processing, Completed and Failed.</p>
    <dl aria-label="Team workload totals" className="grid gap-4 sm:grid-cols-4 rounded-lg bg-slate-50 p-4">
      <div><dt className="text-sm">Assigned Jobs</dt><dd aria-label="Assigned jobs total" className="text-2xl font-semibold">{data.totals.assignedJobs}</dd></div>
      <div><dt className="text-sm">Processing Jobs</dt><dd aria-label="Processing jobs total" className="text-2xl font-semibold">{data.totals.processingJobs}</dd></div>
      <div><dt className="text-sm">Completed Jobs</dt><dd aria-label="Completed jobs total" className="text-2xl font-semibold">{data.totals.completedJobs}</dd></div>
      <div><dt className="text-sm">Failed Jobs</dt><dd aria-label="Failed jobs total" className="text-2xl font-semibold">{data.totals.failedJobs}</dd></div>
    </dl>
    {data.totals.assignedJobs === 0 && <p role="status">No explicitly assigned jobs were created in this reporting period.</p>}
    {!data.members.length ? <p role="status">No active staff are explicitly assigned to this team.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left">
      <thead><tr><th className="p-3">Team Member</th><th className="p-3">Assigned Jobs</th><th className="p-3">Processing Jobs</th><th className="p-3">Completed Jobs</th><th className="p-3">Failed Jobs</th></tr></thead>
      <tbody>{data.members.map((member) => <tr key={member.userId} className="border-t"><td className="p-3">{member.fullName}</td><td className="p-3">{member.metrics.assignedJobs}</td><td className="p-3">{member.metrics.processingJobs}</td><td className="p-3">{member.metrics.completedJobs}</td><td className="p-3">{member.metrics.failedJobs}</td></tr>)}</tbody>
    </table></div>}
    <p className="text-xs text-slate-500">Reported: {new Date(data.asOf).toLocaleString()}. Refresh to check current access and assignments.</p>
  </Card>;
}
export default function TeamWorkloadPage() {
  return <TeamReportLayout kind="CONVERSION">{(selection) => <WorkloadReport {...selection} />}</TeamReportLayout>;
}
