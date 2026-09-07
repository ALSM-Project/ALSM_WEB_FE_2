import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, Info, AlertCircle, Link as LinkIcon, User } from 'lucide-react';
import { MenuItem } from '../types/menu';
import {
  findMenuItemInTree,
  flattenMenuItems,
  isDescendant,
} from '../utils/navigationTreeUtils';
import { Button, Input, Select, Toggle, Card, Tooltip } from '@/shared/ui';
import { DynamicIcon } from '@/components/Sidebar/IconResolver';

export interface MenuItemEditorProps {
  selectedItemId: string | null;
  sidebarNav: MenuItem[];
  onUpdate: (id: string, updates: Partial<MenuItem>) => void;
  onMoveParent: (id: string, newParentId: string | null) => { success: boolean; error?: string };
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => { success: boolean; error?: string };
}

const COMMON_ICONS = [
  { value: 'user-plus', label: 'user-plus (Create Partner / User)' },
  { value: 'LayoutDashboard', label: 'dashboard (Dashboard)' },
  { value: 'Cpu', label: 'cpu (Conversion Queue)' },
  { value: 'Users', label: 'users (CRM & Sales)' },
  { value: 'Building2', label: 'building (Organisations)' },
  { value: 'Handshake', label: 'handshake (Partners)' },
  { value: 'Layers', label: 'layers (Departments)' },
  { value: 'CreditCard', label: 'credit-card (Billing)' },
  { value: 'ShieldCheck', label: 'shield (Admin)' },
  { value: 'Settings', label: 'settings (Settings)' },
  { value: 'HelpCircle', label: 'help-circle (Support)' },
];

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All Users' },
  { value: 'STAFF', label: 'Internal Staff Only' },
  { value: 'ADMIN', label: 'Administrator Only' },
  { value: 'PARTNER', label: 'Partner / Enterprise' },
];

export const MenuItemEditor: React.FC<MenuItemEditorProps> = ({
  selectedItemId,
  sidebarNav,
  onUpdate,
  onMoveParent,
  onAddChild,
  onDelete,
}) => {
  const selectedItem = selectedItemId ? findMenuItemInTree(sidebarNav, selectedItemId) : null;
  const [formState, setFormState] = useState<Partial<MenuItem>>({});
  const [openNewTab, setOpenNewTab] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (selectedItem) {
      setFormState({
        label: selectedItem.label,
        icon: selectedItem.icon || 'user-plus',
        path: selectedItem.path || '',
        parentId: selectedItem.parentId || '',
        order: selectedItem.order || 1,
        isVisible: selectedItem.isVisible !== false,
        permissions: selectedItem.permissions || ['ALL'],
      });
      setErrorMsg(null);
    }
  }, [selectedItemId, selectedItem]);

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
    onUpdate(selectedItem.id, { [field]: value });
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

  const handleDelete = () => {
    const res = onDelete(selectedItem.id);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to delete item.');
    }
  };

  return (
    <Card variant="default" padding="md" className="h-[640px] flex flex-col justify-between overflow-y-auto">
      <div>
        {/* Header with Delete Button at top right */}
        <div className="pb-3 mb-4 border-b border-[#E5EAF0] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#091E42]">Menu Item</h2>
            <p className="text-xs text-[#6B778C] mt-0.5">Configure the selected menu item properties.</p>
          </div>

          <Tooltip content={hasChildren ? 'Cannot delete a menu item with children.' : ''}>
            <Button
              variant="outline"
              size="sm"
              disabled={hasChildren}
              onClick={handleDelete}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </Button>
          </Tooltip>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
            <Shield className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4 text-xs">
          {/* Label * */}
          <Input
            label="Label *"
            value={formState.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Create Partner"
          />

          {/* Icon * */}
          <Select
            label="Icon *"
            value={formState.icon || 'user-plus'}
            onChange={(e) => handleChange('icon', e.target.value)}
            options={COMMON_ICONS}
          />

          {/* Route * */}
          <Input
            label="Route *"
            value={formState.path || ''}
            onChange={(e) => handleChange('path', e.target.value)}
            placeholder="/organisations/partners/create"
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
              <p className="text-[11px] text-[#6B778C]">Menu item will be visible in the navigation.</p>
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

          {/* Required Role / Permissions */}
          <div className="pt-2 border-t border-[#E5EAF0]">
            <Select
              label="Required Role / Permissions"
              value={formState.permissions?.[0] || 'ALL'}
              onChange={(e) => handleChange('permissions', [e.target.value])}
              options={ROLE_OPTIONS}
            />
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
      </div>

      {/* Footer Buttons: Cancel & Save Changes */}
      <div className="pt-4 mt-6 border-t border-[#E5EAF0] flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="text-[#42526E]"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="font-semibold shadow-xs"
        >
          Save Changes
        </Button>
      </div>
    </Card>
  );
};

export default MenuItemEditor;
