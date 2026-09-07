import React, { useState } from 'react';
import { useMenuBuilder } from '@/features/menu-builder/hooks/useMenuBuilder';
import { MenuTreeItem } from '../components/MenuTreeItem';
import { MenuItemEditor } from '../components/MenuItemEditor';
import { LivePreviewPanel } from '../components/LivePreviewPanel';
import { Button, Input, Card } from '@/shared/ui';
import { MenuItem } from '../types/menu';
import {
  Plus,
  RotateCcw,
  Check,
  Search,
  Maximize2,
  Minimize2,
  Globe,
  RefreshCw,
} from 'lucide-react';

export const MenuBuilderPage: React.FC = () => {
  const [selectedApp, setSelectedApp] = useState<'WEB_2' | 'WEB_3'>('WEB_2');

  // Fetch real menu tree from backend API (GET /api/v1/menu-items?application=WEB_2|WEB_3)
  const {
    menuTree,
    isLoading,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    moveMenuItem,
  } = useMenuBuilder(selectedApp);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpandedAll, setIsExpandedAll] = useState<boolean | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Convert backend nodes into MenuItem UI format
  const mappedTree: MenuItem[] = menuTree.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    path: item.route || '',
    parentId: item.parentId || undefined,
    order: item.order,
    isVisible: item.visibility,
    permissions: item.requiredPermissions,
    children: item.children?.map((child) => ({
      id: child.id,
      label: child.label,
      icon: child.icon,
      path: child.route || '',
      parentId: child.parentId || undefined,
      order: child.order,
      isVisible: child.visibility,
      permissions: child.requiredPermissions,
    })),
  }));

  const handleAddRootItem = async () => {
    try {
      setErrorMsg(null);
      const created = await createMenuItem({
        key: `menu.${Date.now()}`,
        application: selectedApp,
        label: 'New Menu',
        type: 'PAGE',
        icon: 'user-plus',
        route: '/new-page',
        parentId: null,
      });
      setSelectedItemId(created.id);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create menu item');
    }
  };

  const handleAddChildItem = async (parentId: string) => {
    try {
      setErrorMsg(null);
      const created = await createMenuItem({
        key: `child.${Date.now()}`,
        application: selectedApp,
        label: 'New Child',
        type: 'PAGE',
        icon: 'user-plus',
        route: '/new-sub-page',
        parentId,
      });
      setSelectedItemId(created.id);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create child menu item');
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<MenuItem>) => {
    try {
      setErrorMsg(null);
      await updateMenuItem({
        id,
        data: {
          label: updates.label,
          icon: updates.icon,
          route: updates.path,
          order: updates.order,
          visibility: updates.isVisible,
        },
      });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update menu item');
    }
  };

  const handleDeleteItem = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setErrorMsg(null);
      await deleteMenuItem(id);
      if (selectedItemId === id) setSelectedItemId(null);
      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Cannot delete menu item';
      setErrorMsg(msg);
      return { success: false, error: msg };
    }
  };

  const handleMoveParent = (id: string, newParentId: string | null): { success: boolean; error?: string } => {
    moveMenuItem({ id, parentId: newParentId })
      .catch((err) => setErrorMsg(err.response?.data?.message || 'Failed to move item'));
    return { success: true };
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto py-2">
      {/* Title Bar with Application Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-[#091E42] tracking-tight">Menu Builder</h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
              Live Backend (Single Source of Truth)
            </span>
          </div>
          <p className="text-xs text-[#6B778C] mt-0.5">
            Backend-managed navigation hierarchy stored in MongoDB for {selectedApp}.
          </p>
        </div>

        {/* Application Selector */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-2 bg-white border border-[#D9E2EC] rounded-xl px-3 py-1.5 shadow-xs">
            <Globe className="w-4 h-4 text-[#0652CC]" />
            <span className="text-xs font-semibold text-[#091E42]">App Target:</span>
            <select
              value={selectedApp}
              onChange={(e) => setSelectedApp(e.target.value as 'WEB_2' | 'WEB_3')}
              className="text-xs font-bold text-[#0652CC] bg-transparent outline-none cursor-pointer"
            >
              <option value="WEB_2">WEB_2 (Internal Staff)</option>
              <option value="WEB_3">WEB_3 (Future Enterprise)</option>
            </select>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
          {errorMsg}
        </div>
      )}

      {/* 3-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* COLUMN 1: Navigation Tree */}
        <Card variant="default" padding="md" className="h-[640px] flex flex-col justify-between">
          <div>
            <div className="pb-3 mb-3 border-b border-[#E5EAF0] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#091E42]">Navigation Tree</h2>
                <p className="text-xs text-[#6B778C] mt-0.5">Application: {selectedApp}</p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-[#E8F1FF] text-[#0652CC]">
                {selectedApp}
              </span>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center space-x-2 mb-3">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddRootItem}
                className="flex items-center space-x-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Menu Item</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpandedAll(true)}
                className="flex items-center space-x-1 text-xs text-[#42526E]"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Expand All</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpandedAll(false)}
                className="flex items-center space-x-1 text-xs text-[#42526E]"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Collapse All</span>
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Input
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs py-1.5"
              />
              <Search className="w-3.5 h-3.5 text-[#6B778C] absolute left-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Tree Items */}
            <div className="overflow-y-auto max-h-[440px] pr-1 space-y-0.5">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-[#6B778C] flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0652CC]" />
                  Loading MongoDB menu tree...
                </div>
              ) : mappedTree.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6B778C]">
                  No menu items found in MongoDB for {selectedApp}.
                </div>
              ) : (
                mappedTree.map((item) => (
                  <MenuTreeItem
                    key={item.id}
                    item={item}
                    selectedItemId={selectedItemId}
                    onSelect={(id) => setSelectedItemId(id)}
                    onAddChild={handleAddChildItem}
                    onDelete={(id) => handleDeleteItem(id)}
                    onDuplicate={() => {}}
                    onReorder={() => {}}
                    searchTerm={searchTerm}
                    isExpandedAll={isExpandedAll}
                  />
                ))
              )}
            </div>
          </div>
        </Card>

        {/* COLUMN 2: Menu Item Properties */}
        <MenuItemEditor
          selectedItemId={selectedItemId}
          sidebarNav={mappedTree}
          onUpdate={handleUpdateItem}
          onMoveParent={handleMoveParent}
          onAddChild={handleAddChildItem}
          onDelete={handleDeleteItem}
        />

        {/* COLUMN 3: Live Preview */}
        <LivePreviewPanel sidebarNav={mappedTree} selectedItemId={selectedItemId} />
      </div>
    </div>
  );
};

export default MenuBuilderPage;
