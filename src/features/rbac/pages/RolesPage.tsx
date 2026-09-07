import React, { useState } from 'react';
import { Shield, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

export interface PermissionItem {
  key: string;
  label: string;
  group: string;
  description: string;
}

export interface RoleItem {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

const DEFAULT_PERMISSIONS: PermissionItem[] = [
  { key: 'dashboard.view', label: 'View Dashboard', group: 'Dashboard', description: 'Access dashboard overview' },
  { key: 'projects.view', label: 'View Projects', group: 'Projects', description: 'View projects list and details' },
  { key: 'projects.create', label: 'Create Projects', group: 'Projects', description: 'Create new modernization projects' },
  { key: 'projects.update', label: 'Update Projects', group: 'Projects', description: 'Edit existing projects' },
  { key: 'projects.delete', label: 'Delete Projects', group: 'Projects', description: 'Remove projects' },
  { key: 'conversion.view', label: 'View Conversions', group: 'Conversion', description: 'View conversion jobs' },
  { key: 'conversion.execute', label: 'Execute Conversion', group: 'Conversion', description: 'Run code conversion jobs' },
  { key: 'diagnostics.view', label: 'View Diagnostics', group: 'Diagnostics', description: 'View system analysis findings' },
  { key: 'diagnostics.review', label: 'Review Diagnostics', group: 'Diagnostics', description: 'Perform diagnostic reviews' },
  { key: 'users.view', label: 'View Users', group: 'Users', description: 'View platform users' },
  { key: 'users.manage', label: 'Manage Users', group: 'Users', description: 'Create/edit users and assign roles' },
  { key: 'roles.view', label: 'View Roles', group: 'Roles', description: 'View roles and permissions' },
  { key: 'roles.manage', label: 'Manage Roles', group: 'Roles', description: 'Create/edit roles and role permissions' },
  { key: 'menu.view', label: 'View Menu Settings', group: 'Menu', description: 'View menu configurations' },
  { key: 'menu.manage', label: 'Manage Menu Builder', group: 'Menu', description: 'Configure application menus' },
  { key: 'system.settings', label: 'System Settings', group: 'System', description: 'Manage global system settings' },
];

const INITIAL_ROLES: RoleItem[] = [
  {
    id: 'ADMIN',
    name: 'Platform Administrator',
    description: 'Full administrative access to all internal platform functions and settings',
    isSystem: true,
    permissions: DEFAULT_PERMISSIONS.map((p) => p.key),
  },
  {
    id: 'PROJECT_MANAGER',
    name: 'Project Manager',
    description: 'Manages modernization projects, team assignments, and reports',
    isSystem: false,
    permissions: ['dashboard.view', 'projects.view', 'projects.create', 'projects.update', 'diagnostics.view'],
  },
  {
    id: 'CONVERSION_OPERATOR',
    name: 'Conversion Operator',
    description: 'Executes legacy code conversions and monitors execution queues',
    isSystem: false,
    permissions: ['dashboard.view', 'projects.view', 'conversion.view', 'conversion.execute'],
  },
  {
    id: 'VALIDATOR',
    name: 'System Validator',
    description: 'Reviews diagnostic analysis findings and validates schema translations',
    isSystem: false,
    permissions: ['dashboard.view', 'diagnostics.view', 'diagnostics.review'],
  },
];

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>(INITIAL_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('ADMIN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoleId, setNewRoleId] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  const handleTogglePermission = (roleId: string, permKey: string) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId) return r;
        const exists = r.permissions.includes(permKey);
        const updated = exists
          ? r.permissions.filter((k) => k !== permKey)
          : [...r.permissions, permKey];
        return { ...r, permissions: updated };
      })
    );
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleId.trim() || !newRoleName.trim()) return;

    const newRole: RoleItem = {
      id: newRoleId.trim().toUpperCase().replace(/\s+/g, '_'),
      name: newRoleName.trim(),
      description: newRoleDesc.trim(),
      isSystem: false,
      permissions: ['dashboard.view'],
    };

    setRoles([...roles, newRole]);
    setSelectedRoleId(newRole.id);
    setIsModalOpen(false);
    setNewRoleId('');
    setNewRoleName('');
    setNewRoleDesc('');
  };

  const handleDeleteRole = (id: string) => {
    if (roles.find((r) => r.id === id)?.isSystem) return;
    setRoles(roles.filter((r) => r.id !== id));
    if (selectedRoleId === id) setSelectedRoleId('ADMIN');
  };

  const groupedPermissions = DEFAULT_PERMISSIONS.reduce((acc, perm) => {
    acc[perm.group] = acc[perm.group] || [];
    acc[perm.group].push(perm);
    return acc;
  }, {} as Record<string, PermissionItem[]>);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#091E42] flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#0652CC]" />
            Roles & Permissions Management
          </h1>
          <p className="text-xs text-[#6B778C] mt-1">
            Configure system roles and assign explicit permission keys for API authorization and dynamic navigation.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0652CC] text-white rounded-xl text-xs font-semibold hover:bg-[#0543A8] transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Create New Role
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Role List */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B778C] px-1">
            Platform Roles ({roles.length})
          </h2>
          <div className="space-y-2">
            {roles.map((role) => {
              const isSelected = role.id === selectedRoleId;
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-[#0652CC] bg-[#E8F1FF]/50 shadow-xs'
                      : 'border-[#E5EAF0] bg-white hover:border-[#B3D4FF]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#091E42]">{role.name}</span>
                      {role.isSystem && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#091E42] text-white">
                          SYSTEM
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B778C] line-clamp-1">{role.description}</p>
                    <span className="inline-block text-[10px] font-semibold text-[#0652CC]">
                      {role.permissions.length} Permissions Assigned
                    </span>
                  </div>

                  {!role.isSystem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(role.id);
                      }}
                      className="p-1.5 text-[#94A3B8] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Permissions Matrix for Selected Role */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#091E42]">{selectedRole.name}</h3>
                <span className="text-xs text-[#6B778C] font-mono">({selectedRole.id})</span>
              </div>
              <p className="text-xs text-[#6B778C] mt-0.5">{selectedRole.description}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#0652CC] font-semibold bg-[#E8F1FF] px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              {selectedRole.permissions.length} Active Permissions
            </div>
          </div>

          {/* Grouped Permissions Checkboxes */}
          <div className="space-y-5 max-h-[520px] overflow-y-auto pr-2">
            {Object.entries(groupedPermissions).map(([group, perms]) => (
              <div key={group} className="border border-[#E5EAF0] rounded-xl p-4 bg-[#F7F9FC]">
                <h4 className="text-xs font-bold text-[#091E42] uppercase tracking-wide mb-3 flex items-center justify-between">
                  <span>{group} Module</span>
                  <span className="text-[10px] text-[#6B778C] font-normal">
                    {perms.filter((p) => selectedRole.permissions.includes(p.key)).length} / {perms.length} selected
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {perms.map((perm) => {
                    const isChecked = selectedRole.permissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'border-[#0652CC] bg-white shadow-2xs'
                            : 'border-transparent hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(selectedRole.id, perm.key)}
                          className="mt-0.5 rounded text-[#0652CC] focus:ring-[#0652CC]"
                        />
                        <div>
                          <div className="font-semibold text-[#091E42]">{perm.label}</div>
                          <div className="text-[10px] text-[#6B778C] font-mono">{perm.key}</div>
                          <div className="text-[11px] text-[#42526E] mt-0.5">{perm.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Create Role */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-[#E5EAF0] space-y-4">
            <h3 className="text-base font-bold text-[#091E42]">Create New Custom Role</h3>
            <form onSubmit={handleCreateRole} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Role Key (ID)</label>
                <input
                  type="text"
                  placeholder="e.g. CONVERSION_AUDITOR"
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none uppercase"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Role Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Conversion Auditor"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Description</label>
                <textarea
                  placeholder="Briefly describe operational responsibilities..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none h-20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B778C] hover:bg-[#F7F9FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0652CC] text-white rounded-xl text-xs font-semibold hover:bg-[#0543A8]"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
