import React, { useState, useEffect } from 'react';
import { Trash2, Shield, Info, AlertCircle, Save, Check, RefreshCw } from 'lucide-react';
import { MenuItem } from '../types/menu';
import {
  findMenuItemInTree,
  flattenMenuItems,
  isDescendant,
} from '../utils/navigationTreeUtils';
import { Button, Input, Select, Toggle, Card, Tooltip } from '@/shared/ui';
import { usePermissionsQuery } from '@/features/roles/hooks/useRolesQuery';
import { PermissionDto } from '@/features/rbac/api/rbac.api';

export interface MenuItemEditorProps {
  selectedItemId: string | null;
  sidebarNav: MenuItem[];
  onUpdate: (id: string, updates: Partial<MenuItem>) => void;
  onMoveParent: (id: string, newParentId: string | null) => { success: boolean; error?: string };
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => { success: boolean; error?: string } | Promise<{ success: boolean; error?: string }>;
}

const COMMON_ICONS = [
  { value: 'LayoutDashboard', label: 'LayoutDashboard (Dashboard)' },
  { value: 'FolderKanban', label: 'FolderKanban (Projects)' },
  { value: 'List', label: 'List (All Projects / List)' },
  { value: 'PlusCircle', label: 'PlusCircle (Create Item)' },
  { value: 'Cpu', label: 'Cpu (Conversion Engine)' },
  { value: 'Play', label: 'Play (Execute / Run)' },
  { value: 'ShieldCheck', label: 'ShieldCheck (Diagnostics)' },
  { value: 'Users', label: 'Users (User Management)' },
  { value: 'Shield', label: 'Shield (Roles & Permissions)' },
  { value: 'Workflow', label: 'Workflow (Menu Builder)' },
  { value: 'Settings', label: 'Settings (System Settings)' },
  { value: 'Globe', label: 'Globe (Enterprise Portal)' },
  { value: 'Building2', label: 'Building2 (Organisations)' },
  { value: 'Briefcase', label: 'Briefcase (Partners)' },
];

