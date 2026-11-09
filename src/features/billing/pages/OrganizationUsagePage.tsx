import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Briefcase,
  Handshake,
  Globe,
  User,
  ShieldCheck,
  CheckCircle2,
  Download,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  FileText,
  Copy,
  Ban,
  Check,
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, toast } from '@/shared/ui';
import { organizationUsageApi } from '../api/organization-usage.api';
import type {
  OrganizationUsageItem,
  UsageHealthStatus,
} from '../types/organization-usage';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const OrganizationUsagePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialOrgId = searchParams.get('orgId') || null;

  const { hasPermission } = useAuth();
  const canManageQuotas = hasPermission('organizations.manage') || hasPermission('system.manage');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [subscriptionPlanFilter, setSubscriptionPlanFilter] = useState<string>('');
  const [serviceMode, setServiceMode] = useState<string>('');
  const [contractStatus, setContractStatus] = useState<string>('');
  const [health, setHealth] = useState<UsageHealthStatus | ''>('');
  const [orgStatusFilter, setOrgStatusFilter] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'NEAR_LIMIT' | 'OVER_QUOTA' | 'SUSPENDED'>('ALL');
  const [orgScopeFilter, setOrgScopeFilter] = useState<'ORGANIZATIONS_ONLY' | 'ENTERPRISE' | 'PARTNER' | 'ALL' | 'PERSONAL_ONLY'>('ORGANIZATIONS_ONLY');
  const [sortBy, setSortBy] = useState<string>('screenUsagePct');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showManageQuotasAlert, setShowManageQuotasAlert] = useState(false);

  // If orgId is present in query parameters, redirect to the full detail page
  useEffect(() => {
    if (initialOrgId) {
      navigate(`/admin/billing/usage/${initialOrgId}`);
    }
  }, [initialOrgId, navigate]);

  // Fetch summary metrics (scoped to organizations by default)
  const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['admin', 'organization-usage', 'summary', orgScopeFilter],
    queryFn: () =>
      organizationUsageApi.getUsageSummary({
        scope:
          orgScopeFilter === 'ALL'
            ? 'ALL'
            : orgScopeFilter === 'PERSONAL_ONLY'
            ? 'PERSONAL_ONLY'
            : 'ORGANIZATIONS_ONLY',
        organizationType:
          orgScopeFilter === 'ENTERPRISE' || orgScopeFilter === 'PARTNER'
            ? orgScopeFilter
            : undefined,
      }),
    staleTime: 1000 * 60,
  });

  // Fetch table data (scoped to organizations by default)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      'admin',
      'organization-usage',
      orgScopeFilter,
      searchTerm,
      subscriptionPlanFilter,
      serviceMode,
      contractStatus,
      health,
      orgStatusFilter,
      sortBy,
      sortOrder,
      page,
      limit,
    ],
    queryFn: () =>
      organizationUsageApi.listOrganizationUsage({
        search: searchTerm.trim() || undefined,
        serviceMode: (serviceMode as any) || undefined,
        contractStatus: contractStatus || undefined,
        health: health || undefined,
        scope:
          orgScopeFilter === 'ALL'
            ? 'ALL'
            : orgScopeFilter === 'PERSONAL_ONLY'
            ? 'PERSONAL_ONLY'
            : 'ORGANIZATIONS_ONLY',
        organizationType:
          orgScopeFilter === 'ENTERPRISE' || orgScopeFilter === 'PARTNER'
            ? orgScopeFilter
            : undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      }),
    staleTime: 1000 * 30,
  });

  const handleViewFullDetails = (orgId: string) => {
    navigate(`/admin/billing/usage/${orgId}`);
  };

  const handleAmendQuotaRoute = (orgId: string) => {
    navigate(`/admin/billing/usage/${orgId}/amend-quota`);
  };

  const handleContractAction = (item: OrganizationUsageItem) => {
    const hasContract = Boolean(
      item.contractStatus &&
      item.contractStatus !== 'NO_CONTRACT' &&
      item.contractNumber &&
      item.contractNumber !== 'CTR-DEFAULT'
    );
    if (hasContract) {
      navigate('/sales/enterprise-quotes');
    } else {
      const q = new URLSearchParams({
        orgId: item.organizationId,
        company: item.name || '',
      }).toString();
      navigate(`/sales/contracts/new?${q}`);
    }
  };

  const handleCopyOrgId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleManageQuotasClick = () => {
    if (!canManageQuotas) {
      setShowManageQuotasAlert(true);
      setTimeout(() => setShowManageQuotasAlert(false), 5000);
      return;
    }
    if (items.length > 0) {
      handleAmendQuotaRoute(items[0].organizationId);
    } else {
      toast.info('No organizations available to adjust quotas.');
    }
  };

  const handleExportReport = () => {
    const csvHeader =
      'Organization,ID,Service Mode,Subscription Plan,Contract,Contract Status,Screen Used,Screen Quota,Screen Pct,Over Quota Screens,Projects Used,Projects Quota,Storage Used GB,Storage Quota GB,Health,Status\n';
    const csvRows = items
      .map((o) => {
        const overScreens = Math.max(0, (o.screenUsage || 0) - (o.screenCapacity || 0));
        return `"${o.name}","${o.organizationId}","${o.serviceMode || 'CUSTOMER_SELF_SERVICE'}","${
          o.subscriptionPlan || 'Enterprise'
        }","${o.contractNumber || 'N/A'}","${o.contractStatus || 'ACTIVE'}",${o.screenUsage || 0},${
          o.screenCapacity || 0
        },${o.screenUsagePct || 0}%,${overScreens},${o.activeProjects || 0},${o.projectCapacity || 0},${
          o.storageUsageGb || 0
        },${o.storageCapacityGb || 0},"${o.health}","${o.orgStatus || 'ACTIVE'}"`;
      })
      .join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `ALSM_Organization_Usage_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setActionSuccessMessage('Organization Usage & Quotas report exported successfully.');
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSubscriptionPlanFilter('');
    setServiceMode('');
    setContractStatus('');
    setHealth('');
    setOrgStatusFilter('');
    setOrgScopeFilter('ORGANIZATIONS_ONLY');
    setQuickFilter('ALL');
    setSortBy('screenUsagePct');
    setSortOrder('desc');
    setPage(1);
  };

  const handleQuickFilterClick = (filterType: 'ALL' | 'NEAR_LIMIT' | 'OVER_QUOTA' | 'SUSPENDED') => {
    setQuickFilter(filterType);
    setPage(1);
    if (filterType === 'ALL') {
      setHealth('');
      setOrgStatusFilter('');
    } else if (filterType === 'NEAR_LIMIT') {
      setHealth('NEAR_LIMIT');
      setOrgStatusFilter('');
    } else if (filterType === 'OVER_QUOTA') {
      setHealth('EXCEEDED');
      setOrgStatusFilter('');
    } else if (filterType === 'SUSPENDED') {
      setHealth('');
      setOrgStatusFilter('SUSPENDED');
    }
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
      subscriptionPlanFilter ||
      serviceMode ||
      contractStatus ||
      health ||
      orgStatusFilter ||
      orgScopeFilter !== 'ORGANIZATIONS_ONLY' ||
      quickFilter !== 'ALL' ||
      sortBy !== 'screenUsagePct'
  );

  const rawItems = data?.items || [];
  // Client-side fallback filter for additional criteria and scope separation
  const items = rawItems.filter((item) => {
    if (orgScopeFilter === 'ORGANIZATIONS_ONLY') {
      const isPersonal =
        item.organizationType === 'SELF_SERVICE' ||
        item.name === 'Personal Workspace' ||
        item.name.toLowerCase().endsWith("'s organization");
      if (isPersonal) return false;
    } else if (orgScopeFilter === 'ENTERPRISE') {
      if (item.organizationType && item.organizationType !== 'ENTERPRISE') return false;
      if (item.name === 'Personal Workspace' || item.name.toLowerCase().endsWith("'s organization")) return false;
    } else if (orgScopeFilter === 'PARTNER') {
      if (item.organizationType !== 'PARTNER') return false;
    } else if (orgScopeFilter === 'PERSONAL_ONLY') {
      const isPersonal =
        item.organizationType === 'SELF_SERVICE' ||
        item.name === 'Personal Workspace' ||
        item.name.toLowerCase().endsWith("'s organization");
      if (!isPersonal) return false;
    }

    if (
      subscriptionPlanFilter &&
      !item.subscriptionPlan?.toLowerCase().includes(subscriptionPlanFilter.toLowerCase())
    ) {
      return false;
    }
    if (orgStatusFilter && item.orgStatus !== orgStatusFilter) {
      return false;
    }
    if (serviceMode) {
      const mode = (item.serviceMode || '').toUpperCase();
      if (serviceMode === 'HYBRID' && !mode.includes('HYBRID')) return false;
      if (serviceMode === 'ALSM_MANAGED' && !mode.includes('MANAGED') && !mode.includes('WE_CONVERT'))
        return false;
      if (serviceMode === 'CUSTOMER_SELF_SERVICE' && !mode.includes('SELF_SERVICE')) return false;
    }
    return true;
  });

  // Quota Health Badges
  const renderHealthBadge = (item: OrganizationUsageItem) => {
    const isOver = item.isOverQuota || (item.screenUsagePct ?? 0) > 100 || item.health === 'EXCEEDED';
    const isNear = (item.screenUsagePct ?? 0) >= 80 && !isOver;

    if (item.orgStatus === 'SUSPENDED' || item.health === 'SUSPENDED') {
      return (
        <Badge variant="danger" className="font-semibold gap-1">
          <Ban className="w-3 h-3 inline" /> Suspended
        </Badge>
      );
    }
    if (isOver) {
      return (
        <Badge variant="danger" className="font-bold bg-rose-100 text-rose-800 border-rose-300">
          <ShieldAlert className="w-3 h-3 inline mr-1 text-rose-600" />
          Over Quota
        </Badge>
      );
    }
    if (isNear || item.health === 'NEAR_LIMIT' || item.health === 'AT_LIMIT') {
      return (
        <Badge variant="warning" className="font-semibold bg-amber-100 text-amber-800 border-amber-300">
          <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-600" />
          Near Limit
        </Badge>
      );
    }
    return (
      <Badge variant="success" className="font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
        <CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-600" />
        Healthy
      </Badge>
    );
  };

  const renderServiceModeBadge = (mode?: string) => {
    const upper = (mode || 'CUSTOMER_SELF_SERVICE').toUpperCase();
    if (upper.includes('HYBRID')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          Hybrid
        </span>
      );
    }
    if (upper.includes('MANAGED') || upper.includes('WE_CONVERT')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          Managed Modernization Services
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-[#244A70] border border-blue-200">
        Platform-Based Modernization
      </span>
    );
  };

  const renderContractStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'TRIAL':
        return <Badge variant="secondary">Trial</Badge>;
      case 'EXPIRED':
        return <Badge variant="danger">Expired</Badge>;
      case 'SUSPENDED':
        return <Badge variant="danger">Suspended</Badge>;
      default:
        return <Badge variant="secondary">Pending / No Contract</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <PageHeader title="Organization Usage & Quotas" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportReport}
            className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#244A70]" />
            Export Report
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              refetch();
              refetchSummary();
            }}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            onClick={handleManageQuotasClick}
            className="inline-flex items-center gap-1.5 text-xs bg-[#244A70] hover:bg-[#244A70] text-white shadow-xs font-semibold"
          >
            <Sliders className="w-3.5 h-3.5" />
            Amend Quota
          </Button>
        </div>
      </div>

      {/* Permission alert for non-admin Manage Quotas */}
      {showManageQuotasAlert && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">
              Permission Required: Only Platform Administrators with organizations.manage can modify quota thresholds.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowManageQuotasAlert(false)}
            className="text-amber-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Feedback Alert */}
      {actionSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 5 Key KPIs Required by User ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 items-stretch">
        {/* 1. Total Organizations */}
        <div
          onClick={() => handleQuickFilterClick('ALL')}
          className={`h-full min-h-[120px] p-3.5 rounded-xl border-2 shadow-2xs cursor-pointer transition-all flex flex-col justify-between ${
            quickFilter === 'ALL' && !health && !orgStatusFilter
              ? 'bg-blue-50/70 border-[#244A70] shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5 h-6 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="w-4 h-4 shrink-0 text-[#244A70]" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                Total Organizations
              </span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100/70 text-[#244A70] border border-blue-200 shrink-0">
              Total
            </span>
          </div>
          <div className="text-2xl font-black text-[#17263A] leading-none my-1.5">
            {isSummaryLoading ? '...' : summary?.totalOrganizations ?? items.length}
          </div>
          <div
            className="text-xs text-slate-500 font-normal truncate"
            title={
              orgScopeFilter === 'ALL'
                ? 'All registered tenants'
                : orgScopeFilter === 'PERSONAL_ONLY'
                ? 'Personal workspaces only'
                : 'Enterprise & Partner Orgs'
            }
          >
            {orgScopeFilter === 'ALL'
              ? 'All registered tenants'
              : orgScopeFilter === 'PERSONAL_ONLY'
              ? 'Personal workspaces only'
              : 'Enterprise & Partner Orgs'}
          </div>
        </div>

        {/* 2. Active Subscriptions */}
        <div
          onClick={() => {
            setContractStatus('ACTIVE');
            setPage(1);
          }}
          className={`h-full min-h-[120px] p-3.5 rounded-xl border-2 shadow-2xs cursor-pointer transition-all flex flex-col justify-between ${
            contractStatus === 'ACTIVE'
              ? 'bg-emerald-50/70 border-emerald-600 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5 h-6 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider truncate">
                Active Subscriptions
              </span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
              Active
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 leading-none my-1.5">
            {isSummaryLoading
              ? '...'
              : summary?.activeOrganizations ??
                items.filter((o) => o.contractStatus === 'ACTIVE' || o.orgStatus === 'ACTIVE').length}
          </div>
          <div className="text-xs text-emerald-700 font-normal truncate" title="Active contract service">
            Active contract service
          </div>
        </div>

        {/* 3. Near Quota Limit */}
        <div
          onClick={() => handleQuickFilterClick('NEAR_LIMIT')}
          className={`h-full min-h-[120px] p-3.5 rounded-xl border-2 shadow-2xs cursor-pointer transition-all flex flex-col justify-between ${
            quickFilter === 'NEAR_LIMIT' || health === 'NEAR_LIMIT'
              ? 'bg-amber-50/70 border-amber-500 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5 h-6 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider truncate">
                Near Quota Limit
              </span>
            </div>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md shrink-0">
              ≥ 80%
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 leading-none my-1.5">
            {isSummaryLoading ? '...' : summary?.nearQuotaOrganizations ?? 0}
          </div>
          <div className="text-xs text-amber-700 font-normal truncate" title="Require upgrade consultation">
            Require upgrade consultation
          </div>
        </div>

        {/* 4. Over Quota */}
        <div
          onClick={() => handleQuickFilterClick('OVER_QUOTA')}
          className={`h-full min-h-[120px] p-3.5 rounded-xl border-2 shadow-2xs cursor-pointer transition-all flex flex-col justify-between ${
            quickFilter === 'OVER_QUOTA' || health === 'EXCEEDED'
              ? 'bg-rose-50/70 border-rose-600 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5 h-6 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider truncate">
                Over Quota
              </span>
            </div>
            <span className="text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md shrink-0">
              &gt; 100%
            </span>
          </div>
          <div className="text-2xl font-black text-rose-600 leading-none my-1.5">
            {isSummaryLoading ? '...' : summary?.exceededQuotaOrganizations ?? 0}
          </div>
          <div className="text-xs text-rose-700 font-normal truncate" title="Conversion blocked / Needs quota">
            Conversion blocked / Needs quota
          </div>
        </div>

        {/* 5. Suspended Organizations */}
        <div
          onClick={() => handleQuickFilterClick('SUSPENDED')}
          className={`h-full min-h-[120px] p-3.5 rounded-xl border-2 shadow-2xs cursor-pointer transition-all flex flex-col justify-between ${
            quickFilter === 'SUSPENDED' || orgStatusFilter === 'SUSPENDED'
              ? 'bg-slate-100 border-slate-600 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5 h-6 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Ban className="w-4 h-4 shrink-0 text-slate-500" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                Suspended Orgs
              </span>
            </div>
            <span className="text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-md shrink-0">
              Locked
            </span>
          </div>
          <div className="text-2xl font-black text-slate-700 leading-none my-1.5">
            {isSummaryLoading
              ? '...'
              : summary?.suspendedOrganizations ??
                items.filter((o) => o.orgStatus === 'SUSPENDED').length}
          </div>
          <div className="text-xs text-slate-600 font-normal truncate" title="Access paused by Admin">
            Access paused by Admin
          </div>
        </div>
      </div>

      {/* ── Filters Toolbar with Quick Filter Tabs ────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
        {/* Scope Selector: Enterprise Organizations vs All / Personal */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setOrgScopeFilter('ORGANIZATIONS_ONLY');
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                orgScopeFilter === 'ORGANIZATIONS_ONLY'
                  ? 'bg-[#1E293B] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Enterprise &amp; Partners</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOrgScopeFilter('ENTERPRISE');
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                orgScopeFilter === 'ENTERPRISE'
                  ? 'bg-[#1E293B] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Enterprise Only</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOrgScopeFilter('PARTNER');
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                orgScopeFilter === 'PARTNER'
                  ? 'bg-[#1E293B] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>Partners Only</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOrgScopeFilter('ALL');
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                orgScopeFilter === 'ALL'
                  ? 'bg-[#1E293B] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>All Tenants (Inc. Workspaces)</span>
            </button>
          </div>

          <div className="text-xs font-medium text-slate-600">
            {orgScopeFilter === 'ORGANIZATIONS_ONLY' ? (
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Displaying Enterprise &amp; Partner Organizations (Personal accounts filtered)
              </span>
            ) : orgScopeFilter === 'ENTERPRISE' ? (
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Briefcase className="w-4 h-4 text-slate-500" />
                Enterprise Organizations Only
              </span>
            ) : orgScopeFilter === 'PARTNER' ? (
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Handshake className="w-4 h-4 text-slate-500" />
                Partner Organizations Only
              </span>
            ) : orgScopeFilter === 'ALL' ? (
              <span className="inline-flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Full Tenant Scope (Including individual developer workspaces)
              </span>
            ) : orgScopeFilter === 'PERSONAL_ONLY' ? (
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <User className="w-4 h-4 text-slate-500" />
                Personal Developer Workspaces Only
              </span>
            ) : null}
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-1">Quick Views:</span>
          <button
            type="button"
            onClick={() => handleQuickFilterClick('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              quickFilter === 'ALL' && !health && !orgStatusFilter
                ? 'bg-[#17263A] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Organizations
          </button>
          <button
            type="button"
            onClick={() => handleQuickFilterClick('NEAR_LIMIT')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              quickFilter === 'NEAR_LIMIT' || health === 'NEAR_LIMIT'
                ? 'bg-[#B45309] text-white shadow-2xs'
                : 'bg-slate-50 text-amber-900 hover:bg-amber-100/60 border border-amber-300'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Organizations Near Limit (≥80%)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFilterClick('OVER_QUOTA')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              quickFilter === 'OVER_QUOTA' || health === 'EXCEEDED'
                ? 'bg-[#B91C1C] text-white shadow-2xs'
                : 'bg-slate-50 text-rose-900 hover:bg-rose-100/60 border border-rose-300'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            Organizations Over Quota (&gt;100%)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFilterClick('SUSPENDED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              quickFilter === 'SUSPENDED' || orgStatusFilter === 'SUSPENDED'
                ? 'bg-[#334155] text-white shadow-2xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            <Ban className="w-3 h-3" />
            Suspended Organizations
          </button>
        </div>

        {/* Detailed Filter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search organization, company, Org ID, domain..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70] focus:bg-white"
            />
          </div>

          {/* 2. Organization Scope */}
          <div>
            <select
              value={orgScopeFilter}
              onChange={(e) => {
                setOrgScopeFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            >
              <option value="ORGANIZATIONS_ONLY">Enterprise &amp; Partners</option>
              <option value="ENTERPRISE">Enterprise Only</option>
              <option value="PARTNER">Partners Only</option>
              <option value="ALL">All Tenants (Inc. Personal)</option>
              <option value="PERSONAL_ONLY">Personal Workspaces Only</option>
            </select>
          </div>

          {/* 3. Service Mode */}
          <div>
            <select
              value={serviceMode}
              onChange={(e) => {
                setServiceMode(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            >
              <option value="">All Service Modes</option>
              <option value="CUSTOMER_SELF_SERVICE">Platform-Based Modernization</option>
              <option value="ALSM_MANAGED">Managed Modernization Services</option>
              <option value="HYBRID">Hybrid Model</option>
            </select>
          </div>

          {/* 4. Subscription Plan */}
          <div>
            <select
              value={subscriptionPlanFilter}
              onChange={(e) => {
                setSubscriptionPlanFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            >
              <option value="">All Subscription Plans</option>
              <option value="Trial">Trial / Evaluation</option>
              <option value="Starter">Starter Plan</option>
              <option value="Professional">Professional</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          {/* 5. Contract Status */}
          <div>
            <select
              value={contractStatus}
              onChange={(e) => {
                setContractStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            >
              <option value="">All Contract States</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* 6. Usage Health */}
          <div>
            <select
              value={health}
              onChange={(e) => {
                setHealth(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            >
              <option value="">All Usage Health</option>
              <option value="HEALTHY">Normal (&lt;80%)</option>
              <option value="NEAR_LIMIT">Near Limit (80–89%)</option>
              <option value="AT_LIMIT">Critical (90–99%)</option>
              <option value="EXCEEDED">Over Quota (≥100%)</option>
              <option value="CONTRACT_EXPIRING">Expiring Soon (≤30d)</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {/* Row 2: Secondary Options & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Sort by:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so as 'asc' | 'desc');
                setPage(1);
              }}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
            >
              <option value="screenUsagePct-desc">Highest Screen Usage (Over Quota first)</option>
              <option value="screenUsagePct-asc">Lowest Screen Usage</option>
              <option value="name-asc">Organization Name (A-Z)</option>
              <option value="daysUntilContractExpiry-asc">Nearest Contract Expiry</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Organization Table with 9 Standard Columns ────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <Card variant="outline" padding="lg">
          <div role="alert" className="flex items-center gap-3 text-rose-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Failed to load organization usage data</p>
              <p className="text-xs text-rose-500 mt-0.5">{(error as any)?.message || 'Server error'}</p>
            </div>
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card variant="outline" padding="lg" className="bg-white border-slate-200">
          <div className="py-12 text-center space-y-2">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No Organizations Found</h4>
            <p className="text-xs text-slate-500">
              No customer organizations match the active search or filter criteria.
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2">
                Clear Filters
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-3">Service Mode</th>
                  <th className="py-3 px-3">Subscription Plan</th>
                  <th className="py-3 px-3">Contract Status</th>
                  <th className="py-3 px-4 min-w-[210px]">Screen Usage</th>
                  <th className="py-3 px-3 min-w-[130px]">Project Usage</th>
                  <th className="py-3 px-3 min-w-[130px]">Storage Usage</th>
                  <th className="py-3 px-3">Usage Health</th>
                  <th className="py-3 px-4 text-right min-w-[220px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.map((item) => {
                  const screenCap = item.screenCapacity || 20;
                  const screenUsage = item.screenUsage || 0;
                  const screenPct = item.screenUsagePct ?? Math.round((screenUsage / screenCap) * 100);
                  const isOverQuota = item.isOverQuota || screenUsage > screenCap;
                  const overQuotaScreens = item.overQuotaScreens ?? Math.max(0, screenUsage - screenCap);

                  const projectCap = item.projectCapacity || 10;
                  const activeProjects = item.activeProjects || 0;
                  const projectPct = projectCap > 0 ? Math.round((activeProjects / projectCap) * 100) : 0;

                  const storageCap = item.storageCapacityGb || 5;
                  const storageUsage = item.storageUsageGb || 0;
                  const storagePct = storageCap > 0 ? Math.round((storageUsage / storageCap) * 100) : 0;

                  return (
                    <tr
                      key={item.organizationId}
                      onClick={() => handleViewFullDetails(item.organizationId)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                        isOverQuota ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* 1. Organization: Name, Org ID, Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[#17263A] group-hover:text-[#244A70] transition-colors text-sm">
                            {item.name}
                          </span>
                          {/* Organization Type Badge */}
                          {item.organizationType === 'PARTNER' ? (
                            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-semibold uppercase">
                              PARTNER
                            </span>
                          ) : item.organizationType === 'INTERNAL' ? (
                            <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-semibold uppercase">
                              INTERNAL
                            </span>
                          ) : item.organizationType === 'SELF_SERVICE' ||
                            item.name.toLowerCase().endsWith("'s organization") ||
                            item.name === 'Personal Workspace' ? (
                            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-semibold uppercase">
                              PERSONAL
                            </span>
                          ) : (
                            <span className="text-xs bg-blue-50 text-[#244A70] border border-blue-200 px-2 py-0.5 rounded font-semibold uppercase">
                              ENTERPRISE
                            </span>
                          )}
                          {item.orgStatus === 'SUSPENDED' && (
                            <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-semibold">
                              SUSPENDED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 mt-0.5">
                          <span>{item.organizationId}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyOrgId(item.organizationId, e)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Copy Org ID"
                          >
                            {copiedId === item.organizationId ? (
                              <Check className="w-3 h-3 text-emerald-600 inline" />
                            ) : (
                              <Copy className="w-3 h-3 inline" />
                            )}
                          </button>
                          {item.domain && (
                            <span className="font-sans text-slate-500 font-medium">
                              • {item.domain}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Service Mode */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {renderServiceModeBadge(item.serviceMode)}
                      </td>

                      {/* 3. Subscription Plan */}
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800 block text-xs">
                          {item.subscriptionPlan || 'Trial'}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {item.contractNumber || 'CTR-DEFAULT'}
                        </span>
                      </td>

                      {/* 4. Contract Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {renderContractStatusBadge(item.contractStatus)}
                      </td>

                      {/* 5. Screen Usage (with accurate over-quota visualization) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">
                              {screenUsage} / {screenCap} screens
                            </span>
                            <span
                              className={`font-mono font-bold ${
                                isOverQuota
                                  ? 'text-rose-600'
                                  : screenPct >= 80
                                  ? 'text-amber-600'
                                  : 'text-slate-600'
                              }`}
                            >
                              {screenPct}%
                            </span>
                          </div>

                          {/* Progress Bar: turns red when over-quota */}
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isOverQuota
                                  ? 'bg-rose-500'
                                  : screenPct >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-[#244A70]'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, screenPct))}%` }}
                            />
                          </div>

                          {/* Contextual Over Quota Notice */}
                          {isOverQuota ? (
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded">
                                +{overQuotaScreens} screens exceeded
                              </span>
                              <span className="text-xs font-semibold text-rose-600">
                                Conversion blocked
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 block font-normal">
                              {item.remainingScreens ?? Math.max(0, screenCap - screenUsage)} remaining
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Project Usage */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">
                              {activeProjects} / {projectCap}
                            </span>
                            <span className="font-mono text-slate-500 text-xs">{projectPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-emerald-600 transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, projectPct))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 7. Storage Usage */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">
                              {storageUsage} / {storageCap} GB
                            </span>
                            <span className="font-mono text-slate-500 text-xs">{storagePct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-purple-600 transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, storagePct))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 8. Usage Health */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {renderHealthBadge(item)}
                      </td>

                      {/* 9. Actions: View Full Details, Amend Quota, View Contract */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Full Details Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewFullDetails(item.organizationId)}
                            className="text-xs py-1.5 px-3 bg-[#17263A] text-white hover:bg-[#1E293B] font-semibold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer border-[#17263A]"
                          >
                            <span>Details</span>
                            <ArrowRight className="w-3 h-3 text-white/80" />
                          </Button>

                          {/* Amend Quota Button */}
                          {canManageQuotas && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAmendQuotaRoute(item.organizationId)}
                              className={`text-xs py-1.5 px-2.5 font-semibold ${
                                isOverQuota
                                  ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                                  : 'text-[#244A70] border-blue-200 hover:bg-blue-50'
                              }`}
                              title="Amend capacity & contract quotas"
                            >
                              Amend
                            </Button>
                          )}

                          {/* View or Create Contract Button */}
                          <button
                            type="button"
                            onClick={() => handleContractAction(item)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                            title={
                              item.contractStatus && item.contractStatus !== 'NO_CONTRACT'
                                ? 'View Legal Contract in CRM'
                                : 'Create Enterprise Contract'
                            }
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="px-4 py-3 border-t border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                Showing {items.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
                {Math.min(page * limit, data?.total || items.length)} of {data?.total || items.length} organizations
              </span>
              <span className="text-slate-300">|</span>
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded font-semibold text-slate-700"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-xs px-2.5 py-1 bg-white"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-2 font-semibold text-slate-700">
                Page {page} of {data?.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data?.totalPages || 1, p + 1))}
                disabled={page >= (data?.totalPages || 1)}
                className="text-xs px-2.5 py-1 bg-white"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
