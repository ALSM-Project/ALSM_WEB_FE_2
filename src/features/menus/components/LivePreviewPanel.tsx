import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronRight,
  Shield,
  AlertCircle,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { MenuItem } from '../types/menu';
import { findMenuItemInTree } from '../utils/navigationTreeUtils';
import { DynamicIcon } from '@/components/Sidebar/IconResolver';
import { Card } from '@/shared/ui';

import logo from '@/assets/logo.png';

export interface RoleOption {
  value: string;
  label: string;
  badge: string;
  tagline: string;
  category: string;
  homeTitle?: string;
}

export const APP_ROLES: Record<'WEB_1' | 'WEB_2' | 'WEB_3', RoleOption[]> = {
  WEB_3: [
    {
      value: 'ALL',
      label: 'All Roles',
      badge: 'Unrestricted View',
      tagline: 'Viewing all enterprise navigation items and portal screens without role constraints.',
      category: 'Overview',
    },
    {
      value: 'ORGANIZATION_OWNER',
      label: 'Organization Owner',
      badge: 'Admin / Owner',
      tagline: 'Full enterprise governance: project portfolios, team memberships, contract quotas & SLA.',
      category: 'Governance',
    },
    {
      value: 'PROJECT_MANAGER',
      label: 'Project Manager',
      badge: 'Project Delivery',
      tagline: 'SOW milestones tracking, conversion delivery sign-offs, and engineer team coordination.',
      category: 'Management',
    },
    {
      value: 'DEVELOPER',
      label: 'Developer',
      badge: 'Modernization Dev',
      tagline: 'Hands-on AST compiler workspace, field mapping review, test assertions, and code exports.',
      category: 'Engineering',
    },
    {
      value: 'VIEWER',
      label: 'Viewer',
      badge: 'Read-Only',
      tagline: 'Inspection and verification mode for completed deliverables, code artifacts, and audit reports.',
      category: 'Audit',
    },
  ],
  WEB_2: [
    {
      value: 'ALL',
      label: 'All Roles',
      badge: 'Staff Console',
      tagline: 'Viewing all internal platform administration consoles and operational modules.',
      category: 'Overview',
    },
    {
      value: 'SYSTEM_ADMIN',
      label: 'Platform Admin',
      badge: 'Super Admin',
      tagline: 'Platform infrastructure, RBAC security matrix, organization onboarding, and revenue analytics.',
      category: 'Administration',
    },
    {
      value: 'TEAM_LEAD',
      label: 'Team Lead',
      badge: 'Operations Lead',
      tagline: 'Resource allocation, conversion staff workload balancing, and offboarding sign-offs.',
      category: 'Operations',
    },
    {
      value: 'SALES_MANAGER',
      label: 'Sales Manager',
      badge: 'Commercial Lead',
      tagline: 'Commercial CRM pipeline, discount authorization queues, and enterprise quote proposals.',
      category: 'Commercial',
    },
    {
      value: 'CONVERSION_STAFF',
      label: 'Conversion Staff',
      badge: 'Conversion Eng',
      tagline: 'Active modernization queue, AST translation fixes, and quality validation reviews.',
      category: 'Engineering',
    },
    {
      value: 'INTERNAL_SUPPORT',
      label: 'Customer Support',
      badge: 'Tier 2 Support',
      tagline: 'Customer org troubleshooting, AST syntax error remediation, and live support requests.',
      category: 'Support',
    },
  ],
  WEB_1: [
    {
      value: 'ALL',
      label: 'All Roles',
      badge: 'Customer View',
      tagline: 'Viewing complete customer workspace and platform-based modernization tools.',
      category: 'Overview',
    },
    {
      value: 'OWNER',
      label: 'Customer Account Owner',
      badge: 'Account Owner',
      tagline: 'Platform-based account management, quota consumption, and enterprise migration upgrade.',
      category: 'Account',
    },
    {
      value: 'DEVELOPER',
      label: 'PoC Developer',
      badge: 'Platform Dev',
      tagline: 'Rapid legacy screen conversion, visual AST preview studio, and modern React export.',
      category: 'Engineering',
    },
    {
      value: 'VIEWER',
      label: 'Viewer',
      badge: 'Read-Only Stakeholder',
      tagline: 'Executive evaluation of modernized screen fidelity, converted lines of code, and quality metrics.',
      category: 'Audit',
    },
  ],
};

export interface LivePreviewPanelProps {
  sidebarNav: MenuItem[];
  selectedItemId: string | null;
  selectedApp?: 'WEB_1' | 'WEB_2' | 'WEB_3';
  onSelectItem?: (id: string) => void;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  // WEB_2
  SYSTEM_ADMIN: ['*'],
  ADMIN: ['*'],
  TEAM_LEAD: [
    'users.onboard',
    'users.manage',
    'users.view',
    'users.offboard',
    'users.offboard.review',
    'resources.assignment.view',
    'resources.transfer',
    'resources.transfer.confirm',
    'roles.temporary.view',
    'roles.temporary.grant',
    'roles.temporary.revoke',
    'roles.temporary.history.view',
    'roles.temporary.request',
    'roles.temporary.requests.review',
    'roles.temporary.requests.approve',
    'roles.temporary.requests.reject',
    'roles.temporary.manage',
    'meetings.create',
    'meetings.view',
    'quality-review.manage',
    'teams.manage',
    'conversions.view',
    'conversions.queue.view',
    'conversions.retry',
    'conversions.execute',
    'conversions.troubleshoot.view',
    'conversions.mapping.validate',
    'conversions.support_patch.apply',
    'projects.demo.view',
    'projects.demo.create',
    'sales.leads.view',
    'partner.view',
    'partner.create',
    'partner.update',
    'partner.manage_status',
    'partner_project.view',
    'partner_project.create',
    'partner_project.update',
    'partner_project.manage_files',
    'partner_project.start_conversion',
    'partner_project.view_progress',
    'conversion_result.view',
    'conversion_result.review',
    'conversion_result.manage_findings',
    'conversion_result.manage_mappings',
    'conversion_result.view_generated_code',
    'conversion_result.export',
    'conversion_result.notify_partner',
  ],
  SALES_MANAGER: [
    'billing.quotes.manage',
    'billing.usage.view',
    'sales.leads.view',
    'sales.leads.manage',
    'sales.contracts.review',
    'sales.reports.view',
    'sales.team-performance.view',
    'sales.discounts.view',
    'sales.discounts.approve',
    'sales.discounts.reject',
    'meetings.create',
    'meetings.view',
    'partner.view',
    'partner_project.view',
  ],
  SALES_VP: [
    'sales.discounts.view',
    'sales.discounts.executive.review',
    'sales.reports.view',
    'sales.team-performance.view',
    'sales.contracts.review',
  ],
  INTERNAL_SALES: [
    'billing.quotes.manage',
    'billing.usage.view',
    'sales.leads.view',
    'sales.leads.manage',
    'sales.discounts.view',
    'roles.temporary.request',
    'roles.temporary.view',
    'meetings.create',
    'meetings.view',
    'partner.view',
    'partner_project.view',
  ],
  CONVERSION_STAFF: [
    'conversions.view',
    'conversions.queue.view',
    'conversions.execute',
    'conversions.retry',
    'quality-review.manage',
    'conversions.troubleshoot.view',
    'conversions.mapping.validate',
    'conversions.support_patch.apply',
    'conversion_result.view',
    'conversion_result.review',
    'conversion_result.manage_findings',
    'conversion_result.manage_mappings',
    'conversion_result.view_generated_code',
    'conversion_result.export',
    'diagnostics.view',
  ],
  INTERNAL_SUPPORT: [
    'meetings.create',
    'meetings.view',
    'organizations.view',
    'organizations.impersonate',
    'conversions.view',
    'conversions.queue.view',
    'conversions.troubleshoot.view',
    'conversions.mapping.validate',
    'conversions.support_patch.apply',
    'support_requests.create',
  ],

