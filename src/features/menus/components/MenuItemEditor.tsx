import React, { useState, useEffect } from 'react';
import { Trash2, Shield, Info, Save, Check, RefreshCw, Workflow } from 'lucide-react';
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
  { value: 'Layers', label: 'Layers (Queue / Jobs)' },
  { value: 'FileCheck', label: 'FileCheck (Quality Review)' },
  { value: 'BarChart3', label: 'BarChart3 (Team Performance)' },
  { value: 'Zap', label: 'Zap (Quotes / Fast Track)' },
  { value: 'CreditCard', label: 'CreditCard (Usage & Billing)' },
  { value: 'Video', label: 'Video (Online Meetings)' },
  { value: 'Headphones', label: 'Headphones (Support)' },
  { value: 'Cpu', label: 'Cpu (Conversion Engine)' },
  { value: 'Users', label: 'Users (User Management)' },
  { value: 'Shield', label: 'Shield (Roles & Permissions)' },
  { value: 'Workflow', label: 'Workflow (Menu Builder)' },
  { value: 'Settings', label: 'Settings (System Settings)' },
  { value: 'Globe', label: 'Globe (Enterprise Portal)' },
  { value: 'Activity', label: 'Activity (Diagnostics / Monitor)' },
  { value: 'Building2', label: 'Building2 (Partner Management)' },
  { value: 'UserPlus', label: 'UserPlus (Onboard / Register)' },
  { value: 'DownloadCloud', label: 'DownloadCloud (Downloads)' },
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
        openInNewTab: selectedItem.openInNewTab ?? false,
        hideParentLabel: selectedItem.hideParentLabel ?? false,
        contractTypeVisibility: selectedItem.contractTypeVisibility || 'ALL',
        featureKey: selectedItem.featureKey || '',
        description: selectedItem.description || '',
      });
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [selectedItemId, selectedItem, allPermissions]);

  if (!selectedItem) {
    return (
      <Card
        variant="flat"
        padding="lg"
        className="h-[700px] flex flex-col items-center justify-center text-center p-8 bg-white border border-[#DCE3EC] rounded-2xl shadow-xs"
      >
        <div className="w-16 h-16 rounded-2xl bg-[#F4F7FB] text-[#244A70] flex items-center justify-center mb-4 shadow-2xs">
          <Workflow className="w-8 h-8 opacity-80" />
        </div>
        <h3 className="text-base font-bold text-[#17263A]">No Menu Item Selected</h3>
        <p className="text-xs text-[#8491A3] max-w-sm mt-1.5 leading-relaxed">
          Select a menu item from the tree on the left to edit its properties, route, permissions, and visibility rules.
        </p>
        <div className="mt-5 flex items-center gap-2 text-[11px] text-[#8491A3] bg-[#F8FAFC] px-3.5 py-2 rounded-xl border border-[#DCE3EC]">
          <Info className="w-4 h-4 text-[#244A70] shrink-0" />
          <span>Tip: You can drag and drop items in the tree to reorder or re-parent them.</span>
        </div>
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
    <Card variant="default" padding="md" className="h-[700px] flex flex-col justify-between overflow-hidden shadow-xs">
      {/* Fixed Card Header */}
      <div className="pb-3 mb-3 border-b border-[#DCE3EC] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-bold text-[#17263A]">Menu Item Properties</h2>
          <p className="text-xs text-[#8491A3] mt-0.5">Configure item properties and required permissions.</p>
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
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs">
        <Input
          label="Label *"
          value={formState.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="Menu Title"
        />

        <Select
          label="Icon *"
          value={formState.icon || 'FolderKanban'}
          onChange={(e) => handleChange('icon', e.target.value)}
          options={COMMON_ICONS}
        />

        <Input
          label="Route *"
          value={formState.path || ''}
          onChange={(e) => handleChange('path', e.target.value)}
          placeholder="/admin/projects"
        />

        <Select
          label="Parent"
          value={formState.parentId || ''}
          onChange={handleParentChange}
          options={parentOptions}
        />

        <Input
          label="Order"
          type="number"
          value={formState.order || 1}
          onChange={(e) => handleChange('order', parseInt(e.target.value, 10) || 1)}
        />

        <Select
          label="Contract Type Visibility"
          value={formState.contractTypeVisibility || 'ALL'}
          onChange={(e) => handleChange('contractTypeVisibility', e.target.value)}
          options={[
            { value: 'ALL', label: 'All Contracts (Shared)' },
            { value: 'SELF_SERVICE', label: 'Platform-Based Modernization Only' },
            { value: 'WE_CONVERT_FOR_YOU', label: 'Managed Modernization Services' },
            { value: 'HYBRID', label: 'Hybrid Contracts Only' },
          ]}
        />

        <Input
          label="Feature Key"
          value={formState.featureKey || ''}
          onChange={(e) => handleChange('featureKey', e.target.value)}
          placeholder="e.g. FEATURE_CONVERSION_PIPELINE"
        />

        <Input
          label="Description"
          value={formState.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Brief description of the menu functionality"
        />

        {/* Visible Switch */}
        <div className="pt-2 border-t border-[#DCE3EC] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#17263A]">Visible</span>
            <p className="text-[11px] text-[#8491A3]">Menu item will be visible in the navigation tree.</p>
          </div>
          <Toggle
            checked={formState.isVisible !== false}
            onChange={(checked) => handleChange('isVisible', checked)}
            size="sm"
          />
        </div>

        {/* Open in new tab Switch */}
        <div className="pt-2 border-t border-[#DCE3EC] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#17263A]">Open in new tab</span>
            <p className="text-[11px] text-[#8491A3]">Open link in a new browser tab</p>
          </div>
          <Toggle
            checked={Boolean(formState.openInNewTab)}
            onChange={(checked) => handleChange('openInNewTab', checked)}
            size="sm"
          />
        </div>

        {/* Hide Parent Label Switch */}
        <div className="pt-2 border-t border-[#DCE3EC] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#17263A]">Hide Parent Label</span>
            <p className="text-[11px] text-[#8491A3]">Render child items directly without showing the parent group label</p>
          </div>
          <Toggle
            checked={Boolean(formState.hideParentLabel)}
            onChange={(checked) => handleChange('hideParentLabel', checked)}
            size="sm"
          />
        </div>

        {/* Required Permissions Multi-Select Box (Sections 3.13.15 & 3.13.16) */}
        <div className="pt-3 border-t border-[#DCE3EC] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#17263A]">Required Permissions</label>
            <div className="flex items-center gap-2">
              {(formState.permissions || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => handleChange('permissions', [])}
                  className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  Revoke Permission (Clear)
                </button>
              )}
              <span className="text-[11px] font-semibold text-[#244A70] bg-[#EEF1F6] px-2 py-0.5 rounded">
                {(formState.permissions || []).length} Selected
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#8491A3]">
            Users holding any of the assigned permissions can view this menu item. Clearing all permissions makes it visible to all authorized role users.
          </p>

          <div className="space-y-3 max-h-56 overflow-y-auto pr-1 border border-[#DCE3EC] rounded-xl p-3 bg-[#F8FAFC]">
            {Object.entries(groupedPermissions).map(([grp, perms]) => (
              <div key={grp} className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8491A3]">
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
                            ? 'border-[#244A70] bg-white text-[#17263A] font-bold shadow-2xs'
                            : 'border-[#DCE3EC] bg-white/60 text-[#8491A3] hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(p.key)}
                          className="rounded text-[#244A70] focus:ring-[#244A70] w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="truncate">{p.label || p.key}</span>
                        <span className="text-[9px] font-mono text-[#244A70] shrink-0 ml-auto">({p.key})</span>
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
          <div className="p-3 rounded-xl bg-[#EEF1F6]/60 border border-[#244A70]/25 flex items-start space-x-2 text-[11px] text-[#244A70]">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              This is a child menu item. It will appear under{' '}
              <strong>{parentItem ? parentItem.label : 'Parent'}</strong> in the navigation.
            </span>
          </div>
        )}
      </div>

      {/* Sticky Bottom Footer: Alert Notifications & Action Buttons */}
      <div className="pt-3 mt-2 border-t border-[#DCE3EC] shrink-0 space-y-2.5 bg-white">
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
                  openInNewTab: selectedItem.openInNewTab ?? false,
                });
              }
            }}
            className="text-[#8491A3]"
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

