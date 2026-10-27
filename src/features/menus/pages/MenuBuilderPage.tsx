import React, { useState } from 'react';
import { useMenuBuilder } from '@/features/menu-builder/hooks/useMenuBuilder';
import { MenuTreeItem } from '../components/MenuTreeItem';
import { MenuItemEditor } from '../components/MenuItemEditor';
import { LivePreviewPanel } from '../components/LivePreviewPanel';
import { Button, Input, Card } from '@/shared/ui';
import { MenuItem } from '../types/menu';
import { findSiblingsOfItem } from '../utils/navigationTreeUtils';
import {
  Plus,
  Search,
  Maximize2,
  Minimize2,
  Globe,
  RefreshCw,
} from 'lucide-react';

export const MenuBuilderPage: React.FC = () => {
  const [selectedApp, setSelectedApp] = useState<'WEB_1' | 'WEB_2' | 'WEB_3'>('WEB_2');

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
  const [modeFilter, setModeFilter] = useState<'ALL' | 'SELF_SERVICE' | 'WE_CONVERT_FOR_YOU'>('ALL');
  const [isExpandedAll, setIsExpandedAll] = useState<boolean | undefined>(undefined);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Convert backend nodes into MenuItem UI format recursively
  const mapNavNodeToMenuItem = (item: any): MenuItem => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    path: item.route || '',
    parentId: item.parentId || undefined,
    order: item.order,
    isVisible: item.visibility,
    permissions: item.requiredPermissions,
    contractTypeVisibility: item.contractTypeVisibility || 'ALL',
    featureKey: item.featureKey || undefined,
    description: item.description || undefined,
    requiredRoles: item.requiredRoles || [],
    children: item.children && item.children.length > 0 ? item.children.map(mapNavNodeToMenuItem) : undefined,
  });

  const mappedTree: MenuItem[] = menuTree.map(mapNavNodeToMenuItem);

  const displayedTree = React.useMemo(() => {
    if (modeFilter === 'ALL') return mappedTree;
    return mappedTree.filter((item) => {
      const vis = item.contractTypeVisibility || 'ALL';
      if (vis === 'ALL' || vis === modeFilter) return true;
      if (item.children && item.children.some((c) => (c.contractTypeVisibility || 'ALL') === 'ALL' || c.contractTypeVisibility === modeFilter)) {
        return true;
      }
      return false;
    });
  }, [mappedTree, modeFilter]);

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
          status: updates.isVisible !== false ? 'ACTIVE' : 'INACTIVE',
          permissions: updates.permissions,
          contractTypeVisibility: updates.contractTypeVisibility,
          featureKey: updates.featureKey,
          description: updates.description,
          requiredRoles: updates.requiredRoles,
        },
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update menu item';
      setErrorMsg(msg);
      throw err;
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

  const handleDropOnItem = async (draggedId: string, targetId: string, placement: 'before' | 'after' | 'inside') => {
    try {
      setErrorMsg(null);
      await moveMenuItem({
        id: draggedId,
        parentId: placement === 'inside' ? targetId : null,
        targetId,
        placement,
      });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to move menu item');
    }
  };

  const handleDropToRoot = async (draggedId: string) => {
    try {
      setErrorMsg(null);
      await moveMenuItem({
        id: draggedId,
        parentId: null,
      });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to promote menu item to root level');
    }
  };

  const handleReorderSibling = async (id: string, direction: 'up' | 'down') => {
    const res = findSiblingsOfItem(mappedTree, id);
    if (!res) return;
    const { siblings, index } = res;

    if (direction === 'up' && index > 0) {
      const prevItem = siblings[index - 1];
      try {
        setErrorMsg(null);
        await moveMenuItem({
          id,
          parentId: siblings[index].parentId || null,
          targetId: prevItem.id,
          placement: 'before',
        });
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Failed to move item up');
      }
    } else if (direction === 'down' && index < siblings.length - 1) {
      const nextItem = siblings[index + 1];
      try {
        setErrorMsg(null);
        await moveMenuItem({
          id,
          parentId: siblings[index].parentId || null,
          targetId: nextItem.id,
          placement: 'after',
        });
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Failed to move item down');
      }
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Title Bar with Application Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">Menu Builder</h1>
          
        </div>

        {/* Application Selector */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-2 bg-white border border-[#DCE3EC] rounded-xl px-3 py-1.5 shadow-xs">
            <Globe className="w-4 h-4 text-[#244A70]" />
            <span className="text-xs font-semibold text-[#17263A]">App Target:</span>
            <select
              value={selectedApp}
              onChange={(e) => setSelectedApp(e.target.value as 'WEB_1' | 'WEB_2' | 'WEB_3')}
              className="text-xs font-bold text-[#244A70] bg-transparent outline-none cursor-pointer"
            >
              <option value="WEB_1">WEB_1 (Customer PoC Portal)</option>
              <option value="WEB_2">WEB_2 (Internal Staff & Admin)</option>
              <option value="WEB_3">WEB_3 (Customer Enterprise Portal)</option>
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
        <Card variant="default" padding="md" className="h-[700px] flex flex-col justify-between overflow-hidden shadow-xs">
          <div className="pb-3 mb-3 border-b border-[#DCE3EC] flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base font-bold text-[#17263A]">Navigation Tree</h2>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-[#EEF1F6] text-[#244A70]">
              {selectedApp}
            </span>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center space-x-2 mb-3 shrink-0 flex-wrap gap-y-1.5">
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
                variant={isExpandedAll === true ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setIsExpandedAll(true)}
                className={`flex items-center space-x-1 text-xs transition-all ${
                  isExpandedAll === true
                    ? 'bg-[#EEF1F6] border-[#244A70] text-[#244A70] font-bold shadow-xs ring-2 ring-[#244A70]/20'
                    : 'text-[#8491A3]'
                }`}
              >
                <Maximize2 className="w-3 h-3" />
                <span>Expand All</span>
              </Button>
              <Button
                variant={isExpandedAll === false ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setIsExpandedAll(false)}
                className={`flex items-center space-x-1 text-xs transition-all ${
                  isExpandedAll === false
                    ? 'bg-[#EEF1F6] border-[#244A70] text-[#244A70] font-bold shadow-xs ring-2 ring-[#244A70]/20'
                    : 'text-[#8491A3]'
                }`}
              >
                <Minimize2 className="w-3 h-3" />
                <span>Collapse All</span>
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-3 shrink-0">
              <Input
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs py-1.5"
              />
              <Search className="w-3.5 h-3.5 text-[#8491A3] absolute left-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Quick Mode Filter for WEB_3 */}
            {selectedApp === 'WEB_3' && (
              <div className="flex items-center space-x-1.5 mb-3 bg-[#F8FAFC] p-1.5 rounded-lg border border-[#DCE3EC]">
                <span className="text-[10px] font-bold text-[#8491A3] uppercase tracking-wider pl-1">Mode:</span>
                {(['ALL', 'SELF_SERVICE', 'WE_CONVERT_FOR_YOU'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModeFilter(m)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      modeFilter === m
                        ? 'bg-[#244A70] text-white shadow-2xs'
                        : 'text-[#8491A3] hover:bg-slate-200'
                    }`}
                  >
                    {m === 'ALL' ? 'All Modes' : m === 'SELF_SERVICE' ? 'Platform-Based' : 'Managed Services'}
                  </button>
                ))}
              </div>
            )}
            {/* Tree Items */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-0.5">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-[#8491A3] flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#244A70]" />
                  Loading MongoDB menu tree...
                </div>
              ) : mappedTree.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8491A3]">
                  No menu items found in MongoDB for {selectedApp}.
                </div>
              ) : (
                displayedTree.map((item, idx) => (
                  <MenuTreeItem
                    key={item.id}
                    item={item}
                    selectedItemId={selectedItemId}
                    onSelect={(id) => setSelectedItemId(id)}
                    onAddChild={handleAddChildItem}
                    onDelete={(id) => handleDeleteItem(id)}
                    onDuplicate={() => {}}
                    onReorder={handleReorderSibling}
                    searchTerm={searchTerm}
                    isExpandedAll={isExpandedAll}
                    onClearExpandAll={() => setIsExpandedAll(undefined)}
                    activeDropdownId={activeDropdownId}
                    onToggleDropdown={setActiveDropdownId}
                    isBottomHalf={idx >= Math.max(0, mappedTree.length - 2)}
                    draggedItemId={draggedItemId}
                    onDragStartItem={setDraggedItemId}
                    onDragEndItem={() => setDraggedItemId(null)}
                    onDropOnItem={handleDropOnItem}
                    entireTree={mappedTree}
                  />
                ))
              )}

              {draggedItemId && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDropToRoot(draggedItemId);
                    setDraggedItemId(null);
                  }}
                  className="mt-3 p-3 border-2 border-dashed border-[#244A70] bg-[#EEF1F6]/60 rounded-xl text-center text-xs font-bold text-[#244A70] animate-pulse cursor-pointer shadow-xs"
                >
                  Drop here to promote to Root Level (parentId: null)
                </div>
              )}
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
        <LivePreviewPanel
          sidebarNav={mappedTree}
          selectedItemId={selectedItemId}
          selectedApp={selectedApp}
          onSelectItem={(id) => setSelectedItemId(id)}
        />
      </div>
    </div>
  );
};

export default MenuBuilderPage;
