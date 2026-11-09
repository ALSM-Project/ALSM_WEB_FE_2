import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Check, UserCheck, RefreshCw, UserPlus, 
  Lock, Unlock, UserMinus, ArrowRight, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { rbacApi, UserRbacDto, RoleDto } from '../api/rbac.api';
import { usersApi } from '../../users/api/users.api';
import { OffboardingWizardModal } from '../../users/components/OffboardingWizardModal';
import { Modal, Input, Button } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const UserRolesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: actor, hasPermission } = useAuth();
  const canLock = actor?.isPlatformAdmin === true && hasPermission('users.lock');
  const canOffboard = actor?.isPlatformAdmin === true && hasPermission('users.offboard') && hasPermission('resources.transfer.confirm');
  const [users, setUsers] = useState<UserRbacDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRbacDto | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Onboard (create staff) form state (Requirement 2.A)
  const [showOnboard, setShowOnboard] = useState<boolean>(false);
  const [onboardEmail, setOnboardEmail] = useState('');
  const [onboardFullName, setOnboardFullName] = useState('');
  const [onboardRole, setOnboardRole] = useState('');
  const [onboardStatus, setOnboardStatus] = useState<'ACTIVE' | 'PENDING_ACTIVATION'>('ACTIVE');
  const [onboardRolePermissions, setOnboardRolePermissions] = useState<string[]>([]);
  const [onboardConfirm, setOnboardConfirm] = useState<boolean>(false);
  const [onboardSubmitting, setOnboardSubmitting] = useState<boolean>(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSuccess, setOnboardSuccess] = useState<string | null>(null);

  // Lock Account Modal State (Requirement G)
  const [lockTargetUser, setLockTargetUser] = useState<UserRbacDto | null>(null);
  const [lockReason, setLockReason] = useState('Security policy violation / Suspicious activity');
  const [lockDuration, setLockDuration] = useState('24_HOURS');
  const [confirmLock, setConfirmLock] = useState<boolean>(false);
  const [isLocking, setIsLocking] = useState<boolean>(false);

  // Offboarding Modal State
  const [offboardTargetUser, setOffboardTargetUser] = useState<UserRbacDto | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const [fetchedUsers, fetchedRoles] = await Promise.all([
        rbacApi.getAllUsers(),
        rbacApi.getRoles(),
      ]);
      setUsers(fetchedUsers);
      setRoles(fetchedRoles);
    } catch (err: any) {
      console.error('Failed to load users/roles from MongoDB:', err);
      setErrorMsg(err.message || 'Failed to load user roles from MongoDB');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleSelectChange = async (roleId: string) => {
    setOnboardRole(roleId);
    if (!roleId) {
      setOnboardRolePermissions([]);
      return;
    }
    try {
      const perms = await rbacApi.getRolePermissions(roleId);
      setOnboardRolePermissions(perms);
    } catch {
      setOnboardRolePermissions([]);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredUsers.length);

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, startIndex, endIndex]);

  const handleToggleUserRole = async (userId: string, roleId: string) => {
    const userTarget = users.find((u) => u.id === userId);
    if (!userTarget) return;

    const exists = userTarget.roles.includes(roleId);
    const updatedRoles = exists
      ? userTarget.roles.filter((r) => r !== roleId)
      : [...userTarget.roles, roleId];

    // Optimistic UI Update
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, roles: updatedRoles } : u))
    );
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser({ ...selectedUser, roles: updatedRoles });
    }

    try {
      setIsSaving(true);
      await rbacApi.updateUserRoles(userId, updatedRoles);
    } catch (err: any) {
      console.error('Failed to update user roles in MongoDB:', err);
      setErrorMsg(err.message || 'Failed to update user roles in MongoDB');
      loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError(null);
    setOnboardSuccess(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(onboardEmail.trim())) return setOnboardError('A valid email address format is required (e.g. name@domain.com)');
    if (!onboardFullName.trim()) return setOnboardError('Full name is required');
    if (!onboardRole) return setOnboardError('Please select a role');
    if (!onboardConfirm) return setOnboardError('Please confirm the simulated onboarding authorization.');

    setOnboardSubmitting(true);
    try {
      const created = await usersApi.onboardUser({
        email: onboardEmail.trim(),
        fullName: onboardFullName.trim(),
        role: onboardRole,
      });

      await loadData();
      setOnboardSuccess(`Staff account "${created?.fullName || onboardFullName.trim()}" created successfully.`);
      setOnboardEmail('');
      setOnboardFullName('');
      setOnboardRole('');
      setOnboardStatus('ACTIVE');
      setOnboardConfirm(false);
      setOnboardRolePermissions([]);
      setTimeout(() => {
        setShowOnboard(false);
        setOnboardSuccess(null);
      }, 2000);
    } catch (err: any) {
      const code = err?.code || err?.response?.data?.code;
      const message = err?.response?.data?.message || err?.message;
      setOnboardError(
        code === 'EMAIL_ALREADY_REGISTERED'
          ? 'This email is already registered'
          : (Array.isArray(message) ? message.join('; ') : message) || 'Failed to create staff account'
      );
    } finally {
      setOnboardSubmitting(false);
    }
  };

  const handleLockAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockTargetUser || !canLock) return;
    if (!confirmLock) {
      setErrorMsg('Please confirm authorization to lock this account.');
      return;
    }
    try {
      setIsLocking(true);
      setErrorMsg(null);
      const formattedDuration = lockDuration.replace(/_/g, ' ');
      await usersApi.lockUser(lockTargetUser.id, `${lockReason} (Duration: ${formattedDuration})`);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === lockTargetUser.id
            ? { ...u, isLocked: true, lockReason, lockDuration }
            : u
        )
      );
      setSuccessMsg(`User ${lockTargetUser.email} has been locked for ${formattedDuration}. Active sessions invalidated.`);
      setLockTargetUser(null);
      setConfirmLock(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to lock user account');
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockAccount = async (user: UserRbacDto) => {
    if (!canLock) return;
    try {
      setErrorMsg(null);
      await usersApi.unlockUser(user.id);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, isLocked: false, lockReason: undefined, lockDuration: undefined }
            : u
        )
      );
      setSuccessMsg(`User ${user.email} has been unlocked and restored to active state.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to unlock user account');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center space-x-2 text-xs text-[#8491A3]">
        <RefreshCw className="w-5 h-5 animate-spin text-[#244A70]" />
        <span>Loading registered users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#DCE3EC] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">
            User Directory
          </h1>
        </div>
        <button
          onClick={() => {
            setOnboardError(null);
            setOnboardSuccess(null);
            setShowOnboard(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#244A70] text-white rounded-xl text-xs font-semibold hover:bg-[#244A70] transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Onboard User
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search staff users by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[#8491A3] uppercase font-bold text-[10px]">
            <tr>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Status & Security</th>
              <th className="py-3 px-4">Assigned Roles</th>
              <th className="py-3 px-4 text-right">Lifecycle Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE3EC]">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-[#8491A3]">
                  No registered users match your search query in MongoDB.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                  title="Click to open member details and assign roles"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#EEF1F6] text-[#244A70] font-bold flex items-center justify-center text-xs group-hover:bg-[#244A70] group-hover:text-white transition-colors">
                        {user.fullName.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-bold text-[#17263A] group-hover:text-[#244A70] transition-colors flex items-center gap-1.5">
                          <span>{user.fullName}</span>
                        </div>
                        <div className="text-[11px] text-[#8491A3]">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      {user.isPlatformAdmin && (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-lg bg-[#17263A] text-white">
                          PLATFORM ADMIN
                        </span>
                      )}
                      {user.isLocked ? (
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 w-fit">
                            <Lock className="w-3 h-3 text-rose-700" />
                            ACCOUNT LOCKED
                          </span>
                          {user.lockReason && (
                            <span className="text-[10px] text-rose-700 italic block line-clamp-1 max-w-[220px]" title={user.lockReason}>
                              "{user.lockReason}"
                            </span>
                          )}
                          {user.lockDuration && (
                            <span className="text-[9px] font-mono font-semibold text-slate-500 block">
                              Duration: {user.lockDuration.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      ) : (user.isActive ?? true) ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active User
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-gray-100 text-gray-700 border border-gray-300">
                          Deactivated
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles.map((rId) => {
                        const matchedRole = roles.find((r) => r.id === rId);
                        return (
                          <span
                            key={rId}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#EEF1F6] text-[#244A70] border border-[#244A70]/20"
                          >
                            {matchedRole ? matchedRole.name : rId}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/users/${user.id}`);
                        }}
                        className="px-2.5 py-1 bg-[#EEF1F6] text-[#244A70] hover:bg-[#244A70] hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        title="View member profile and manage roles"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(user);
                        }}
                        className="px-2.5 py-1 bg-white border border-[#DCE3EC] rounded-lg text-xs font-semibold text-[#17263A] hover:bg-[#EEF1F6] hover:text-[#244A70] transition-colors cursor-pointer"
                      >
                        Roles
                      </button>

                      {/* Lock / Unlock (SRS 3.13.9) */}
                      {canLock && !user.isPlatformAdmin && (
                        user.isLocked ? (
                          <button
                            onClick={() => handleUnlockAccount(user)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 flex items-center gap-1"
                            title="Unlock account"
                          >
                            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                            Unlock
                          </button>
                        ) : (
                          <button
                            onClick={() => setLockTargetUser(user)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold border border-amber-300 bg-white text-amber-800 hover:bg-amber-50 flex items-center gap-1"
                            title="Lock account and terminate active sessions"
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            Lock
                          </button>
                        )
                      )}

                      {/* Controlled Offboard (SRS 3.14.2) */}
                      {canOffboard && !user.isPlatformAdmin && (user.isActive ?? true) && user.id !== actor?.id && (
                        <button
                          onClick={() => setOffboardTargetUser(user)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 flex items-center gap-1"
                          title="Offboard user and transfer resources"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Offboard
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {filteredUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#F8FAFC] border-t border-[#DCE3EC] text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#DCE3EC] rounded px-2 py-1 text-xs font-semibold text-[#17263A] focus:outline-none focus:border-[#244A70] cursor-pointer shadow-2xs"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-slate-300">|</span>
              <span>
                Showing <strong className="font-semibold text-[#17263A]">{filteredUsers.length === 0 ? 0 : startIndex + 1}</strong> to{' '}
                <strong className="font-semibold text-[#17263A]">{endIndex}</strong> of{' '}
                <strong className="font-semibold text-[#17263A]">{filteredUsers.length}</strong> staff users
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={safeCurrentPage <= 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#DCE3EC] bg-white text-xs font-semibold text-[#17263A] hover:bg-[#F4F7FB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1 px-2 text-xs">
                <span className="font-semibold text-[#17263A]">{safeCurrentPage}</span>
                <span className="text-slate-400">/</span>
                <span>{totalPages}</span>
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={safeCurrentPage >= totalPages}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#DCE3EC] bg-white text-xs font-semibold text-[#17263A] hover:bg-[#F4F7FB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Onboard User Modal with Real-Time Permission Preview (SRS 3.14.1) */}
      {showOnboard && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#17263A]/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border border-[#DCE3EC] space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCE3EC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17263A]">Onboard Staff Account</h3>
                <p className="text-xs text-[#8491A3]">Create an internal staff account with real-time permission preview.</p>
              </div>
              <UserPlus className="w-5 h-5 text-[#244A70]" />
            </div>

            {onboardError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                {onboardError}
              </div>
            )}
            {onboardSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                {onboardSuccess}
              </div>
            )}

            <form onSubmit={handleOnboardSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  required
                  value={onboardFullName}
                  onChange={(e) => setOnboardFullName(e.target.value)}
                  placeholder="Alex Vance"
                  className="mt-1 w-full px-3.5 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider">Work Email *</label>
                <input
                  type="email"
                  required
                  value={onboardEmail}
                  onChange={(e) => setOnboardEmail(e.target.value)}
                  placeholder="alex.vance@acmecorp.com"
                  className="mt-1 w-full px-3.5 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider">Assigned Role *</label>
                <select
                  required
                  value={onboardRole}
                  onChange={(e) => handleRoleSelectChange(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none"
                >
                  <option value="">Select a role…</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} ({role.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider">Account Status *</label>
                <select
                  value={onboardStatus}
                  onChange={(e) => setOnboardStatus(e.target.value as 'ACTIVE' | 'PENDING_ACTIVATION')}
                  className="mt-1 w-full px-3.5 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none"
                >
                  <option value="ACTIVE">Active (Immediate platform access)</option>
                  <option value="PENDING_ACTIVATION">Pending Activation (Awaiting invitation verification)</option>
                </select>
              </div>

              {/* Real-Time Permission Preview (SRS 3.14.1) */}
              {onboardRolePermissions.length > 0 && (
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
                  <span className="text-[10px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1.5">
                    Live Permission Preview ({onboardRolePermissions.length} grants):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {onboardRolePermissions.map((p) => (
                      <span key={p} className="px-1.5 py-0.5 text-[10px] rounded font-mono bg-white border border-[#DCE3EC] text-[#17263A]">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmation Step */}
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onboardConfirm}
                    onChange={(e) => setOnboardConfirm(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#244A70] focus:ring-[#244A70]"
                  />
                  <span className="text-xs text-[#17263A] font-medium leading-relaxed">
                    I confirm the creation of this staff account and the associated initial role permissions.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCE3EC]">
                <button
                  type="button"
                  onClick={() => setShowOnboard(false)}
                  className="px-4 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs font-semibold text-[#17263A] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardSubmitting}
                  className="px-4 py-2 bg-[#244A70] text-white rounded-xl text-xs font-semibold hover:bg-[#244A70] disabled:opacity-50"
                >
                  {onboardSubmitting ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lock Account Modal (SRS 3.13.9 / Requirement G) */}
      <Modal
        isOpen={!!lockTargetUser}
        onClose={() => {
          setLockTargetUser(null);
          setConfirmLock(false);
        }}
        title="Lock Staff Account & Invalidate Sessions"
      >
        <form onSubmit={handleLockAccount} className="space-y-4 text-xs">
          <p className="text-xs text-[#8491A3]">
            Locking account for <strong className="text-[#17263A]">{lockTargetUser?.fullName}</strong> ({lockTargetUser?.email})
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
                setLockTargetUser(null);
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

      {/* Offboarding Wizard Modal (SRS 3.14.2) */}
      <OffboardingWizardModal
        isOpen={!!offboardTargetUser}
        onClose={() => setOffboardTargetUser(null)}
        userToOffboard={offboardTargetUser as any}
        activeStaffMembers={users as any}
        onSuccess={() => {
          setSuccessMsg(`User ${offboardTargetUser?.email} successfully offboarded and resources transferred.`);
          loadData();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />

      {/* Manage User Roles Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#17263A]/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border border-[#DCE3EC] space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCE3EC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17263A]">Assign Roles for {selectedUser.fullName}</h3>
                <p className="text-xs text-[#8491A3]">{selectedUser.email}</p>
              </div>
              <UserCheck className="w-5 h-5 text-[#244A70]" />
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {roles.map((role) => {
                const isAssigned = selectedUser.roles.includes(role.id);
                return (
                  <label
                    key={role.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                      isAssigned
                        ? 'border-[#244A70] bg-[#EEF1F6]/40'
                        : 'border-[#DCE3EC] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleToggleUserRole(selectedUser.id, role.id)}
                        className="rounded text-[#244A70] focus:ring-[#244A70]"
                      />
                      <div>
                        <span className="font-bold text-[#17263A]">{role.name}</span>
                        <span className="text-[10px] text-[#8491A3] ml-2 font-mono">({role.id})</span>
                        <p className="text-[11px] text-[#8491A3] mt-0.5">{role.description}</p>
                      </div>
                    </div>
                    {isAssigned && <Check className="w-4 h-4 text-[#244A70]" />}
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#DCE3EC]">
              <span className="text-xs text-[#8491A3]">
                {isSaving ? 'Saving changes to MongoDB...' : 'Changes save automatically.'}
              </span>
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-[#244A70] text-white rounded-xl text-xs font-semibold hover:bg-[#244A70]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRolesPage;
