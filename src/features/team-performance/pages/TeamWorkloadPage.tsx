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
    <div>
      <h2 className="text-lg font-bold text-[#17263A]">{data.team.name} — assigned workload</h2>
      <p className="text-xs sm:text-sm text-[#5B6B7F] mt-1 max-w-prose leading-relaxed">Current statuses of explicitly assigned jobs created from {new Date(data.period.start).toLocaleString()} to {new Date(data.period.end).toLocaleString()} (exclusive end; rolling UTC days). Each job counts once; retries do not add jobs.</p>
      <p className="text-xs sm:text-sm text-[#5B6B7F] mt-1 max-w-prose leading-relaxed">Unassigned jobs are excluded. Assigned Jobs includes all statuses; the other totals show only Processing, Completed and Failed.</p>
    </div>
    <dl aria-label="Team workload totals" className="grid gap-3 sm:grid-cols-4">
      <div className="rounded-lg border border-[#DCE3EC] bg-[#F4F7FB] p-4"><dt className="text-xs font-medium text-[#5B6B7F]">Assigned Jobs</dt><dd aria-label="Assigned jobs total" className="mt-1 text-2xl font-semibold text-[#17263A]">{data.totals.assignedJobs}</dd></div>
      <div className="rounded-lg border border-[#DCE3EC] bg-[#F4F7FB] p-4"><dt className="text-xs font-medium text-[#5B6B7F]">Processing Jobs</dt><dd aria-label="Processing jobs total" className="mt-1 text-2xl font-semibold text-[#244A70]">{data.totals.processingJobs}</dd></div>
      <div className="rounded-lg border border-[#DCE3EC] bg-[#F4F7FB] p-4"><dt className="text-xs font-medium text-[#5B6B7F]">Completed Jobs</dt><dd aria-label="Completed jobs total" className="mt-1 text-2xl font-semibold text-emerald-700">{data.totals.completedJobs}</dd></div>
      <div className="rounded-lg border border-[#DCE3EC] bg-[#F4F7FB] p-4"><dt className="text-xs font-medium text-[#5B6B7F]">Failed Jobs</dt><dd aria-label="Failed jobs total" className="mt-1 text-2xl font-semibold text-rose-700">{data.totals.failedJobs}</dd></div>
    </dl>
    {data.totals.assignedJobs === 0 && <p role="status" className="text-sm text-[#5B6B7F]">No explicitly assigned jobs were created in this reporting period.</p>}
    {!data.members.length ? <p role="status" className="text-sm text-[#5B6B7F]">No active staff are explicitly assigned to this team.</p> : <div className="overflow-x-auto rounded-lg border border-[#DCE3EC]"><table className="w-full text-sm text-left">
      <thead className="bg-[#F4F7FB] text-xs font-semibold uppercase tracking-wider text-[#5B6B7F]"><tr><th className="p-3">Team Member</th><th className="p-3">Assigned Jobs</th><th className="p-3">Processing Jobs</th><th className="p-3">Completed Jobs</th><th className="p-3">Failed Jobs</th></tr></thead>
      <tbody className="divide-y divide-[#DCE3EC] text-[#17263A]">{data.members.map((member) => <tr key={member.userId} className="hover:bg-[#F4F7FB]/50"><td className="p-3 font-medium">{member.fullName}</td><td className="p-3">{member.metrics.assignedJobs}</td><td className="p-3">{member.metrics.processingJobs}</td><td className="p-3">{member.metrics.completedJobs}</td><td className="p-3">{member.metrics.failedJobs}</td></tr>)}</tbody>
    </table></div>}
    <p className="text-xs text-[#8491A3]">Reported: {new Date(data.asOf).toLocaleString()}. Refresh to check current access and assignments.</p>
  </Card>;
}
export default function TeamWorkloadPage() {
  return <TeamReportLayout kind="CONVERSION">{(selection) => <WorkloadReport {...selection} />}</TeamReportLayout>;
}