  // WEB_3
  ORGANIZATION_OWNER: ['*'],
  PROJECT_MANAGER: [
    'projects.view',
    'projects.create',
    'projects.update',
    'projects.members.manage',
    'project_files.view',
    'project_files.upload',
    'project_files.download',
    'project_progress.view',
    'project_deliverables.view',
    'project_deliverables.download',
    'conversion.view',
    'conversion.history.view',
    'conversion.results.view',
    'conversations.view',
    'conversations.create',
    'meetings.view',
    'meetings.create',
    'support_requests.create',
    'partner_portal.dashboard.view',
    'partner_portal.project.view',
    'partner_portal.download',
  ],
  DEVELOPER: [
    'projects.view',
    'project_files.view',
    'project_files.upload',
    'project_files.download',
    'conversion.execute',
    'conversion.view',
    'conversion.history.view',
    'conversion.results.view',
    'project_deliverables.view',
    'project_deliverables.download',
    'support_requests.create',
    'partner_portal.dashboard.view',
    'partner_portal.project.view',
    'partner_portal.download',
  ],
  VIEWER: [
    'projects.view',
    'project_deliverables.view',
    'project_deliverables.download',
    'partner_portal.dashboard.view',
    'partner_portal.project.view',
    'partner_portal.download',
  ],

  // WEB_1
  OWNER: ['*'],
};

