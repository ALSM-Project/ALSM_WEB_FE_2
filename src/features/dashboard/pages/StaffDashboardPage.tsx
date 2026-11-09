import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/shared/ui';
import {
  ShieldAlert,
  Users,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PlatformAdminOverview } from '../components/PlatformAdminOverview';
import { TeamLeadOverview } from '../components/TeamLeadOverview';
import { ConversionStaffOverview } from '../components/ConversionStaffOverview';
import { SalesOverview } from '../components/SalesOverview';

export type DashboardRoleView = 'ADMIN' | 'TEAM_LEAD' | 'STAFF' | 'SALES';

export const StaffDashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Detect user's primary dashboard view based on their role
  const detectedRole = useMemo<DashboardRoleView>(() => {
    if (!user) return 'ADMIN';
    if (user.isPlatformAdmin) return 'ADMIN';

    const userRoles = (user.roles || []).map((r) => String(r).toUpperCase());

    if (userRoles.some((r) => r === 'ADMIN' || r === 'SYSTEM_ADMIN')) {
      return 'ADMIN';
    }
    if (userRoles.includes('TEAM_LEAD')) {
      return 'TEAM_LEAD';
    }
    if (userRoles.some((r) => r.includes('SALES'))) {
      return 'SALES';
    }
    if (userRoles.includes('CONVERSION_STAFF') || userRoles.includes('STAFF')) {
      return 'STAFF';
    }
    return 'ADMIN';
  }, [user]);

  const [activeTab, setActiveTab] = useState<DashboardRoleView>(detectedRole);

  // Sync activeTab if detectedRole updates
  useEffect(() => {
    setActiveTab(detectedRole);
  }, [detectedRole]);

  const isUserAdmin = Boolean(
    user?.isPlatformAdmin ||
      user?.roles?.some((r) => ['ADMIN', 'SYSTEM_ADMIN'].includes(String(r).toUpperCase()))
  );

  // Header content by active view
  const headerInfo = useMemo(() => {
    switch (activeTab) {
      case 'ADMIN':
        return {
          title: 'Platform Overview',
                  };
      case 'TEAM_LEAD':
        return {
          title: 'Team Overview',
                  };
      case 'STAFF':
        return {
          title: 'My Workspace',
                  };
      case 'SALES':
        return {
          title: 'Sales Overview',
                  };
    }
  }, [activeTab]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Top Header & Role Switcher for Admin ───────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <PageHeader title={headerInfo.title} />

        {/* View Switcher: Only Admins can switch between all 4 role perspectives */}
        {isUserAdmin && (
          <div className="inline-flex items-center p-1 rounded-md bg-white border border-[#DCE3EC] shadow-xs self-start lg:self-center shrink-0">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-2.5 hidden sm:inline">
              View As:
            </span>

            <button
              type="button"
              onClick={() => setActiveTab('ADMIN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ADMIN'
                  ? 'bg-[#244A70] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-[#17263A] hover:bg-[#EEF1F6]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TEAM_LEAD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'TEAM_LEAD'
                  ? 'bg-[#244A70] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-[#17263A] hover:bg-[#EEF1F6]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team Lead</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('STAFF')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'STAFF'
                  ? 'bg-[#244A70] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-[#17263A] hover:bg-[#EEF1F6]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Staff</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SALES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'SALES'
                  ? 'bg-[#244A70] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-[#17263A] hover:bg-[#EEF1F6]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Sales</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Active Role View Component ───────────────────────────────── */}
      <div className="pt-0">
        {activeTab === 'ADMIN' && <PlatformAdminOverview />}
        {activeTab === 'TEAM_LEAD' && <TeamLeadOverview />}
        {activeTab === 'STAFF' && <ConversionStaffOverview />}
        {activeTab === 'SALES' && <SalesOverview />}
      </div>
    </div>
  );
};

export default StaffDashboardPage;
