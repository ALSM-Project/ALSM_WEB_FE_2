import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Save,
  Lock,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useRolesQuery,
  usePermissionsQuery,
  useRolePermissionsQuery,
  useCreateRoleMutation,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useUpdateRolePermissionsMutation,
} from '@/features/roles/hooks/useRolesQuery';
import { RoleDto, PermissionDto } from '@/features/rbac/api/rbac.api';

export const RolesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('roles.manage');

  // TanStack Query Data Fetching
  const { data: roles = [], isLoading: isLoadingRoles, error: rolesError } = useRolesQuery();
  const { data: permissions = [], isLoading: isLoadingPerms, error: permsError } = usePermissionsQuery();

  const [selectedRoleId, setSelectedRoleId] = useState<string>('ADMIN');

  // When roles load, ensure selectedRoleId is valid
  useEffect(() => {
    if (roles.length > 0 && !roles.some((r) => r.id === selectedRoleId)) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const { data: serverPermissions = [], isLoading: isLoadingRolePerms } =
    useRolePermissionsQuery(selectedRoleId);

  // Unsaved Permissions Local Form State
  const [unsavedPermissions, setUnsavedPermissions] = useState<string[]>([]);
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);

  // Synchronize local permissions when serverPermissions data resolves
  useEffect(() => {
    setUnsavedPermissions(serverPermissions);
  }, [serverPermissions]);

  const hasUnsavedChanges =
    JSON.stringify([...unsavedPermissions].sort()) !== JSON.stringify([...serverPermissions].sort());

  // Error Banner State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoleKey, setNewRoleKey] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const [isCreatePermModalOpen, setIsCreatePermModalOpen] = useState(false);
  const [newPermKey, setNewPermKey] = useState('');
  const [newPermLabel, setNewPermLabel] = useState('');
  const [newPermGroup, setNewPermGroup] = useState('');
  const [newPermDesc, setNewPermDesc] = useState('');

  const [isEditPermModalOpen, setIsEditPermModalOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<PermissionDto | null>(null);
  const [editPermLabel, setEditPermLabel] = useState('');
  const [editPermGroup, setEditPermGroup] = useState('');
  const [editPermDesc, setEditPermDesc] = useState('');

  const [isDeletePermModalOpen, setIsDeletePermModalOpen] = useState(false);
  const [deletingPerm, setDeletingPerm] = useState<PermissionDto | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDto | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RoleDto | null>(null);

  const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);

  // Mutations
  const createRoleMutation = useCreateRoleMutation();
  const createPermissionMutation = useCreatePermissionMutation();
  const updatePermissionMutation = useUpdatePermissionMutation();
  const deletePermissionMutation = useDeletePermissionMutation();
  const updateRoleMutation = useUpdateRoleMutation();
  const deleteRoleMutation = useDeleteRoleMutation();
  const updateRolePermissionsMutation = useUpdateRolePermissionsMutation();

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  // Role Selection with Unsaved Check
  const handleSelectRole = (id: string) => {
    if (id === selectedRoleId) return;
    if (hasUnsavedChanges) {
      setPendingRoleId(id);
      setIsUnsavedConfirmOpen(true);
    } else {
      setSelectedRoleId(id);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const confirmSwitchRole = () => {
    if (pendingRoleId) {
      setSelectedRoleId(pendingRoleId);
      setPendingRoleId(null);
    }
    setIsUnsavedConfirmOpen(false);
  };

  // Toggle individual permission checkbox
  const handleTogglePermission = (permKey: string) => {
    if (!canManage) return;
    setUnsavedPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((k) => k !== permKey) : [...prev, permKey]
    );
  };

  // Save Permission Assignments
  const handleSavePermissions = async () => {
    if (!selectedRoleId || !canManage) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateRolePermissionsMutation.mutateAsync({
        roleId: selectedRoleId,
        permissions: unsavedPermissions,
      });
      setSuccessMessage('Permissions successfully updated and saved to MongoDB Atlas.');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save permissions.';
      setErrorMessage(msg);
    }
  };

  // Handle Create Role Form Submit
  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleKey.trim() || !newRoleName.trim()) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const created = await createRoleMutation.mutateAsync({
        key: newRoleKey.trim(),
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
      });
      setIsCreateModalOpen(false);
      setNewRoleKey('');
      setNewRoleName('');
      setNewRoleDesc('');
      setSelectedRoleId(created.id || created.key || 'ADMIN');
      setSuccessMessage(`Role '${created.name}' created successfully.`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create role.';
      setErrorMessage(msg);
    }
  };

  // Handle Create Permission Form Submit
  const handleCreatePermissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPermKey.trim() || !newPermLabel.trim() || !newPermGroup.trim()) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const created = await createPermissionMutation.mutateAsync({
        key: newPermKey.trim(),
        label: newPermLabel.trim(),
        group: newPermGroup.trim(),
        description: newPermDesc.trim(),
      });
      setIsCreatePermModalOpen(false);
      setNewPermKey('');
      setNewPermLabel('');
      setNewPermGroup('');
      setNewPermDesc('');
      setSuccessMessage(`Permission '${created.label || created.key}' created successfully.`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create permission.';
      setErrorMessage(msg);
    }
  };

  // Handle Edit Permission Form Submit
  const handleEditPermissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerm || !editPermLabel.trim() || !editPermGroup.trim()) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updatePermissionMutation.mutateAsync({
        key: editingPerm.key,
        data: {
          label: editPermLabel.trim(),
          group: editPermGroup.trim(),
          description: editPermDesc.trim(),
        },
      });
      setIsEditPermModalOpen(false);
      setEditingPerm(null);
      setSuccessMessage(`Permission '${editingPerm.key}' updated successfully.`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update permission.';
      setErrorMessage(msg);
    }
  };

  // Handle Delete Permission Confirm
  const handleDeletePermissionConfirm = async () => {
    if (!deletingPerm) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deletePermissionMutation.mutateAsync(deletingPerm.key);
      setIsDeletePermModalOpen(false);
      setSuccessMessage(`Permission '${deletingPerm.label || deletingPerm.key}' deleted successfully.`);
      setDeletingPerm(null);
    } catch (err: any) {
      setIsDeletePermModalOpen(false);
      const msg = err.response?.data?.message || err.message || 'Failed to delete permission.';
      setErrorMessage(msg);
    }
  };

  // Handle Edit Role Form Submit
  const handleEditRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editRoleName.trim()) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateRoleMutation.mutateAsync({
        id: editingRole.id,
        data: { name: editRoleName.trim(), description: editRoleDesc.trim() },
      });
      setIsEditModalOpen(false);
      setEditingRole(null);
      setSuccessMessage(`Role updated successfully.`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update role.';
      setErrorMessage(msg);
    }
  };

  // Handle Delete Role Confirm
  const handleDeleteRoleConfirm = async () => {
    if (!deletingRole) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteRoleMutation.mutateAsync(deletingRole.id);
      setIsDeleteModalOpen(false);
      if (selectedRoleId === deletingRole.id) {
        setSelectedRoleId('ADMIN');
      }
      setSuccessMessage(`Role '${deletingRole.name}' deleted successfully.`);
      setDeletingRole(null);
    } catch (err: any) {
      setIsDeleteModalOpen(false);
      const msg = err.response?.data?.message || err.message || 'Failed to delete role.';
      setErrorMessage(msg);
    }
  };

  // Group Permissions by Module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const grp = perm.group || 'General';
    acc[grp] = acc[grp] || [];
    acc[grp].push(perm);
    return acc;
  }, {} as Record<string, PermissionDto[]>);

  const combinedError = rolesError || permsError;

  if (isLoadingRoles || isLoadingPerms) {
    return (
      <div className="flex h-96 w-full flex-col items-center justify-center space-y-3 text-xs text-[#6B778C]">
        <RefreshCw className="w-6 h-6 animate-spin text-[#0652CC]" />
        <span className="font-semibold text-[#091E42]">Loading Roles & Permissions Catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#091E42] tracking-tight">
            Roles & Permissions Management
          </h1>
          <p className="text-xs text-[#6B778C] mt-1">
            Configure RBAC roles and permissions. Changes are enforced on the backend.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatePermModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-[#0652CC] text-[#0652CC] rounded-xl text-xs font-semibold hover:bg-[#E8F1FF] transition-colors shadow-xs cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              Create New Permission
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0652CC] text-white rounded-xl text-xs font-semibold hover:bg-[#0543A8] transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create New Role
            </button>
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {combinedError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{(combinedError as any)?.response?.data?.message || 'Unable to load roles or permissions from backend.'}</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Column: Role List */}
        <div className="space-y-3 shrink-0">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B778C] px-1">
            Platform Roles ({roles.length})
          </h2>

          {roles.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-[#E5EAF0] text-xs text-[#6B778C]">
              No roles have been configured.
            </div>
          ) : (
            <div className="space-y-2.5">
              {roles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                return (
                  <div
                    key={role.id}
                    onClick={() => handleSelectRole(role.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#0652CC] bg-[#E8F1FF]/60 shadow-xs'
                        : 'border-[#E5EAF0] bg-white hover:border-[#B3D4FF]'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#091E42] truncate">{role.name}</span>
                        {role.isSystem && (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-[#091E42] text-white shrink-0">
                            SYSTEM
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B778C] line-clamp-1">{role.description}</p>
                      <span className="inline-block text-[11px] font-semibold text-[#0652CC]">
                        {role.permissionCount !== undefined ? role.permissionCount : '—'} Permissions
                      </span>
                    </div>

                    {canManage && (
                      <div className="flex items-center space-x-1 shrink-0">
                        {/* Edit Role Button */}
                        {!role.isSystem && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRole(role);
                              setEditRoleName(role.name);
                              setEditRoleDesc(role.description || '');
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#0652CC] rounded-lg hover:bg-[#0652CC]/10 transition-colors"
                            title="Edit Role Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete Role Button */}
                        {role.isSystem ? (
                          <span
                            className="p-1.5 text-[#CBD5E1] cursor-not-allowed"
                            title="System roles cannot be deleted"
                          >
                            <Lock className="w-4 h-4" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingRole(role);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-[#94A3B8] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Role"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Permissions Matrix for Selected Role */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-5 flex flex-col justify-between min-w-0">
          {selectedRole ? (
            <>
              <div>
                {/* Selected Role Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5EAF0] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#091E42]">{selectedRole.name}</h3>
                      <span className="text-xs text-[#6B778C] font-mono">({selectedRole.id})</span>
                      {selectedRole.isSystem && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#091E42] text-white">
                          System Role
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B778C] mt-0.5">{selectedRole.description}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#0652CC] font-semibold bg-[#E8F1FF] px-3 py-1.5 rounded-lg border border-[#B3D4FF]/40">
                      {unsavedPermissions.length} Active Permissions
                    </span>

                    {canManage && (
                      <button
                        type="button"
                        onClick={handleSavePermissions}
                        disabled={!hasUnsavedChanges || updateRolePermissionsMutation.isPending}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                          hasUnsavedChanges
                            ? 'bg-[#0652CC] text-white hover:bg-[#0543A8] cursor-pointer animate-pulse'
                            : 'bg-[#E5EAF0] text-[#94A3B8] cursor-not-allowed'
                        }`}
                      >
                        {updateRolePermissionsMutation.isPending ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>Save Permission Changes</span>
                      </button>
                    )}
                  </div>
                </div>

                {hasUnsavedChanges && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold flex items-center justify-between">
                    <span>You have unsaved permission changes for this role.</span>
                    <button
                      onClick={() => setUnsavedPermissions(serverPermissions)}
                      className="text-amber-700 underline text-xs font-bold hover:text-amber-900"
                    >
                      Reset Changes
                    </button>
                  </div>
                )}

                {/* Grouped Permissions List */}
                {isLoadingRolePerms ? (
                  <div className="p-12 text-center text-xs text-[#6B778C] flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#0652CC]" />
                    <span>Loading permissions for {selectedRole.name}...</span>
                  </div>
                ) : (
                  <div className="space-y-5 max-h-[560px] overflow-y-auto pr-2 mt-4">
                    {Object.entries(groupedPermissions).map(([group, perms]) => {
                      const selectedCount = perms.filter((p) => unsavedPermissions.includes(p.key)).length;
                      return (
                        <div key={group} className="border border-[#E5EAF0] rounded-xl p-4 bg-[#F7F9FC]">
                          <div className="flex items-center justify-between mb-3 border-b border-[#E5EAF0] pb-2">
                            <h4 className="text-xs font-bold text-[#091E42] uppercase tracking-wide">
                              {group} Module
                            </h4>
                            <span className="text-[11px] font-bold text-[#42526E]">
                              {selectedCount} / {perms.length} SELECTED
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                            {perms.map((perm) => {
                              const isChecked = unsavedPermissions.includes(perm.key);
                              return (
                                <div
                                  key={perm.key}
                                  className={`flex items-start justify-between gap-2 p-3 rounded-xl border text-xs transition-all ${
                                    isChecked
                                      ? 'border-[#0652CC] bg-white shadow-2xs'
                                      : 'border-[#E5EAF0] bg-white/60 hover:bg-white'
                                  }`}
                                >
                                  <label className={`flex items-start gap-3 min-w-0 cursor-pointer flex-1 ${!canManage ? 'opacity-80 cursor-not-allowed' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={!canManage}
                                      onChange={() => handleTogglePermission(perm.key)}
                                      className="mt-0.5 rounded text-[#0652CC] focus:ring-[#0652CC] w-4 h-4 cursor-pointer shrink-0"
                                    />
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="font-bold text-[#091E42] truncate">
                                        {perm.label || perm.name || perm.key}
                                      </div>
                                      <div className="text-[10px] text-[#0652CC] font-mono">{perm.key}</div>
                                      <div className="text-[11px] text-[#6B778C] mt-1">{perm.description}</div>
                                    </div>
                                  </label>

                                  {canManage && (
                                    <div className="flex items-center space-x-1 shrink-0 ml-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingPerm(perm);
                                          setEditPermLabel(perm.label || perm.name || perm.key);
                                          setEditPermGroup(perm.group || 'General');
                                          setEditPermDesc(perm.description || '');
                                          setIsEditPermModalOpen(true);
                                        }}
                                        className="p-1 text-[#64748B] hover:text-[#0652CC] rounded hover:bg-[#0652CC]/10 transition-colors"
                                        title="Edit Permission Details"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingPerm(perm);
                                          setIsDeletePermModalOpen(true);
                                        }}
                                        className="p-1 text-[#94A3B8] hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                                        title="Delete Permission"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-[#6B778C]">
              Select a role from the left panel to configure permissions.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Permission */}
      {isCreatePermModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-[#E5EAF0] space-y-4">
            <h3 className="text-base font-bold text-[#091E42]">Create New System Permission</h3>
            <form onSubmit={handleCreatePermissionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Permission Key (e.g. reports.export)</label>
                <input
                  type="text"
                  placeholder="e.g. reports.export"
                  value={newPermKey}
                  onChange={(e) => setNewPermKey(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Display Label</label>
                <input
                  type="text"
                  placeholder="e.g. Export System Reports"
                  value={newPermLabel}
                  onChange={(e) => setNewPermLabel(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Module / Group</label>
                <input
                  type="text"
                  placeholder="e.g. Reports or Analytics or Dashboard"
                  value={newPermGroup}
                  onChange={(e) => setNewPermGroup(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Description</label>
                <textarea
                  placeholder="Describe what this permission allows..."
                  value={newPermDesc}
                  onChange={(e) => setNewPermDesc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none h-20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePermModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B778C] hover:bg-[#F7F9FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPermissionMutation.isPending}
                  className="px-4 py-2 bg-[#0652CC] text-white rounded-xl text-xs font-semibold hover:bg-[#0543A8] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {createPermissionMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Permission</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Permission */}
      {isEditPermModalOpen && editingPerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-[#E5EAF0] space-y-4">
            <h3 className="text-base font-bold text-[#091E42]">Edit Permission Details</h3>
            <form onSubmit={handleEditPermissionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Permission Key (Read-Only)</label>
                <input
                  type="text"
                  value={editingPerm.key}
                  disabled
                  className="w-full px-3.5 py-2 border border-[#D9E2EC] bg-[#F4F5F7] text-[#6B778C] rounded-xl text-xs font-mono cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Display Label</label>
                <input
                  type="text"
                  value={editPermLabel}
                  onChange={(e) => setEditPermLabel(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Module / Group</label>
                <input
                  type="text"
                  value={editPermGroup}
                  onChange={(e) => setEditPermGroup(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Description</label>
                <textarea
                  value={editPermDesc}
                  onChange={(e) => setEditPermDesc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none h-20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditPermModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B778C] hover:bg-[#F7F9FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePermissionMutation.isPending}
                  className="px-4 py-2 bg-[#0652CC] text-white rounded-xl text-xs font-semibold hover:bg-[#0543A8] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updatePermissionMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Permission Confirmation */}
      {isDeletePermModalOpen && deletingPerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-[#E5EAF0] space-y-4">
            <h3 className="text-base font-bold text-[#091E42]">Delete Permission?</h3>
            <p className="text-xs text-[#6B778C]">
              Are you sure you want to delete permission <strong>{deletingPerm.label || deletingPerm.key}</strong> (<code className="font-mono">{deletingPerm.key}</code>)? This will automatically remove it from all assigned roles.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeletePermModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B778C] hover:bg-[#F7F9FC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePermissionConfirm}
                disabled={deletePermissionMutation.isPending}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletePermissionMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permission</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Role */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-[#E5EAF0] space-y-4">
            <h3 className="text-base font-bold text-[#091E42]">Create New Custom Role</h3>
            <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Role Key (Stable Identifier)</label>
                <input
                  type="text"
                  placeholder="e.g. PROJECT_MANAGER"
                  value={newRoleKey}
                  onChange={(e) => setNewRoleKey(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none uppercase font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Role Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Project Manager"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Description</label>
                <textarea
                  placeholder="Describe operational responsibilities..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none h-20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B778C] hover:bg-[#F7F9FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoleMutation.isPending}
                  className="px-4 py-2 bg-[#0652CC] text-white rounded-xl text-xs font-semibold hover:bg-[#0543A8] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {createRoleMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Role */}
      {isEditModalOpen && editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-[#E5EAF0] space-y-4">
            <h3 className="text-base font-bold text-[#091E42]">Edit Role ({editingRole.id})</h3>
            <form onSubmit={handleEditRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Role Display Name</label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">Description</label>
                <textarea
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none h-20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B778C] hover:bg-[#F7F9FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateRoleMutation.isPending}
                  className="px-4 py-2 bg-[#0652CC] text-white rounded-xl text-xs font-semibold hover:bg-[#0543A8] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updateRoleMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Role Confirmation */}
      {isDeleteModalOpen && deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-[#E5EAF0] space-y-4">
            <h3 className="text-base font-bold text-[#091E42]">Delete Role?</h3>
            <p className="text-xs text-[#6B778C]">
              Are you sure you want to delete role <strong>{deletingRole.name}</strong> ({deletingRole.id})? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B778C] hover:bg-[#F7F9FC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRoleConfirm}
                disabled={deleteRoleMutation.isPending}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleteRoleMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Role</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Unsaved Changes Confirmation */}
      {isUnsavedConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-[#E5EAF0] space-y-4">
            <h3 className="text-base font-bold text-[#091E42]">Unsaved Permission Changes</h3>
            <p className="text-xs text-[#6B778C]">
              You have unsaved permission changes for the current role. Discard changes and switch roles?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUnsavedConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B778C] hover:bg-[#F7F9FC]"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={confirmSwitchRole}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700"
              >
                Discard & Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
