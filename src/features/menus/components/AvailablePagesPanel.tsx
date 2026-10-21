import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Card, Input, Select } from '@/shared/ui';
import { DynamicIcon } from '@/components/Sidebar/IconResolver';

export interface AvailablePage {
  id: string;
  label: string;
  module: string;
  icon: string;
  path: string;
}

const AVAILABLE_PAGES_LIBRARY: AvailablePage[] = [
  { id: 'page-dashboard', label: 'Staff Dashboard', module: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
  { id: 'page-queue', label: 'Conversion Queue', module: 'Conversions', icon: 'Layers', path: '/queue' },
  { id: 'page-review', label: 'Quality Review', module: 'Conversions', icon: 'FileCheck', path: '/review' },
  { id: 'page-leads', label: 'Lead Management (CRM)', module: 'Sales & CRM', icon: 'Users', path: '/sales/leads' },
  { id: 'page-pipeline', label: 'Sales Pipeline Kanban', module: 'Sales & CRM', icon: 'TrendingUp', path: '/sales/pipeline' },
  { id: 'page-sales-reports', label: 'Sales Reports & Analytics', module: 'Sales & CRM', icon: 'BarChart3', path: '/sales/reports' },
  { id: 'page-discounts', label: 'Discount Approvals', module: 'Sales & CRM', icon: 'DollarSign', path: '/sales/discounts' },
  { id: 'page-orgs', label: 'Organisations Directory', module: 'Administration', icon: 'Building', path: '/admin/organizations' },
  { id: 'page-revenue', label: 'Total Platform Revenue', module: 'Commercial', icon: 'DollarSign', path: '/admin/revenue' },
  { id: 'page-audit-logs', label: 'Platform Audit Trail', module: 'Administration', icon: 'FileSearch', path: '/admin/audit-logs' },
  { id: 'page-temp-roles', label: 'Temporary Role Elevations', module: 'Administration', icon: 'Clock', path: '/admin/temporary-roles' },
  { id: 'page-team-perf', label: 'Team Performance', module: 'Operations', icon: 'BarChart3', path: '/team-performance' },
  { id: 'page-meetings', label: 'Online Meetings', module: 'Operations', icon: 'Video', path: '/enterprise/meetings' },
  { id: 'page-meeting-create', label: 'Create Meeting Room', module: 'Operations', icon: 'Video', path: '/enterprise/meetings/create' },
  { id: 'page-quotes', label: 'Enterprise Quotes', module: 'Commercial', icon: 'Zap', path: '/admin/billing/quotes' },
  { id: 'page-admin-projects', label: 'Admin Projects (Assignments)', module: 'Administration', icon: 'FolderKanban', path: '/admin/projects' },
  { id: 'page-engagement-types', label: 'Engagement Types & Plans', module: 'Administration', icon: 'Layers', path: '/admin/engagement-types' },
  { id: 'page-menu-builder', label: 'Menu Builder', module: 'Administration', icon: 'ListTree', path: '/admin/menu-builder' },
  { id: 'page-roles', label: 'Roles & Permissions', module: 'Administration', icon: 'ShieldCheck', path: '/admin/roles' },
  { id: 'page-users', label: 'User Assignments', module: 'Administration', icon: 'Users', path: '/admin/users' },
  { id: 'page-diagnostics', label: 'System Diagnostics', module: 'Operations', icon: 'Activity', path: '/diagnostics' },
  { id: 'page-partner-list', label: 'Partner Directory', module: 'Partners', icon: 'Building', path: '/partners' },
  { id: 'page-partner-new', label: 'Register Partner', module: 'Partners', icon: 'Users', path: '/partners/new' },
  { id: 'page-partner-projects-new', label: 'New Partner Project', module: 'Partners', icon: 'FolderKanban', path: '/partners/projects/new' },
  { id: 'page-partner-portal-dash', label: 'Partner Dashboard (Portal)', module: 'Partner Portal', icon: 'LayoutDashboard', path: '/portal/dashboard' },
  { id: 'page-partner-portal-projects', label: 'My Projects (Portal)', module: 'Partner Portal', icon: 'FolderKanban', path: '/portal/projects' },
  { id: 'page-partner-portal-downloads', label: 'Downloads (Portal)', module: 'Partner Portal', icon: 'Zap', path: '/portal/downloads' },
];

const MODULE_OPTIONS = [
  { value: 'ALL', label: 'All Modules' },
  { value: 'Dashboard', label: 'Dashboard' },
  { value: 'Conversions', label: 'Conversions' },
  { value: 'Partners', label: 'Partners' },
  { value: 'Partner Portal', label: 'Partner Portal' },
  { value: 'Sales & CRM', label: 'Sales & CRM' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Administration', label: 'Administration' },
];

export interface AvailablePagesPanelProps {
  onAddPageToMenu: (page: AvailablePage) => void;
}

export const AvailablePagesPanel: React.FC<AvailablePagesPanelProps> = ({ onAddPageToMenu }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');

  const filteredPages = AVAILABLE_PAGES_LIBRARY.filter((page) => {
    const matchesSearch =
      page.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.module.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesModule = selectedModule === 'ALL' || page.module === selectedModule;

    return matchesSearch && matchesModule;
  });

  return (
    <Card variant="default" padding="md" className="h-[640px] flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="pb-3 mb-3 border-b border-[#E5EAF0]">
          <h2 className="text-base font-bold text-[#091E42]">Available Pages</h2>
          <p className="text-xs text-[#6B778C] mt-0.5">Select a page to add to the menu.</p>
        </div>

        {/* Filter & Search Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          <div className="sm:col-span-2 relative">
            <Input
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs py-1.5"
            />
            <Search className="w-3.5 h-3.5 text-[#6B778C] absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          <div>
            <Select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              options={MODULE_OPTIONS}
              className="text-xs py-1.5"
            />
          </div>
        </div>

        {/* Pages Library List */}
        <div className="overflow-y-auto max-h-[460px] pr-1 space-y-1.5">
          {filteredPages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-[#E5EAF0] bg-white hover:border-[#0652CC]/50 hover:bg-[#F7F9FC] transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-[#F7F9FC] border border-[#E5EAF0] flex items-center justify-center text-[#0652CC] group-hover:bg-[#E8F1FF]">
                  <DynamicIcon name={page.icon} className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#091E42] group-hover:text-[#0652CC]">
                    {page.label}
                  </h4>
                  <span className="text-[10px] text-[#6B778C]">{page.module}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onAddPageToMenu(page)}
                className="w-7 h-7 rounded-lg bg-[#0652CC] hover:bg-[#0655FF] text-white flex items-center justify-center transition-colors shadow-xs"
                title={`Add ${page.label} to menu structure`}
              >
                <Plus className="w-4 h-4 font-bold" />
              </button>
            </div>
          ))}

          {filteredPages.length === 0 && (
            <div className="p-6 text-center text-xs text-[#6B778C]">
              No available pages match your filter criteria.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AvailablePagesPanel;
