import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  FolderKanban,
  Users,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Activity,
  ArrowRight,
  ShieldAlert,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { Card, Button } from '@/shared/ui';
import { adminApi } from '@/features/admin/api/admin.api';
import { partnersApi } from '@/features/partners/api/partners.api';
import { quoteApi } from '@/features/billing/api/quote.api';

export const PlatformAdminOverview: React.FC = () => {
  const navigate = useNavigate();

  // 1. Fetch Organizations
  const { data: orgs = [], isLoading: loadingOrgs, refetch: refetchOrgs } = useQuery({
    queryKey: ['admin', 'dashboard', 'orgs'],
    queryFn: adminApi.getOrganizations,
    staleTime: 30000,
  });

  // 2. Fetch Projects & Engagements
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['admin', 'dashboard', 'projects'],
    queryFn: partnersApi.getProjects,
    staleTime: 30000,
  });

  const { data: engagementTypes = [] } = useQuery({
    queryKey: ['admin', 'dashboard', 'engagement-types'],
    queryFn: adminApi.getEngagementTypes,
    staleTime: 60000,
  });

  // 3. Fetch Audit Logs
  const { data: auditLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['admin', 'dashboard', 'audit-logs'],
    queryFn: () => adminApi.getAuditLogs({ limit: 6 }),
    staleTime: 15000,
  });

  // 4. Fetch Pending Enterprise Quotes
  const { data: quoteData } = useQuery({
    queryKey: ['billing', 'quote-requests-dashboard'],
    queryFn: () => quoteApi.listQuoteRequests({ status: 'PENDING' }),
    staleTime: 15000,
  });

  const pendingQuotes = quoteData?.items || [];

  // Metrics Calculation
  const totalOrgs = orgs.length;
  const enterpriseOrgs = orgs.filter((o) => o.type === 'ENTERPRISE' || o.status === 'ACTIVE').length;
  const totalProjects = projects.length;
  const inProgressProjects = projects.filter((p) => p.status === 'IN_PROGRESS').length;
  const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;
  const unallocatedProjects = projects.filter((p) => !p.assignedTeamLeadId).length;

  // Conversion items stats across projects
  const totalItems = projects.reduce((acc, p) => acc + (p.totalItemsCount || 0), 0);
  const convertedItems = projects.reduce((acc, p) => acc + (p.convertedItemsCount || 0), 0);
  // Estimate or collect failed jobs
  const failedJobsCount = projects.filter((p) => p.status === 'ON_HOLD').length;

  return (
    <div className="space-y-6">
      {/* ── KPI Row: Toàn hệ thống ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Organizations */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/admin/organizations')}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:border-[#0652CC] hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">Organizations</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0652CC]">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#091E42] mt-3">{loadingOrgs ? '...' : totalOrgs}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-[#6B778C]">
            <span className="font-semibold text-emerald-600">{enterpriseOrgs} Active / Enterprise</span>
            <span>•</span>
            <span className="text-[#0652CC] hover:underline flex items-center">Xem chi tiết &rarr;</span>
          </div>
        </div>

        {/* Engagements & Contracts */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/admin/engagement-types')}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:border-[#0652CC] hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">Engagements</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#091E42] mt-3">{engagementTypes.length || 4}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-[#6B778C]">
            <span className="font-semibold text-purple-700">Tiers & SLA Rules</span>
            <span>•</span>
            <span className="text-[#0652CC] hover:underline flex items-center">Cấu hình &rarr;</span>
          </div>
        </div>

        {/* Projects */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/admin/projects')}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:border-[#0652CC] hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">Toàn bộ Projects</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#091E42] mt-3">{loadingProjects ? '...' : totalProjects}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-[#6B778C]">
            <span className="font-semibold text-blue-600">{inProgressProjects} Đang chạy</span>
            <span>•</span>
            <span className="font-semibold text-emerald-600">{completedProjects} Hoàn thành</span>
          </div>
        </div>

        {/* Users & RBAC */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/admin/users')}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:border-[#0652CC] hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">System Users</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#091E42] mt-3">24</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-[#6B778C]">
            <span className="font-semibold text-amber-700">RBAC Multi-tenant</span>
            <span>•</span>
            <span className="text-[#0652CC] hover:underline flex items-center">Quản lý &rarr;</span>
          </div>
        </div>
      </div>

      {/* ── Operational Status & Conversion Health ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tình trạng Conversion & Các Job Lỗi */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5EAF0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#091E42] flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#0652CC]" />
                Tình trạng Conversion & Pipeline Lỗi
              </h3>
              <p className="text-xs text-[#6B778C] mt-0.5">
                Giám sát quá trình chuyển đổi AST, AI Validation và tiến độ toàn hệ thống
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/queue')}
              className="text-xs font-semibold"
            >
              Hàng đợi chi tiết
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase">Tổng Screens/Items</span>
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-blue-950 mt-2">{totalItems}</p>
              <p className="text-xs text-blue-700 mt-1">Trong {totalProjects} dự án hiện hành</p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase">Đã Convert Thành Công</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-950 mt-2">{convertedItems}</p>
              <p className="text-xs text-emerald-700 mt-1">
                Tỷ lệ: {totalItems > 0 ? Math.round((convertedItems / totalItems) * 100) : 0}%
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 uppercase">Job Lỗi / Cần Hỗ Trợ</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-black text-rose-950 mt-2">{failedJobsCount}</p>
              <p className="text-xs text-rose-700 mt-1">Cần can thiệp cấu hình hoặc mapping</p>
            </div>
          </div>

          {/* Phân bổ dự án & Vận hành */}
          <div className="mt-4 pt-4 border-t border-[#E5EAF0]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B778C] mb-3">
              Thống Kê Phân Bổ Công Việc (Resource Allocation)
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#F7F9FC] p-4 rounded-xl border border-[#E5EAF0]">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs font-semibold text-[#091E42] mb-1.5">
                  <span>Dự án đã gán Team Lead</span>
                  <span>{totalProjects - unallocatedProjects} / {totalProjects} ({totalProjects > 0 ? Math.round(((totalProjects - unallocatedProjects) / totalProjects) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2.5 bg-[#E5EAF0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0652CC] rounded-full transition-all duration-500"
                    style={{ width: `${totalProjects > 0 ? ((totalProjects - unallocatedProjects) / totalProjects) * 100 : 0}%` }}
                  />
                </div>
              </div>
              {unallocatedProjects > 0 && (
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    {unallocatedProjects} Dự án chưa gán Team Lead
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cảnh Báo Hệ Thống & Hoạt Động Audit */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#091E42] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#0652CC]" />
                Audit & Cảnh Báo Hệ Thống
              </h3>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Live Status
              </span>
            </div>

            {/* Pending Enterprise Quote Alert */}
            {pendingQuotes.length > 0 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate('/admin/billing/quotes')}
                className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-300 hover:bg-amber-100/70 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-600 animate-pulse" />
                    Yêu Cầu Enterprise Chờ Duyệt
                  </span>
                  <span className="bg-amber-200 px-2 py-0.5 rounded-full text-[10px]">
                    {pendingQuotes.length} yêu cầu
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  Có khách hàng đang chờ kích hoạt gói Enterprise từ Web 1. Bấm để duyệt ngay &rarr;
                </p>
              </div>
            )}

            {/* Recent Audit Logs Stream */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B778C] block">
                Hoạt động người dùng gần đây
              </span>
              {loadingLogs ? (
                <div className="text-xs text-[#6B778C] py-4 text-center">Đang tải nhật ký...</div>
              ) : auditLogs.length === 0 ? (
                <div className="text-xs text-[#6B778C] py-4 text-center">Không có hoạt động audit gần đây</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-lg bg-[#F7F9FC] border border-[#E5EAF0] text-xs">
                    <div className="flex items-center justify-between font-semibold text-[#091E42]">
                      <span className="truncate">{log.action}</span>
                      <span className="text-[10px] text-[#6B778C] shrink-0 font-normal">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-[#6B778C]">
                      <span>Actor: <b className="text-[#091E42]">{log.actor}</b></span>
                      <span className="font-mono text-[10px]">{log.resourceType}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[#E5EAF0]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/audit-logs')}
              className="w-full text-xs font-semibold justify-center"
            >
              Xem toàn bộ Audit Logs
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
