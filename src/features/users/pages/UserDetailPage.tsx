import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Unlock,
  UserMinus,
  Mail,
  Check,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  ExternalLink,
} from 'lucide-react';
import { rbacApi, UserRbacDto, RoleDto } from '../../rbac/api/rbac.api';
import { usersApi } from '../api/users.api';
import { OffboardingWizardModal } from '../components/OffboardingWizardModal';
import { Modal, Input, Button } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useBreadcrumbEntity } from '@/hooks/useBreadcrumb';
import { partnersApi } from '@/features/partners/api/partners.api';
import { PartnerProject } from '@/features/partners/types/partner.types';

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: actor, hasPermission } = useAuth();

  const canLock = actor?.isPlatformAdmin === true && hasPermission('users.lock');
  const canOffboard =
    actor?.isPlatformAdmin === true &&
    hasPermission('users.offboard') &&
    hasPermission('resources.transfer.confirm');
  const canManageRoles = hasPermission('users.manage') || hasPermission('roles.manage');

  const [targetUser, setTargetUser] = useState<UserRbacDto | null>(null);
  useBreadcrumbEntity(targetUser?.fullName, id);

  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<PartnerProject[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSavingRoles, setIsSavingRoles] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Lock Account Modal State
  const [showLockModal, setShowLockModal] = useState<boolean>(false);
  const [lockReason, setLockReason] = useState('Security policy violation / Suspicious activity');
  const [lockDuration, setLockDuration] = useState('24_HOURS');
  const [confirmLock, setConfirmLock] = useState<boolean>(false);
  const [isLocking, setIsLocking] = useState<boolean>(false);

  // Offboarding Modal State
  const [showOffboardModal, setShowOffboardModal] = useState<boolean>(false);
  const [allUsersList, setAllUsersList] = useState<UserRbacDto[]>([]);

  const loadUserData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const [userData, allRoles, allUsers, projects] = await Promise.all([
        rbacApi.getUserById(id),
        rbacApi.getRoles(),
        rbacApi.getAllUsers().catch(() => []),
        partnersApi.getProjects().catch(() => []),
      ]);

      setTargetUser(userData);
      setSelectedRoleIds(userData.roles || []);
      setRoles(allRoles || []);
      setAllUsersList(allUsers || []);

      const userProjects = (projects || []).filter(
        (p) => p.assignedStaffId === id || (p as any).assignedTo === id
      );
      setAssignedProjects(userProjects);
    } catch (err: any) {
      console.error('Failed to load user detail:', err);
      setErrorMsg(err.message || 'Failed to load user details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [id]);

  const handleToggleRole = (roleId: string) => {
    if (!canManageRoles) return;
    const isAssigned = selectedRoleIds.includes(roleId);
    const updated = isAssigned
      ? selectedRoleIds.filter((r) => r !== roleId)
      : [...selectedRoleIds, roleId];

    setSelectedRoleIds(updated);
    setHasUnsavedChanges(true);
  };

  const handleSaveRoles = async () => {
    if (!targetUser || !canManageRoles) return;
    try {
      setIsSavingRoles(true);
      setErrorMsg(null);
      await rbacApi.updateUserRoles(targetUser.id, selectedRoleIds);
      setTargetUser({ ...targetUser, roles: selectedRoleIds });
      setHasUnsavedChanges(false);
      setSuccessMsg(`Roles successfully updated for ${targetUser.fullName}.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to update roles:', err);
      setErrorMsg(err.message || 'Failed to update roles for user');
    } finally {
      setIsSavingRoles(false);
    }
  };

  const handleCopyId = () => {
    if (!targetUser?.id) return;
    navigator.clipboard.writeText(targetUser.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLockAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !canLock) return;
    if (!confirmLock) {
      setErrorMsg('Please confirm authorization to lock this account.');
      return;
    }
    try {
      setIsLocking(true);
      setErrorMsg(null);
      const formattedDuration = lockDuration.replace(/_/g, ' ');
      await usersApi.lockUser(targetUser.id, `${lockReason} (Duration: ${formattedDuration})`);

      setTargetUser({
        ...targetUser,
        isLocked: true,
        lockReason,
        lockDuration,
      });
      setShowLockModal(false);
      setConfirmLock(false);
      setSuccessMsg(`User ${targetUser.email} has been locked for ${formattedDuration}. Active sessions invalidated.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to lock user account');
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockAccount = async () => {
    if (!targetUser || !canLock) return;
    try {
      setErrorMsg(null);
      await usersApi.unlockUser(targetUser.id);
      setTargetUser({
        ...targetUser,
        isLocked: false,
        lockReason: undefined,
        lockDuration: undefined,
      });
      setSuccessMsg(`User ${targetUser.email} has been unlocked and restored to active state.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to unlock user account');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center space-x-2 text-xs text-[#8491A3]">
        <RefreshCw className="w-5 h-5 animate-spin text-[#244A70]" />
        <span>Loading member profile & roles...</span>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#244A70] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to User Directory
        </button>
        <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl text-center text-xs text-[#8491A3]">
          {errorMsg || 'User account not found.'}
        </div>
      </div>
    );
  }

  const initials = targetUser.fullName
    ? targetUser.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 3)
    : 'U';

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* ── Top Navigation & Actions Bar ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE3EC] pb-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/admin/users')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#244A70] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to User Directory</span>
          </button>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">
              {targetUser.fullName}
            </h1>
            {targetUser.isPlatformAdmin && (
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-md bg-[#17263A] text-white">
                PLATFORM ADMIN
              </span>
            )}
            {targetUser.isLocked ? (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-rose-700" />
                Account Locked
              </span>
            ) : (targetUser.isActive ?? true) ? (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Active Member
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-gray-100 text-gray-700 border border-gray-300">
                Deactivated
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canLock && !targetUser.isPlatformAdmin && (
            targetUser.isLocked ? (
              <button
                type="button"
                onClick={handleUnlockAccount}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 shadow-2xs transition-colors cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowLockModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-300 bg-white text-amber-800 hover:bg-amber-50 shadow-2xs transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Account</span>
              </button>
            )
          )}

          {canOffboard && !targetUser.isPlatformAdmin && (targetUser.isActive ?? true) && targetUser.id !== actor?.id && (
            <button
              type="button"
              onClick={() => setShowOffboardModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 shadow-2xs transition-colors cursor-pointer"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>Offboard User</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800 text-xs font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800 text-xs font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Main 2-Column Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Member Profile & Security Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-3.5 pb-4 border-b border-[#DCE3EC]">
              <div className="w-12 h-12 rounded-full bg-[#EEF1F6] text-[#244A70] font-bold flex items-center justify-center text-base shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-[#17263A] truncate">
                  {targetUser.fullName}
                </div>
                <div className="text-xs text-[#8491A3] truncate flex items-center gap-1 mt-0.5">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{targetUser.email}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#8491A3] block text-[11px] font-semibold uppercase tracking-wider">
                  User ID
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-[#F8FAFC] border border-[#DCE3EC] px-2 py-1 rounded text-[11px] font-mono text-slate-700 truncate max-w-[220px]">
                    {targetUser.id}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 hover:bg-[#EEF1F6] rounded text-[#244A70] transition-colors cursor-pointer"
                    title="Copy User ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[#8491A3] block text-[11px] font-semibold uppercase tracking-wider">
                  Account Classification
                </span>
                <span className="font-semibold text-[#17263A] mt-1 block">
                  {targetUser.isPlatformAdmin ? 'Platform Administrator (Full Superuser)' : 'Standard Organization Member'}
                </span>
              </div>

              <div>
                <span className="text-[#8491A3] block text-[11px] font-semibold uppercase tracking-wider">
                  Security Status
                </span>
                {targetUser.isLocked ? (
                  <div className="mt-1 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      Locked Account
                    </div>
                    {targetUser.lockReason && (
                      <div className="italic text-[11px]">"{targetUser.lockReason}"</div>
                    )}
                    {targetUser.lockDuration && (
                      <div className="text-[10px] font-mono text-rose-700">
                        Duration: {targetUser.lockDuration.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="font-semibold text-emerald-700 mt-1 block">
                    Normal (No active security lockouts)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Assigned Projects Card */}
          <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-[#244A70]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#17263A]">
                  Assigned Projects
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {assignedProjects.length}
              </span>
            </div>

            {assignedProjects.length === 0 ? (
              <p className="text-xs text-[#8491A3] py-2">
                No modernization projects directly assigned to this member.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                {assignedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => navigate(`/partners/projects/${proj.id}`)}
                    className="p-2.5 bg-[#F8FAFC] hover:bg-[#EEF1F6] border border-[#DCE3EC] rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-[#17263A] truncate">{proj.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{proj.id}</div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (2 spans): Role Assignment & Access Governance */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-[#DCE3EC] p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCE3EC]">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#244A70]" />
                  <h2 className="text-base font-bold text-[#17263A]">
                    Role Assignment &amp; Access Governance
                  </h2>
                </div>
                <p className="text-xs text-[#8491A3] mt-0.5">
                  Select and assign system roles for this member. Changes govern permissions across all modules.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveRoles}
                  disabled={isSavingRoles || !hasUnsavedChanges || !canManageRoles}
                  className="bg-[#244A70] hover:bg-[#1B3856] text-white text-xs px-4"
                >
                  {isSavingRoles ? 'Saving...' : 'Save Role Assignments'}
                </Button>
              </div>
            </div>

            {hasUnsavedChanges && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>You have unsaved role modifications. Click <strong>"Save Role Assignments"</strong> to commit changes.</span>
              </div>
            )}

            {/* Roles List */}
            <div className="space-y-3">
              {roles.map((role) => {
                const isAssigned = selectedRoleIds.includes(role.id);
                return (
                  <div
                    key={role.id}
                    onClick={() => handleToggleRole(role.id)}
                    className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                      isAssigned
                        ? 'border-[#244A70] bg-[#EEF1F6]/50 shadow-2xs ring-1 ring-[#244A70]/20'
                        : 'border-[#DCE3EC] bg-white hover:border-slate-300 hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          disabled={!canManageRoles}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-[#244A70] focus:ring-[#244A70] cursor-pointer"
                        />
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-[#17263A]">
                              {role.name}
                            </span>
                            <span className="font-mono text-[10px] font-semibold text-[#244A70] bg-white px-2 py-0.5 rounded border border-[#DCE3EC]">
                              {role.id}
                            </span>
                            {role.isSystem && (
                              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                System Role
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {role.description}
                          </p>
                        </div>
                      </div>

                      {isAssigned && (
                        <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Assigned
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Lock Account Modal */}
      <Modal
        isOpen={showLockModal}
        onClose={() => {
          setShowLockModal(false);
          setConfirmLock(false);
        }}
        title="Lock Staff Account & Invalidate Sessions"
      >
        <form onSubmit={handleLockAccount} className="space-y-4 text-xs">
          <p className="text-xs text-[#8491A3]">
            Locking account for <strong className="text-[#17263A]">{targetUser.fullName}</strong> ({targetUser.email})
            will immediately invalidate all active web sessions and prevent authentication.
          </p>

          <div>
            <label className="block text-xs font-semibold text-[#17263A] mb-1">Lock Audit Reason *</label>
            <Input
              required
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              placeholder="e.g. Suspected credential leak / Investigation"
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17263A] mb-1">Lock Duration *</label>
            <select
              value={lockDuration}
              onChange={(e) => setLockDuration(e.target.value)}
              className="w-full px-3 py-2 border border-[#DCE3EC] rounded-xl text-xs bg-white text-[#17263A] focus:ring-2 focus:ring-[#244A70] outline-none"
            >
              <option value="24_HOURS">24 Hours (Temporary Hold)</option>
              <option value="7_DAYS">7 Days (Security Audit)</option>
              <option value="30_DAYS">30 Days (Extended Review)</option>
              <option value="INDEFINITE">Permanent / Indefinite (Until Manual Unlock)</option>
            </select>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
            <span className="font-bold block mb-1">Security Policy Authorization Confirmation:</span>
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={confirmLock}
                onChange={(e) => setConfirmLock(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>I confirm that locking this account is authorized under platform security governance.</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#DCE3EC]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowLockModal(false);
                setConfirmLock(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isLocking || !confirmLock || !lockReason.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
            >
              {isLocking ? 'Locking...' : 'Confirm Account Lock'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Offboarding Wizard Modal */}
      <OffboardingWizardModal
        isOpen={showOffboardModal}
        onClose={() => setShowOffboardModal(false)}
        userToOffboard={targetUser as any}
        activeStaffMembers={allUsersList as any}
        onSuccess={() => {
          setSuccessMsg(`User ${targetUser.email} successfully offboarded and resources transferred.`);
          loadUserData();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />
    </div>
  );
};

export default UserDetailPage;
