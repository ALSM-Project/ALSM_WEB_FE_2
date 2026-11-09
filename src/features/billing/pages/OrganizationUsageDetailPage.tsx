import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  FileText,
  Layers,
  Monitor,
  FolderKanban,
  HardDrive,
  Users,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  Copy,
  History,
  TrendingUp,
  Cpu,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useNavigation } from '@/context/NavigationContext';
import { organizationUsageApi } from '../api/organization-usage.api';
import type { OrganizationUsageDetail } from '../types/organization-usage';

export const OrganizationUsageDetailPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setCustomBreadcrumbs } = useNavigation();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'quotas' | 'analytics' | 'activity' | 'contract' | 'audit'
  >('overview');
  const [copiedId, setCopiedId] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch Organization Usage Detail
  const { data: org, isLoading, isError, error, refetch } = useQuery<OrganizationUsageDetail>({
    queryKey: ['admin', 'organization-usage', 'detail', orgId],
    queryFn: () => organizationUsageApi.getOrganizationUsageDetail(orgId!),
    enabled: Boolean(orgId),
    staleTime: 30_000,
  });

  // Breadcrumb integration
  useEffect(() => {
    if (org) {
      setCustomBreadcrumbs([
        { label: 'Organizations', path: '/admin/billing/usage' },
        { label: org.name || 'Organization Dossier' },
      ]);
      return () => {
        setCustomBreadcrumbs(null);
      };
    }
  }, [org, setCustomBreadcrumbs]);

  // Suspend / Reactivate Mutation
  const statusMutation = useMutation({
    mutationFn: (action: 'SUSPEND' | 'REACTIVATE') =>
      organizationUsageApi.updateServiceStatus(orgId!, {
        action,
        reason: action === 'SUSPEND' ? 'Administrative suspension due to quota policy / audit' : 'Reactivated by Platform Admin',
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organization-usage'] });
      setActionSuccess(`Organization service successfully ${res.status.toLowerCase()}!`);
      setTimeout(() => setActionSuccess(null), 4000);
      refetch();
    },
  });

  const copyOrgId = () => {
    if (!org) return;
    navigator.clipboard.writeText(org.organizationId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-white rounded-xl border border-slate-200" />
        <div className="h-96 bg-white rounded-xl border border-slate-200" />
      </div>
    );
  }

  if (isError || !org) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Failed to load organization</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {(error as any)?.message || `Could not find organization with ID ${orgId}`}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/billing/usage')}>
          Return to Service Usage & Quotas
        </Button>
      </div>
    );
  }

  const isOverQuota = org.screenUsage > org.screenCapacity;
  const overQuotaCount = Math.max(0, org.screenUsage - org.screenCapacity);
  const screenPct = org.screenCapacity > 0 ? Math.round((org.screenUsage / org.screenCapacity) * 100) : 0;
  const projectPct = org.projectCapacity > 0 ? Math.round((org.activeProjects / org.projectCapacity) * 100) : 0;
  const storagePct = org.storageCapacityGb > 0 ? Math.round((org.storageUsageGb / org.storageCapacityGb) * 100) : 0;

  const hasActiveContract = Boolean(
    ((org as any).contractId || org.contractHistory?.contractId) &&
    org.contractStatus !== 'NO_CONTRACT' &&
    org.contractNumber &&
    org.contractNumber !== 'CTR-DEFAULT'
  );

  const handleContractAction = () => {
    const contractId = (org as any).contractId || org.contractHistory?.contractId;
    if (hasActiveContract && contractId) {
      navigate(`/sales/contracts/${contractId}`);
    } else if (hasActiveContract) {
      navigate('/sales/enterprise-quotes');
    } else {
      const q = new URLSearchParams({
        orgId: org.organizationId,
        company: org.name || '',
        email: org.contactEmail || '',
      }).toString();
      navigate(`/sales/contracts/new?${q}`);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 pb-3">
        <PageHeader
          title="Organization Usage & Entitlements"
          className="mb-0"
        />
      </div>

      {/* ── Action Success Alert ────────────────────────────────────────── */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold">&times;</button>
        </div>
      )}

      {/* ── Over Quota Breach Warning Banner ────────────────────────────── */}
      {isOverQuota && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-rose-900">
                  CRITICAL: Resource Quota Breached ({screenPct}% Capacity Consumed)
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-600 text-white uppercase">
                  Over Quota (+{overQuotaCount} screens)
                </span>
              </div>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                This organization has converted <strong>{org.screenUsage}</strong> screens against an authorized entitlement limit of <strong>{org.screenCapacity}</strong> screens.
                Conversion worker execution is <strong>BLOCKED</strong> until an authorized quota amendment or contract upgrade is provisioned.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/admin/billing/usage/${org.organizationId}/amend-quota`)}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-xs text-xs font-bold"
            >
              <Sliders className="w-3.5 h-3.5 mr-1.5" />
              Amend Quota Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleContractAction}
              className="bg-white border-rose-300 text-rose-800 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
            >
              {hasActiveContract ? 'View Contract' : 'Create Contract'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Organization Header Card ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#DCE3EC] p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-5 border-b border-[#F4F7FB]">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EEF1F6] border border-[#BFDBFE] flex items-center justify-center text-[#244A70] font-bold text-xl shadow-xs">
              <Building2 className="w-7 h-7 text-[#244A70]" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-[#17263A]">{org.name}</h1>
                <Badge
                  variant={
                    org.orgStatus === 'ACTIVE'
                      ? 'success'
                      : org.orgStatus === 'SUSPENDED'
                      ? 'danger'
                      : 'secondary'
                  }
                >
                  {org.orgStatus}
                </Badge>
                {isOverQuota ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    OVER QUOTA (+{overQuotaCount})
                  </span>
                ) : screenPct >= 80 ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    NEAR LIMIT ({screenPct}%)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL HEALTH
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#8491A3]">
                <button
                  type="button"
                  onClick={copyOrgId}
                  className="flex items-center gap-1 font-mono hover:text-[#17263A] transition-colors cursor-pointer"
                  title="Click to copy Org ID"
                >
                  <span>Org ID: {org.organizationId}</span>
                  <Copy className="w-3 h-3" />
                  {copiedId && <span className="text-emerald-600 font-bold ml-1">Copied!</span>}
                </button>
                <span>•</span>
                <span>Contact: {org.contactEmail || 'No email registered'}</span>
                <span>•</span>
                <span>Mode: <strong className="text-[#17263A]">{org.serviceMode.replace(/_/g, ' ')}</strong></span>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/admin/billing/usage/${org.organizationId}/amend-quota`)}
              className="bg-[#244A70] hover:bg-[#244A70] text-white shadow-xs font-bold text-xs"
            >
              <Sliders className="w-3.5 h-3.5 mr-1.5" />
              Amend Quota
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleContractAction}
              className="text-[#17263A] font-semibold text-xs border-[#DCE3EC] hover:bg-slate-50 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>{hasActiveContract ? 'View Contract' : 'Create Contract'}</span>
            </Button>

            {org.orgStatus === 'SUSPENDED' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => statusMutation.mutate('REACTIVATE')}
                disabled={statusMutation.isPending}
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs font-semibold"
              >
                <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                Reactivate Service
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => statusMutation.mutate('SUSPEND')}
                disabled={statusMutation.isPending}
                className="text-rose-700 border-rose-300 hover:bg-rose-50 text-xs font-semibold"
              >
                <PauseCircle className="w-3.5 h-3.5 mr-1.5" />
                Suspend Service
              </Button>
            )}
          </div>
        </div>

        {/* Header Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 pt-5 text-xs">
          <div>
            <span className="text-xs font-bold text-[#8491A3] uppercase tracking-wide">Contract Number</span>
            <p className="font-bold text-[#17263A] font-mono mt-0.5">{org.contractNumber || 'CTR-DEFAULT'}</p>
          </div>
          <div>
            <span className="text-xs font-bold text-[#8491A3] uppercase tracking-wide">Subscription Plan</span>
            <p className="font-bold text-[#17263A] mt-0.5">{org.subscriptionPlan}</p>
          </div>
          <div>
            <span className="text-xs font-bold text-[#8491A3] uppercase tracking-wide">Contract Status</span>
            <p className="font-bold text-[#17263A] mt-0.5">{org.contractStatus}</p>
          </div>
          <div>
            <span className="text-xs font-bold text-[#8491A3] uppercase tracking-wide">Contract Expiry</span>
            <p className="font-bold text-[#17263A] mt-0.5">
              {org.contractExpiresAt ? new Date(org.contractExpiresAt).toLocaleDateString('en-US') : 'Evaluation (No expiry)'}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-[#8491A3] uppercase tracking-wide">Concurrent Jobs</span>
            <p className="font-bold text-[#17263A] mt-0.5">{org.concurrentJobsLimit} concurrent workers</p>
          </div>
          <div>
            <span className="text-xs font-bold text-[#8491A3] uppercase tracking-wide">Team Members</span>
            <p className="font-bold text-[#17263A] mt-0.5">{org.membersCount} active users</p>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 flex flex-wrap gap-2 shadow-2xs">
        {[
          { key: 'overview', label: 'Overview', icon: Building2 },
          { key: 'quotas', label: 'Quotas & Entitlements', icon: Layers },
          { key: 'analytics', label: 'Usage Analytics', icon: TrendingUp },
          { key: 'activity', label: 'Conversion Activity', count: org.recentActivities?.length, icon: Activity },
          { key: 'contract', label: 'Contract Details', icon: FileText },
          { key: 'audit', label: 'Audit Log', count: org.auditHistory?.length, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-[#244A70] text-[#244A70] bg-blue-50/40'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#244A70]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-[#244A70] text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Overview ─────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Resource Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Screen Capacity */}
            <Card className="border border-[#DCE3EC] bg-white p-5 shadow-2xs rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-[#17263A] flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-[#244A70]" />
                  Screen Modernization Capacity
                </span>
                <span className={`text-xs font-mono font-bold ${isOverQuota ? 'text-rose-600' : 'text-[#244A70]'}`}>
                  {screenPct}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all duration-300 ${isOverQuota ? 'bg-rose-500' : screenPct >= 80 ? 'bg-amber-500' : 'bg-[#244A70]'}`}
                  style={{ width: `${Math.min(100, screenPct)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-xs text-slate-500 block uppercase font-medium">Consumed</span>
                  <span className={`font-bold ${isOverQuota ? 'text-rose-600' : 'text-slate-900'}`}>{org.screenUsage}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-xs text-slate-500 block uppercase font-medium">Authorized</span>
                  <span className="font-bold text-slate-900">{org.screenCapacity}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-xs text-slate-500 block uppercase font-medium">Remaining</span>
                  <span className={`font-bold ${org.remainingScreens <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {org.remainingScreens}
                  </span>
                </div>
              </div>
              {isOverQuota && (
                <p className="text-xs text-rose-600 font-semibold text-center bg-rose-50 py-1 rounded">
                  +{overQuotaCount} screens over quota limit
                </p>
              )}
            </Card>

            {/* 2. Projects */}
            <Card className="border border-[#DCE3EC] bg-white p-5 shadow-2xs rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-[#17263A] flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-emerald-600" />
                  Active Project Slots
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700">{projectPct}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div className="h-full bg-emerald-600 transition-all duration-300" style={{ width: `${Math.min(100, projectPct)}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-xs text-slate-500 block uppercase font-medium">Active</span>
                  <span className="font-bold text-slate-900">{org.activeProjects}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-xs text-slate-500 block uppercase font-medium">Limit</span>
                  <span className="font-bold text-slate-900">{org.projectCapacity}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-xs text-slate-500 block uppercase font-medium">Available</span>
                  <span className="font-bold text-emerald-700">{org.remainingProjects}</span>
                </div>
              </div>
            </Card>

            {/* 3. Storage */}
            <Card className="border border-[#DCE3EC] bg-white p-5 shadow-2xs rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-[#17263A] flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-600" />
                  Storage Allowance
                </span>
                <span className="text-xs font-mono font-bold text-purple-700">{storagePct}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div className="h-full bg-purple-600 transition-all duration-300" style={{ width: `${Math.min(100, storagePct)}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-xs text-slate-500 block uppercase font-medium">Used</span>
                  <span className="font-bold text-slate-900">{org.storageUsageGb} GB</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-xs text-slate-500 block uppercase font-medium">Cap</span>
                  <span className="font-bold text-slate-900">{org.storageCapacityGb} GB</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-xs text-slate-500 block uppercase font-medium">Free</span>
                  <span className="font-bold text-purple-700">{org.remainingStorageGb} GB</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Entitlement Sync & Web 3 Gateway Info */}
          <div className="p-5 rounded-xl bg-white border border-[#DCE3EC] shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-[#17263A] uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#244A70]" />
              Source of Truth & Web 3 Entitlement Projection
            </h3>
            <p className="text-xs text-[#8491A3] leading-relaxed">
              Quotas defined on this contract are projected in real-time to the customer Web 3 client portal. When conversions exceed limits, the compiler engine throttles new upload requests until capacity is increased via the <strong>Amend Quota</strong> workflow.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab 2: Quotas & Entitlements ─────────────────────────────────── */}
      {activeTab === 'quotas' && (
        <Card className="border border-[#DCE3EC] bg-white p-6 shadow-2xs rounded-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#F4F7FB]">
            <div>
              <h2 className="text-sm font-bold text-[#17263A]">Authorized Service Limits & Entitlements</h2>
              <p className="text-xs text-[#8491A3]">Contractual capacity bounds assigned to {org.name}</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/admin/billing/usage/${org.organizationId}/amend-quota`)}
              className="bg-[#244A70] text-xs font-bold"
            >
              <Sliders className="w-3.5 h-3.5 mr-1.5" />
              Amend Quota
            </Button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                <tr>
                  <th className="py-3 px-4">Resource Dimension</th>
                  <th className="py-3 px-4">Authorized Quota</th>
                  <th className="py-3 px-4">Currently Consumed</th>
                  <th className="py-3 px-4">Remaining Available</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[#244A70]" />
                    Screen Modernization Capacity
                  </td>
                  <td className="py-3.5 px-4 font-bold">{org.screenCapacity} screens</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{org.screenUsage} screens</td>
                  <td className="py-3.5 px-4">
                    {isOverQuota ? (
                      <span className="text-rose-600 font-bold">-{overQuotaCount} screens (Exceeded)</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">{org.remainingScreens} screens</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {isOverQuota ? (
                      <Badge variant="danger">Over Quota</Badge>
                    ) : screenPct >= 80 ? (
                      <Badge variant="warning">Near Limit</Badge>
                    ) : (
                      <Badge variant="success">Normal</Badge>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-emerald-600" />
                    Active Project Slots
                  </td>
                  <td className="py-3.5 px-4 font-bold">{org.projectCapacity} projects</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{org.activeProjects} active</td>
                  <td className="py-3.5 px-4 text-emerald-700 font-bold">{org.remainingProjects} available</td>
                  <td className="py-3.5 px-4"><Badge variant="success">Normal</Badge></td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-purple-600" />
                    Artifact & Source Storage
                  </td>
                  <td className="py-3.5 px-4 font-bold">{org.storageCapacityGb} GB</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{org.storageUsageGb} GB</td>
                  <td className="py-3.5 px-4 text-purple-700 font-bold">{org.remainingStorageGb} GB</td>
                  <td className="py-3.5 px-4"><Badge variant="success">Normal</Badge></td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-amber-600" />
                    Concurrent Conversion Workers
                  </td>
                  <td className="py-3.5 px-4 font-bold">{org.concurrentJobsLimit} concurrent workers</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{org.activeJobs || 0} running</td>
                  <td className="py-3.5 px-4 text-slate-700 font-bold">{org.concurrentJobsLimit - (org.activeJobs || 0)} slots</td>
                  <td className="py-3.5 px-4"><Badge variant="success">Available</Badge></td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Team User Seats
                  </td>
                  <td className="py-3.5 px-4 font-bold">10 seats</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{org.membersCount} assigned</td>
                  <td className="py-3.5 px-4 text-emerald-700 font-bold">{Math.max(0, 10 - org.membersCount)} seats left</td>
                  <td className="py-3.5 px-4"><Badge variant="success">Normal</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Tab 3: Usage Analytics ───────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <Card className="border border-[#DCE3EC] bg-white p-6 shadow-2xs rounded-xl space-y-6">
          <div className="pb-3 border-b border-[#F4F7FB]">
            <h2 className="text-sm font-bold text-[#17263A]">6-Month Consumption & Conversion Velocity</h2>
            <p className="text-xs text-[#8491A3]">Monthly volume of modernized screens and job success rates</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {org.monthlyTrends?.map((m) => (
              <div key={`${m.year}-${m.month}`} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase">{m.monthLabel}</span>
                <div className="text-xl font-extrabold text-[#244A70]">{m.screensConverted}</div>
                <span className="text-xs text-slate-500 block">screens converted</span>
                <div className="flex items-center justify-center gap-2 text-xs pt-1 border-t border-slate-200">
                  <span className="text-emerald-600 font-semibold">{m.successfulJobs} ok</span>
                  <span className="text-rose-600 font-semibold">{m.failedJobs} err</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Tab 4: Conversion Activity ───────────────────────────────────── */}
      {activeTab === 'activity' && (
        <Card className="border border-[#DCE3EC] bg-white p-6 shadow-2xs rounded-xl space-y-4">
          <div className="pb-3 border-b border-[#F4F7FB]">
            <h2 className="text-sm font-bold text-[#17263A]">Recent Conversion Runs & Workload</h2>
            <p className="text-xs text-[#8491A3]">Audited conversion executions consuming tenant screen quota</p>
          </div>

          {(!org.recentActivities || org.recentActivities.length === 0) ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No recent conversion jobs recorded for this organization.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                  <tr>
                    <th className="py-3 px-4">Job ID</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Started At</th>
                    <th className="py-3 px-4">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {org.recentActivities.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{act.id.slice(-8)}</td>
                      <td className="py-3 px-4 font-sans text-slate-700">{act.projectName || act.projectId.slice(-8)}</td>
                      <td className="py-3 px-4 font-sans text-slate-600">{act.conversionType}</td>
                      <td className="py-3 px-4 font-sans">
                        <Badge variant={act.status === 'COMPLETED' ? 'success' : act.status === 'FAILED' ? 'danger' : 'info'}>
                          {act.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {act.startedAt ? new Date(act.startedAt).toLocaleString('en-US') : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {act.durationSeconds ? `${act.durationSeconds}s` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Tab 5: Contract Details ──────────────────────────────────────── */}
      {activeTab === 'contract' && (
        <Card className="border border-[#DCE3EC] bg-white p-6 shadow-2xs rounded-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F4F7FB]">
            <div>
              <h2 className="text-sm font-bold text-[#17263A]">Contractual Terms & Service Agreement</h2>
              <p className="text-xs text-[#8491A3]">Legal binding terms establishing service mode and quotas</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleContractAction}
                className="bg-[#244A70] hover:bg-[#244A70] text-white text-xs font-bold"
              >
                {hasActiveContract ? 'Open Contract Details' : 'Create Contract Now'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/sales/enterprise-quotes')}
                className="text-xs"
              >
                Open Quotes & Contracts
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-xs font-bold text-[#8491A3] uppercase">Contract Entity</span>
              <p className="font-bold text-slate-900">{org.companyName || org.name}</p>
              <p className="text-slate-600">Contract Number: <strong className="font-mono">{org.contractNumber || 'CTR-DEFAULT'}</strong></p>
              <p className="text-slate-600">Contract Status: <span className="font-bold text-emerald-700">{org.contractStatus}</span></p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-xs font-bold text-[#8491A3] uppercase">Subscription Model</span>
              <p className="font-bold text-slate-900">{org.subscriptionPlan}</p>
              <p className="text-slate-600">Service Delivery: <strong>{org.serviceMode}</strong></p>
              <p className="text-slate-600">
                Renewal / Expiry: <strong>{org.contractExpiresAt ? new Date(org.contractExpiresAt).toLocaleDateString('en-US') : 'Permanent'}</strong>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab 6: Audit Log ─────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <Card className="border border-[#DCE3EC] bg-white p-6 shadow-2xs rounded-xl space-y-4">
          <div className="pb-3 border-b border-[#F4F7FB]">
            <h2 className="text-sm font-bold text-[#17263A]">Quota Amendments & Service Action Audit Trail</h2>
            <p className="text-xs text-[#8491A3]">Immutable log of quota changes, justifications, and administrator actors</p>
          </div>

          {(!org.auditHistory || org.auditHistory.length === 0) ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No quota modifications or service events recorded in the audit ledger yet.
            </div>
          ) : (
            <div className="space-y-3">
              {org.auditHistory.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#17263A]">{item.action.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-mono text-slate-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('en-US') : 'Recent'}
                    </span>
                  </div>
                  <p className="text-[#8491A3]">Actor: <strong>{item.actorEmail || item.actorUserId || 'System Administrator'}</strong></p>
                  {item.metadata && (
                    <div className="p-2 bg-white rounded-lg border border-slate-200 mt-2 font-mono text-xs text-slate-700">
                      {Object.entries(item.metadata).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-slate-400">{k}:</span>
                          <span>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
