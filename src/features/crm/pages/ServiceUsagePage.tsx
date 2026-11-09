import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Monitor,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { Button, PageHeader, StatCard } from '@/shared/ui';
import { crmApi } from '../api/crm.api';

export const ServiceUsagePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{ items: any[]; summary: any } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchServiceUsage = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await crmApi.getServiceUsage({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchTerm || undefined,
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load service usage:', err);
      setErrorMsg(err.message || 'Failed to load enterprise service usage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceUsage();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchServiceUsage();
  };

  const items = data?.items || [];
  const summary = data?.summary || {
    totalOrganizations: 0,
    totalAllocatedScreens: 0,
    totalUsedScreens: 0,
    utilizationPct: 0,
    nearCapacityCount: 0,
    exceededCount: 0,
  };

  const getCapacityStatusBadge = (usageStatus: string, pct: number) => {
    if (pct >= 100 || usageStatus === 'EXCEEDED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <ShieldAlert className="w-3 h-3 text-rose-600" /> At Quota (100%)
        </span>
      );
    }
    if (pct >= 80 || usageStatus === 'NEAR_CAPACITY') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" /> Near Limit ({pct}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Normal ({pct}%)
      </span>
    );
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <PageHeader
            title="Service Usage"
          />
          <p className="text-xs text-slate-500 mt-1">
            Real contract capacity allocation, active screen modernization quotas, and platform utilization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchServiceUsage}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/sales/enterprise-quotes')}
          >
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
            Manage Quota Proposals
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 font-bold">&times;</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Customer Organizations"
          value={summary.totalOrganizations}
          icon={Building2}
          subtext="Provisioned customer workspaces"
        />
        <StatCard
          label="Contracted Screen Capacity"
          value={summary.totalAllocatedScreens.toLocaleString()}
          icon={Monitor}
          subtext="Total screens licensed"
        />
        <StatCard
          label="Modernized Screen Usage"
          value={summary.totalUsedScreens.toLocaleString()}
          icon={CreditCard}
          subtext={`${summary.utilizationPct}% overall platform utilization`}
        />
        <StatCard
          label="Quota Attention Required"
          value={summary.nearCapacityCount + summary.exceededCount}
          icon={ShieldAlert}
          subtext={`${summary.nearCapacityCount} near limit, ${summary.exceededCount} exceeded`}
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search organization name, domain, or contract..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#244A70] focus:bg-white"
          />
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Capacity Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white outline-none focus:border-[#244A70]"
          >
            <option value="ALL">All Organizations</option>
            <option value="ACTIVE">Normal Capacity</option>
            <option value="NEAR_CAPACITY">Near Limit (&ge; 80%)</option>
            <option value="EXCEEDED">At / Exceeded Quota</option>
          </select>
        </div>
      </div>

      {/* Service Usage Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Organization & Domain</th>
                <th className="py-3 px-4">Engagement Mode</th>
                <th className="py-3 px-4">Active Contract</th>
                <th className="py-3 px-4 w-64">Screen Capacity</th>
                <th className="py-3 px-4">Programs & Projects</th>
                <th className="py-3 px-4">Seats & Storage</th>
                <th className="py-3 px-4">Quota Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-[#244A70]" />
                    Loading contracted capacity and usage data...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No customer organizations found.
                  </td>
                </tr>
              ) : (
                items.map((org) => {
                  const pct = org.screenCapacity.pct;
                  const barColor =
                    pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-[#244A70]';

                  return (
                    <tr key={org.organizationId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{org.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{org.domain}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          org.serviceMode === 'ALSM_MANAGED'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {org.serviceMode === 'ALSM_MANAGED' ? 'Managed Modernization Services' : 'Platform-Based Modernization'}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{org.engagementType}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-800 text-[11px]">
                          {org.contractNumber}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Expires: {formatDate(org.contractExpiresAt)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-800">
                            {org.screenCapacity.used} / {org.screenCapacity.allocated} Screens
                          </span>
                          <span className="font-mono text-slate-500">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${barColor}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {org.screenCapacity.remaining} screens remaining
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div>
                          <span className="font-semibold">{org.programCapacity.used}</span>
                          <span className="text-slate-400"> / {org.programCapacity.allocated} Programs</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          <span className="font-semibold">{org.projectCapacity.used}</span>
                          <span className="text-slate-400"> / {org.projectCapacity.allocated} Projects</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div>
                          <span className="font-semibold">{org.userSeats.used}</span>
                          <span className="text-slate-400"> / {org.userSeats.allocated} Seats</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          <span className="font-semibold">{org.storageGb.used}</span>
                          <span className="text-slate-400"> / {org.storageGb.allocated} GB</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getCapacityStatusBadge(org.usageStatus, pct)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/organizations/${org.organizationId}`)}
                          title="View Organization Workspace Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
