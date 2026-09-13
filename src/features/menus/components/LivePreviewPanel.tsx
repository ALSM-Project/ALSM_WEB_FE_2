import React from 'react';
import { ChevronRight } from 'lucide-react';
import { MenuItem } from '../types/menu';
import { findMenuItemInTree } from '../utils/navigationTreeUtils';
import { DynamicIcon } from '@/components/Sidebar/IconResolver';
import { Card } from '@/shared/ui';

import logo from '@/assets/logo.png';

export interface LivePreviewPanelProps {
  sidebarNav: MenuItem[];
  selectedItemId: string | null;
}

const PreviewSidebarItem: React.FC<{ item: MenuItem; selectedItemId: string | null; depth?: number }> = ({
  item,
  selectedItemId,
  depth = 0,
}) => {
  if (item.isVisible === false) return null;
  const isSelected = selectedItemId === item.id;
  const hasChildren = Boolean(item.children && item.children.length > 0);

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg text-[10px] transition-colors ${
          isSelected
            ? 'bg-[#0652CC] text-white font-semibold'
            : 'text-[#94A3B8] hover:text-white'
        }`}
        style={{ marginLeft: `${depth * 6}px` }}
      >
        <DynamicIcon name={item.icon} className="w-3 h-3 shrink-0" />
        <span className="truncate">{item.label}</span>
      </div>

      {hasChildren && (
        <div className="ml-2 pl-1 border-l border-[#0652CC]/30 space-y-0.5 mt-0.5">
          {item.children!
            .filter((c) => c.isVisible !== false)
            .map((child) => (
              <PreviewSidebarItem key={child.id} item={child} selectedItemId={selectedItemId} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
};

export const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({
  sidebarNav,
  selectedItemId,
}) => {
  const selectedItem = selectedItemId ? findMenuItemInTree(sidebarNav, selectedItemId) : null;

  const getAncestralPath = (items: MenuItem[], targetId: string, path: string[] = []): string[] | null => {
    for (const item of items) {
      const currentPath = [...path, item.label];
      if (item.id === targetId) return currentPath;
      if (item.children && item.children.length > 0) {
        const found = getAncestralPath(item.children, targetId, currentPath);
        if (found) return found;
      }
    }
    return null;
  };

  const breadcrumbChain = selectedItemId
    ? getAncestralPath(sidebarNav, selectedItemId) || [selectedItem?.label || 'Create Profile']
    : ['Organisations', 'Partners', 'Create Profile'];

  return (
    <Card variant="default" padding="md" className="h-[640px] flex flex-col justify-between overflow-y-auto">
      <div>
        {/* Header */}
        <div className="pb-3 mb-3 border-b border-[#E5EAF0]">
          <h2 className="text-base font-bold text-[#091E42]">Live Preview</h2>
          <p className="text-xs text-[#6B778C] mt-0.5">
            See how the menu will appear in the application.
          </p>
        </div>

        {/* Miniature Shell Card matching screenshot */}
        <div className="border border-[#D9E2EC] rounded-2xl overflow-hidden shadow-xs bg-[#F7F9FC]">
          <div className="flex h-[420px]">
            {/* Sidebar Preview */}
            <div className="w-36 bg-[#091E42] text-white p-2.5 flex flex-col space-y-1.5 shrink-0 border-r border-[#020817] overflow-y-auto max-h-[420px]">
              {/* Logo matching Sidebar */}
              <div className="flex items-center space-x-2 pb-2 mb-1 border-b border-[#020817]">
                <img src={logo} alt="ALSM" className="h-6 w-auto object-contain" />
                <span className="font-extrabold text-xs tracking-tight text-white">ALSM</span>
              </div>


              {/* Sidebar Menu Items */}
              {sidebarNav
                .filter((item) => item.isVisible !== false)
                .map((item) => (
                  <PreviewSidebarItem key={item.id} item={item} selectedItemId={selectedItemId} />
                ))}
            </div>

            {/* Page Workspace Preview with skeleton lines matching screenshot */}
            <div className="flex-1 p-4 bg-white flex flex-col justify-start">
              {/* Header Breadcrumbs */}
              <div className="flex items-center space-x-1 text-[9px] text-[#6B778C] mb-3">
                <span>&lt;</span>
                {breadcrumbChain.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span>&gt;</span>}
                    <span className={idx === breadcrumbChain.length - 1 ? 'font-semibold text-[#091E42]' : ''}>
                      {crumb}
                    </span>
                  </React.Fragment>
                ))}
              </div>

              {/* Form Title & Skeleton Lines */}
              <h4 className="text-xs font-bold text-[#091E42] mb-3">
                {selectedItem ? `${selectedItem.label} Profile` : 'Create Partner Profile'}
              </h4>

              <div className="space-y-3">
                <div className="h-6 bg-[#F7F9FC] border border-[#E5EAF0] rounded-md w-full" />
                <div className="h-6 bg-[#F7F9FC] border border-[#E5EAF0] rounded-md w-3/4" />
                <div className="h-6 bg-[#F7F9FC] border border-[#E5EAF0] rounded-md w-full" />
                <div className="h-[2px] bg-[#E5EAF0] my-2" />
                <div className="h-6 bg-[#F7F9FC] border border-[#E5EAF0] rounded-md w-1/2" />
                <div className="h-6 bg-[#F7F9FC] border border-[#E5EAF0] rounded-md w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Path Bar Below Preview matching screenshot */}
      <div className="mt-4 pt-3 border-t border-[#E5EAF0]">
        <span className="text-[11px] font-semibold text-[#091E42] flex items-center space-x-1.5 mb-1.5">
          <DynamicIcon name="Compass" className="w-3.5 h-3.5 text-[#0652CC]" />
          <span>Current Path</span>
        </span>
        <div className="flex items-center flex-wrap gap-1.5">
          {breadcrumbChain.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-[#94A3B8]" />}
              <span className="px-2.5 py-1 text-[11px] rounded-lg bg-[#E8F1FF] text-[#0652CC] font-semibold border border-[#0652CC]/20">
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default LivePreviewPanel;