const isItemAllowedForRole = (
  item: MenuItem,
  role: string,
  app: 'WEB_1' | 'WEB_2' | 'WEB_3',
  parentItem?: MenuItem
): boolean => {
  if (role === 'ALL') return true;

  // 1. Explicit item requiredRoles check
  if (item.requiredRoles && item.requiredRoles.length > 0) {
    return item.requiredRoles.includes(role);
  }

  // 2. Permission check if item has permissions
  const rolePerms = ROLE_PERMISSIONS[role];
  if (rolePerms && !rolePerms.includes('*') && item.permissions && item.permissions.length > 0) {
    const hasPerm = item.permissions.some((p) => rolePerms.includes(p));
    if (!hasPerm) return false;
  }

  const path = (item.path || '').toLowerCase();
  const label = (item.label || '').toLowerCase();
  const id = (item.id || '').toLowerCase();

  const parentId = (parentItem?.id || '').toLowerCase();
  const parentLabel = (parentItem?.label || '').toLowerCase();

  // 3. Strict Section/Capability Whitelisting per Application & Role
  if (app === 'WEB_2') {
    if (role === 'SYSTEM_ADMIN' || role === 'ADMIN') {
      return true;
    }

    // Check parent group context
    const isUnderTeamLead = parentId.includes('team_lead') || parentLabel.includes('team lead');
    const isUnderCrmSales =
      parentId.includes('commercial') ||
      parentId.includes('crm') ||
      parentLabel.includes('crm') ||
      parentLabel.includes('sales');
    const isUnderConversions = parentId.includes('conversions') || parentLabel.includes('conversions');
    const isUnderOperations = parentId.includes('operations') || parentLabel.includes('operations');
    const isUnderSupport = parentId.includes('support') || parentLabel.includes('support');
    const isUnderAdmin = parentId.includes('administration') || parentLabel.includes('administration');
    const isUnderPartners = parentId.includes('partner') || parentLabel.includes('partner');

    if (role === 'SALES_MANAGER') {
      // Must NOT see items under Team Lead, Conversions, Operations, Support, Administration
      if (isUnderTeamLead || isUnderConversions || isUnderOperations || isUnderSupport || isUnderAdmin) {
        return false;
      }
      if (isUnderCrmSales) return true;

      // Group / root level rejection
      if (
        id.includes('team_lead') ||
        label.includes('team lead') ||
        path.includes('team-lead') ||
        label.includes('employee allocation') ||
        label.includes('workload') ||
        id.includes('operations') ||
        label.includes('operations') ||
        id.includes('conversions') ||
        label.includes('conversions') ||
        path.includes('my-work') ||
        path.includes('review') ||
        path.includes('queue') ||
        id.includes('support') ||
        label.includes('customer support') ||
        label.includes('organisation access') ||
        path.includes('/support') ||
        id.includes('administration') ||
        label.includes('administration') ||
        path.includes('/admin')
      ) {
        return false;
      }

      // Can see Dashboard, CRM & Sales, Partner directory
      const isDashboard = path === '/' || path.includes('dashboard') || label.includes('dashboard') || id.includes('dashboard');
      const isCrmSales =
        id.includes('commercial') ||
        id.includes('crm') ||
        id.includes('sales') ||
        label.includes('crm') ||
        label.includes('sales') ||
        label.includes('lead') ||
        label.includes('pipeline') ||
        label.includes('discount') ||
        label.includes('quote') ||
        label.includes('conversation') ||
        label.includes('team performance') ||
        label.includes('service usage') ||
        label.includes('meeting request') ||
        path.includes('sales') ||
        path.includes('lead') ||
        path.includes('pipeline') ||
        path.includes('discount') ||
        path.includes('quote') ||
        path.includes('conversation') ||
        path.includes('usage');
      const isPartnerDir = (path === '/partners' || label === 'partner directory' || label === 'partner list') && !path.includes('new');

      return isDashboard || isCrmSales || isPartnerDir;
    }

    if (role === 'TEAM_LEAD') {
      // If parent is Team Lead, Conversions, Operations, Support, or Partners -> ALLOW
      if (isUnderTeamLead || isUnderConversions || isUnderOperations || isUnderSupport || isUnderPartners) {
        return true;
      }

      // If parent is CRM & Sales or Administration -> REJECT
      if (isUnderCrmSales || isUnderAdmin) {
        return false;
      }

      // Root level: Must NOT see CRM & Sales, Administration
      if (
        id.includes('commercial') ||
        id.includes('crm') ||
        id.includes('sales') ||
        label.includes('crm & sales') ||
        label.includes('leads') ||
        label.includes('sales pipeline') ||
        label.includes('sales reports') ||
        label.includes('discount approvals') ||
        path.includes('/sales') ||
        id.includes('administration') ||
        label.includes('administration') ||
        label.includes('menu builder') ||
        label.includes('roles & permissions') ||
        path.includes('/admin/menus') ||
        path.includes('/admin/roles')
      ) {
        return false;
      }

      return (
        path === '/' ||
        path.includes('dashboard') ||
        label.includes('dashboard') ||
        id.includes('team_lead') ||
        id.includes('tl_') ||
        label.includes('team lead') ||
        label.includes('workload') ||
        label.includes('employee allocation') ||
        label.includes('allocation') ||
        label.includes('meeting') ||
        label.includes('transfer') ||
        label.includes('offboard') ||
        path.includes('team-lead') ||
        path.includes('team-performance') ||
        path.includes('meetings') ||
        id.includes('conversions') ||
        label.includes('conversions') ||
        path.includes('my-work') ||
        path.includes('review') ||
        id.includes('operations') ||
        label.includes('operations') ||
        path.includes('queue') ||
        id.includes('support') ||
        label.includes('customer support') ||
        path.includes('partner') ||
        label.includes('partner')
      );
    }

    if (role === 'CONVERSION_STAFF') {
      if (isUnderTeamLead || isUnderCrmSales || isUnderAdmin || isUnderSupport) {
        return false;
      }
      if (isUnderConversions || isUnderOperations) return true;

      return (
        path === '/' ||
        path.includes('dashboard') ||
        label.includes('dashboard') ||
        id.includes('conversions') ||
        label.includes('conversions') ||
        path.includes('my-work') ||
        path.includes('review') ||
        id.includes('operations') ||
        label.includes('operations') ||
        path.includes('queue')
      );
    }

    if (role === 'INTERNAL_SUPPORT') {
      if (isUnderTeamLead || isUnderCrmSales || isUnderAdmin) {
        return false;
      }
      if (isUnderSupport || isUnderOperations) return true;

      return (
        path === '/' ||
        path.includes('dashboard') ||
        label.includes('dashboard') ||
        id.includes('support') ||
        label.includes('customer support') ||
        label.includes('organisation access') ||
        path.includes('/support') ||
        id.includes('operations') ||
        label.includes('operations') ||
        path.includes('queue')
      );
    }
  }

  if (app === 'WEB_3') {
    if (role === 'ORGANIZATION_OWNER') {
      return true;
    }

    if (role === 'PROJECT_MANAGER') {
      if (
        path.includes('role') ||
        path.includes('contract') ||
        path.includes('billing') ||
        path.includes('quota') ||
        path.includes('audit') ||
        label.includes('roles & permissions') ||
        label.includes('security audit') ||
        label.includes('service & contract') ||
        label.includes('service usage') ||
        id.includes('service_contract')
      ) {
        return false;
      }
      return true;
    }

    if (role === 'DEVELOPER') {
      if (
        path.includes('role') ||
        path.includes('member') ||
        path.includes('contract') ||
        path.includes('billing') ||
        path.includes('quota') ||
        path.includes('audit') ||
        path.includes('setting') ||
        label.includes('enterprise organisation') ||
        label.includes('team member') ||
        label.includes('roles & permissions') ||
        label.includes('security audit') ||
        label.includes('service & contract') ||
        id.includes('enterprise_org') ||
        id.includes('service_contract')
      ) {
        return false;
      }
      return true;
    }

    if (role === 'VIEWER') {
      const isAllowed =
        path.includes('dashboard') ||
        path.includes('project') ||
        path.includes('download') ||
        path.includes('deliverable') ||
        path.includes('diagnostic') ||
        label.includes('dashboard') ||
        label.includes('my projects') ||
        label.includes('download') ||
        label.includes('deliverable') ||
        label.includes('diagnostic');
      if (
        path.includes('member') ||
        path.includes('role') ||
        path.includes('contract') ||
        path.includes('setting') ||
        label.includes('organisation') ||
        label.includes('service & contract') ||
        label.includes('communication')
      ) {
        return false;
      }
      return isAllowed;
    }
  }

  if (app === 'WEB_1') {
    if (role === 'OWNER') return true;
    if (role === 'DEVELOPER') {
      return !path.includes('billing') && !path.includes('invoice') && !path.includes('contract');
    }
    if (role === 'VIEWER') {
      return (
        path.includes('dashboard') ||
        path.includes('result') ||
        path.includes('overview') ||
        path.includes('diagnostic')
      );
    }
  }

  return true;
};

