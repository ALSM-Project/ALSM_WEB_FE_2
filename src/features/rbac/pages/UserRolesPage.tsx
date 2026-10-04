import React, { useState, useEffect } from 'react';
import { Search, Check, UserCheck, RefreshCw, UserPlus, Ban, PlayCircle } from 'lucide-react';
import { rbacApi, UserRbacDto, RoleDto } from '../api/rbac.api';
import { usersApi } from '../../users/api/users.api';

export const UserRolesPage: React.FC = () => {
  const [users, setUsers] = useState<UserRbacDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRbacDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Onboard (create staff) form state
  const [showOnboard, setShowOnboard] = useState<boolean>(false);
  const [onboardEmail, setOnboardEmail] = useState('');
  const [onboardFullName, setOnboardFullName] = useState('');
  const [onboardRole, setOnboardRole] = useState('');
  const [onboardSubmitting, setOnboardSubmitting] = useState<boolean>(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSuccess, setOnboardSuccess] = useState<string | null>(null);

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

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

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
      // Rollback
      loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError(null);
    setOnboardSuccess(null);

    if (!onboardEmail.includes('@')) return setOnboardError('A valid email is required');
    if (!onboardFullName.trim()) return setOnboardError('Full name is required');
    if (!onboardRole) return setOnboardError('Please select a role');

    setOnboardSubmitting(true);
    try {
      await usersApi.onboardUser({
        email: onboardEmail.trim(),
        fullName: onboardFullName.trim(),
        role: onboardRole,
      });
      setOnboardSuccess('Staff account created and invitation email sent');
      setOnboardEmail('');
      setOnboardFullName('');
      setOnboardRole('');
      await loadData();
    } catch (err: any) {
      const code = err?.code || err?.response?.data?.code;
      setOnboardError(
        code === 'EMAIL_ALREADY_REGISTERED'
          ? 'This email is already registered'
          : err?.message || 'Failed to create staff account',
      );
    } finally {
      setOnboardSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserRbacDto) => {
    const nextActive = !user.isActive;
    try {
      await usersApi.updateUserStatus(user.id, nextActive);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update user status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center space-x-2 text-xs text-[#6B778C]">
        <RefreshCw className="w-5 h-5 animate-spin text-[#0652CC]" />
        <span>Loading Registered Users from MongoDB Atlas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#091E42] tracking-tight">
            User Role Assignments
          </h1>
          <p className="text-xs text-[#6B778C] mt-1">
            Assign operational roles to staff accounts. Role assignments are persisted directly in MongoDB.
          </p>
        </div>
        <button
          onClick={() => {
            setOnboardError(null);
            setOnboardSuccess(null);
            setShowOnboard(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0652CC] text-white rounded-xl text-xs font-semibold hover:bg-[#0543A8] transition-colors"
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

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search staff users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[#6B778C] uppercase font-bold text-[10px]">
            <tr>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Assigned Roles</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF0]">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-[#6B778C]">
                  No registered users match your search query in MongoDB.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#F7F9FC] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E8F1FF] text-[#0652CC] font-bold flex items-center justify-center text-xs">
                        {user.fullName.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-bold text-[#091E42]">{user.fullName}</div>
                        <div className="text-[11px] text-[#6B778C]">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {user.isPlatformAdmin ? (
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-[#091E42] text-white">
                        PLATFORM ADMIN
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active User
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles.map((rId) => {
                        const matchedRole = roles.find((r) => r.id === rId);
                        return (
                          <span
                            key={rId}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#E8F1FF] text-[#0652CC] border border-[#0652CC]/20"
                          >
                            {matchedRole ? matchedRole.name : rId}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="px-3 py-1.5 bg-white border border-[#D9E2EC] rounded-lg text-xs font-semibold text-[#091E42] hover:bg-[#E8F1FF] hover:text-[#0652CC] transition-colors"
                      >
                        Manage Roles
                      </button>
                      {!user.isPlatformAdmin && (
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={isSaving}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                            user.isActive
                              ? 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50'
                              : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {user.isActive ? (
                            <span className="flex items-center gap-1"><Ban className="w-3.5 h-3.5" /> Deactivate</span>
                          ) : (
                            <span className="flex items-center gap-1"><PlayCircle className="w-3.5 h-3.5" /> Activate</span>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Onboard User Modal */}
      {showOnboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border border-[#E5EAF0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#091E42]">Onboard Staff Account</h3>
                <p className="text-xs text-[#6B778C]">Create an internal staff account with a temporary password.</p>
              </div>
              <UserPlus className="w-5 h-5 text-[#0652CC]" />
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
                <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={onboardFullName}
                  onChange={(e) => setOnboardFullName(e.target.value)}
                  placeholder="Alex Vance"
                  className="mt-1 w-full px-3.5 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={onboardEmail}
                  onChange={(e) => setOnboardEmail(e.target.value)}
                  placeholder="alex.vance@acmecorp.com"
                  className="mt-1 w-full px-3.5 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider">Role</label>
                <select
                  value={onboardRole}
                  onChange={(e) => setOnboardRole(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
                >
                  <option value="">Select a role…</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} ({role.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5EAF0]">
                <button
                  type="button"
                  onClick={() => setShowOnboard(false)}
                  className="px-4 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs font-semibold text-[#091E42] hover:bg-[#F7F9FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardSubmitting}
                  className="px-4 py-2 bg-[#0652CC] text-white rounded-xl text-xs font-semibold hover:bg-[#0543A8] disabled:opacity-50"
                >
                  {onboardSubmitting ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage User Roles Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border border-[#E5EAF0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#091E42]">Assign Roles for {selectedUser.fullName}</h3>
                <p className="text-xs text-[#6B778C]">{selectedUser.email}</p>
              </div>
              <UserCheck className="w-5 h-5 text-[#0652CC]" />
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {roles.map((role) => {
                const isAssigned = selectedUser.roles.includes(role.id);
                return (
                  <label
                    key={role.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                      isAssigned
                        ? 'border-[#0652CC] bg-[#E8F1FF]/40'
                        : 'border-[#E5EAF0] hover:bg-[#F7F9FC]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleToggleUserRole(selectedUser.id, role.id)}
                        className="rounded text-[#0652CC] focus:ring-[#0652CC]"
                      />
                      <div>
                        <span className="font-bold text-[#091E42]">{role.name}</span>
                        <span className="text-[10px] text-[#6B778C] ml-2 font-mono">({role.id})</span>
                        <p className="text-[11px] text-[#42526E] mt-0.5">{role.description}</p>
                      </div>
                    </div>
                    {isAssigned && <Check className="w-4 h-4 text-[#0652CC]" />}
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E5EAF0]">
              <span className="text-xs text-[#6B778C]">
                {isSaving ? 'Saving changes to MongoDB...' : 'Changes save automatically.'}
              </span>
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-[#0652CC] text-white rounded-xl text-xs font-semibold hover:bg-[#0543A8]"
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
