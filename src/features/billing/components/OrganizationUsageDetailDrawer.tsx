import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  BarChart2,
  FileText,
  Folder,
  HardDrive,
  Monitor,
  Power,
  RefreshCw,
  Shield,
  ShieldCheck,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Badge, Button } from '@/shared/ui';
import { organizationUsageApi } from '../api/organization-usage.api';
import type { OrganizationUsageItem, UsageHealthStatus } from '../types/organization-usage';

interface OrganizationUsageDetailDrawerProps {
  organizationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAmendment: (org: OrganizationUsageItem) => void;
  onOpenStatusModal: (org: OrganizationUsageItem) => void;
}

export const OrganizationUsageDetailDrawer: React.FC<OrganizationUsageDetailDrawerProps> = ({
  organizationId,
  isOpen,
  onClose,
  onOpenAmendment: _onOpenAmendment,
  onOpenStatusModal,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'quotas' | 'trends' | 'activity' | 'contract' | 'audit'>('quotas');

  const { data: detail, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'organization-usage', organizationId],
    queryFn: () => organizationUsageApi.getOrganizationUsageDetail(organizationId!),
    enabled: isOpen && !!organizationId,
    staleTime: 1000 * 30,
  });

  if (!isOpen || !organizationId) return null;

  const getHealthBadge = (health: UsageHealthStatus) => {
    switch (health) {
      case 'HEALTHY':
        return <Badge variant="success">Healthy</Badge>;
      case 'NEAR_LIMIT':
        return <Badge variant="warning">Near Limit</Badge>;
      case 'AT_LIMIT':
        return <Badge variant="warning">At Quota Limit</Badge>;
      case 'EXCEEDED':
        return <Badge variant="danger">Quota Exceeded</Badge>;
      case 'CONTRACT_EXPIRING':
        return <Badge variant="warning">Contract Expiring</Badge>;
      case 'CONTRACT_EXPIRED':
        return <Badge variant="danger">Contract Expired</Badge>;
      case 'SUSPENDED':
        return <Badge variant="danger">Suspended</Badge>;
      default:
        return <Badge variant="secondary">Data Unavailable</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[#17263A] shadow-xs">
              {detail?.organizationId || organizationId}
            </span>
            {detail && getHealthBadge(detail.health)}
            {detail?.orgStatus === 'SUSPENDED' && (
              <Badge variant="danger">Suspended Access</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              title="Refresh usage statistics"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading / Error States */}
        {isLoading ? (
          <div className="p-8 space-y-4">
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-1/2" />
            <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        ) : isError || !detail ? (
          <div className="p-8">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-start gap-3 text-rose-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Failed to load organization usage detail</h4>
                <p className="text-xs text-rose-600 mt-1">{(error as any)?.message || 'Unknown error'}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Organization Identity Card */}
            <div className="px-6 py-4 bg-white border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#17263A] leading-snug">
                    {detail.name || 'Organization Details'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      Mode: {(detail.serviceMode || 'CUSTOMER_SELF_SERVICE').replace(/_/g, ' ')}
                    </span>
                    <span>•</span>
                    <span>Plan: {detail.subscriptionPlan || 'Enterprise Standard'}</span>
                    {detail.domain && (
                      <>
                        <span>•</span>
                        <span>{detail.domain}</span>
                      </>
                    )}
                    {detail.contractNumber && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-semibold text-slate-700">
                          Contract: {detail.contractNumber}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      onClose();
                      navigate(`/admin/billing/usage/${detail.organizationId}`);
                    }}
                    className="text-xs inline-flex items-center gap-1.5 bg-[#244A70] hover:bg-[#244A70] text-white shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Full Details
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onClose();
                      navigate(`/admin/billing/usage/${detail.organizationId}/amend-quota`);
                    }}
                    className="text-xs inline-flex items-center gap-1.5 text-[#244A70] border-[#244A70]/30 hover:bg-blue-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Amend Quota
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => onOpenStatusModal(detail)}
                    className={`text-xs inline-flex items-center gap-1.5 ${
                      detail.orgStatus === 'SUSPENDED'
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {detail.orgStatus === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center px-6 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('quotas')}
                className={`py-3 border-b-2 transition-colors ${
                  activeTab === 'quotas'
                    ? 'border-[#244A70] text-[#244A70]'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Quotas & Entitlements
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('trends')}
                className={`py-3 border-b-2 transition-colors ${
                  activeTab === 'trends'
                    ? 'border-[#244A70] text-[#244A70]'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                6-Month Usage Trends
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'activity'
                    ? 'border-[#244A70] text-[#244A70]'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <span>Conversion Activity</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                  {detail.recentActivities.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('contract')}
                className={`py-3 border-b-2 transition-colors ${
                  activeTab === 'contract'
                    ? 'border-[#244A70] text-[#244A70]'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Contract Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'audit'
                    ? 'border-[#244A70] text-[#244A70]'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <span>Audit Log</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                  {detail.auditHistory.length}
                </span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'quotas' && (
                <div className="space-y-6">
                  {/* Screen Capacity Card */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-[#244A70]" />
                        <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
                          Screen Modernization Capacity
                        </h4>
                      </div>
                      <span className={`text-xs font-extrabold ${detail.screenUsage > detail.screenCapacity ? 'text-rose-600' : 'text-[#17263A]'}`}>
                        {detail.screenUsage} / {detail.screenCapacity} screens ({detail.screenUsagePct}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          detail.screenUsage > detail.screenCapacity
                            ? 'bg-rose-500'
                            : detail.screenUsagePct >= 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, detail.screenUsagePct)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[11px]">Consumed</span>
                        <span className={`font-bold text-sm ${detail.screenUsage > detail.screenCapacity ? 'text-rose-600' : 'text-slate-800'}`}>
                          {detail.screenUsage}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[11px]">Remaining</span>
                        <span className={`font-bold text-sm ${detail.screenUsage > detail.screenCapacity ? 'text-rose-600' : 'text-slate-800'}`}>
                          {detail.screenUsage > detail.screenCapacity ? `-${detail.screenUsage - detail.screenCapacity} (Over)` : detail.remainingScreens}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[11px]">Entitlement</span>
                        <span className="font-bold text-[#244A70] text-sm">{detail.screenCapacity}</span>
                      </div>
                    </div>
                    {detail.screenUsage > detail.screenCapacity && (
                      <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold text-center">
                        ⚠️ Over Quota (+{detail.screenUsage - detail.screenCapacity} screens) • Throttling active on new conversion uploads.
                      </div>
                    )}
                  </div>

                  {/* Secondary Quotas: Projects & Storage */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5 text-slate-500" />
                          Project Quota
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {detail.activeProjects} / {detail.projectCapacity}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#244A70]"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((detail.activeProjects / Math.max(1, detail.projectCapacity)) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        {detail.remainingProjects} project slots available
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                          Storage Quota
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {detail.storageUsageGb} / {detail.storageCapacityGb} GB
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: '5%' }} />
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        {detail.remainingStorageGb} GB remaining
                      </span>
                    </div>
                  </div>

                  {/* Source of Truth & Governance */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                    <h4 className="font-bold text-[#17263A] uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#244A70]" />
                      Source of Truth & Entitlement Synchronization
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      Quotas are projected directly from the organization's active contract record in ALSM. Quota modifications trigger a synchronized update to the Web3 smart contract entitlement projection.
                    </p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span>Concurrent Conversion Limit: <strong>{detail.concurrentJobsLimit} jobs</strong></span>
                      <span>•</span>
                      <span>Team Members: <strong>{detail.membersCount} users</strong></span>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => navigate('/sales/contracts')}
                        className="text-xs inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#244A70]" />
                        View Contract in CRM
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => navigate('/sales/contracts/new')}
                        className="text-xs bg-[#244A70] inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Upgrade / Amend Plan
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'trends' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-[#244A70]" />
                    6-Month Historical Conversion Trends
                  </h4>

                  <div className="space-y-3">
                    {(detail.monthlyTrends || []).map((trend) => (
                      <div
                        key={`${trend.year}-${trend.month}`}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{trend.monthLabel}</span>
                          <span className="font-extrabold text-[#244A70]">
                            {trend.screensConverted} screens converted
                          </span>
                        </div>

                        {/* Bar */}
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#244A70]"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(4, Math.round((trend.screensConverted / Math.max(1, detail.screenCapacity || 1)) * 100))
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500">
                          <span className="text-emerald-600 font-semibold">
                            ✓ {trend.successfulJobs} successful jobs
                          </span>
                          {trend.failedJobs > 0 && (
                            <span className="text-rose-600 font-semibold">
                              ✕ {trend.failedJobs} failed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    Recent Conversion Jobs
                  </h4>

                  {(!detail.recentActivities || detail.recentActivities.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">No conversion jobs recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(detail.recentActivities || []).map((job) => (
                        <div
                          key={job.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-[#17263A]">
                                {job.id.slice(0, 8)}...
                              </span>
                              <Badge
                                variant={job.status === 'COMPLETED' ? 'success' : job.status === 'FAILED' ? 'danger' : 'secondary'}
                              >
                                {job.status}
                              </Badge>
                              <span className="text-[11px] text-slate-500">
                                {(job.conversionType || 'CONVERSION').replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Created: {new Date(job.createdAt).toLocaleString('vi-VN')}
                              {job.durationSeconds !== undefined && ` • ${job.durationSeconds}s runtime`}
                            </div>
                            {job.errorMessage && (
                              <p className="text-[11px] text-rose-600 font-mono mt-1">
                                Error: {job.errorMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'contract' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#244A70]" />
                    Contract & Entitlement Binding
                  </h4>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Contract Number</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {detail.contractNumber || 'No Active Contract Number'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Contract Status</span>
                        <Badge
                          variant={detail.contractStatus === 'ACTIVE' ? 'success' : detail.contractStatus === 'EXPIRED' ? 'danger' : 'secondary'}
                        >
                          {detail.contractStatus}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Expiration Date</span>
                        <span className="font-semibold text-slate-800">
                          {detail.contractExpiresAt
                            ? new Date(detail.contractExpiresAt).toLocaleDateString('vi-VN')
                            : 'Open-ended / Evaluation'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Days Remaining</span>
                        <span
                          className={`font-bold ${
                            detail.daysUntilContractExpiry !== undefined && detail.daysUntilContractExpiry <= 30
                              ? 'text-rose-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {detail.daysUntilContractExpiry !== undefined
                            ? `${detail.daysUntilContractExpiry} days`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => navigate('/sales/contracts')}
                        className="text-xs inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#244A70]" />
                        View Contract in CRM
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => navigate('/sales/contracts/new')}
                        className="text-xs bg-[#244A70] inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Upgrade / Amend Plan
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-500" />
                    Quota & Access Audit Log
                  </h4>

                  {(!detail.auditHistory || detail.auditHistory.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">No quota audit events recorded yet.</p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {(detail.auditHistory || []).map((audit, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-white rounded-xl border border-slate-200 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#17263A]">{audit.action}</span>
                            <span className="text-slate-400">
                              {audit.createdAt ? new Date(audit.createdAt).toLocaleString('vi-VN') : ''}
                            </span>
                          </div>
                          {audit.metadata && (
                            <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                              {Object.entries(audit.metadata || {}).map(([k, v]) => (
                                <div key={k}>
                                  <span className="text-slate-400">{k}:</span> {v}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Created: {new Date(detail.createdAt).toLocaleDateString('vi-VN')}
              </span>
              <Button variant="secondary" onClick={onClose} className="text-xs">
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
