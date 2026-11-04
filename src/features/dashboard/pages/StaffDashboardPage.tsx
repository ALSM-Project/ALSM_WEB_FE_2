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
          title: 'Platform Admin — System Overview',
          subtitle: 'Giám sát toàn hệ thống: Tổ chức, dự án, tiến độ chuyển đổi, nhật ký audit và trạng thái vận hành.',
        };
      case 'TEAM_LEAD':
        return {
          title: 'Team Lead — Team Overview',
          subtitle: 'Quản lý trong phạm vi team: Phân bổ công việc, tiến độ nhân viên, và xử lý các dự án cần hỗ trợ.',
        };
      case 'STAFF':
        return {
          title: 'Conversion Staff — My Workspace',
          subtitle: 'Không gian cá nhân: Danh sách dự án được giao, tiến độ conversion, và truy cập nhanh vào Web 1 Workspace.',
        };
      case 'SALES':
        return {
          title: 'Sales / Sales Manager — Sales Overview',
          subtitle: 'CRM & Bán hàng: Phễu bán hàng, báo cáo doanh thu, duyệt chiết khấu hợp đồng và lịch chăm sóc khách hàng.',
        };
    }
  }, [activeTab]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top Header & Role Switcher for Admin ───────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <PageHeader title={headerInfo.title} subtitle={headerInfo.subtitle} />

        {/* View Switcher: Only Admins can switch between all 4 role perspectives */}
        {isUserAdmin && (
          <div className="inline-flex items-center p-1 rounded-md bg-[#F1F5F9] border border-[#CBD5E1] self-start lg:self-center shrink-0">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-2 hidden sm:inline">
              Xem theo vai trò:
            </span>

            <button
              type="button"
              onClick={() => setActiveTab('ADMIN')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ADMIN'
                  ? 'bg-white text-[#0652CC] shadow-xs font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TEAM_LEAD')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'TEAM_LEAD'
                  ? 'bg-white text-[#0652CC] shadow-xs font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team Lead</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('STAFF')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'STAFF'
                  ? 'bg-white text-[#0652CC] shadow-xs font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Staff</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SALES')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'SALES'
                  ? 'bg-white text-[#0652CC] shadow-xs font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Sales</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Active Role View Component ───────────────────────────────── */}
      <div className="pt-1">
        {activeTab === 'ADMIN' && <PlatformAdminOverview />}
        {activeTab === 'TEAM_LEAD' && <TeamLeadOverview />}
        {activeTab === 'STAFF' && <ConversionStaffOverview />}
        {activeTab === 'SALES' && <SalesOverview />}
      </div>
    </div>
  );
};

export default StaffDashboardPage;
