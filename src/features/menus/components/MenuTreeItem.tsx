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
}) => {
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [showDropdownActions, setShowDropdownActions] = useState<boolean>(false);

  const effectiveExpanded = isExpandedAll !== undefined ? isExpandedAll : isOpen;
  const isSelected = selectedItemId === item.id;

  if (searchTerm && !item.label.toLowerCase().includes(searchTerm.toLowerCase())) {
    if (!item.children || !item.children.some((c) => c.label.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return null;
    }
  }

  const childCount = item.children ? item.children.length : 0;
  const isParentWithChildren = childCount > 0;

  return (
    <div className="select-none my-1 relative">
      <div
        onClick={() => onSelect(item.id)}
        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
          isSelected
            ? 'bg-[#E8F1FF] border-[#0652CC] text-[#0652CC] font-bold shadow-2xs'
            : 'bg-white border-[#E5EAF0] text-[#091E42] hover:border-[#D9E2EC] hover:bg-[#F7F9FC]'
        }`}
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <div className="flex items-center space-x-2.5 truncate">
          <GripVertical className="w-3.5 h-3.5 text-[#94A3B8] cursor-grab shrink-0 opacity-40 group-hover:opacity-100" />

          <DynamicIcon
            name={item.icon}
            className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#0652CC]' : 'text-[#42526E]'}`}
          />

          <span className="truncate max-w-[150px] font-semibold">{item.label}</span>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!effectiveExpanded);
              }}
              className="p-1 text-[#6B778C] hover:text-[#091E42] rounded-md hover:bg-black/5"
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
                setShowDropdownActions(!showDropdownActions);
              }}
              className="p-1 text-[#6B778C] hover:text-[#091E42] rounded-md hover:bg-black/5"
              title="More Actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showDropdownActions && (
              <div
                className="absolute right-0 top-6 z-50 w-36 bg-white border border-[#D9E2EC] rounded-lg shadow-lg py-1 text-xs text-[#091E42]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdownActions(false);
                    onAddChild(item.id);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F7F9FC] flex items-center space-x-2 text-[#0652CC]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Child</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdownActions(false);
                    onDuplicate(item.id);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F7F9FC] flex items-center space-x-2"
                >
                  <Copy className="w-3.5 h-3.5 text-[#6B778C]" />
                  <span>Duplicate</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdownActions(false);
                    onReorder(item.id, 'up');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F7F9FC] flex items-center space-x-2"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-[#6B778C]" />
                  <span>Move Up</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdownActions(false);
                    onReorder(item.id, 'down');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F7F9FC] flex items-center space-x-2"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-[#6B778C]" />
                  <span>Move Down</span>
                </button>

                <div className="border-t border-[#E5EAF0] my-1" />

                <button
                  type="button"
                  disabled={isParentWithChildren}
                  onClick={() => {
                    setShowDropdownActions(false);
                    if (!isParentWithChildren) onDelete(item.id);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center space-x-2 ${
                    isParentWithChildren
                      ? 'text-[#D9E2EC] cursor-not-allowed'
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
            )}
          </div>
        </div>
      </div>

      {/* Children tree with visual hierarchy connector lines */}
      {effectiveExpanded && item.children && item.children.length > 0 && (
        <div className="relative border-l-2 border-[#D9E2EC] ml-6 pl-2 space-y-1 mt-1">
          {item.children.map((child) => (
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuTreeItem;