export const MenuItemEditor: React.FC<MenuItemEditorProps> = ({
  selectedItemId,
  sidebarNav,
  onUpdate,
  onMoveParent,
  onAddChild: _onAddChild,
  onDelete,
}) => {
  const { data: allPermissions = [] } = usePermissionsQuery();
  const selectedItem = selectedItemId ? findMenuItemInTree(sidebarNav, selectedItemId) : null;

  const [formState, setFormState] = useState<Partial<MenuItem>>({});
  const [openNewTab, setOpenNewTab] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (selectedItem) {
      const validKeys = new Set(allPermissions.map((p) => p.key));
      const initialPermissions = (selectedItem.permissions || []).filter(
        (key) => key === 'ALL' || validKeys.size === 0 || validKeys.has(key)
      );

      setFormState({
        label: selectedItem.label,
        icon: selectedItem.icon || 'FolderKanban',
        path: selectedItem.path || '',
        parentId: selectedItem.parentId || '',
        order: selectedItem.order || 1,
        isVisible: selectedItem.isVisible !== false,
        permissions: initialPermissions,
      });
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [selectedItemId, selectedItem, allPermissions]);

  if (!selectedItem) {
    return (
      <Card variant="flat" padding="lg" className="h-[640px] flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-10 h-10 text-[#6B778C] mb-3" />
        <h3 className="text-base font-semibold text-[#091E42]">No Menu Item Selected</h3>
        <p className="text-xs text-[#42526E] max-w-xs mt-1">
          Select a menu item from the tree on the left to edit its properties.
        </p>
      </Card>
    );
  }

  const childCount = selectedItem.children ? selectedItem.children.length : 0;
  const hasChildren = childCount > 0;
  const parentItem = selectedItem.parentId ? findMenuItemInTree(sidebarNav, selectedItem.parentId) : null;

  const flattenedList = flattenMenuItems(sidebarNav);
  const parentOptions = [
    { value: '', label: 'None (Top Level)' },
    ...flattenedList.map(({ item, label }) => {
      const invalid = item.id === selectedItem.id || isDescendant(sidebarNav, selectedItem.id, item.id);
      return {
        value: item.id,
        label,
        disabled: invalid,
      };
    }),
  ];

  const handleChange = (field: keyof MenuItem, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleTogglePermission = (permKey: string) => {
    setFormState((prev) => {
      const current = prev.permissions || [];
      const updated = current.includes(permKey)
        ? current.filter((k) => k !== permKey)
        : [...current, permKey];
      return { ...prev, permissions: updated };
    });
  };

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParent = e.target.value || null;
    const res = onMoveParent(selectedItem.id, newParent);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update parent menu.');
    } else {
      setErrorMsg(null);
      setFormState((prev) => ({ ...prev, parentId: newParent || undefined }));
    }
  };

  const handleDelete = async () => {
    const res = await onDelete(selectedItem.id);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to delete item.');
    }
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      await onUpdate(selectedItem.id, formState);
      setSuccessMsg('Menu item configuration saved to MongoDB Atlas.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save menu item changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Group real permissions by module
  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    const grp = perm.group || 'General';
    acc[grp] = acc[grp] || [];
    acc[grp].push(perm);
    return acc;
  }, {} as Record<string, PermissionDto[]>);

  return (
    <Card variant="default" padding="md" className="h-[640px] flex flex-col justify-between overflow-hidden">
      {/* Fixed Card Header */}
      <div className="pb-3 mb-3 border-b border-[#E5EAF0] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-bold text-[#091E42]">Menu Item Properties</h2>
          <p className="text-xs text-[#6B778C] mt-0.5">Configure item properties and required permissions.</p>
        </div>

        <Tooltip content={hasChildren ? 'Cannot delete a menu item with children.' : ''}>
          <Button
            variant="outline"
            size="sm"
            disabled={hasChildren}
            onClick={handleDelete}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center space-x-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </Button>
        </Tooltip>
      </div>

      {/* Scrollable Form Fields Body */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
        {/* Label * */}
        <Input
          label="Label *"
          value={formState.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="Menu Title"
        />

        {/* Icon * */}
        <Select
          label="Icon *"
          value={formState.icon || 'FolderKanban'}
          onChange={(e) => handleChange('icon', e.target.value)}
          options={COMMON_ICONS}
        />

        {/* Route * */}
        <Input
          label="Route *"
          value={formState.path || ''}
          onChange={(e) => handleChange('path', e.target.value)}
          placeholder="/admin/projects"
        />

        {/* Parent */}
        <Select
          label="Parent"
          value={formState.parentId || ''}
          onChange={handleParentChange}
          options={parentOptions}
        />

        {/* Order */}
        <Input
          label="Order"
          type="number"
          value={formState.order || 1}
          onChange={(e) => handleChange('order', parseInt(e.target.value, 10) || 1)}
        />

        {/* Visible Switch */}
        <div className="pt-2 border-t border-[#E5EAF0] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#091E42]">Visible</span>
            <p className="text-[11px] text-[#6B778C]">Menu item will be visible in the navigation tree.</p>
          </div>
          <Toggle
            checked={formState.isVisible !== false}
            onChange={(checked) => handleChange('isVisible', checked)}
            size="sm"
          />
        </div>

        {/* Open in new tab Switch */}
        <div className="pt-2 border-t border-[#E5EAF0] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#091E42]">Open in new tab</span>
            <p className="text-[11px] text-[#6B778C]">Open link in a new browser tab</p>
          </div>
          <Toggle
            checked={openNewTab}
            onChange={setOpenNewTab}
            size="sm"
          />
        </div>

        {/* Required Permissions Multi-Select Box */}
        <div className="pt-3 border-t border-[#E5EAF0] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#091E42]">Required Permissions</label>
            <span className="text-[11px] font-semibold text-[#0652CC] bg-[#E8F1FF] px-2 py-0.5 rounded">
              {(formState.permissions || []).length} Selected
            </span>
          </div>
          <p className="text-[11px] text-[#6B778C]">
            Users must have ALL checked permissions to view this menu item.
          </p>

          <div className="space-y-3 max-h-48 overflow-y-auto pr-1 border border-[#E5EAF0] rounded-xl p-3 bg-[#F7F9FC]">
            {Object.entries(groupedPermissions).map(([grp, perms]) => (
              <div key={grp} className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B778C]">
                  {grp}
                </span>
                <div className="grid grid-cols-1 gap-1">
                  {perms.map((p) => {
                    const isChecked = (formState.permissions || []).includes(p.key);
                    return (
                      <label
                        key={p.key}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                          isChecked
                            ? 'border-[#0652CC] bg-white text-[#091E42] font-bold shadow-2xs'
                            : 'border-[#E5EAF0] bg-white/60 text-[#6B778C] hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(p.key)}
                          className="rounded text-[#0652CC] focus:ring-[#0652CC] w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="truncate">{p.label || p.key}</span>
                        <span className="text-[9px] font-mono text-[#0652CC] shrink-0 ml-auto">({p.key})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Alert Box */}
        {selectedItem.parentId && (
          <div className="p-3 rounded-xl bg-[#E8F1FF]/60 border border-[#0652CC]/25 flex items-start space-x-2 text-[11px] text-[#0652CC]">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              This is a child menu item. It will appear under{' '}
              <strong>{parentItem ? parentItem.label : 'Parent'}</strong> in the navigation.
            </span>
          </div>
        )}
      </div>

      {/* Sticky Bottom Footer: Alert Notifications & Action Buttons */}
      <div className="pt-3 mt-2 border-t border-[#E5EAF0] shrink-0 space-y-2.5">
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2 font-semibold shadow-xs">
            <Shield className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center space-x-2 font-semibold shadow-xs">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => {
              if (selectedItem) {
                setFormState({
                  label: selectedItem.label,
                  icon: selectedItem.icon || 'FolderKanban',
                  path: selectedItem.path || '',
                  parentId: selectedItem.parentId || '',
                  order: selectedItem.order || 1,
                  isVisible: selectedItem.isVisible !== false,
                  permissions: selectedItem.permissions || [],
                });
              }
            }}
            className="text-[#42526E]"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={isSaving}
            onClick={handleSaveChanges}
            className="font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default MenuItemEditor;

