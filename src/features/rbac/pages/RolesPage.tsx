import { createPortal } from 'react-dom';
import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Save,
  KeyRound,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
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
import { SearchInput } from '@/shared/ui/SearchInput';

const IndeterminateCheckbox: React.FC<{
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: () => void;
  title?: string;
  ariaLabel?: string;
}> = ({ checked, indeterminate, disabled, onChange, title, ariaLabel }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      title={title}
      aria-label={ariaLabel}
      className="w-4 h-4 rounded text-[#244A70] focus:ring-[#244A70] border-[#DCE3EC] cursor-pointer disabled:cursor-not-allowed shrink-0"
    />
  );
};

export const RolesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('roles.manage');

  // TanStack Query Data Fetching
  const { data: roles = [], isLoading: isLoadingRoles, error: rolesError } = useRolesQuery();
  const { data: permissions = [], isLoading: isLoadingPerms, error: permsError } = usePermissionsQuery();

  const [selectedRoleId, setSelectedRoleId] = useState<string>('ADMIN');
  const permissionsScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll permissions panel to top when selected role changes
  useEffect(() => {
    if (typeof permissionsScrollRef.current?.scrollTo === 'function') {
      permissionsScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
    } else if (permissionsScrollRef.current) {
      permissionsScrollRef.current.scrollTop = 0;
    }
  }, [selectedRoleId]);

  // When roles load, ensure selectedRoleId is valid
  useEffect(() => {
    if (roles.length > 0 && !roles.some((r) => r.id === selectedRoleId)) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const { data: serverPermissions, isLoading: isLoadingRolePerms } =
    useRolePermissionsQuery(selectedRoleId);

  const activeServerPermissions = serverPermissions ?? [];

  // Unsaved Permissions Local Form State
  const [unsavedPermissions, setUnsavedPermissions] = useState<string[]>([]);
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);

  // Synchronize local permissions when serverPermissions data resolves
  useEffect(() => {
    if (serverPermissions) {
      setUnsavedPermissions(serverPermissions);
    }
  }, [serverPermissions]);

  const hasUnsavedChanges =
    !isLoadingRolePerms &&
    Boolean(serverPermissions) &&
    JSON.stringify([...unsavedPermissions].sort()) !== JSON.stringify([...activeServerPermissions].sort());

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

  const isAnyModalOpen = Boolean(
    isCreatePermModalOpen ||
    isEditPermModalOpen ||
    isDeletePermModalOpen ||
    isCreateModalOpen ||
    isEditModalOpen ||
    isDeleteModalOpen ||
    isUnsavedConfirmOpen
  );

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isAnyModalOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isAnyModalOpen]);

  // Mutations
  const createRoleMutation = useCreateRoleMutation();
  const createPermissionMutation = useCreatePermissionMutation();
  const updatePermissionMutation = useUpdatePermissionMutation();
  const deletePermissionMutation = useDeletePermissionMutation();
  const updateRoleMutation = useUpdateRoleMutation();
  const deleteRoleMutation = useDeleteRoleMutation();
  const updateRolePermissionsMutation = useUpdateRolePermissionsMutation();

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

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

  // Search & Filter State
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [permSearchQuery, setPermSearchQuery] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // Filtered Roles
  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(roleSearchQuery.toLowerCase()))
  );

  // Filtered Permissions & Grouping
  const filteredPermissions = permissions.filter((p) => {
    if (!permSearchQuery.trim()) return true;
    const q = permSearchQuery.toLowerCase();
    return (
      (p.label && p.label.toLowerCase().includes(q)) ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      p.key.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.group && p.group.toLowerCase().includes(q))
    );
  });

  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    const grp = perm.group || 'General';
    acc[grp] = acc[grp] || [];
    acc[grp].push(perm);
    return acc;
  }, {} as Record<string, PermissionDto[]>);

  const groupKeys = Object.keys(groupedPermissions);
  const allCollapsed = groupKeys.length > 0 && groupKeys.every((grp) => collapsedModules[grp]);

  const toggleCollapseAll = () => {
    const nextState: Record<string, boolean> = {};
    const shouldCollapse = !allCollapsed;
    groupKeys.forEach((grp) => {
      nextState[grp] = shouldCollapse;
    });
    setCollapsedModules(nextState);
  };

  const toggleModuleCollapse = (grp: string) => {
    setCollapsedModules((prev) => ({ ...prev, [grp]: !prev[grp] }));
  };

  const handleToggleModuleAll = (perms: PermissionDto[]) => {
    if (!canManage) return;
    const permKeys = perms.map((p) => p.key);
    const allSelected = permKeys.every((k) => unsavedPermissions.includes(k));
    if (allSelected) {
      setUnsavedPermissions((prev) => prev.filter((k) => !permKeys.includes(k)));
    } else {
      setUnsavedPermissions((prev) => Array.from(new Set([...prev, ...permKeys])));
    }
  };

  const combinedError = rolesError || permsError;

  if (isLoadingRoles || isLoadingPerms) {
    return (
      <div className="flex h-96 w-full flex-col items-center justify-center space-y-3 text-xs text-[#526071]">
        <RefreshCw className="w-6 h-6 animate-spin text-[#244A70] shrink-0" />
        <span className="font-semibold text-[#17263A]">Loading Roles & Permissions Catalog...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full lg:h-[calc(100vh-6rem)] lg:max-h-[calc(100vh-6rem)] min-h-0">
      {/* Header Bar */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE3EC] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#17263A] tracking-tight">
            Roles & Permissions Management
          </h1>
          <p className="text-sm text-[#526071] mt-0.5">
            Configure access control policies, system capabilities, and role assignments
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreatePermModalOpen(true)}
              className="h-8 px-3.5 bg-white border border-[#244A70] text-[#244A70] rounded-lg text-xs font-semibold hover:bg-[#EEF1F6] transition-colors shadow-2xs cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span>Create New Permission</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-8 px-3.5 bg-[#244A70] text-white rounded-lg text-xs font-semibold hover:bg-[#1B3856] transition-colors shadow-2xs cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Create New Role</span>
            </button>
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {combinedError && (
        <div className="shrink-0 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{(combinedError as any)?.response?.data?.message || 'Unable to load roles or permissions from backend.'}</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="shrink-0 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800 text-xs font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="shrink-0 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800 text-xs font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Two-Column Workspace */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-5 items-stretch">
        {/* Left Column: Role List */}
        <aside className="w-full lg:w-[320px] lg:shrink-0 flex flex-col min-h-0">
          <div className="shrink-0 space-y-2.5 pb-1">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#526071]">
                Platform Roles ({roles.length})
              </h2>
              {roleSearchQuery && (
                <span className="text-[11px] text-[#526071]">
                  {filteredRoles.length} matching
                </span>
              )}
            </div>

            <SearchInput
              value={roleSearchQuery}
              onChangeValue={setRoleSearchQuery}
              placeholder="Search roles..."
              className="w-full max-w-none"
            />
          </div>

          <div className="mt-2 space-y-2 pr-1.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto [scrollbar-gutter:stable]">
            {filteredRoles.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-xl border border-[#DCE3EC] text-xs text-[#526071] space-y-1">
                <p className="font-semibold text-[#17263A]">No roles found</p>
                <p className="text-[11px]">No roles match your search criteria.</p>
              </div>
            ) : (
              filteredRoles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                return (
                  <div
                    key={role.id}
                    onClick={() => handleSelectRole(role.id)}
                    className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#244A70] bg-[#EEF4FB] ring-1 ring-[#244A70]/20 shadow-xs'
                        : 'border-[#DCE3EC] bg-white hover:border-[#B8C7D9] hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-[#17263A] truncate">
                            {role.name}
                          </span>
                          {role.isSystem && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded bg-[#17263A] text-white shrink-0">
                              SYSTEM
                            </span>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-xs text-[#526071] line-clamp-1 mt-0.5">
                            {role.description}
                          </p>
                        )}
                        <span className="inline-block text-xs font-semibold text-[#244A70] mt-1.5">
                          {role.permissionCount !== undefined ? role.permissionCount : '—'} Permissions
                        </span>
                      </div>

                      {canManage && (
                        <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0 bg-white/90 backdrop-blur-2xs rounded-lg p-0.5 border border-[#DCE3EC] shadow-2xs">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRole(role);
                              setEditRoleName(role.name);
                              setEditRoleDesc(role.description || '');
                              setIsEditModalOpen(true);
                            }}
                            className="p-1 text-[#526071] hover:text-[#244A70] rounded-md hover:bg-[#EEF1F6] transition-colors cursor-pointer"
                            title="Edit Role Details"
                            aria-label={`Edit ${role.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5 shrink-0" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingRole(role);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1 text-[#526071] hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Role"
                            aria-label={`Delete ${role.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Column: Permissions Matrix for Selected Role */}
        <section className="flex-1 min-h-0 flex flex-col rounded-2xl border border-[#DCE3EC] bg-white shadow-xs">
          {selectedRole ? (
            <>
              {/* Zone 1: Role Header (Pinned) */}
              <div className="shrink-0 border-b border-[#DCE3EC] p-5 space-y-3 bg-white rounded-t-2xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-[#17263A]">
                        {selectedRole.name} Permissions <span className="text-xs font-normal text-[#526071] font-mono">({selectedRole.id})</span>
                      </h3>
                      {selectedRole.isSystem && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          System Role
                        </span>
                      )}
                    </div>
                    {selectedRole.description && (
                      <p className="text-sm text-[#526071] mt-0.5 line-clamp-1 max-w-2xl">
                        {selectedRole.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <span className="text-xs text-[#244A70] font-semibold bg-[#EEF1F6] px-3 py-1.5 rounded-lg border border-[#DCE3EC]">
                      {unsavedPermissions.length} Active Permissions
                    </span>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRole(selectedRole);
                          setEditRoleName(selectedRole.name);
                          setEditRoleDesc(selectedRole.description || '');
                          setIsEditModalOpen(true);
                        }}
                        className="h-8 px-3 rounded-lg text-xs font-semibold text-[#244A70] bg-white hover:bg-[#EEF1F6] border border-[#DCE3EC] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        title="Edit Role Details"
                      >
                        <Edit2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Edit Role</span>
                      </button>
                    )}

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingRole(selectedRole);
                          setIsDeleteModalOpen(true);
                        }}
                        className="h-8 px-3 rounded-lg text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        title="Delete this role"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Delete Role</span>
                      </button>
                    )}

                    {canManage && (
                      <button
                        type="button"
                        onClick={handleSavePermissions}
                        disabled={!hasUnsavedChanges || updateRolePermissionsMutation.isPending}
                        className={`h-8 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs ${
                          hasUnsavedChanges
                            ? 'bg-[#244A70] text-white hover:bg-[#1B3856] cursor-pointer ring-2 ring-[#244A70]/20'
                            : 'bg-[#EEF1F6] text-[#526071] border border-[#DCE3EC] cursor-not-allowed'
                        }`}
                      >
                        {updateRolePermissionsMutation.isPending ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                        ) : (
                          <Save className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>Save Permission Changes</span>
                      </button>
                    )}
                  </div>
                </div>

                {hasUnsavedChanges && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold flex items-center justify-between">
                    <span>You have unsaved permission changes for this role.</span>
                    <button
                      onClick={() => setUnsavedPermissions(activeServerPermissions)}
                      className="text-amber-700 underline text-xs font-bold hover:text-amber-900 cursor-pointer"
                    >
                      Reset Changes
                    </button>
                  </div>
                )}
              </div>

              {/* Zone 2: Permissions Toolbar (Pinned below Header) */}
              <div className="shrink-0 border-b border-[#DCE3EC] px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFBFD]">
                <SearchInput
                  value={permSearchQuery}
                  onChangeValue={setPermSearchQuery}
                  placeholder="Search permissions by name, key, or group..."
                  className="w-full sm:w-80"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleCollapseAll}
                    className="h-8 px-3 rounded-lg text-xs font-medium text-[#17263A] bg-white hover:bg-[#EEF1F6] border border-[#DCE3EC] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ChevronsUpDown className="w-3.5 h-3.5 text-[#526071] shrink-0" />
                    <span>{allCollapsed ? 'Expand All' : 'Collapse All'}</span>
                  </button>
                </div>
              </div>

              {/* Zone 3: Scrollable Module & Permissions List */}
              <div
                ref={permissionsScrollRef}
                className="p-5 space-y-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto [scrollbar-gutter:stable]"
              >
              {isLoadingRolePerms ? (
                <div className="p-12 text-center text-xs text-[#526071] flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#244A70] shrink-0" />
                  <span>Loading permissions for {selectedRole.name}...</span>
                </div>
              ) : Object.keys(groupedPermissions).length === 0 ? (
                <div className="p-12 text-center text-xs text-[#526071] space-y-1">
                  <p className="font-semibold text-[#17263A]">No permissions match your search.</p>
                  <p className="text-[11px]">Try searching with a different term or clearing the filter.</p>
                </div>
              ) : (
                Object.entries(groupedPermissions).map(([group, perms]) => {
                  const selectedCount = perms.filter((p) => unsavedPermissions.includes(p.key)).length;
                    const isAllSelected = perms.length > 0 && selectedCount === perms.length;
                    const isIndeterminate = selectedCount > 0 && selectedCount < perms.length;
                    const isCollapsed = Boolean(collapsedModules[group]);
                    const percent = perms.length > 0 ? Math.round((selectedCount / perms.length) * 100) : 0;

                    return (
                      <div key={group} className="border-b border-[#DCE3EC] pb-5 last:border-b-0 last:pb-0">
                        {/* Module Header */}
                        <div className="flex items-center justify-between py-2.5 gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => toggleModuleCollapse(group)}
                              className="p-1 text-[#526071] hover:text-[#17263A] rounded transition-colors cursor-pointer"
                              title={isCollapsed ? 'Expand module' : 'Collapse module'}
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4 shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 shrink-0" />
                              )}
                            </button>

                            {canManage && (
                              <IndeterminateCheckbox
                                checked={isAllSelected}
                                indeterminate={isIndeterminate}
                                disabled={!canManage}
                                onChange={() => handleToggleModuleAll(perms)}
                                title={isAllSelected ? `Deselect all in ${group}` : `Select all in ${group}`}
                                ariaLabel={`Select all ${group} permissions`}
                              />
                            )}

                            <h4
                              className="text-xs font-bold text-[#17263A] uppercase tracking-wider cursor-pointer select-none truncate"
                              onClick={() => toggleModuleCollapse(group)}
                            >
                              {group} Module
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="hidden sm:block w-20 h-1.5 bg-[#DCE3EC] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#244A70] rounded-full transition-all duration-300"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-[#526071] font-mono">
                              {selectedCount} / {perms.length} SELECTED
                            </span>
                          </div>
                        </div>

                        {/* Cards Grid */}
                        {!isCollapsed && (
                          <div className="pt-2 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2.5">
                            {perms.map((perm) => {
                              const isChecked = unsavedPermissions.includes(perm.key);
                              return (
                                <div
                                  key={perm.key}
                                  className={`relative group p-2.5 rounded-lg text-xs transition-colors ${
                                    isChecked
                                      ? 'bg-blue-50/70'
                                      : 'bg-slate-50/60 hover:bg-slate-100/80'
                                  }`}
                                >
                                  <label
                                    className={`flex items-start gap-2.5 min-w-0 cursor-pointer ${
                                      !canManage ? 'opacity-80 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={!canManage}
                                      onChange={() => handleTogglePermission(perm.key)}
                                      aria-label={perm.label || perm.name || perm.key}
                                      className="mt-0.5 rounded text-[#244A70] focus:ring-[#244A70] w-4 h-4 cursor-pointer shrink-0 border-[#DCE3EC]"
                                    />
                                    <div className="space-y-0.5 min-w-0 flex-1 pr-6">
                                      <div className="font-semibold text-sm text-[#17263A] truncate">
                                        {perm.label || perm.name || perm.key}
                                      </div>
                                      <code className="text-xs text-slate-700 font-mono px-1.5 py-0.5 rounded bg-slate-100 inline-block">
                                        {perm.key}
                                      </code>
                                      {perm.description && (
                                        <p className="text-xs text-[#526071] mt-1 line-clamp-2 leading-relaxed">
                                          {perm.description}
                                        </p>
                                      )}
                                    </div>
                                  </label>

                                  {canManage && (
                                    <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-0.5 bg-white/90 backdrop-blur-2xs rounded-md p-0.5 border border-[#DCE3EC] shadow-2xs">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setEditingPerm(perm);
                                          setEditPermLabel(perm.label || perm.name || perm.key);
                                          setEditPermGroup(perm.group || 'General');
                                          setEditPermDesc(perm.description || '');
                                          setIsEditPermModalOpen(true);
                                        }}
                                        className="p-1 text-[#526071] hover:text-[#244A70] rounded hover:bg-[#EEF1F6] transition-colors cursor-pointer"
                                        title="Edit Permission Details"
                                        aria-label={`Edit ${perm.key}`}
                                      >
                                        <Edit2 className="w-3.5 h-3.5 shrink-0" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setDeletingPerm(perm);
                                          setIsDeletePermModalOpen(true);
                                        }}
                                        className="p-1 text-[#526071] hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Delete Permission"
                                        aria-label={`Delete ${perm.key}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-[#526071] my-auto">
              Select a role from the left panel to configure permissions.
            </div>
          )}
        </section>
      </div>

      {/* Modal: Create Permission */}
      {isCreatePermModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#17263A]/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-[#DCE3EC] space-y-4">
            <h3 className="text-base font-bold text-[#17263A]">Create New System Permission</h3>
            <form onSubmit={handleCreatePermissionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Permission Key (e.g. reports.export)</label>
                <input
                  type="text"
                  placeholder="e.g. reports.export"
                  value={newPermKey}
                  onChange={(e) => setNewPermKey(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Display Label</label>
                <input
                  type="text"
                  placeholder="e.g. Export System Reports"
                  value={newPermLabel}
                  onChange={(e) => setNewPermLabel(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Module / Group</label>
                <input
                  type="text"
                  placeholder="e.g. Reports or Analytics or Dashboard"
                  value={newPermGroup}
                  onChange={(e) => setNewPermGroup(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Description</label>
                <textarea
                  placeholder="Describe what this permission allows..."
                  value={newPermDesc}
                  onChange={(e) => setNewPermDesc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none h-20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePermModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#526071] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPermissionMutation.isPending}
                  className="px-4 py-2 bg-[#244A70] text-white rounded-xl text-xs font-semibold hover:bg-[#244A70] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {createPermissionMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Permission</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Modal: Edit Permission */}
      {isEditPermModalOpen && editingPerm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#17263A]/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-[#DCE3EC] space-y-4">
            <h3 className="text-base font-bold text-[#17263A]">Edit Permission Details</h3>
            <form onSubmit={handleEditPermissionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Permission Key (Read-Only)</label>
                <input
                  type="text"
                  value={editingPerm.key}
                  disabled
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] bg-[#F4F7FB] text-[#526071] rounded-xl text-xs font-mono cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Display Label</label>
                <input
                  type="text"
                  value={editPermLabel}
                  onChange={(e) => setEditPermLabel(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Module / Group</label>
                <input
                  type="text"
                  value={editPermGroup}
                  onChange={(e) => setEditPermGroup(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Description</label>
                <textarea
                  value={editPermDesc}
                  onChange={(e) => setEditPermDesc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none h-20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditPermModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#526071] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePermissionMutation.isPending}
                  className="px-4 py-2 bg-[#244A70] text-white rounded-xl text-xs font-semibold hover:bg-[#244A70] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updatePermissionMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Modal: Delete Permission Confirmation */}
      {isDeletePermModalOpen && deletingPerm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#17263A]/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-[#DCE3EC] space-y-4">
            <h3 className="text-base font-bold text-[#17263A]">Delete Permission?</h3>
            <p className="text-xs text-[#526071]">
              Are you sure you want to delete permission <strong>{deletingPerm.label || deletingPerm.key}</strong> (<code className="font-mono">{deletingPerm.key}</code>)? This will automatically remove it from all assigned roles.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeletePermModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#526071] hover:bg-[#F8FAFC]"
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
      , document.body)}

      {/* Modal: Create Role */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#17263A]/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-[#DCE3EC] space-y-4">
            <h3 className="text-base font-bold text-[#17263A]">Create New Custom Role</h3>
            <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Role Key (Stable Identifier)</label>
                <input
                  type="text"
                  placeholder="e.g. PROJECT_MANAGER"
                  value={newRoleKey}
                  onChange={(e) => setNewRoleKey(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none uppercase font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Role Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Project Manager"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Description</label>
                <textarea
                  placeholder="Describe operational responsibilities..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none h-20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#526071] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoleMutation.isPending}
                  className="px-4 py-2 bg-[#244A70] text-white rounded-xl text-xs font-semibold hover:bg-[#244A70] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {createRoleMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Modal: Edit Role */}
      {isEditModalOpen && editingRole && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#17263A]/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-[#DCE3EC] space-y-4">
            <h3 className="text-base font-bold text-[#17263A]">Edit Role: {editingRole.name}</h3>
            <form onSubmit={handleEditRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Role Key (Identifier)</label>
                <input
                  type="text"
                  value={editingRole.id}
                  disabled
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] bg-[#F8FAFC] rounded-xl text-xs text-[#526071] font-mono cursor-not-allowed select-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Role Display Name</label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Description</label>
                <textarea
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#DCE3EC] rounded-xl text-xs focus:ring-2 focus:ring-[#244A70] outline-none h-20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#526071] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateRoleMutation.isPending}
                  className="px-4 py-2 bg-[#244A70] text-white rounded-xl text-xs font-semibold hover:bg-[#244A70] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updateRoleMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Modal: Delete Role Confirmation */}
      {isDeleteModalOpen && deletingRole && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#17263A]/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-[#DCE3EC] space-y-4">
            <h3 className="text-base font-bold text-[#17263A]">Delete Role?</h3>
            <p className="text-xs text-[#526071]">
              Are you sure you want to delete role <strong>{deletingRole.name}</strong> ({deletingRole.id})? This will unassign it from all users and remove its permissions. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#526071] hover:bg-[#F8FAFC]"
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
      , document.body)}

      {/* Modal: Unsaved Changes Confirmation */}
      {isUnsavedConfirmOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#17263A]/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-[#DCE3EC] space-y-4">
            <h3 className="text-base font-bold text-[#17263A]">Unsaved Permission Changes</h3>
            <p className="text-xs text-[#526071]">
              You have unsaved permission changes for the current role. Discard changes and switch roles?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUnsavedConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#526071] hover:bg-[#F8FAFC]"
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
      , document.body)}
    </div>
  );
};

export default RolesPage;
