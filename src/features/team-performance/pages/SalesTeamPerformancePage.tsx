import { useQuery } from '@tanstack/react-query';
import { Card } from '@/shared/ui';
import { conversionError } from '@/features/conversions/services/conversion-queue.service';
import TeamReportLayout, { type ReportSelection } from '../components/TeamReportLayout';
import { teamPerformanceService, type SalesMetric } from '../services/team-performance.service';

const displayMetric = (metric: SalesMetric) => metric.available ? <span>{metric.value}</span> : <span title={metric.reason}>Unavailable</span>;
function SalesReport({ team, days, userId }: ReportSelection) {
  const report = useQuery({ queryKey: ['sales-team-performance', userId, team.organizationId, team.id, days], queryFn: () => teamPerformanceService.sales(team, days), retry: false, staleTime: 0, gcTime: 0, refetchOnMount: 'always' });
  if (report.isFetching) return <Card><p role="status">Loading sales performance...</p></Card>;
  if (report.isError) return <Card><p role="alert">Unable to load sales performance: {conversionError(report.error)}</p></Card>;
  const data = report.data;
  if (!data || data.team.id !== team.id || data.team.organizationId !== team.organizationId || data.team.kind !== 'SALES' || data.period.days !== days) return <p role="alert">The report does not match the selected team and period.</p>;
  return <Card className="space-y-4">
    <h2 className="text-lg font-bold">{data.team.name} — sales comparison</h2>
    <p className="text-sm text-slate-600">Period: {new Date(data.period.start).toLocaleString()} to {new Date(data.period.end).toLocaleString()} (exclusive end; rolling UTC days).</p>
    <section aria-label="Sales metric availability" className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2 text-sm">
      <p>Conversion Rate uses converted leads / assigned leads × 100.</p>
      {!data.metrics.leadCount.available && <p>Lead Count unavailable: {data.metrics.leadCount.reason}</p>}
      {!data.metrics.conversionRate.available && <p>Conversion Rate unavailable: {data.metrics.conversionRate.reason}</p>}
      {!data.metrics.revenueGenerated.available && <p>Revenue Generated unavailable: {data.metrics.revenueGenerated.reason}</p>}
    </section>
    {!data.members.length ? <p role="status">No active salespeople are explicitly assigned to this team.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left">
      <thead><tr><th className="p-3">Salesperson</th><th className="p-3">Lead Count</th><th className="p-3">Conversion Rate</th><th className="p-3">Revenue Generated</th></tr></thead>
      <tbody>{data.members.map((member) => <tr key={member.userId} className="border-t"><td className="p-3">{member.fullName}</td><td className="p-3">{displayMetric(member.metrics.leadCount)}</td><td className="p-3">{displayMetric(member.metrics.conversionRate)}</td><td className="p-3">{displayMetric(member.metrics.revenueGenerated)}</td></tr>)}</tbody>
    </table></div>}
    <p className="text-xs text-slate-500">Reported: {new Date(data.asOf).toLocaleString()}. Missing sources are shown as unavailable.</p>
  </Card>;
}
export default function SalesTeamPerformancePage() {
  return <TeamReportLayout kind="SALES">{(selection) => <SalesReport {...selection} />}</TeamReportLayout>;
}
