import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MenuItem } from '@/features/menus/types/menu';
import { DynamicIcon } from './IconResolver';

export interface SidebarItemProps {
  item: MenuItem;
  isCollapsed?: boolean;
  depth?: number;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  isCollapsed = false,
  depth = 0,
}) => {
  const location = useLocation();
  const hasChildren = Boolean(item.children && item.children.length > 0);

  const isChildActive = (node: MenuItem): boolean => {
    if (node.path && (location.pathname === node.path || (node.path !== '/' && location.pathname.startsWith(node.path)))) {
      return true;
    }
    if (node.children) {
      return node.children.some(isChildActive);
    }
    return false;
  };

  const isActive = isChildActive(item);
  const [isExpanded, setIsExpanded] = useState<boolean>(isActive);

  useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [location.pathname, isActive]);

  if (item.isVisible === false) {
    return null;
  }

  const paddingLeftClass = isCollapsed
    ? 'justify-center px-0'
    : depth === 0
    ? 'px-3'
    : depth === 1
    ? 'pl-8 pr-3'
    : 'pl-11 pr-3';

  const groupMarginTop = depth === 0 && hasChildren ? 'mt-3' : 'mt-0.5';

  return (
    <div className={`w-full ${groupMarginTop}`}>
      {hasChildren ? (
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center py-2' : 'justify-between py-2 text-xs font-semibold'
            } rounded-lg transition-colors cursor-pointer ${paddingLeftClass} ${
              isActive
                ? 'text-white bg-white/10 font-bold'
                : 'text-[#E5EAF0] hover:bg-white/10 hover:text-white'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-5 shrink-0 flex items-center justify-center">
                <DynamicIcon name={item.icon} className="w-4 h-4 text-[#94A3B8] group-hover:text-white" />
              </div>
              {!isCollapsed && <span className="truncate text-xs font-semibold">{item.label}</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[#64748B] shrink-0 ml-1">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
            )}
          </button>

          {!isCollapsed && isExpanded && item.children && (
            <div className="flex flex-col mt-1 space-y-1">
              {item.children.map((child) => (
                <SidebarItem key={child.id} item={child} isCollapsed={isCollapsed} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <NavLink
          to={item.path || '#'}
          className={({ isActive: linkActive }) =>
            `flex items-center ${
              isCollapsed ? 'justify-center py-2' : 'justify-between py-2 text-xs font-medium'
            } rounded-lg transition-all ${paddingLeftClass} ${
              linkActive
                ? 'bg-[#0652CC] text-white font-semibold shadow-xs'
                : 'text-[#94A3B8] hover:bg-white/10 hover:text-white'
            }`
          }
          title={isCollapsed ? item.label : undefined}
        >
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-5 shrink-0 flex items-center justify-center">
              <DynamicIcon name={item.icon} className="w-4 h-4" />
            </div>
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </div>
          {!isCollapsed && item.badge && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold shrink-0 ml-1"
              style={{ backgroundColor: item.badgeColor || '#0652CC' }}
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
