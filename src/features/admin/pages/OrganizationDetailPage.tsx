import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Globe, Mail, ArrowLeft, Edit3, Cpu, CheckCircle2, Users, Receipt, BarChart3, Eye, AlertCircle, RefreshCw, FolderGit2
} from 'lucide-react';
import { adminApi, OrganizationDto } from '../api/admin.api';
import { Button, Input, Modal } from '@/shared/ui';
import { SUPPORT_VIEW_UNAVAILABLE_MESSAGE } from '../context/SupportViewContext';
import { formatVnd } from '@/shared/utils/currency';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const OrganizationDetailPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const canImpersonate = Boolean(user) && hasPermission('organizations.impersonate');

  const [org, setOrg] = useState<OrganizationDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Engagement Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'TRIAL' | 'SUSPENDED'>('ACTIVE');
  const [editEngagement, setEditEngagement] = useState('ENTERPRISE_T1');

  // Trial Limits (Section 3.13.4)
  const [trialScreens, setTrialScreens] = useState<number>(15);
  const [trialPrograms, setTrialPrograms] = useState<number>(8);
  const [trialStorageGb, setTrialStorageGb] = useState<number>(5);

  // Post-Upgrade Usage Limits (Section 3.13.4)
  const [maxProjects, setMaxProjects] = useState<number>(10);
  const [maxConversions, setMaxConversions] = useState<number>(100);
  const [maxStorageGb, setMaxStorageGb] = useState<number>(50);
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);

  // Demo Project Modal
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [demoProjectName, setDemoProjectName] = useState('BMS Oracle Forms Modernization Demo');
  const [sourcePlatform, setSourcePlatform] = useState('Oracle Forms 11g');
  const [targetPlatform, setTargetPlatform] = useState('React + NestJS');

  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchOrg = async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const merged = await adminApi.getOrganizationById(orgId);
      setOrg(merged);
      setEditStatus(merged.status);
      setEditEngagement(merged.engagementType || 'ENTERPRISE_T1');

      if (merged.limits) {
        setMaxProjects(merged.limits.maxProjects ?? 10);
        setMaxConversions(merged.limits.maxConversionsPerMonth ?? 100);
        setMaxStorageGb(merged.limits.maxStorageGb ?? 50);
        setAiEnabled(merged.limits.aiValidationEnabled ?? true);
        setTrialScreens(merged.limits.trialScreens ?? 15);
        setTrialPrograms(merged.limits.trialPrograms ?? 8);
        setTrialStorageGb(merged.limits.trialStorageGb ?? 5);
      }
    } catch {
      setOrg(null);
      setErrorMsg('Unable to load organisation details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrg();
  }, [orgId]);

  const handleUpdateEngagement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const updatedLimits = {
        maxProjects,
        maxConversionsPerMonth: maxConversions,
        maxStorageGb,
        aiValidationEnabled: aiEnabled,
        trialScreens,
        trialPrograms,
        trialStorageGb,
        usageScreens: maxConversions,
        usagePrograms: Math.round(maxConversions / 2),
        usageStorageGb: maxStorageGb,
      };

      await adminApi.updateEngagement(org.id, {
        status: editStatus,
        engagementType: editEngagement,
        limits: updatedLimits as any,
      });

      setOrg((prev) =>
        prev
          ? {
              ...prev,
              status: editStatus,
              engagementType: editEngagement,
              limits: updatedLimits,
            }
          : prev
      );

      setShowEditModal(false);
      setSuccessMsg('Engagement parameters and limits updated successfully in local state.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update engagement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      await adminApi.createDemoProject({
        name: demoProjectName,
        organizationId: org.id,
        sourcePlatform,
        targetPlatform,
      });
      setShowDemoModal(false);
      setSuccessMsg(`Pre-configured demo project "${demoProjectName}" created with sample screens!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create demo project');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-[#6B778C]">
        <div className="w-8 h-8 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading organisation details...
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#E5EAF0] max-w-md mx-auto mt-12 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-[#091E42]">Organisation Unavailable</h2>
        <p role="alert" className="text-xs text-[#6B778C] mt-1">{errorMsg || 'The requested organisation is unavailable.'}</p>
        <div className="flex items-center justify-center gap-3 mt-5">
          <Button variant="outline" size="sm" onClick={() => fetchOrg()} className="cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Try Again
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/organizations')} className="cursor-pointer">
            Back to Directory
          </Button>
        </div>
      </div>
    );
  }

  const usageStats = {
    totalScreensConverted: org.usageStats?.totalScreensConverted ?? org.conversionJobCount ?? 0,
    activeProjects: org.usageStats?.activeProjects ?? org.projectCount ?? 0,
    storageUsedGb: org.usageStats?.storageUsedGb ?? 0,
    conversionsThisMonth: org.usageStats?.conversionsThisMonth ?? org.conversionJobCount ?? 0,
  };

  const billingHistory = org.billingHistory || [];
  const members = org.members || [];

  return (
    <div className="space-y-6">
      <p id="support-view-unavailable" role="status" className="text-xs text-[#6B778C]">
        {SUPPORT_VIEW_UNAVAILABLE_MESSAGE}
      </p>
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/organizations')}
            className="p-2 rounded-xl border border-[#E5EAF0] hover:bg-[#F7F9FC] text-[#6B778C] transition-colors cursor-pointer"
            title="Back to Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#091E42]">{org.name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  org.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : org.status === 'TRIAL'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {org.status}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {org.type || 'ENTERPRISE'}
              </span>
            </div>
            <p className="text-xs text-[#6B778C] mt-1 font-mono">Tenant ID: {org.id}</p>
          </div>
        </div>

        {/* Visible Admin Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canImpersonate && (
            <Button
              variant="outline"
              size="sm"
              disabled
              aria-describedby="support-view-unavailable"
              title={SUPPORT_VIEW_UNAVAILABLE_MESSAGE}
              className="text-xs border-[#D9E2EC] text-[#091E42]"
            >
              <Eye className="w-3.5 h-3.5 mr-1 text-[#0652CC]" />
              Support View
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDemoModal(true)}
            className="text-xs border-[#D9E2EC] text-[#091E42] hover:bg-[#F7F9FC]"
          >
            <Cpu className="w-3.5 h-3.5 mr-1 text-[#0652CC]" />
            Create Demo Project
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowEditModal(true)}
            className="text-xs bg-[#0652CC] hover:bg-[#0543A8] text-white"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1" />
            Edit Engagement
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 font-bold">&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 font-bold">&times;</button>
        </div>
      )}

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile & Domain */}
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider">
            Organisation Profile
          </span>
          <div className="mt-3.5 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-[#091E42]">
              <Globe className="w-4 h-4 text-[#0652CC]" />
              <span className="font-semibold">{org.domain || 'No custom domain'}</span>
            </div>
            <div className="flex items-center gap-2 text-[#6B778C]">
              <Mail className="w-4 h-4 text-[#6B778C]" />
              <span>{org.contactEmail || 'No contact email'}</span>
            </div>
            <div className="flex items-center gap-2 text-[#091E42]">
              <Users className="w-4 h-4 text-[#6B778C]" />
              <span>{org.memberCount || members.length} registered members</span>
            </div>
            <div className="text-[11px] text-[#6B778C] pt-2 border-t border-[#E5EAF0]">
              Provisioned: {new Date(org.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Contract & SLA */}
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider">
            Engagement & Commercial Plan
          </span>
          <div className="mt-3.5 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#6B778C]">Current Plan:</span>
              <span className="font-semibold text-[#091E42]">{org.engagementType || 'STANDARD'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B778C]">Tenant Classification:</span>
              <span className="font-semibold text-indigo-700">{org.type || 'ENTERPRISE'}</span>
            </div>
            {org.trialExpiresAt && (
              <div className="flex justify-between text-amber-700 font-semibold">
                <span className="text-amber-600 font-normal">Trial Expiry:</span>
                <span>{new Date(org.trialExpiresAt).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-[#E5EAF0]">
              <span className="text-[#6B778C]">AI Engine Modernizer:</span>
              <span className="font-semibold text-emerald-700">
                {org.limits?.aiValidationEnabled ? 'Active (Cobol & Forms)' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Configured Limits Summary */}
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider">
            Configured Limits Summary
          </span>
          <div className="mt-3.5 space-y-2 text-xs">
            <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Trial Sandbox Limits</span>
              <div className="text-[11px] text-amber-950 mt-0.5 font-medium">
                {org.limits?.trialScreens ?? 15} screens · {org.limits?.trialPrograms ?? 8} progs · {org.limits?.trialStorageGb ?? 5} GB
              </div>
            </div>
            <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-[#0652CC] block">Post-Upgrade Production Quotas</span>
              <div className="text-[11px] text-[#091E42] mt-0.5 font-medium">
                {org.limits?.maxProjects ?? 10} projects · {org.limits?.maxConversionsPerMonth ?? 100} conv/mo · {org.limits?.maxStorageGb ?? 50} GB
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Statistics Section (Requirement A) */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0652CC]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#091E42]">
              Resource & Platform Usage Statistics
            </h3>
          </div>
          <span className="text-[11px] text-[#6B778C]">Simulated Live Monitoring</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0]">
            <span className="text-[10px] uppercase font-bold text-[#6B778C]">Total Screens Converted</span>
            <div className="text-2xl font-bold text-[#091E42] mt-1">{usageStats.totalScreensConverted}</div>
            <p className="text-[11px] text-emerald-700 mt-1">Across all modernizations</p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0]">
            <span className="text-[10px] uppercase font-bold text-[#6B778C]">Active Projects</span>
            <div className="text-2xl font-bold text-[#091E42] mt-1">
              {usageStats.activeProjects} <span className="text-xs font-normal text-[#6B778C]">/ {org.limits?.maxProjects ?? 10}</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#0652CC] h-full rounded-full"
                style={{ width: `${Math.min(100, (usageStats.activeProjects / (org.limits?.maxProjects || 10)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0]">
            <span className="text-[10px] uppercase font-bold text-[#6B778C]">Conversions This Month</span>
            <div className="text-2xl font-bold text-[#091E42] mt-1">
              {usageStats.conversionsThisMonth} <span className="text-xs font-normal text-[#6B778C]">/ {org.limits?.maxConversionsPerMonth ?? 100}</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full"
                style={{ width: `${Math.min(100, (usageStats.conversionsThisMonth / (org.limits?.maxConversionsPerMonth || 100)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0]">
            <span className="text-[10px] uppercase font-bold text-[#6B778C]">Storage Consumed</span>
            <div className="text-2xl font-bold text-[#091E42] mt-1">
              {usageStats.storageUsedGb} GB <span className="text-xs font-normal text-[#6B778C]">/ {org.limits?.maxStorageGb ?? 50} GB</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full"
                style={{ width: `${Math.min(100, (usageStats.storageUsedGb / (org.limits?.maxStorageGb || 50)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Billing History & Members (Requirement A) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billing History */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5EAF0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#0652CC]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#091E42]">
                Commercial Billing & Invoices
              </h3>
            </div>
            <span className="text-[11px] text-[#6B778C] font-mono">{billingHistory.length} recorded</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Invoice</th>
                  <th className="py-2.5 px-3">Plan / Item</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {billingHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#6B778C]">
                      No billing records recorded for this organisation.
                    </td>
                  </tr>
                ) : (
                  billingHistory.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F9FBFF]">
                      <td className="py-3 px-3 font-mono font-semibold text-[#091E42]">
                        {inv.invoiceNumber}
                        <div className="text-[10px] text-[#6B778C] font-normal">{inv.date}</div>
                      </td>
                      <td className="py-3 px-3 text-[#091E42]">{inv.plan}</td>
                      <td className="py-3 px-3 font-bold text-emerald-700">
                        {formatVnd(inv.amount)}
                      </td>
                      <td className="py-3 px-3 text-[#6B778C]">{inv.paymentMethod}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Organisation Members */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5EAF0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0652CC]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#091E42]">
                Organisation Members
              </h3>
            </div>
            <span className="text-[11px] text-[#6B778C] font-mono">{members.length} members</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Joined Date</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#6B778C]">
                      No active members found.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.userId} className="hover:bg-[#F9FBFF]">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#091E42]">{m.fullName || m.email.split('@')[0]}</div>
                        <div className="text-[10px] text-[#6B778C]">{m.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#0652CC]">
                          {m.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#6B778C]">
                        {m.joinedDate || '2026-08-01'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {m.status || 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modernization Projects (Associated Projects) */}
      {org.projects && org.projects.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5EAF0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-[#0652CC]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#091E42]">
                Modernization Projects
              </h3>
            </div>
            <span className="text-[11px] text-[#6B778C] font-mono">{org.projects.length} projects</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Project Name</th>
                  <th className="py-2.5 px-3">Conversion Type</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {org.projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-[#F9FBFF]">
                    <td className="py-3 px-3 font-semibold text-[#091E42]">
                      {proj.name}
                    </td>
                    <td className="py-3 px-3 text-[#6B778C]">
                      {proj.conversionType}
                    </td>
                    <td className="py-3 px-3">
                      {proj.isDemo ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Demo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#0652CC] border border-blue-200">
                          Production
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#6B778C]">
                      {new Date(proj.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {proj.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Engagement Modal (Requirement D) */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Organisation Engagement & Limits (Section 3.13.4)"
      >
        <form onSubmit={handleUpdateEngagement} className="space-y-4 text-xs">
          <p className="text-xs text-[#6B778C]">
            Configure commercial engagement tier, Trial sandbox constraints, and post-upgrade production usage limits.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#091E42] mb-1">Status</label>
              <select
                className="w-full text-xs p-2 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42] focus:ring-2 focus:ring-[#0652CC] outline-none"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="TRIAL">TRIAL</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#091E42] mb-1">Engagement Type</label>
              <select
                className="w-full text-xs p-2 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42] focus:ring-2 focus:ring-[#0652CC] outline-none"
                value={editEngagement}
                onChange={(e) => setEditEngagement(e.target.value)}
              >
                <option value="ENTERPRISE_T1">ENTERPRISE_T1 (Tier 1 Premium)</option>
                <option value="ENTERPRISE_T2">ENTERPRISE_T2 (Tier 2 Standard)</option>
                <option value="MANAGED_PARTNER">MANAGED_PARTNER</option>
                <option value="STANDARD">STANDARD (Self-Service)</option>
              </select>
            </div>
          </div>

          {/* Section 1: Trial Limits Group (Clearly Distinguished) */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <h4 className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                1. Trial Limits (Pre-Upgrade Sandbox Caps)
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-amber-900 mb-1">Trial Screen Limit</label>
                <Input
                  type="number"
                  min={1}
                  value={trialScreens}
                  onChange={(e) => setTrialScreens(parseInt(e.target.value) || 1)}
                  className="text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-amber-900 mb-1">Trial Program Limit</label>
                <Input
                  type="number"
                  min={1}
                  value={trialPrograms}
                  onChange={(e) => setTrialPrograms(parseInt(e.target.value) || 1)}
                  className="text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-amber-900 mb-1">Trial Storage (GB)</label>
                <Input
                  type="number"
                  min={1}
                  value={trialStorageGb}
                  onChange={(e) => setTrialStorageGb(parseInt(e.target.value) || 1)}
                  className="text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Post-Upgrade Usage Limits Group (Clearly Distinguished) */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0652CC]" />
              <h4 className="text-[11px] font-bold text-[#0652CC] uppercase tracking-wider">
                2. Post-Upgrade Production Usage Limits
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[#091E42] mb-1">Max Projects</label>
                <Input
                  type="number"
                  min={1}
                  value={maxProjects}
                  onChange={(e) => setMaxProjects(parseInt(e.target.value) || 1)}
                  className="text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#091E42] mb-1">Max Conv/Month</label>
                <Input
                  type="number"
                  min={1}
                  value={maxConversions}
                  onChange={(e) => setMaxConversions(parseInt(e.target.value) || 1)}
                  className="text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#091E42] mb-1">Storage Quota (GB)</label>
                <Input
                  type="number"
                  min={1}
                  value={maxStorageGb}
                  onChange={(e) => setMaxStorageGb(parseInt(e.target.value) || 1)}
                  className="text-xs bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="aiCheck"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                className="rounded text-[#0652CC] focus:ring-[#0652CC]"
              />
              <label htmlFor="aiCheck" className="text-xs font-semibold text-[#091E42] cursor-pointer">
                Enable AI Validation Engine (COBOL & Forms Modernization AST)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EAF0]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
              className="bg-[#0652CC] hover:bg-[#0543A8] text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {submitting ? 'Saving...' : 'Save Engagement Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Demo Project Modal */}
      <Modal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} title="Create Pre-Configured Demo Project">
        <form onSubmit={handleCreateDemo} className="space-y-4 text-xs">
          <p className="text-xs text-[#6B778C]">
            Initializes an enterprise demonstration project populated with standard BMS Oracle Forms screens and ready-to-test conversions.
          </p>
          <div>
            <label className="block text-xs font-semibold text-[#091E42] mb-1">Project Name *</label>
            <Input
              required
              value={demoProjectName}
              onChange={(e) => setDemoProjectName(e.target.value)}
              className="text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#091E42] mb-1">Source Platform</label>
              <Input
                value={sourcePlatform}
                onChange={(e) => setSourcePlatform(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#091E42] mb-1">Target Platform</label>
              <Input
                value={targetPlatform}
                onChange={(e) => setTargetPlatform(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowDemoModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
              className="bg-[#0652CC] hover:bg-[#0543A8] text-white"
            >
              {submitting ? 'Creating...' : 'Create Demo Project'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OrganizationDetailPage;
