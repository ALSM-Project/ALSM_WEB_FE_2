import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, Search, Plus, Eye, RefreshCw, Mail, CheckCircle2,
  FolderKanban, Users, AlertCircle, ArrowRight, ArrowLeft
} from 'lucide-react';
import { adminApi, OrganizationDto, EngagementTypeDto, OrganizationInvitationStatus } from '../api/admin.api';
import { Button, Input, Modal } from '@/shared/ui';
import { SUPPORT_VIEW_UNAVAILABLE_MESSAGE } from '../context/SupportViewContext';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const OrganizationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const canImpersonate = Boolean(user) && hasPermission('organizations.impersonate');
  const canManageOrganizations = Boolean(user) && hasPermission('organizations.manage');

  const [organizations, setOrganizations] = useState<OrganizationDto[]>([]);
  const [engagementTypes, setEngagementTypes] = useState<EngagementTypeDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'date_desc' | 'date_asc'>('name_asc');

  // Modal State for New Org Provisioning (2-Step Wizard)
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [inviteWarning, setInviteWarning] = useState(false);
  const [requestId, setRequestId] = useState('');

  const [newOrg, setNewOrg] = useState({
    name: '',
    domain: '',
    adminEmail: '',
    engagementType: 'Enterprise Pilot',
    trialDays: 30,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [orgs, types] = await Promise.all([
        adminApi.getOrganizations(),
        adminApi.getEngagementTypes().catch(() => []),
      ]);
      setOrganizations(orgs);
      setEngagementTypes(types);
      const activeNames = types.filter((type) => type.isActive).map((type) => type.name);
      if (activeNames.length) {
        setNewOrg((current) => activeNames.includes(current.engagementType)
          ? current
          : { ...current, engagementType: activeNames[0] });
      }
    } catch {
      setLoadError('Unable to load organisations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const validateStep1 = (): boolean => {
    setFormError(null);
    if (!newOrg.name.trim()) {
      setFormError('Company / Organisation name is required.');
      return false;
    }
    if (!newOrg.adminEmail.trim()) {
      setFormError('Organisation admin email is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newOrg.adminEmail.trim())) {
      setFormError('Please enter a valid admin email address format (e.g. name@domain.com).');
      return false;
    }
    if (newOrg.domain.trim() && !/^(?=.{1,253}$)(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(newOrg.domain.trim())) {
      setFormError('Enter a valid domain name, such as company.com.');
      return false;
    }
    if (!Number.isInteger(newOrg.trialDays) || newOrg.trialDays < 1 || newOrg.trialDays > 3650) {
      setFormError('Trial period must be between 1 and 3650 days.');
      return false;
    }
    return true;
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setCreateStep(2);
    }
  };

  const handleConfirmProvisioning = async () => {
    if (submitting || !canManageOrganizations) return;
    try {
      setSubmitting(true);
      setFormError(null);
      const currentRequestId = requestId || window.crypto.randomUUID();
      setRequestId(currentRequestId);
      const res = await adminApi.createEnterpriseOrganization({
        name: newOrg.name.trim(),
        domain: newOrg.domain.trim() || undefined,
        contactEmail: newOrg.adminEmail.trim().toLowerCase(),
        engagementType: newOrg.engagementType,
        trialDays: newOrg.trialDays,
        requestId: currentRequestId,
      });
      setOrganizations((prev) => [res.organization, ...prev.filter((org) => org.id !== res.organization.id)]);
      const warning = res.invitationStatus === 'FAILED' || res.invitationStatus === 'PENDING';
      setInviteWarning(warning);
      const messages: Record<OrganizationInvitationStatus, string> = {
        SENT: `Organisation “${res.organization.name}” was created. A secure account setup link was sent to ${newOrg.adminEmail.trim()}.`,
        NOT_REQUIRED: `Organisation “${res.organization.name}” was created and linked to the existing administrator account.`,
        FAILED: `Organisation “${res.organization.name}” was created, but the setup email could not be sent. Ask the administrator to use Forgot password.`,
        PENDING: `Organisation “${res.organization.name}” was created. The account setup email is pending; ask the administrator to use Forgot password if it does not arrive.`,
      };
      setShowCreateModal(false);
      setCreateStep(1);
      setSuccessMsg(messages[res.invitationStatus]);
      setRequestId('');
      setNewOrg({
        name: '',
        domain: '',
        adminEmail: '',
        engagementType: 'Enterprise Pilot',
        trialDays: 30,
      });
      void fetchData();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: unknown) {
      const error = err as { status?: number; response?: { status?: number; data?: { message?: string | string[] } } };
      const status = error.status ?? error.response?.status;
      const message = error.response?.data?.message;
      if (status === 400) setFormError(Array.isArray(message) ? message.join(' ') : message || 'Check the organisation details and try again.');
      else if (status === 403) setFormError('You do not have permission to create organisations.');
      else if (status === 409) setFormError(typeof message === 'string' ? message : 'An organisation with these details already exists.');
      else setFormError('The organisation could not be created right now. Your request is safe to retry.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter & Sort
  const filteredOrgs = organizations
    .filter((org) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        org.name.toLowerCase().includes(term) ||
        (org.domain && org.domain.toLowerCase().includes(term)) ||
        (org.contactEmail && org.contactEmail.toLowerCase().includes(term)) ||
        org.id.toLowerCase().includes(term);

      const matchesStatus = statusFilter === 'ALL' || org.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || (org.type || 'ENTERPRISE') === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const getStatusBadge = (status: OrganizationDto['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Active</span>;
      case 'TRIAL':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Trial</span>;
      case 'SUSPENDED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Suspended</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getTypeBadge = (type?: string) => {
    const normalized = (type || 'ENTERPRISE').toUpperCase();
    if (normalized === 'PARTNER') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">PARTNER</span>;
    }
    if (normalized === 'STANDARD') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">STANDARD</span>;
    }
    if (normalized === 'SELF_SERVICE' || normalized === 'PLATFORM_BASED') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">PLATFORM-BASED</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">ENTERPRISE</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">
            Enterprise Organisations
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            aria-busy={loading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-[#DCE3EC] text-[#17263A] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#244A70] ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {canManageOrganizations && (
            <button
              onClick={() => {
                setCreateStep(1);
                setFormError(null);
                setRequestId(window.crypto.randomUUID());
                setShowCreateModal(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#244A70] text-white rounded-xl text-xs font-semibold hover:bg-[#244A70] transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Organisation
            </button>
          )}
        </div>
      </div>

      <p id="support-view-unavailable" role="status" className="sr-only">
        {SUPPORT_VIEW_UNAVAILABLE_MESSAGE}
      </p>
      {loadError && <p role="alert" className="text-xs text-rose-700">{loadError}</p>}

      {/* Alert Messages */}
      {successMsg && (
        <div role="status" className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${inviteWarning ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 font-bold">&times;</button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              aria-label="Search organisations"
              placeholder="Search by organisation name or contact email..."
              maxLength={100}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none"
            />
            <Search className="w-4 h-4 text-[#8491A3] absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Filter by Type */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#8491A3]">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-[#DCE3EC] text-xs bg-white text-[#17263A] focus:ring-2 focus:ring-[#244A70] outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="ENTERPRISE">Enterprise</option>
                <option value="SELF_SERVICE">Platform-Based Modernization</option>
                <option value="STANDARD">Standard</option>
                <option value="PARTNER">Partner</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#8491A3]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-[#DCE3EC] text-xs bg-white text-[#17263A] focus:ring-2 focus:ring-[#244A70] outline-none"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              {['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-[#244A70] text-white shadow-xs'
                      : 'bg-[#F8FAFC] text-[#17263A] hover:bg-[#DCE3EC]'
                  }`}
                >
                  {st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Organisations Table */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[10px] font-bold text-[#8491A3] uppercase tracking-wider">
                <th className="py-3 px-4">Organisation Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Members</th>
                <th className="py-3 px-4">Projects</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3EC]" aria-live="polite" aria-busy={loading}>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8491A3]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#244A70] border-t-transparent rounded-full animate-spin" />
                      <span>Loading tenant organisations...</span>
                    </div>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8491A3]">
                    The organisation directory could not be loaded. Use Refresh to try again.
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8491A3]">
                    <Building className="w-8 h-8 mx-auto text-[#8491A3]/40 mb-2" />
                    {organizations.length === 0
                      ? 'No organisations are available yet.'
                      : 'No organisations match your search criteria.'}
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const projectCount = org.projectCount ?? 0;
                  const memberCount = org.memberCount ?? org.members?.length ?? 0;
                  return (
                    <tr
                      key={org.id}
                      onClick={() => navigate(`/admin/organizations/${org.id}`)}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-semibold text-[#17263A]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#244A70] flex items-center justify-center font-bold text-xs shrink-0">
                            {org.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="group-hover:text-[#244A70] transition-colors font-medium text-[#17263A]">
                              {org.name}
                            </div>
                            <div className="text-[10px] text-[#8491A3] flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="font-mono text-slate-500">{org.id}</span>
                              {org.contactEmail && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-2.5 h-2.5 text-[#8491A3]" />
                                  <span>{org.contactEmail}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {getTypeBadge(org.type)}
                      </td>
                      <td className="py-3.5 px-4 text-[#17263A] font-medium">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#8491A3]" />
                          <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#17263A]">
                          <FolderKanban className="w-3.5 h-3.5 text-[#244A70]" />
                          {projectCount} {projectCount === 1 ? 'project' : 'projects'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(org.status)}
                      </td>
                      <td className="py-3.5 px-4 text-[#8491A3]">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {canImpersonate && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs bg-[#244A70] text-white hover:bg-[#244A70] py-1 px-2.5"
                              disabled
                              aria-describedby="support-view-unavailable"
                              title={SUPPORT_VIEW_UNAVAILABLE_MESSAGE}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Support View
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-[#DCE3EC] text-[#17263A] hover:bg-[#F8FAFC] py-1"
                            onClick={() => navigate(`/admin/organizations/${org.id}`)}
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-Step Provisioning Modal: New Enterprise Org (Requirement C) */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          if (submitting) return;
          setShowCreateModal(false);
          setCreateStep(1);
        }}
        title={createStep === 1 ? 'Provision Enterprise Organisation (Step 1/2)' : 'Review & Confirm Provisioning (Step 2/2)'}
      >
        {createStep === 1 ? (
          <form onSubmit={handleProceedToReview} noValidate className="space-y-4">
            <p className="text-xs text-[#8491A3]">
              Configure customer tenant parameters, contact details, and initial engagement level.
            </p>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Company / Org Name *</label>
                <Input
                  required
                  placeholder="Global FinTech Solutions Inc."
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Primary Domain</label>
                <Input
                  placeholder="fintechsolutions.com"
                  value={newOrg.domain}
                  onChange={(e) => setNewOrg({ ...newOrg, domain: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">Organisation Admin Email *</label>
              <Input
                required
                type="email"
                placeholder="admin@fintechsolutions.com"
                value={newOrg.adminEmail}
                onChange={(e) => setNewOrg({ ...newOrg, adminEmail: e.target.value })}
              />
              <span className="text-[11px] text-[#8491A3] mt-0.5 block">
                Standard format required (e.g. user@company.com). Will receive administrative ownership.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Engagement Type *</label>
                <select
                  value={newOrg.engagementType}
                  onChange={(e) => setNewOrg({ ...newOrg, engagementType: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DCE3EC] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#244A70]"
                >
                  {(engagementTypes.filter((type) => type.isActive).length
                    ? engagementTypes.filter((type) => type.isActive).map((type) => type.name)
                    : ['Trial', 'Enterprise Pilot', 'Enterprise Production']
                  ).map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Trial Period (Days)</label>
                <Input
                  type="number"
                  value={newOrg.trialDays}
                  onChange={(e) => setNewOrg({ ...newOrg, trialDays: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3EC]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="bg-[#244A70] hover:bg-[#244A70] text-white"
              >
                <span>Continue to Review</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-[#17263A] space-y-2">
              <span className="font-bold text-xs uppercase tracking-wide text-[#244A70] block">
                Provisioning Summary Verification
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#8491A3]">Company Name:</span>
                  <div className="font-semibold text-[#17263A]">{newOrg.name}</div>
                </div>
                <div>
                  <span className="text-[#8491A3]">Admin Email:</span>
                  <div className="font-semibold text-[#17263A]">{newOrg.adminEmail}</div>
                </div>
                <div>
                  <span className="text-[#8491A3]">Engagement Plan:</span>
                  <div className="font-semibold text-emerald-700">{newOrg.engagementType}</div>
                </div>
                <div>
                  <span className="text-[#8491A3]">Primary Domain:</span>
                  <div className="font-semibold text-[#17263A]">{newOrg.domain || 'Auto-generated'}</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
              The organisation and its initial administrator will be created. If the email is new, the administrator receives a secure, expiring link to set a password.
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <div className="flex justify-between gap-2 pt-3 border-t border-[#DCE3EC]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => setCreateStep(1)}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back to Edit
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  onClick={handleConfirmProvisioning}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {submitting ? 'Provisioning...' : 'Confirm & Provision Organisation'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrganizationsPage;
