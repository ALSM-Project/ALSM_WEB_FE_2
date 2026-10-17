import { BarChart3, ShieldAlert } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import PageHeader from '@/shared/ui/PageHeader';

export default function TeamPerformancePage() {
  const isMonitoring = useLocation().pathname.endsWith('/monitor');

  return (
    <div className="space-y-6">
      <PageHeader
        title={isMonitoring ? 'Monitor Team Performance' : 'Team Performance'}
        subtitle="Team reporting availability and required configuration."
      />

      <nav aria-label="Team performance views" className="flex gap-4 text-sm">
        <Link
          to="/team-performance"
          aria-current={isMonitoring ? undefined : 'page'}
          className="font-medium text-[#0652CC] underline underline-offset-4"
        >
          Overview
        </Link>
        <Link
          to="/team-performance/monitor"
          aria-current={isMonitoring ? 'page' : undefined}
          className="font-medium text-[#0652CC] underline underline-offset-4"
        >
          Monitoring
        </Link>
      </nav>

      <section
        aria-labelledby="team-performance-unavailable"
        className="rounded-xl border border-amber-200 bg-amber-50 p-6"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert aria-hidden="true" className="h-6 w-6 shrink-0 text-amber-700" />
          <div className="space-y-3">
            <h2 id="team-performance-unavailable" className="text-lg font-semibold text-[#091E42]">
              Team performance unavailable
            </h2>
            <p className="max-w-2xl text-sm text-[#42526E]">
              Verified team assignments, manager or team-lead access, and approved metric definitions
              are required before team metrics can be displayed. These capabilities are unavailable in the current release.
            </p>
            <p role="status" className="text-sm font-medium text-amber-900">
              No team metrics have been loaded. Totals, trends, and live monitoring are unavailable.
            </p>
          </div>
        </div>
      </section>

      <Link
        to="/queue"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#0652CC] underline underline-offset-4"
      >
        <BarChart3 aria-hidden="true" className="h-4 w-4" />
        View conversion queue
      </Link>
    </div>
  );
}
