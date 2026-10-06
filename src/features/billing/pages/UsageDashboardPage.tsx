import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Folder,
  HardDrive,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Card, PageHeader, Badge, Button } from '@/shared/ui';
import { usageApi } from '../api/usage.api';

function getQuotaStatus(used: number, max: number): {
  pct: number;
  isUnlimited: boolean;
  barColor: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'secondary';
  badgeText: string;
} {
  if (max === -1) {
    return {
      pct: 100,
      isUnlimited: true,
      barColor: 'bg-indigo-500',
      badgeVariant: 'secondary',
      badgeText: 'Unlimited',
    };
  }

  const pct = Math.min(100, Math.round((used / max) * 100));

  if (pct >= 100) {
    return {
      pct,
      isUnlimited: false,
      barColor: 'bg-rose-500',
      badgeVariant: 'danger',
      badgeText: 'At Quota',
    };
  }

  if (pct >= 80) {
    return {
      pct,
      isUnlimited: false,
      barColor: 'bg-amber-500',
      badgeVariant: 'warning',
      badgeText: 'Near Limit',
    };
  }

  return {
    pct,
    isUnlimited: false,
    barColor: 'bg-emerald-500',
    badgeVariant: 'success',
    badgeText: 'Normal',
  };
}

export const UsageDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: () => usageApi.getUsageStats(),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Service Usage & Quotas"
          subtitle="Monitor organization resource consumption, quota limits, and conversion volume."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Service Usage & Quotas"
          subtitle="Monitor organization resource consumption, quota limits, and conversion volume."
        />
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-rose-800 text-sm">Failed to load service usage</h3>
            <p className="text-xs text-rose-600 mt-1">
              Could not retrieve usage metrics from the billing service. Please try again.
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refetch()}
                className="inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { plan, screens, projects, storage, monthlyConversions } = data;
  const isEnterprise = plan.tier?.toUpperCase() === 'ENTERPRISE';

  const screensStatus = getQuotaStatus(screens.used, screens.max);
  const projectsStatus = getQuotaStatus(projects.used, projects.max);
  const storageStatus = getQuotaStatus(storage.usedGb, storage.maxGb);

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Service Usage & Quotas"
          subtitle="Monitor organization resource consumption, quota limits, and conversion volume."
        />
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/billing/quotes')}
            className="inline-flex items-center gap-1.5"
          >
            Enterprise Quotes (UC-32)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Active Subscription Plan ─────────────────────────────────────────── */}
      <Card variant="default" padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8F1FF] text-[#0652CC] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#091E42]">{plan.name}</span>
                <Badge variant={isEnterprise ? 'primary' : 'secondary'}>
                  {plan.tier?.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-[#6B778C] mt-0.5">
                {isEnterprise
                  ? 'Enterprise dedicated tier with custom SLA and unlimited quota boundaries.'
                  : 'Organization active subscription quota plan.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#6B778C] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Quota enforcement active</span>
          </div>
        </div>
      </Card>

      {/* ── Quota Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Screens */}
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-50 text-[#0652CC]">
                <Monitor className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">
                Screens / Month
              </span>
            </div>
            <Badge variant={screensStatus.badgeVariant}>{screensStatus.badgeText}</Badge>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-black text-[#091E42]">
              {screensStatus.isUnlimited ? '∞' : screens.used.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-[#6B778C]">
              {screensStatus.isUnlimited ? 'Unlimited' : `/ ${screens.max.toLocaleString()}`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${screensStatus.barColor}`}
              style={{ width: `${screensStatus.pct}%` }}
            />
          </div>
          <p className="text-[11px] text-[#6B778C] mt-2">
            {screensStatus.isUnlimited ? 'No quota limit' : `${screensStatus.pct}% of monthly capacity`}
          </p>
        </Card>

        {/* Projects */}
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
                <Folder className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">
                Active Projects
              </span>
            </div>
            <Badge variant={projectsStatus.badgeVariant}>{projectsStatus.badgeText}</Badge>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-black text-[#091E42]">
              {projectsStatus.isUnlimited ? '∞' : projects.used.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-[#6B778C]">
              {projectsStatus.isUnlimited ? 'Unlimited' : `/ ${projects.max.toLocaleString()}`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${projectsStatus.barColor}`}
              style={{ width: `${projectsStatus.pct}%` }}
            />
          </div>
          <p className="text-[11px] text-[#6B778C] mt-2">
            {projectsStatus.isUnlimited ? 'No project limit' : `${projectsStatus.pct}% projects allocated`}
          </p>
        </Card>

        {/* Storage */}
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-purple-50 text-purple-600">
                <HardDrive className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">
                Storage (GB)
              </span>
            </div>
            <Badge variant={storageStatus.badgeVariant}>{storageStatus.badgeText}</Badge>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-black text-[#091E42]">
              {storageStatus.isUnlimited ? '∞' : `${storage.usedGb.toFixed(1)} GB`}
            </span>
            <span className="text-xs font-semibold text-[#6B778C]">
              {storageStatus.isUnlimited ? 'Unlimited' : `/ ${storage.maxGb} GB`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${storageStatus.barColor}`}
              style={{ width: `${storageStatus.pct}%` }}
            />
          </div>
          <p className="text-[11px] text-[#6B778C] mt-2">
            {storageStatus.isUnlimited ? 'No storage limit' : `${storageStatus.pct}% storage utilized`}
          </p>
        </Card>
      </div>

      {/* ── Monthly Conversion Activity ──────────────────────────────────────── */}
      <Card variant="default" padding="lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0652CC]" />
            <h2 className="text-base font-bold text-[#091E42]">
              Conversion Activity (Last 6 Months)
            </h2>
          </div>
          <span className="text-xs text-[#6B778C] flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            6-month audit trail
          </span>
        </div>

        {monthlyConversions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#6B778C]">
            <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm font-semibold text-[#091E42]">No conversion activity recorded</p>
            <p className="text-xs mt-0.5">Conversions executed by this organization will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visual Bar Chart */}
            <div className="flex items-end gap-4 h-36 pt-4 px-2 border-b border-slate-100 pb-3">
              {monthlyConversions.map((item) => {
                const maxCount = Math.max(...monthlyConversions.map((d) => d.count), 1);
                const heightPct = Math.max(10, Math.round((item.count / maxCount) * 100));

                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs font-bold text-[#091E42]">{item.count}</span>
                    <div
                      className="w-full max-w-[48px] rounded-t bg-[#0652CC] opacity-80 hover:opacity-100 transition-opacity"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[11px] font-medium text-[#6B778C]">{item.month}</span>
                  </div>
                );
              })}
            </div>

            {/* Structured Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[#6B778C] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3 text-right">Screens Converted</th>
                    <th className="py-2.5 px-3 text-right">Share of Max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyConversions.map((item) => {
                    const shareText = screens.max === -1
                      ? 'N/A (Unlimited)'
                      : `${Math.round((item.count / screens.max) * 100)}%`;

                    return (
                      <tr key={item.month} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#091E42]">{item.month}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#0652CC]">{item.count}</td>
                        <td className="py-2.5 px-3 text-right text-[#6B778C]">{shareText}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UsageDashboardPage;
