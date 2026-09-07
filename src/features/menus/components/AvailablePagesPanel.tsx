import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Card, Input, Select } from '@/shared/ui';
import { DynamicIcon } from '@/components/Sidebar/IconResolver';
import { MenuItem } from '../types/menu';

export interface AvailablePage {
  id: string;
  label: string;
  module: string;
  icon: string;
  path: string;
}

const AVAILABLE_PAGES_LIBRARY: AvailablePage[] = [
  { id: 'page-dashboard', label: 'Dashboard', module: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
  { id: 'page-users', label: 'Users', module: 'User Management', icon: 'User', path: '/users' },
  { id: 'page-roles', label: 'Roles', module: 'User Management', icon: 'Shield', path: '/roles' },
  { id: 'page-permissions', label: 'Permissions', module: 'User Management', icon: 'Lock', path: '/permissions' },
  { id: 'page-departments', label: 'Departments', module: 'Organization', icon: 'GitFork', path: '/organisations/departments' },
  { id: 'page-teams', label: 'Teams', module: 'Organization', icon: 'Users', path: '/organisations/teams' },
  { id: 'page-positions', label: 'Positions', module: 'Organization', icon: 'Briefcase', path: '/organisations/positions' },
  { id: 'page-plans', label: 'Plans', module: 'Subscription', icon: 'CreditCard', path: '/billing/pricing' },
  { id: 'page-invoices', label: 'Invoices', module: 'Subscription', icon: 'Receipt', path: '/billing/history' },
  { id: 'page-transactions', label: 'Transactions', module: 'Subscription', icon: 'ArrowLeftRight', path: '/billing/transactions' },
  { id: 'page-reports', label: 'Reports', module: 'CRM & Sales', icon: 'BarChart3', path: '/reports' },
  { id: 'page-settings', label: 'Settings', module: 'Settings', icon: 'Settings', path: '/account/security/password' },
];

const MODULE_OPTIONS = [
  { value: 'ALL', label: 'All Modules' },
  { value: 'Dashboard', label: 'Dashboard' },
  { value: 'User Management', label: 'User Management' },
  { value: 'Organization', label: 'Organization' },
  { value: 'Subscription', label: 'Subscription' },
  { value: 'CRM & Sales', label: 'CRM & Sales' },
  { value: 'Settings', label: 'Settings' },
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