const PreviewSidebarItem: React.FC<{
  item: MenuItem;
  selectedItemId: string | null;
  onSelect: (item: MenuItem) => void;
  depth?: number;
  isLight?: boolean;
}> = ({ item, selectedItemId, onSelect, depth = 0, isLight = false }) => {
  if (item.isVisible === false) return null;
  const isSelected = selectedItemId === item.id;
  const hasChildren = Boolean(item.children && item.children.length > 0);

  const selectedClass = isLight
    ? 'bg-[#EEF1F6] text-[#244A70] font-bold shadow-2xs border border-[#244A70]/20'
    : 'bg-[#244A70] text-white font-semibold';
  const normalClass = isLight
    ? 'text-[#334155] hover:bg-[#F4F7FB] font-medium'
    : 'text-[#94A3B8] hover:text-white hover:bg-white/5';

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => onSelect(item)}
        className={`w-full text-left flex items-center space-x-1.5 px-2 py-1 rounded-lg text-[10px] transition-colors cursor-pointer ${
          isSelected ? selectedClass : normalClass
        }`}
        style={{ paddingLeft: `${Math.max(8, depth * 8 + 8)}px` }}
      >
        <DynamicIcon
          name={item.icon}
          className={`w-3 h-3 shrink-0 ${
            isSelected ? (isLight ? 'text-[#244A70]' : 'text-white') : isLight ? 'text-[#64748B]' : 'text-[#94A3B8]'
          }`}
        />
        <span className="truncate flex-1">{item.label}</span>
      </button>

      {hasChildren && (
        <div className={`ml-2 pl-1 border-l ${isLight ? 'border-[#CBD5E1]' : 'border-[#244A70]/30'} space-y-0.5 mt-0.5`}>
          {item.children!
            .filter((c) => c.isVisible !== false)
            .map((child) => (
              <PreviewSidebarItem
                key={child.id}
                item={child}
                selectedItemId={selectedItemId}
                onSelect={onSelect}
                depth={depth + 1}
                isLight={isLight}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({
  sidebarNav,
  selectedItemId,
  selectedApp = 'WEB_2',
  onSelectItem,
}) => {
  const [previewContractType, setPreviewContractType] = useState<string>('ALL');
  const [previewRole, setPreviewRole] = useState<string>('ALL');
  const [activePreviewItemId, setActivePreviewItemId] = useState<string | null>(selectedItemId);
  const [viewMode, setViewMode] = useState<'ROLE_SCREEN' | 'ITEM_SCREEN'>('ITEM_SCREEN');

  // When selectedItemId changes externally from the builder tree, sync local preview
  useEffect(() => {
    setActivePreviewItemId(selectedItemId);
    if (selectedItemId) {
      setViewMode('ITEM_SCREEN');
    }
  }, [selectedItemId]);

  // When selectedApp changes, validate and update previewRole
  useEffect(() => {
    const validRoles = (APP_ROLES[selectedApp] || []).map((r) => r.value);
    if (!validRoles.includes(previewRole)) {
      setPreviewRole('ALL');
    }
    setViewMode('ROLE_SCREEN');
  }, [selectedApp]);

  // When user explicitly selects a role, switch view to role screen
  const handleRoleChange = (roleValue: string) => {
    setPreviewRole(roleValue);
    if (roleValue !== 'ALL') {
      setViewMode('ROLE_SCREEN');
    }
  };

  const handleSidebarItemClick = (item: MenuItem) => {
    setActivePreviewItemId(item.id);
    setViewMode('ITEM_SCREEN');
    onSelectItem?.(item.id);
  };

  const currentRoleInfo = useMemo(() => {
    const list = APP_ROLES[selectedApp] || [];
    return list.find((r) => r.value === previewRole) || list[0];
  }, [selectedApp, previewRole]);

  // Filter items for preview based on contract type & role
  const filteredSidebarNav = useMemo(() => {
    const filterItem = (item: MenuItem, parentItem?: MenuItem): MenuItem | null => {
      if (item.isVisible === false) return null;

      // Contract Type filtering (Web 3)
      if (previewContractType !== 'ALL') {
        const vis = item.contractTypeVisibility || 'ALL';
        if (vis !== 'ALL') {
          if (previewContractType === 'SELF_SERVICE' && vis !== 'SELF_SERVICE') return null;
          if (previewContractType === 'WE_CONVERT_FOR_YOU' && vis !== 'WE_CONVERT_FOR_YOU') return null;
          if (previewContractType === 'HYBRID' && vis !== 'SELF_SERVICE' && vis !== 'WE_CONVERT_FOR_YOU' && vis !== 'HYBRID') return null;
        }
      }

      // Role filtering
      if (!isItemAllowedForRole(item, previewRole, selectedApp, parentItem)) {
        return null;
      }

      let filteredChildren: MenuItem[] | undefined = undefined;
      if (item.children && item.children.length > 0) {
        filteredChildren = item.children
          .map((child) => filterItem(child, item))
          .filter((c): c is MenuItem => c !== null);
        if ((!item.path || item.path.trim() === '') && filteredChildren.length === 0) {
          return null;
        }
      }

      return {
        ...item,
        children: filteredChildren,
      };
    };

    return sidebarNav.map((item) => filterItem(item)).filter((i): i is MenuItem => i !== null);
  }, [sidebarNav, previewContractType, previewRole, selectedApp]);

  // If activePreviewItemId is not in filteredSidebarNav, reset it to null and show role screen
  useEffect(() => {
    if (activePreviewItemId) {
      const isStillVisible = findMenuItemInTree(filteredSidebarNav, activePreviewItemId);
      if (!isStillVisible) {
        setActivePreviewItemId(null);
        setViewMode('ROLE_SCREEN');
      }
    }
  }, [filteredSidebarNav, activePreviewItemId]);

  const currentActiveItem = useMemo(() => {
    if (!activePreviewItemId) return null;
    return findMenuItemInTree(sidebarNav, activePreviewItemId);
  }, [sidebarNav, activePreviewItemId]);

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

  const breadcrumbChain = useMemo(() => {
    if (viewMode === 'ITEM_SCREEN' && activePreviewItemId) {
      const found = getAncestralPath(sidebarNav, activePreviewItemId);
      if (found) return found;
    }
    if (selectedApp === 'WEB_3') {
      return ['Customer Enterprise Portal', currentRoleInfo.label];
    } else if (selectedApp === 'WEB_2') {
      return ['Platform Admin', currentRoleInfo.label];
    } else {
      return ['Customer PoC', currentRoleInfo.label];
    }
  }, [viewMode, activePreviewItemId, sidebarNav, selectedApp, currentRoleInfo]);

  return (
    <Card variant="default" padding="md" className="h-[700px] flex flex-col justify-between overflow-hidden shadow-xs">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="pb-3 mb-2.5 border-b border-[#DCE3EC] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-[#17263A]">Live Preview</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EEF1F6] text-[#244A70]">
                {selectedApp}
              </span>
            </div>
            <span className="text-[11px] text-[#8491A3] font-medium">
              Interactive Shell
            </span>
          </div>

          {/* Preview Controls for Contract Type and Role */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#DCE3EC]">
            <div>
              <label className="text-[10px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1">
                Contract Type
              </label>
              <select
                value={previewContractType}
                onChange={(e) => setPreviewContractType(e.target.value)}
                className="w-full text-[11px] h-7 px-2 rounded-md border border-[#DCE3EC] bg-white text-[#17263A] focus:outline-none focus:ring-1 focus:ring-[#244A70] font-medium"
              >
                <option value="ALL">All Contracts</option>
                <option value="SELF_SERVICE">Platform-Based Modernization</option>
                <option value="WE_CONVERT_FOR_YOU">Managed Modernization Services</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1">
                Preview Role
              </label>
              <select
                value={previewRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full text-[11px] h-7 px-2 rounded-md border border-[#DCE3EC] bg-white text-[#244A70] font-bold focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              >
                {(APP_ROLES[selectedApp] || []).map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Role Scope Notice Bar */}
        <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-[#F4F7FB] border border-[#244A70]/20 flex items-center justify-between text-[10.5px] shrink-0">
          <div className="flex items-center space-x-1.5 truncate">
            <Shield className="w-3.5 h-3.5 text-[#244A70] shrink-0" />
            <span className="text-[#17263A] font-semibold truncate">
              Role: <span className="text-[#244A70]">{currentRoleInfo.label}</span>
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white text-[#244A70] border border-[#244A70]/20 shrink-0">
              {currentRoleInfo.badge}
            </span>
          </div>

          {viewMode === 'ITEM_SCREEN' && previewRole !== 'ALL' && (
            <button
              type="button"
              onClick={() => setViewMode('ROLE_SCREEN')}
              className="text-[9.5px] font-bold text-[#244A70] hover:underline flex items-center space-x-1 shrink-0 ml-2"
            >
              <span>View Role Home</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Miniature Shell Card matching actual web UI */}
        <div className="border border-[#DCE3EC] rounded-xl overflow-hidden shadow-xs bg-[#F8FAFC] flex-1 min-h-0 flex flex-col">
          <div className="flex flex-1 min-h-0">
            {/* Sidebar Preview */}
            <div
              className={`w-38 p-2 flex flex-col space-y-1 shrink-0 overflow-y-auto min-h-0 select-none ${
                selectedApp === 'WEB_1'
                  ? 'bg-white text-[#17263A] border-r border-[#DCE3EC]'
                  : 'bg-[#17263A] text-white border-r border-[#17263A]'
              }`}
            >
              {/* App Brand Header */}
              <div
                className={`flex items-center space-x-2 pb-2 mb-1 shrink-0 border-b ${
                  selectedApp === 'WEB_1' ? 'border-[#DCE3EC]' : 'border-[#17263A]'
                }`}
              >
                <img src={logo} alt="ALSM" className="h-4 w-auto object-contain" />
                <div className="flex flex-col">
                  <span
                    className={`font-extrabold text-[11px] tracking-tight leading-none ${
                      selectedApp === 'WEB_1' ? 'text-[#17263A]' : 'text-white'
                    }`}
                  >
                    ALSM
                  </span>
                  <span className="text-[8px] font-semibold opacity-60 leading-tight">
                    {selectedApp === 'WEB_3'
                      ? 'Enterprise Portal'
                      : selectedApp === 'WEB_2'
                      ? 'Platform Admin'
                      : 'PoC Customer'}
                  </span>
                </div>
              </div>

              {/* Sidebar Menu Items (interactive on click) */}
              <div className="space-y-0.5 overflow-y-auto flex-1">
                {filteredSidebarNav.length === 0 ? (
                  <div className="p-2 text-center text-[9px] text-[#94A3B8]">
                    No visible menus for this role.
                  </div>
                ) : (
                  filteredSidebarNav.map((item) => (
                    <PreviewSidebarItem
                      key={item.id}
                      item={item}
                      selectedItemId={viewMode === 'ITEM_SCREEN' ? activePreviewItemId : null}
                      onSelect={handleSidebarItemClick}
                      isLight={selectedApp === 'WEB_1'}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Page Workspace Preview Area */}
            <div className="flex-1 bg-white flex flex-col justify-start overflow-y-auto min-h-0">
              {/* Workspace Header & Breadcrumbs */}
              <div className="px-3.5 py-2 border-b border-[#DCE3EC] bg-[#F8FAFC] flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-1 text-[9.5px] text-[#8491A3] truncate">
                  {breadcrumbChain.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-[#CBD5E1]">&gt;</span>}
                      <span className={idx === breadcrumbChain.length - 1 ? 'font-bold text-[#17263A]' : 'truncate'}>
                        {crumb}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8.5px] font-bold text-slate-500">Live</span>
                </div>
              </div>

              {/* Dynamic Screen Content */}
              <div className="p-3.5 flex-1 overflow-y-auto">
                {viewMode === 'ROLE_SCREEN' || !currentActiveItem ? (
                  <RoleHomeScreen
                    app={selectedApp}
                    role={previewRole}
                    roleInfo={currentRoleInfo}
                  />
                ) : (
                  <MenuItemScreen
                    item={currentActiveItem}
                    role={previewRole}
                    app={selectedApp}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Path Bar Below Preview */}
      <div className="mt-2.5 pt-2 border-t border-[#DCE3EC] shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-[#17263A] flex items-center space-x-1">
            <DynamicIcon name="Compass" className="w-3 h-3 text-[#244A70]" />
            <span>Current Path</span>
          </span>
          <span className="text-[9.5px] text-[#8491A3]">
            Click any sidebar item to test view
          </span>
        </div>
        <div className="flex items-center flex-wrap gap-1">
          {breadcrumbChain.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-2.5 h-2.5 text-[#94A3B8]" />}
              <span className="px-2 py-0.5 text-[10px] rounded-md bg-[#EEF1F6] text-[#244A70] font-semibold border border-[#244A70]/20 truncate">
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </Card>
  );
};

/* -------------------------------------------------------------------------- */
/* Dynamic Screen Renderers Based on Selected Role                           */
/* -------------------------------------------------------------------------- */

const RoleHomeScreen: React.FC<{
  app: 'WEB_1' | 'WEB_2' | 'WEB_3';
  role: string;
  roleInfo: RoleOption;
}> = ({ app, role, roleInfo }) => {
  // WEB_3 Roles
  if (app === 'WEB_3') {
    if (role === 'ORGANIZATION_OWNER') {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#17263A] leading-tight">Enterprise Organization Governance</h3>
              <p className="text-[9.5px] text-[#8491A3] mt-0.5">Acme Enterprise Corp • Hybrid Conversion SLA (24/7)</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8.5px] font-bold">
              Active MSA
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
              <span className="text-[8px] uppercase font-bold text-[#64748B] block">Projects</span>
              <span className="text-sm font-bold text-[#17263A]">4 Active</span>
            </div>
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
              <span className="text-[8px] uppercase font-bold text-[#64748B] block">Quota Used</span>
              <span className="text-sm font-bold text-[#244A70]">71%</span>
            </div>
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
              <span className="text-[8px] uppercase font-bold text-[#64748B] block">Team Members</span>
              <span className="text-sm font-bold text-[#17263A]">14 Staff</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border border-[#DCE3EC] bg-white space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#17263A]">
              <span>Active Modernization Portfolios</span>
              <span className="text-[8.5px] font-semibold text-[#244A70] hover:underline cursor-pointer">View All</span>
            </div>
            <div className="space-y-1.5 text-[9px]">
              <div className="flex items-center justify-between p-1.5 rounded bg-[#F8FAFC] border border-[#E8EDF4]">
                <div className="truncate font-semibold text-[#17263A]">Core Banking Batch (COBOL)</div>
                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 text-[8px] font-bold">In Review</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-[#F8FAFC] border border-[#E8EDF4]">
                <div className="truncate font-semibold text-[#17263A]">Loan Origination UI (RPG)</div>
                <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[8px] font-bold">AST Active</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (role === 'PROJECT_MANAGER') {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#17263A] leading-tight">Project Management & Deliverables</h3>
              <p className="text-[9.5px] text-[#8491A3] mt-0.5">SOW-2026-0881 • Wave 2 Modernization</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[8.5px] font-bold">
              Sprint 4
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
              <span className="text-[8px] uppercase font-bold text-[#64748B] block">Milestones</span>
              <span className="text-sm font-bold text-emerald-600">8/10 Done</span>
            </div>
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
              <span className="text-[8px] uppercase font-bold text-[#64748B] block">Queue Jobs</span>
              <span className="text-sm font-bold text-[#17263A]">12 Items</span>
            </div>
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
              <span className="text-[8px] uppercase font-bold text-[#64748B] block">Quality Sign-offs</span>
              <span className="text-sm font-bold text-amber-600">2 Pending</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[#F4F7FB] border border-[#244A70]/20 space-y-1.5">
            <span className="text-[9.5px] font-bold text-[#244A70] block">Milestone Progress</span>
            <div className="space-y-1 text-[8.5px]">
              <div className="flex justify-between font-medium text-[#17263A]">
                <span>Phase 1: Batch Services</span>
                <span>100%</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-full" />
              </div>
              <div className="flex justify-between font-medium text-[#17263A] mt-1">
                <span>Phase 2: Online Screens</span>
                <span>85%</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#244A70] h-full w-[85%]" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (role === 'DEVELOPER') {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#17263A] leading-tight">Modernization Studio & AST Engine</h3>
              <p className="text-[9.5px] text-[#8491A3] mt-0.5">Target: Spring Boot 3 + React 19 + TypeScript</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[8.5px] font-bold">
              AST v3.4
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-[#DCE3EC] bg-[#17263A] text-slate-100 font-mono text-[8.5px] space-y-1">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-700 pb-1 text-[8px]">
              <span>CSUTLDTC.cbl → CsutldtcScreen.tsx</span>
              <span className="text-emerald-400">0 Errors</span>
            </div>
            <div className="text-slate-400">// Modernized React 19 AST emission</div>
            <div className="text-blue-300">export const <span className="text-amber-300">CsutldtcScreen</span> = () =&gt; &#123;</div>
            <div className="pl-2 text-slate-300">const &#123; formState &#125; = useFormState();</div>
            <div className="pl-2 text-emerald-300">&lt;ModernGrid columns=&#123;12&#125; /&gt;</div>
            <div className="text-blue-300">&#125;;</div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
              <span className="font-bold block">48/48 Assertions</span>
              <span className="text-[8px] text-emerald-600">Vitest Test Suite Passed</span>
            </div>
            <div className="p-2 rounded bg-blue-50 border border-blue-200 text-blue-800">
              <span className="font-bold block">98.6% Fidelity</span>
              <span className="text-[8px] text-blue-600">AST Coordinate Match</span>
            </div>
          </div>
        </div>
      );
    }

    if (role === 'VIEWER') {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#17263A] leading-tight">Deliverables & Reports (Read-Only)</h3>
              <p className="text-[9.5px] text-[#8491A3] mt-0.5">Verification and Download Center</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[8.5px] font-bold">
              Read-Only
            </span>
          </div>

          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[9px] flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>You have read-only permissions. You can inspect and download approved artifacts.</span>
          </div>

          <div className="space-y-1.5 text-[9px]">
            <div className="p-2 rounded-lg border border-[#DCE3EC] bg-white flex items-center justify-between">
              <div className="truncate">
                <span className="font-semibold text-[#17263A] block">modernized-frontend-bundle-v2.1.zip</span>
                <span className="text-[8px] text-slate-500">18.4 MB • Verified Package</span>
              </div>
              <button type="button" className="px-2 py-0.5 rounded bg-[#244A70] text-white text-[8px] font-bold">
                Download
              </button>
            </div>
            <div className="p-2 rounded-lg border border-[#DCE3EC] bg-white flex items-center justify-between">
              <div className="truncate">
                <span className="font-semibold text-[#17263A] block">spring-boot-backend-v1.4.jar</span>
                <span className="text-[8px] text-slate-500">32.1 MB • Production Build</span>
              </div>
              <button type="button" className="px-2 py-0.5 rounded bg-[#244A70] text-white text-[8px] font-bold">
                Download
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // WEB_2 Roles (Internal Staff)
  if (app === 'WEB_2') {
    if (role === 'SYSTEM_ADMIN') {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#17263A] leading-tight">Platform Administration Console</h3>
              <p className="text-[9.5px] text-[#8491A3] mt-0.5">Global Cluster: 99.98% Uptime • Healthy</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8.5px] font-bold">
              Cluster OK
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
              <span className="text-[8px] uppercase font-bold text-[#64748B] block">Revenue</span>
              <span className="text-sm font-bold text-[#17263A]">$248.5K</span>
            </div>
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
              <span className="text-[8px] uppercase font-bold text-[#64748B] block">Enterprises</span>
              <span className="text-sm font-bold text-[#244A70]">24 Orgs</span>
            </div>
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
              <span className="text-[8px] uppercase font-bold text-[#64748B] block">Temp Roles</span>
              <span className="text-sm font-bold text-amber-600">2 Active</span>
            </div>
          </div>

          <div className="p-2 rounded-lg border border-[#DCE3EC] bg-white space-y-1.5 text-[9px]">
            <span className="font-bold text-[#17263A] block">Recent Platform Audits</span>
            <div className="space-y-1 text-slate-600 text-[8.5px]">
              <div>• RBAC catalogue updated with 12 new granular permissions</div>
              <div>• Customer Acme Corp extended Enterprise Hybrid MSA</div>
              <div>• Automated backup executed on MongoDB Atlas cluster</div>
            </div>
          </div>
        </div>
      );
    }

    if (role === 'TEAM_LEAD') {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#17263A] leading-tight">Team Operations & Workload</h3>
              <p className="text-[9.5px] text-[#8491A3] mt-0.5">8 Modernization Engineers Online</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[8.5px] font-bold">
              Team Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
              <span className="text-[8px] uppercase font-bold text-[#64748B] block">Queue Throughput</span>
              <span className="text-sm font-bold text-emerald-600">184/day</span>
            </div>
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
              <span className="text-[8px] uppercase font-bold text-[#64748B] block">Offboarding</span>
              <span className="text-sm font-bold text-amber-600">1 Pending</span>
            </div>
          </div>

          <div className="p-2 rounded-lg border border-[#DCE3EC] bg-white space-y-1.5 text-[9px]">
            <span className="font-bold text-[#17263A] block">Staff Workload Distribution</span>
            <div className="space-y-1 text-[8.5px]">
              <div className="flex justify-between">
                <span>David T. (Lead Dev)</span>
                <span className="font-bold text-amber-600">90% Capacity</span>
              </div>
              <div className="flex justify-between">
                <span>Sarah N. (AST Eng)</span>
                <span className="font-bold text-blue-600">70% Capacity</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (role === 'SALES_MANAGER') {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#17263A] leading-tight">Commercial CRM & Pipeline</h3>
              <p className="text-[9.5px] text-[#8491A3] mt-0.5">$1.42M Weighted Pipeline</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8.5px] font-bold">
              68% Win Rate
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#F4F7FB] border border-[#244A70]/20 space-y-1.5">
            <div className="flex items-center justify-between text-[9.5px] font-bold text-[#244A70]">
              <span>Discount Approvals Queue</span>
              <span>3 Requests</span>
            </div>
            <div className="space-y-1 text-[8.5px] bg-white p-2 rounded border border-[#DCE3EC]">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#17263A]">MegaBank Global (15%)</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">Under Limit</span>
              </div>
              <p className="text-slate-500 text-[8px]">Requested by Sales Rep • Within Manager Authority</p>
            </div>
          </div>
        </div>
      );
    }

    if (role === 'CONVERSION_STAFF') {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#17263A] leading-tight">Conversion Processing Queue</h3>
              <p className="text-[9.5px] text-[#8491A3] mt-0.5">AST Workers: 3 Active • 14 In Queue</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[8.5px] font-bold">
              Workers Active
            </span>
          </div>

          <div className="space-y-1.5 text-[9px]">
            <div className="p-2 rounded-lg border border-[#DCE3EC] bg-white flex items-center justify-between">
              <div>
                <span className="font-bold text-[#17263A] block">JOB-9921 • ACCT_BAL.cbl</span>
                <span className="text-[8px] text-slate-500">AST Field Synthesis 92%</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[8px] font-bold">Running</span>
            </div>
            <div className="p-2 rounded-lg border border-[#DCE3EC] bg-white flex items-center justify-between">
              <div>
                <span className="font-bold text-[#17263A] block">JOB-9922 • TRAN_HIST.rpg</span>
                <span className="text-[8px] text-slate-500">Quality Score Validation</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[8px] font-bold">Review</span>
            </div>
          </div>
        </div>
      );
    }

    if (role === 'INTERNAL_SUPPORT') {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#17263A] leading-tight">Support Hub & Troubleshooting</h3>
              <p className="text-[9.5px] text-[#8491A3] mt-0.5">Tier 2 Customer Diagnostics</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[8.5px] font-bold">
              Support Active
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC] space-y-1 text-[9px]">
            <span className="font-bold text-[#17263A] block">Active Troubleshooting Session</span>
            <div className="p-1.5 bg-white rounded border border-[#CBD5E1] text-[8.5px]">
              <div className="font-bold text-rose-700">Acme Corp: Nested EVALUATE Parser Warning</div>
              <p className="text-slate-500 text-[8px] mt-0.5">AST patch pending simulation test before production sync.</p>
            </div>
          </div>
        </div>
      );
    }
  }

  // WEB_1 Roles (Customer PoC Portal)
  if (app === 'WEB_1') {
    if (role === 'DEVELOPER') {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#17263A] leading-tight">Platform-Based Modernization Studio</h3>
              <p className="text-[9.5px] text-[#8491A3] mt-0.5">Single-screen instant converter</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[8.5px] font-bold">
              PoC Dev
            </span>
          </div>

          <div className="p-3 border-2 border-dashed border-[#244A70]/40 rounded-xl bg-[#F4F7FB]/40 text-center space-y-1">
            <span className="text-[9.5px] font-bold text-[#244A70] block">Drop legacy screen (.cbl, .rpg, .bms)</span>
            <span className="text-[8px] text-slate-500 block">Or select from sample library</span>
            <button type="button" className="px-2.5 py-1 rounded bg-[#244A70] text-white text-[8.5px] font-bold mt-1 shadow-xs">
              Convert Screen Now
            </button>
          </div>
        </div>
      );
    }

    if (role === 'VIEWER') {
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#17263A] leading-tight">PoC Modernization Results</h3>
              <p className="text-[9.5px] text-[#8491A3] mt-0.5">Evaluation & Code Inspection</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8.5px] font-bold">
              99.1% Quality
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-[#DCE3EC] bg-white space-y-1.5 text-[9px]">
            <div className="flex items-center justify-between font-bold text-[#17263A]">
              <span>SampleScreen_Demo.cbl</span>
              <span className="text-emerald-600 font-bold">Success</span>
            </div>
            <div className="text-[8px] text-slate-500">Source: 420 Lines • Generated React: 180 Lines</div>
          </div>
        </div>
      );
    }

    // Default WEB_1 Owner
    return (
      <div className="space-y-3">
        <div className="bg-white border border-[#DCE3EC] rounded-xl p-2.5 mb-2 shadow-2xs">
          <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#EEF1F6] text-[#244A70] mb-1">
            • ALSM Customer PoC Workspace
          </span>
          <h4 className="text-[11px] font-bold text-[#17263A] leading-tight">
            Automating Legacy System Modernization
          </h4>
          <p className="text-[8.5px] text-[#64748B] mt-0.5">
            Trial Quota: 18/25 screens consumed. Upgrade to Enterprise for unlimited AST pipelines.
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-[#244A70] text-white text-[8.5px] font-bold">
              + Create Project
            </span>
            <span className="px-2 py-0.5 rounded border border-[#CBD5E1] bg-white text-[#334155] text-[8.5px] font-medium">
              Upload Screen
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[9px]">
          <div className="bg-white border border-[#DCE3EC] rounded-lg p-2">
            <span className="text-[8px] font-bold text-[#64748B] uppercase">Active Projects</span>
            <div className="text-sm font-bold text-[#17263A] mt-0.5">2</div>
          </div>
          <div className="bg-white border border-[#DCE3EC] rounded-lg p-2">
            <span className="text-[8px] font-bold text-[#64748B] uppercase">Success Rate</span>
            <div className="text-sm font-bold text-emerald-600 mt-0.5">99.4%</div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback Overview Screen
  return (
    <div className="space-y-3 text-[9.5px]">
      <h3 className="text-xs font-bold text-[#17263A]">{roleInfo.homeTitle || roleInfo.label}</h3>
      <p className="text-slate-500">{roleInfo.tagline}</p>
      <div className="p-3 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl space-y-1">
        <span className="font-bold text-[#17263A] block">Navigation Scope</span>
        <span className="text-slate-600 text-[8.5px]">
          All permissible modules and actions for this role are visible in the miniature sidebar. Click any item to preview its screen.
        </span>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Dynamic Screen Renderers Based on Selected Menu Item                      */
/* -------------------------------------------------------------------------- */

const MenuItemScreen: React.FC<{
  item: MenuItem;
  role: string;
  app: 'WEB_1' | 'WEB_2' | 'WEB_3';
}> = ({ item, role, app: _app }) => {
  const path = (item.path || '').toLowerCase();
  const label = (item.label || '').toLowerCase();

  // 1. Projects Screen
  if (path.includes('project') || label.includes('project')) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[#17263A]">{item.label}</h3>
            <p className="text-[8.5px] text-[#8491A3]">Enterprise modernization portfolios and active AST conversions</p>
          </div>
          {role !== 'VIEWER' && (
            <span className="px-2 py-0.5 rounded bg-[#244A70] text-white text-[8px] font-bold flex items-center space-x-1 shadow-2xs">
              <Plus className="w-2.5 h-2.5" />
              <span>New Project</span>
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-[9px]">
          <div className="p-2 rounded-lg border border-[#DCE3EC] bg-white flex items-center justify-between shadow-2xs">
            <div className="truncate pr-2">
              <div className="font-bold text-[#17263A] truncate">Core Banking Ledger</div>
              <span className="text-[8px] text-slate-500">COBOL → Spring Boot 3 + React 19</span>
            </div>
            <div className="text-right shrink-0">
              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[8px] font-bold">94% Done</span>
            </div>
          </div>

          <div className="p-2 rounded-lg border border-[#DCE3EC] bg-white flex items-center justify-between shadow-2xs">
            <div className="truncate pr-2">
              <div className="font-bold text-[#17263A] truncate">Loan Origination UI</div>
              <span className="text-[8px] text-slate-500">RPG IV → React 19 NextGen</span>
            </div>
            <div className="text-right shrink-0">
              <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[8px] font-bold">78% In Progress</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Members / Users Screen
  if (path.includes('member') || path.includes('user') || label.includes('member') || label.includes('team')) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[#17263A]">{item.label}</h3>
            <p className="text-[8.5px] text-[#8491A3]">Team members and assigned RBAC roles</p>
          </div>
          {role === 'ORGANIZATION_OWNER' && (
            <span className="px-2 py-0.5 rounded bg-[#244A70] text-white text-[8px] font-bold">
              + Invite
            </span>
          )}
        </div>

        <div className="space-y-1 text-[9px] border border-[#DCE3EC] rounded-lg p-2 bg-white">
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <div className="flex items-center space-x-1.5">
              <div className="w-5 h-5 rounded-full bg-[#EEF1F6] text-[#244A70] font-bold text-[8px] flex items-center justify-center">
                AL
              </div>
              <div>
                <span className="font-bold text-[#17263A] block">Alex Lee</span>
                <span className="text-[7.5px] text-slate-500">alex@acme.com</span>
              </div>
            </div>
            <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[8px] font-bold">
              Owner
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center space-x-1.5">
              <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[8px] flex items-center justify-center">
                VN
              </div>
              <div>
                <span className="font-bold text-[#17263A] block">Vu Nguyen</span>
                <span className="text-[7.5px] text-slate-500">vu@acme.com</span>
              </div>
            </div>
            <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[8px] font-bold">
              Developer
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Roles & Permissions Screen
  if (path.includes('role') || path.includes('permission') || label.includes('role')) {
    return (
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-[#17263A]">{item.label}</h3>
        <p className="text-[8.5px] text-[#8491A3]">RBAC permission policies and access control tiers</p>

        <div className="p-2 border border-[#DCE3EC] rounded-lg bg-white space-y-1.5 text-[8.5px]">
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="font-bold text-[#17263A]">projects.create</span>
            <span className="text-emerald-600 font-bold">Owner, PM</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="font-bold text-[#17263A]">conversion.execute</span>
            <span className="text-emerald-600 font-bold">Owner, Dev</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="font-bold text-[#17263A]">deliverables.download</span>
            <span className="text-emerald-600 font-bold">All Roles</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. Downloads / Deliverables Screen
  if (path.includes('download') || path.includes('deliverable') || label.includes('download')) {
    return (
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-[#17263A]">{item.label}</h3>
        <p className="text-[8.5px] text-[#8491A3]">Modernization exports and compiled bundles</p>

        <div className="space-y-1.5 text-[9px]">
          <div className="p-2 border border-[#DCE3EC] rounded-lg bg-white flex items-center justify-between">
            <div>
              <span className="font-bold text-[#17263A] block">react-components-bundle.zip</span>
              <span className="text-[8px] text-slate-500">14.2 MB • Ready</span>
            </div>
            <button type="button" className="px-2 py-0.5 rounded bg-[#244A70] text-white text-[8px] font-bold">
              Download
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Diagnostics Screen
  if (path.includes('diagnostic') || label.includes('diagnostic') || path.includes('log')) {
    return (
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-[#17263A]">{item.label}</h3>
        <div className="p-2 rounded bg-[#17263A] text-slate-200 font-mono text-[8px] space-y-1">
          <div className="text-emerald-400">[OK] AST Core Engine 3.4 Operational</div>
          <div className="text-blue-400">[INFO] MongoDB cluster connectivity verified</div>
          <div className="text-slate-400">[INFO] Ready for next conversion batch</div>
        </div>
      </div>
    );
  }

  // Default Page Preview with Authentic Form & Layout
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div>
          <h3 className="text-xs font-bold text-[#17263A]">{item.label}</h3>
          <p className="text-[8.5px] text-slate-500 font-mono mt-0.5">{item.path || '/overview'}</p>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#EEF1F6] text-[#244A70] text-[8.5px] font-bold">
          Active Page
        </span>
      </div>

      <div className="space-y-2">
        <div className="p-2.5 rounded-lg border border-[#DCE3EC] bg-[#F8FAFC] space-y-1.5">
          <span className="text-[9px] font-bold text-[#17263A] block">{item.label} Configuration</span>
          <p className="text-[8.5px] text-slate-600">
            {item.description || 'Custom configured navigation module consuming single source of truth.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[8.5px]">
          <div className="p-2 rounded border border-[#DCE3EC] bg-white">
            <span className="text-slate-500 block">Required Permissions</span>
            <span className="font-bold text-[#17263A]">
              {(item.permissions || []).length > 0 ? item.permissions?.join(', ') : 'None (Public)'}
            </span>
          </div>
          <div className="p-2 rounded border border-[#DCE3EC] bg-white">
            <span className="text-slate-500 block">Visibility Mode</span>
            <span className="font-bold text-[#244A70]">{item.contractTypeVisibility || 'ALL'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePreviewPanel;
