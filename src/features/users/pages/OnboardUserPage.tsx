import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  ArrowLeft,
  ShieldCheck,
  Mail,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Lock,
  BadgeCheck,
  Search,
  Sparkles,
} from 'lucide-react';
import { rbacApi, RoleDto } from '@/features/rbac/api/rbac.api';
import { usersApi } from '@/features/users/api/users.api';
import { Button } from '@/shared/ui';

const DEPARTMENTS = [
  'Modernization Engineering',
  'Platform Operations',
  'Legacy Systems Transformation',
  'Core Banking Modernization',
  'Distributed Systems & Microservices',
  'Quality Assurance & Validation',
  'Cloud Architecture',
  'Customer Support',
  'Sales & Commercial',
];

export const OnboardUserPage: React.FC = () => {
  const navigate = useNavigate();

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Modernization Engineering');
  const [employeeCode, setEmployeeCode] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [accountStatus, setAccountStatus] = useState<'ACTIVE' | 'PENDING_ACTIVATION'>('ACTIVE');

  // Governance options
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [requireMfa, setRequireMfa] = useState(true);
  const [enforcePasswordRotation, setEnforcePasswordRotation] = useState(false);
  const [confirmAuthorization, setConfirmAuthorization] = useState(false);

  // Data & Dynamic States
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setIsLoadingRoles(true);
        const fetchedRoles = await rbacApi.getRoles();
        setRoles(fetchedRoles || []);
        if (fetchedRoles && fetchedRoles.length > 0) {
          const defaultRole = fetchedRoles.find((r) => r.id === 'conversion_staff') || fetchedRoles[0];
          setSelectedRole(defaultRole.id);
          fetchPermissions(defaultRole.id);
        }
      } catch (err: any) {
        console.error('Failed to load system roles:', err);
        setErrorMsg('Failed to load system roles from directory.');
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  const fetchPermissions = async (roleId: string) => {
    if (!roleId) {
      setRolePermissions([]);
      return;
    }
    try {
      const perms = await rbacApi.getRolePermissions(roleId);
      setRolePermissions(perms || []);
    } catch {
      setRolePermissions([]);
    }
  };

  const handleRoleChange = (roleId: string) => {
    setSelectedRole(roleId);
    fetchPermissions(roleId);
  };

  const filteredPermissions = rolePermissions.filter((p) =>
    p.toLowerCase().includes(permissionSearch.toLowerCase().trim())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('A valid email address format is required (e.g. name@domain.com)');
      return;
    }
    if (!fullName.trim()) {
      setErrorMsg('Full name is required');
      return;
    }
    if (!selectedRole) {
      setErrorMsg('Please select a primary role');
      return;
    }
    if (!confirmAuthorization) {
      setErrorMsg('Please confirm the simulated onboarding authorization.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await usersApi.onboardUser({
        email: email.trim(),
        fullName: fullName.trim(),
        role: selectedRole,
      });

      setSuccessMsg(
        `Staff account "${created?.fullName || fullName.trim()}" created successfully. Redirecting to User Directory...`
      );

      setTimeout(() => {
        navigate('/admin/users');
      }, 1500);
    } catch (err: any) {
      const code = err?.code || err?.response?.data?.code;
      const message = err?.response?.data?.message || err?.message;
      setErrorMsg(
        code === 'EMAIL_ALREADY_REGISTERED'
          ? 'This email is already registered'
          : (Array.isArray(message) ? message.join('; ') : message) || 'Failed to create staff account'
      );
      setIsSubmitting(false);
    }
  };

  const selectedRoleObj = roles.find((r) => r.id === selectedRole);
  const initials = fullName.trim()
    ? fullName
        .trim()
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE3EC] pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-[#17263A]">Onboard Staff Account</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border bg-blue-50 text-[#244A70] border-blue-200">
              INTERNAL WORKFORCE
            </span>
          </div>
          <p className="text-sm text-[#526071] mt-1 max-w-[68ch]">
            Provision a new enterprise staff profile, assign role credentials, and establish platform security governance.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/users')}
            className="text-slate-600 hover:bg-slate-100 px-3 py-1.5 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Cancel
          </Button>
          <button
            type="submit"
            form="onboard-user-form"
            disabled={isSubmitting || !confirmAuthorization}
            className="justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#244A70]/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-[#244A70] hover:bg-[#1B3856] text-white text-xs font-bold px-4 py-2 shadow-sm flex items-center space-x-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Creating Account…' : 'Complete Onboarding'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Feedback Notifications ──────────────────────────────────────── */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* ── 3. Main Form & Dossier Layout ──────────────────────────────────── */}
      <form id="onboard-user-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Form Sections */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Staff Identity & Profile Information */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
                1
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                  Staff Member Identity & Coordinates
                </h2>
                <p className="text-sm text-[#526071]">
                  Enter legal name, corporate email address, and organizational unit.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-[#526071] uppercase tracking-wider block mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none shrink-0" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Vance"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#DCE3EC] rounded-xl outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] text-[#17263A]"
                  />
                </div>
              </div>

              {/* Work Email */}
              <div>
                <label className="text-xs font-bold text-[#526071] uppercase tracking-wider block mb-1">
                  Work Email <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none shrink-0" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.vance@acmecorp.com"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#DCE3EC] rounded-xl outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] text-[#17263A]"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="text-xs font-bold text-[#526071] uppercase tracking-wider block mb-1">
                  Department / Unit <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none shrink-0" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-xl outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] text-[#17263A]"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Staff / Employee Code */}
              <div>
                <label className="text-xs font-bold text-[#526071] uppercase tracking-wider block mb-1">
                  Staff / Employee Code
                </label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="e.g. EMP-2026-089"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#DCE3EC] rounded-xl outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] text-[#17263A]"
                />
              </div>

              {/* Job Title */}
              <div>
                <label className="text-xs font-bold text-[#526071] uppercase tracking-wider block mb-1">
                  Job Title / Position
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior AST Conversion Engineer"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#DCE3EC] rounded-xl outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] text-[#17263A]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-bold text-[#526071] uppercase tracking-wider block mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+84 988 776 655"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#DCE3EC] rounded-xl outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] text-[#17263A]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Role Assignment & Platform Permissions */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
                2
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                  Role Assignment & System Entitlements
                </h2>
                <p className="text-sm text-[#526071]">
                  Select the primary role. System capabilities and permission grants update dynamically.
                </p>
              </div>
            </div>

            {/* Role Cards Grid */}
            <div>
              <label className="text-xs font-bold text-[#526071] uppercase tracking-wider block mb-2">
                Primary Assigned Role <span className="text-rose-600">*</span>
              </label>
              {isLoadingRoles ? (
                <div className="p-4 text-center text-sm text-slate-600">Loading available system roles…</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {roles.map((r) => {
                    const isSelected = selectedRole === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleRoleChange(r.id)}
                        className={`p-3 rounded-xl cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/80 ring-1 ring-[#244A70]'
                            : 'bg-slate-50/70 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-[#17263A] flex items-center gap-1.5">
                            <KeyRound className={`w-3.5 h-3.5 ${isSelected ? 'text-[#244A70]' : 'text-slate-500'}`} />
                            {r.name}
                          </span>
                          {isSelected && <BadgeCheck className="w-4 h-4 text-[#244A70] shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {r.description || `Platform capability profile for ${r.name}.`}
                        </p>
                        <div className="mt-1.5 text-xs font-mono text-slate-600">ID: {r.id}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Account Initial Status */}
            <div>
              <label className="text-xs font-bold text-[#526071] uppercase tracking-wider block mb-1">
                Account Status *
              </label>
              <select
                value={accountStatus}
                onChange={(e) => setAccountStatus(e.target.value as 'ACTIVE' | 'PENDING_ACTIVATION')}
                className="w-full px-3.5 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs focus:ring-1 focus:ring-[#244A70] focus:border-[#244A70] outline-none text-[#17263A]"
              >
                <option value="ACTIVE">Active (Immediate platform access)</option>
                <option value="PENDING_ACTIVATION">Pending Activation (Awaiting invitation verification)</option>
              </select>
            </div>
          </div>

          {/* Section 3: Security Governance & Invitation Dispatch */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
                3
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                  Security Governance & Account Provisioning
                </h2>
                <p className="text-sm text-[#526071]">
                  Configure password policies and initial sign-in authentication requirements.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <label className="flex items-start gap-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWelcomeEmail}
                  onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                  className="mt-0.5 rounded text-[#244A70] focus:ring-[#244A70]"
                />
                <div>
                  <span className="text-sm font-bold text-[#17263A] block">Send Welcome Invitation Email</span>
                  <span className="text-xs text-slate-600">
                    Dispatches onboarding email with secure activation link and authentication instructions.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireMfa}
                  onChange={(e) => setRequireMfa(e.target.checked)}
                  className="mt-0.5 rounded text-[#244A70] focus:ring-[#244A70]"
                />
                <div>
                  <span className="text-sm font-bold text-[#17263A] block">Enforce Multi-Factor Authentication (MFA)</span>
                  <span className="text-xs text-slate-600">
                    Mandates authenticator app or hardware token registration on initial login.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enforcePasswordRotation}
                  onChange={(e) => setEnforcePasswordRotation(e.target.checked)}
                  className="mt-0.5 rounded text-[#244A70] focus:ring-[#244A70]"
                />
                <div>
                  <span className="text-sm font-bold text-[#17263A] block">Periodic Password Rotation (90 Days)</span>
                  <span className="text-xs text-slate-600">
                    Enforces corporate security credential rotation schedule.
                  </span>
                </div>
              </label>
            </div>

            {/* Mandatory Authorization Confirmation */}
            <div className="border-l-2 border-[#244A70] pl-3 py-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={confirmAuthorization}
                  onChange={(e) => setConfirmAuthorization(e.target.checked)}
                  className="mt-0.5 rounded text-[#244A70] focus:ring-[#244A70]"
                />
                <span className="text-sm text-[#17263A] font-medium leading-relaxed">
                  I confirm the creation of this staff account and the associated initial role permissions.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Live Profile Dossier & Policy Guidance */}
        <div className="lg:col-span-4 space-y-6">
          {/* Live Profile Dossier Card */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="w-4 h-4 text-[#244A70]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#17263A]">
                Provisioning Profile Dossier
              </h3>
            </div>

            {/* User Identity Preview */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#244A70] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-[#17263A] truncate">
                  {fullName.trim() || 'New Staff Member'}
                </h4>
                <p className="text-xs text-slate-600 font-mono truncate">
                  {email.trim() || 'staff.email@alsm.io'}
                </p>
                <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-[#244A70] border border-blue-200">
                  {selectedRoleObj?.name || selectedRole || 'Unassigned Role'}
                </span>
              </div>
            </div>

            {/* Metadata Summary List */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Department:</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[160px]">
                  {department}
                </span>
              </div>
              {employeeCode && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Employee ID:</span>
                  <span className="font-mono font-semibold text-slate-800">{employeeCode}</span>
                </div>
              )}
              {jobTitle && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Job Title:</span>
                  <span className="font-semibold text-slate-800 text-right truncate max-w-[160px]">
                    {jobTitle}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Initial Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                    accountStatus === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {accountStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Permissions Count:</span>
                <span className="font-semibold text-[#244A70]">{rolePermissions.length} Grants</span>
              </div>
            </div>
          </div>

          {/* Live Permission Preview Card */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#17263A] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#244A70]" />
                <span>Live Permission Preview ({rolePermissions.length} grants)</span>
              </span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none shrink-0" />
                <input
                  type="text"
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  placeholder="Filter permissions..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#244A70] text-[#17263A]"
                />
              </div>
            </div>

            {filteredPermissions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
                {filteredPermissions.map((perm) => (
                  <span
                    key={perm}
                    className="px-2 py-0.5 text-xs font-mono bg-slate-100 rounded-md text-slate-700"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600 italic">
                {rolePermissions.length === 0
                  ? 'No specific permissions defined for this role.'
                  : 'No permissions match your filter query.'}
              </p>
            )}
          </div>

          {/* Security & Access Guidelines Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-xs text-[#17263A] uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#244A70]" />
              <span>Security & Compliance</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span>Account provisioning generates an immutable audit record in system event logs.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span>RBAC permissions adhere strictly to the principle of least privilege.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span>Accounts can be temporarily locked or offboarded with asset transfer at any time.</span>
              </li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OnboardUserPage;
