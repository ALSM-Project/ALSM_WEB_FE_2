import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  MoreVertical,
} from 'lucide-react';
import { MenuItem } from '../types/menu';
import { DynamicIcon } from '@/components/Sidebar/IconResolver';

export interface MenuTreeItemProps {
  item: MenuItem;
  selectedItemId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  depth?: number;
  searchTerm?: string;
  isExpandedAll?: boolean;
  onClearExpandAll?: () => void;
  activeDropdownId: string | null;
  onToggleDropdown: (id: string | null) => void;
  isBottomHalf?: boolean;

  // Drag and Drop
  draggedItemId?: string | null;
  onDragStartItem?: (id: string) => void;
  onDragEndItem?: () => void;
  onDropOnItem?: (draggedId: string, targetId: string, placement: 'before' | 'after' | 'inside') => void;
  entireTree?: MenuItem[];
}

export const MenuTreeItem: React.FC<MenuTreeItemProps> = ({
  item,
  selectedItemId,
  onSelect,
  onAddChild,
  onDelete,
  onDuplicate,
  onReorder,
  depth = 0,
  searchTerm = '',
  isExpandedAll,
  onClearExpandAll,
  activeDropdownId,
  onToggleDropdown,
  isBottomHalf = false,
  draggedItemId,
  onDragStartItem,
  onDragEndItem,
  onDropOnItem,
  entireTree = [],
}) => {
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [dropPlacement, setDropPlacement] = useState<'before' | 'after' | 'inside' | null>(null);

  const showDropdownActions = activeDropdownId === item.id;
  const effectiveExpanded = isExpandedAll !== undefined ? isExpandedAll : isOpen;
  const isSelected = selectedItemId === item.id;

  if (searchTerm && !item.label.toLowerCase().includes(searchTerm.toLowerCase())) {
    if (!item.children || !item.children.some((c) => c.label.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return null;
    }
  }

  const childCount = item.children ? item.children.length : 0;
  const isParentWithChildren = childCount > 0;

  const isDraggingMe = draggedItemId === item.id;

  // Cycle check helper
  const checkIsDescendant = (nodes: MenuItem[], targetId: string, candidateId: string): boolean => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return checkContainsChild(node.children || [], candidateId);
      }
      if (node.children && node.children.length > 0) {
        if (checkIsDescendant(node.children, targetId, candidateId)) return true;
      }
    }
    return false;
  };

  const checkContainsChild = (children: MenuItem[], candidateId: string): boolean => {
    for (const child of children) {
      if (child.id === candidateId) return true;
      if (child.children && checkContainsChild(child.children, candidateId)) return true;
    }
    return false;
  };

  let isInvalid = false;
  if (draggedItemId && draggedItemId !== item.id && entireTree.length > 0) {
    if (dropPlacement === 'inside') {
      if (checkIsDescendant(entireTree, draggedItemId, item.id)) {
        isInvalid = true;
      }
    } else if (dropPlacement === 'before' || dropPlacement === 'after') {
      if (item.parentId && checkIsDescendant(entireTree, draggedItemId, item.parentId)) {
        isInvalid = true;
      }
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItemId || draggedItemId === item.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const height = rect.height;

    let placement: 'before' | 'after' | 'inside' = 'inside';
    if (relativeY < height * 0.28) {
      placement = 'before';
    } else if (relativeY > height * 0.72) {
      placement = 'after';
    } else {
      placement = 'inside';
    }

    setDropPlacement(placement);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDropPlacement(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItemId || draggedItemId === item.id || !dropPlacement) {
      setDropPlacement(null);
      return;
    }

    if (!isInvalid && onDropOnItem) {
      onDropOnItem(draggedItemId, item.id, dropPlacement);
    }
    setDropPlacement(null);
  };

  let borderStyle = '';
  if (isInvalid) {
    borderStyle = 'border-2 border-rose-500 bg-rose-50/70 shadow-xs cursor-not-allowed';
  } else if (dropPlacement === 'before') {
    borderStyle = 'border-t-4 border-t-[#244A70] bg-[#EEF1F6]/60 shadow-xs';
  } else if (dropPlacement === 'after') {
    borderStyle = 'border-b-4 border-b-[#244A70] bg-[#EEF1F6]/60 shadow-xs';
  } else if (dropPlacement === 'inside') {
    borderStyle = 'border-2 border-[#244A70] bg-[#EEF1F6] ring-2 ring-[#244A70]/30 font-bold';
  } else if (isDraggingMe) {
    borderStyle = 'opacity-40 border-dashed border-2 border-[#244A70] bg-[#F8FAFC]';
  } else if (isSelected) {
    borderStyle = 'bg-[#EEF1F6] border-[#244A70] text-[#244A70] font-bold shadow-2xs';
  } else {
    borderStyle = 'bg-white border-[#DCE3EC] text-[#17263A] hover:border-[#DCE3EC] hover:bg-[#F8FAFC]';
  }

  return (
    <div className="select-none my-1 relative">
      <div
        onClick={() => onSelect(item.id)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${borderStyle}`}
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
          <div
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('text/plain', item.id);
              e.dataTransfer.effectAllowed = 'move';
              if (onDragStartItem) onDragStartItem(item.id);
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              if (onDragEndItem) onDragEndItem();
            }}
            className="p-1 cursor-grab active:cursor-grabbing text-[#94A3B8] hover:text-[#244A70] rounded hover:bg-black/5 transition-colors shrink-0"
            title="Drag to move/re-parent item"
          >
            <GripVertical className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
          </div>

          <DynamicIcon
            name={item.icon}
            className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#244A70]' : 'text-[#8491A3]'}`}
          />

          <span className="truncate font-semibold text-xs flex-1 min-w-0" title={item.label}>{item.label}</span>
          {item.contractTypeVisibility === 'SELF_SERVICE' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              Platform-Based
            </span>
          )}
          {item.contractTypeVisibility === 'WE_CONVERT_FOR_YOU' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
              Managed Services
            </span>
          )}

          {isInvalid && (
            <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
              Invalid Drop Target
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onClearExpandAll) onClearExpandAll();
                setIsOpen(!effectiveExpanded);
              }}
              className="p-1 text-[#8491A3] hover:text-[#17263A] rounded-md hover:bg-black/5"
            >
              {effectiveExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Three dots context action menu */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleDropdown(showDropdownActions ? null : item.id);
              }}
              className="p-1 text-[#8491A3] hover:text-[#17263A] rounded-md hover:bg-black/5"
              title="More Actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showDropdownActions && (
              <>
                {/* Backdrop to close dropdown on click outside */}
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleDropdown(null);
                  }}
                />

                <div
                  className={`absolute right-0 z-50 w-36 bg-white border border-[#DCE3EC] rounded-lg shadow-xl py-1 text-xs text-[#17263A] ${
                    isBottomHalf ? 'bottom-6 origin-bottom-right' : 'top-6 origin-top-right'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onToggleDropdown(null);
                      onAddChild(item.id);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F8FAFC] flex items-center space-x-2 text-[#244A70]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Child</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleDropdown(null);
                      onDuplicate(item.id);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F8FAFC] flex items-center space-x-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#8491A3]" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleDropdown(null);
                      onReorder(item.id, 'up');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F8FAFC] flex items-center space-x-2"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-[#8491A3]" />
                    <span>Move Up</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleDropdown(null);
                      onReorder(item.id, 'down');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F8FAFC] flex items-center space-x-2"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-[#8491A3]" />
                    <span>Move Down</span>
                  </button>

                  <div className="border-t border-[#DCE3EC] my-1" />

                  <button
                    type="button"
                    disabled={isParentWithChildren}
                    onClick={() => {
                      onToggleDropdown(null);
                      if (!isParentWithChildren) onDelete(item.id);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center space-x-2 ${
                      isParentWithChildren
                        ? 'text-[#DCE3EC] cursor-not-allowed'
                        : 'hover:bg-rose-50 text-rose-600'
                    }`}
                    title={
                      isParentWithChildren ? 'Cannot delete a menu item with children.' : undefined
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Children tree with visual hierarchy connector lines */}
      {effectiveExpanded && item.children && item.children.length > 0 && (
        <div className="relative border-l-2 border-[#DCE3EC] ml-6 pl-2 space-y-1 mt-1">
          {item.children.map((child, childIdx) => (
            <MenuTreeItem
              key={child.id}
              item={child}
              selectedItemId={selectedItemId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onReorder={onReorder}
              depth={depth}
              searchTerm={searchTerm}
              isExpandedAll={isExpandedAll}
              onClearExpandAll={onClearExpandAll}
              activeDropdownId={activeDropdownId}
              onToggleDropdown={onToggleDropdown}
              isBottomHalf={isBottomHalf || childIdx >= item.children!.length - 1}
              draggedItemId={draggedItemId}
              onDragStartItem={onDragStartItem}
              onDragEndItem={onDragEndItem}
              onDropOnItem={onDropOnItem}
              entireTree={entireTree}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuTreeItem;
