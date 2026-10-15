import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MenuItem } from '@/features/menus/types/menu';
import { DynamicIcon } from './IconResolver';

export interface SidebarItemProps {
  item: MenuItem;
  isCollapsed?: boolean;
  depth?: number;
  activeItemId?: string | null;
}

const containsActive = (node: MenuItem, targetId?: string | null): boolean => {
  if (!targetId) return false;
  if (node.id === targetId) return true;
  if (node.children) return node.children.some((c) => containsActive(c, targetId));
  return false;
};

export const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  isCollapsed = false,
  depth = 0,
  activeItemId = null,
}) => {
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isBranchActive = containsActive(item, activeItemId);
  const isSelfActive = Boolean(activeItemId && item.id === activeItemId);

  const [isExpanded, setIsExpanded] = useState<boolean>(isBranchActive);

  useEffect(() => {
    if (isBranchActive) {
      setIsExpanded(true);
    }
  }, [isBranchActive]);

  if (item.isVisible === false) {
    return null;
  }

  if (item.hideParentLabel && hasChildren && item.children) {
    return (
      <div className="w-full flex flex-col space-y-0.5">
        {item.children.map((child) => (
          <SidebarItem
            key={child.id}
            item={child}
            isCollapsed={isCollapsed}
            depth={depth}
            activeItemId={activeItemId}
          />
        ))}
      </div>
    );
  }

  const paddingLeftClass = isCollapsed
    ? 'justify-center px-0'
    : depth === 0
    ? 'px-3'
    : depth === 1
    ? 'pl-7 pr-3'
    : 'pl-10 pr-3';

  const groupMarginTop = depth === 0 && hasChildren ? 'mt-2.5' : 'mt-0.5';

  return (
    <div className={`w-full ${groupMarginTop}`}>
      {hasChildren ? (
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center py-2' : 'justify-between py-2 text-xs font-semibold'
            } rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ${paddingLeftClass} ${
              isBranchActive
                ? 'text-white bg-[#203954] font-bold'
                : 'text-[#CBD5E1] hover:bg-[#203954] hover:text-white'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <div className="flex items-center space-x-2.5 min-w-0 truncate">
              <div className="w-4 h-4 shrink-0 flex items-center justify-center text-[#8491A3]">
                <DynamicIcon name={item.icon} className="w-4 h-4" />
              </div>
              {!isCollapsed && (
                <span className="truncate text-xs font-semibold tracking-tight">{item.label}</span>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[#8491A3] shrink-0 ml-1.5 flex items-center">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
            )}
          </button>

          {!isCollapsed && isExpanded && item.children && (
            <div className="flex flex-col mt-0.5 space-y-0.5">
              {item.children.map((child) => (
                <SidebarItem
                  key={child.id}
                  item={child}
                  isCollapsed={isCollapsed}
                  depth={depth + 1}
                  activeItemId={activeItemId}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <NavLink
          to={item.path || '#'}
          target={item.openInNewTab ? '_blank' : undefined}
          rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
          style={{
            backgroundColor: isSelfActive ? '#29466A' : undefined,
          }}
          className={() =>
            `flex items-center ${
              isCollapsed ? 'justify-center py-2' : 'justify-between py-2 text-xs font-medium'
            } rounded-md transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ${paddingLeftClass} ${
              isSelfActive
                ? 'bg-[#29466A] bg-[#0652CC] text-white font-semibold shadow-xs'
                : 'text-[#CBD5E1] hover:bg-[#203954] hover:text-white'
            }`
          }
          title={isCollapsed ? item.label : undefined}
        >
          <div className="flex items-center space-x-2.5 min-w-0 truncate">
            <div className={`w-4 h-4 shrink-0 flex items-center justify-center ${isSelfActive ? 'text-white' : 'text-[#8491A3]'}`}>
              <DynamicIcon name={item.icon} className="w-4 h-4" />
            </div>
            {!isCollapsed && <span className="truncate leading-tight">{item.label}</span>}
          </div>
          {!isCollapsed && item.badge && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ml-1.5 bg-[#244A70] text-white border border-white/10"
            >
              {item.badge}
            </span>
          )}
        </NavLink>
      )}
    </div>
  );
};

export default SidebarItem;
