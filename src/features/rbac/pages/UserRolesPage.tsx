import React, { useState } from 'react';
import { Users, Search, Shield, Check, UserCheck } from 'lucide-react';

export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  isPlatformAdmin: boolean;
  roles: string[];
}

const AVAILABLE_ROLES = [
  { id: 'ADMIN', name: 'Platform Administrator', isSystem: true },
  { id: 'PROJECT_MANAGER', name: 'Project Manager', isSystem: false },
  { id: 'CONVERSION_OPERATOR', name: 'Conversion Operator', isSystem: false },
  { id: 'VALIDATOR', name: 'System Validator', isSystem: false },
  { id: 'REVIEWER', name: 'Reviewer', isSystem: false },
];

const INITIAL_USERS: StaffUser[] = [
  {
    id: 'u1',
    fullName: 'John Doe',
    email: 'admin@alsm.internal',
    isPlatformAdmin: true,
    roles: ['ADMIN'],
  },
  {
    id: 'u2',
    fullName: 'Sarah Jenkins',
    email: 's.jenkins@alsm.internal',
    isPlatformAdmin: false,
    roles: ['PROJECT_MANAGER', 'CONVERSION_OPERATOR'],
  },
  {
    id: 'u3',
    fullName: 'Alex Vance',
    email: 'a.vance@alsm.internal',
    isPlatformAdmin: false,
    roles: ['VALIDATOR', 'REVIEWER'],
  },
];

export const UserRolesPage: React.FC = () => {
  const [users, setUsers] = useState<StaffUser[]>(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleUserRole = (userId: string, roleId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const exists = u.roles.includes(roleId);
        const updated = exists
          ? u.roles.filter((r) => r !== roleId)
          : [...u.roles, roleId];
        return { ...u, roles: updated };
      })
    );
    if (selectedUser && selectedUser.id === userId) {
      const exists = selectedUser.roles.includes(roleId);
      const updated = exists
        ? selectedUser.roles.filter((r) => r !== roleId)
        : [...selectedUser.roles, roleId];
      setSelectedUser({ ...selectedUser, roles: updated });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#091E42] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0652CC]" />
            User Role Assignments
          </h1>
          <p className="text-xs text-[#6B778C] mt-1">
            Assign operational roles to staff accounts. Navigation and API access permissions are dynamically calculated based on role unions.
          </p>
        </div>
      </div>

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
            {filteredUsers.map((user) => (
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
                      Active Staff
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-wrap gap-1.5">
                    {user.roles.map((rId) => (
                      <span
                        key={rId}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#E8F1FF] text-[#0652CC] border border-[#0652CC]/20"
                      >
                        {AVAILABLE_ROLES.find((r) => r.id === rId)?.name || rId}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="px-3 py-1.5 bg-white border border-[#D9E2EC] rounded-lg text-xs font-semibold text-[#091E42] hover:bg-[#E8F1FF] hover:text-[#0652CC] transition-colors"
                  >
                    Manage Roles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
              {AVAILABLE_ROLES.map((role) => {
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
                      </div>
                    </div>
                    {isAssigned && <Check className="w-4 h-4 text-[#0652CC]" />}
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#E5EAF0]">
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
