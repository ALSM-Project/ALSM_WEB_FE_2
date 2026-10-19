import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Layers,
  Monitor,
  FolderKanban,
  HardDrive,
  Cpu,
  Users,
  FileText,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { useNavigation } from '@/context/NavigationContext';
import { organizationUsageApi } from '../api/organization-usage.api';
import type { OrganizationUsageDetail, QuotaAmendmentPayload } from '../types/organization-usage';

export const AmendQuotaPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setCustomBreadcrumbs } = useNavigation();

  // Fetch Current Organization Usage Detail
  const { data: org, isLoading, isError } = useQuery<OrganizationUsageDetail>({
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
        { label: org.name || 'Organization', path: `/admin/billing/usage/${orgId}` },
        { label: 'Amend Quota' },
      ]);
      return () => {
        setCustomBreadcrumbs(null);
      };
    }
  }, [org, orgId, setCustomBreadcrumbs]);

  // Form State
  const [amendmentType, setAmendmentType] = useState<
    'CAPACITY_UPGRADE' | 'ADDITIONAL_SCREENS' | 'STORAGE_EXPANSION' | 'CONTRACT_RENEWAL' | 'INCREASE' | 'DECREASE' | 'TEMPORARY_INCREASE'
  >('CAPACITY_UPGRADE');
  const [contractReference, setContractReference] = useState('');
  const [justification, setJustification] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expirationDate, setExpirationDate] = useState('');

  // Resource Targets
  const [targetScreens, setTargetScreens] = useState<number>(100);
  const [targetProjects, setTargetProjects] = useState<number>(20);
  const [targetStorageGb, setTargetStorageGb] = useState<number>(50);
  const [targetConcurrentJobs, setTargetConcurrentJobs] = useState<number>(5);
  const [targetMembers, setTargetMembers] = useState<number>(30);

  // Initialize targets once org is loaded
  useEffect(() => {
    if (org) {
      setTargetScreens(Math.max(org.screenUsage, org.screenCapacity, 100));
      setTargetProjects(Math.max(org.activeProjects, org.projectCapacity, 20));
      setTargetStorageGb(Math.max(org.storageUsageGb, org.storageCapacityGb, 50));
      setTargetConcurrentJobs(Math.max(org.concurrentJobsLimit, 5));
      setTargetMembers(Math.max(org.membersCount, 30));
      setContractReference(`AMD-${org.contractNumber || 'CTR-2026'}-${new Date().getMonth() + 1}`);
    }
  }, [org]);

  // Validation & Error
  const [validationError, setValidationError] = useState<string | null>(null);

  // Apply Quota Mutation
  const amendMutation = useMutation({
    mutationFn: (payload: QuotaAmendmentPayload) =>
      organizationUsageApi.applyQuotaAmendment(orgId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organization-usage'] });
      navigate(`/admin/billing/usage/${orgId}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setValidationError(
        Array.isArray(msg)
          ? msg.join('; ')
          : msg || err?.message || 'Failed to apply quota amendment'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!contractReference.trim()) {
      setValidationError('Related Contract Amendment / Approval Reference is required');
      return;
    }
    if (!justification.trim() || justification.trim().length < 5) {
      setValidationError('Please provide a substantive justification for the quota change (minimum 5 characters)');
      return;
    }

    if (!org) return;

    const screenDelta = targetScreens - org.screenCapacity;
    const projectDelta = targetProjects - org.projectCapacity;
    const storageDelta = targetStorageGb - org.storageCapacityGb;

    const payload: QuotaAmendmentPayload = {
      amendmentType,
      screenCapacityDelta: screenDelta,
      projectCapacityDelta: projectDelta,
      storageGbDelta: storageDelta,
      targetScreenCapacity: targetScreens,
      targetProjectCapacity: targetProjects,
      targetStorageGb: targetStorageGb,
      targetConcurrentJobs,
      targetMembers,
      contractReference: contractReference.trim(),
      justification: justification.trim(),
      effectiveDate,
      expirationDate: expirationDate || undefined,
    };

    amendMutation.mutate(payload);
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
        <h2 className="text-lg font-bold text-slate-800">Organization not found</h2>
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/billing/usage')}>
          Return to Service Usage & Quotas
        </Button>
      </div>
    );
  }

  const isOverQuota = org.screenUsage > org.screenCapacity;
  const screenDelta = targetScreens - org.screenCapacity;
  const projectDelta = targetProjects - org.projectCapacity;
  const storageDelta = targetStorageGb - org.storageCapacityGb;
  const jobDelta = targetConcurrentJobs - org.concurrentJobsLimit;
  const memberDelta = targetMembers - (org.membersCount || 10);

  return (
    <div className="space-y-6 w-full">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <div className="flex items-center gap-2">

          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17263A] mt-1">
            Amend Service Quota & Entitlements
          </h1> 
        </div>
      </div>

      {validationError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 shadow-2xs">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-rose-600" />
          <span className="font-medium">{validationError}</span>
        </div>
      )}

      {/* ── Context Card: Current Organization & Contract ───────────────── */}
      <div className="p-5 rounded-xl bg-white border border-[#DCE3EC] shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#EEF1F6] border border-[#BFDBFE] flex items-center justify-center text-[#244A70]">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#17263A]">{org.name}</span>
              <Badge variant={org.orgStatus === 'ACTIVE' ? 'success' : 'secondary'}>{org.orgStatus}</Badge>
              {isOverQuota && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">
                  Currently Over Quota (+{org.screenUsage - org.screenCapacity} screens)
                </span>
              )}
            </div>
            <p className="text-xs text-[#8491A3] mt-0.5">
              Contract: <strong className="font-mono text-[#17263A]">{org.contractNumber || 'CTR-DEFAULT'}</strong> • Plan: <strong>{org.subscriptionPlan}</strong> • Mode: <strong>{org.serviceMode}</strong>
            </p>
          </div>
        </div>

        <div className="text-right text-xs">
          <span className="text-slate-500 block">Authorized Expiry</span>
          <span className="font-bold text-slate-800 font-mono">
            {org.contractExpiresAt ? new Date(org.contractExpiresAt).toLocaleDateString('en-US') : 'Evaluation (Permanent)'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Resource Comparison Table ───────────────────────────────────── */}
        <Card className="border border-[#DCE3EC] bg-white p-6 shadow-2xs rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#244A70]" />
                Resource Quota Adjustment & Entitlement Comparison
              </h2>
              <p className="text-xs text-[#8491A3]">
                Compare current consumption against authorized limits and set new contract entitlements.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#244A70] bg-blue-50 px-2.5 py-1 rounded-lg">
              Live Entitlement Calculator
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                <tr>
                  <th className="py-3 px-4">Resource Dimension</th>
                  <th className="py-3 px-4">Current Authorized Quota</th>
                  <th className="py-3 px-4">Current Usage</th>
                  <th className="py-3 px-4 min-w-[180px]">New Authorized Quota</th>
                  <th className="py-3 px-4">Net Change (Delta)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Screens */}
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[#244A70]" />
                    Screen Modernization (Screens)
                  </td>
                  <td className="py-3.5 px-4 font-bold">{org.screenCapacity} screens</td>
                  <td className="py-3.5 px-4">
                    <span className={`font-bold ${isOverQuota ? 'text-rose-600' : 'text-slate-900'}`}>
                      {org.screenUsage} screens
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <input
                      type="number"
                      min={org.screenUsage}
                      value={targetScreens}
                      onChange={(e) => setTargetScreens(Number(e.target.value))}
                      className="w-36 px-3 py-1.5 bg-white border border-[#DCE3EC] rounded-lg font-bold text-[#244A70] focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                      required
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    {screenDelta > 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700">
                        +{screenDelta} screens
                      </span>
                    ) : screenDelta < 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700">
                        {screenDelta} screens
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold">No change</span>
                    )}
                  </td>
                </tr>

                {/* 2. Projects */}
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-emerald-600" />
                    Active Project Slots
                  </td>
                  <td className="py-3.5 px-4 font-bold">{org.projectCapacity} projects</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{org.activeProjects} active</td>
                  <td className="py-3.5 px-4">
                    <input
                      type="number"
                      min={org.activeProjects}
                      value={targetProjects}
                      onChange={(e) => setTargetProjects(Number(e.target.value))}
                      className="w-36 px-3 py-1.5 bg-white border border-[#DCE3EC] rounded-lg font-bold text-[#244A70] focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                      required
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    {projectDelta > 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700">
                        +{projectDelta} slots
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold">No change</span>
                    )}
                  </td>
                </tr>

                {/* 3. Storage */}
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-purple-600" />
                    Storage Allowance (GB)
                  </td>
                  <td className="py-3.5 px-4 font-bold">{org.storageCapacityGb} GB</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{org.storageUsageGb} GB</td>
                  <td className="py-3.5 px-4">
                    <input
                      type="number"
                      min={1}
                      value={targetStorageGb}
                      onChange={(e) => setTargetStorageGb(Number(e.target.value))}
                      className="w-36 px-3 py-1.5 bg-white border border-[#DCE3EC] rounded-lg font-bold text-[#244A70] focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                      required
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    {storageDelta > 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700">
                        +{storageDelta} GB
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold">No change</span>
                    )}
                  </td>
                </tr>

                {/* 4. Concurrent Workers */}
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-amber-600" />
                    Concurrent Jobs / Workers
                  </td>
                  <td className="py-3.5 px-4 font-bold">{org.concurrentJobsLimit} workers</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{org.activeJobs || 0} active</td>
                  <td className="py-3.5 px-4">
                    <input
                      type="number"
                      min={1}
                      value={targetConcurrentJobs}
                      onChange={(e) => setTargetConcurrentJobs(Number(e.target.value))}
                      className="w-36 px-3 py-1.5 bg-white border border-[#DCE3EC] rounded-lg font-bold text-[#244A70] focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                      required
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    {jobDelta > 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700">
                        +{jobDelta} workers
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold">No change</span>
                    )}
                  </td>
                </tr>

                {/* 5. Team Members */}
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Team User Seats
                  </td>
                  <td className="py-3.5 px-4 font-bold">10 seats</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{org.membersCount} active</td>
                  <td className="py-3.5 px-4">
                    <input
                      type="number"
                      min={org.membersCount || 1}
                      value={targetMembers}
                      onChange={(e) => setTargetMembers(Number(e.target.value))}
                      className="w-36 px-3 py-1.5 bg-white border border-[#DCE3EC] rounded-lg font-bold text-[#244A70] focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                      required
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    {memberDelta > 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700">
                        +{memberDelta} seats
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold">No change</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Amendment Metadata & Justification ───────────────────────────── */}
        <Card className="border border-[#DCE3EC] bg-white p-6 shadow-2xs rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-[#17263A] pb-2 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#244A70]" />
            Amendment Details & Approval Governance
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#17263A] mb-1.5">
                Amendment Type *
              </label>
              <select
                value={amendmentType}
                onChange={(e) => setAmendmentType(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              >
                <option value="CAPACITY_UPGRADE">Capacity Increase (Upgrade Plan/Quota)</option>
                <option value="ADDITIONAL_SCREENS">Additional Screens Only</option>
                <option value="TEMPORARY_INCREASE">Temporary Capacity Boost (Trial/PoC)</option>
                <option value="DECREASE">Capacity Decrease / Scope Reduction</option>
                <option value="CONTRACT_RENEWAL">Contract Renewal Expansion</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#17263A] mb-1.5">
                Related Contract Amendment / Approval Reference *
              </label>
              <input
                type="text"
                value={contractReference}
                onChange={(e) => setContractReference(e.target.value)}
                placeholder="e.g. AMEND-CTR-2026-08 or BOARD-APP-921"
                className="w-full px-3 py-2 bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[#17263A] mb-1.5">
                Effective Date *
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                required
              />
            </div>

            {amendmentType === 'TEMPORARY_INCREASE' && (
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block font-semibold text-[#17263A] mb-1.5">
                  Temporary Expiration Date (Reverts to base quota upon date)
                </label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full sm:w-72 px-3 py-2 bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>
            )}

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block font-semibold text-[#17263A] mb-1.5">
                Reason & Business Justification for Amendment *
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                placeholder="Detail the customer expansion request, signed addendum reference, or authorized over-quota resolution..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#DCE3EC] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70] resize-none"
                required
              />
            </div>
          </div>
        </Card>

        {/* ── Assurance & Submission Card ─────────────────────────────────── */}
        <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-[#17263A] block">
                Audit Record & Instant Web 3 Entitlement Synchronization
              </span>
              <span className="text-[#8491A3]">
                Saving this amendment will immediately unblock any throttled conversion jobs and persist an immutable record to the Audit Log.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/billing/usage/${orgId}`)}
              disabled={amendMutation.isPending}
              className="text-[#17263A]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={amendMutation.isPending}
              className="bg-[#244A70] hover:bg-[#244A70] text-white font-bold text-xs shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {amendMutation.isPending ? 'Applying Changes...' : 'Confirm & Apply Quota Amendment'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
