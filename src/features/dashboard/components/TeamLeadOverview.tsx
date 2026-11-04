import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FolderKanban,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  UserPlus,
  } from 'lucide-react';
import { Button } from '@/shared/ui';
import { partnersApi } from '@/features/partners/api/partners.api';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const TeamLeadOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch Projects & Staff Roster
  const { data: rawProjects = [], isLoading: loadingProjects } = useQuery<PartnerProject[]>({
    queryKey: ['team-lead', 'dashboard', 'projects'],
    queryFn: () => partnersApi.getProjects(),
    staleTime: 20000,
  });

  const { data: rawStaff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['team-lead', 'dashboard', 'staff'],
    queryFn: () => partnersApi.getAssignableStaff(),
    staleTime: 30000,
  });

  const allProjects = Array.isArray(rawProjects) ? rawProjects : [];
  const staffRoster = Array.isArray(rawStaff) ? rawStaff : [];

  // Filter projects in this team's scope
  // If user is a specific team lead, filter by assignedTeamLeadId, else if admin or inspecting, show all
  const isDedicatedLead = allProjects.some((p) => p.assignedTeamLeadId === user?.id);
  const teamProjects = isDedicatedLead
    ? allProjects.filter((p) => p.assignedTeamLeadId === user?.id)
    : allProjects;

  const inProgressCount = teamProjects.filter((p) => p.status === 'IN_PROGRESS').length;
      const blockedCount = teamProjects.filter((p) => p.status === 'FAILED').length;

  // Items / Projects awaiting assignment
  const unassignedProjects = teamProjects.filter((p) => !p.assignedStaffId && p.status !== 'COMPLETED');

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── KPI Row: Trong phạm vi Team ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Team Projects */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/team-lead/projects')}
          className="alsm-metric-card cursor-pointer group"
          title="Xem danh sách dự án của team"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Project Giao Cho Team</span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-[#0652CC] flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A] mt-2">
            {loadingProjects ? '...' : teamProjects.length}
          </p>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
            <span className="font-medium text-[#0652CC]">{inProgressCount} Đang thực hiện</span>
            <span className="text-[#0652CC] group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>

        {/* Work Awaiting Assignment */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/team-lead/projects')}
          className="alsm-metric-card cursor-pointer group hover:border-amber-300"
          title="Phân công nhân sự cho các dự án mới"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Chờ Phân Công</span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A] mt-2">
            {unassignedProjects.length}
          </p>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
            <span className="font-medium text-amber-700">Cần phân bổ nhân sự</span>
            <span className="text-amber-700 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>

        {/* Team Staff Members */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/team-lead/projects')}
          className="alsm-metric-card cursor-pointer group"
          title="Xem đội ngũ nhân sự trong team"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Nhân Sự Trong Team</span>
            <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A] mt-2">
            {loadingStaff ? '...' : staffRoster.length}
          </p>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
            <span className="font-medium text-purple-700">Conversion Staff &amp; Reviewers</span>
            <span className="text-purple-700 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>

        {/* Blocked / Job Lỗi */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/team-lead/projects')}
          className="alsm-metric-card cursor-pointer group hover:border-rose-300"
          title="Xem các dự án gặp sự cố kỹ thuật"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Job Lỗi / Chậm Tiến Độ</span>
            <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A] mt-2">
            {blockedCount}
          </p>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
            <span className="font-medium text-rose-700">Cần hỗ trợ giải quyết</span>
            <span className="text-rose-700 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>
      </div>

      {/* ── Main Section: Nhân Sự & Tiến Độ Conversion ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Nhân Viên & Workload */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3.5">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0652CC]" />
                Tiến Độ Conversion &amp; Workload Nhân Viên
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Theo dõi khối lượng công việc và hiệu suất chuyển đổi của từng nhân sự trong team
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/team-lead/projects')}
              className="text-xs font-semibold"
            >
              Phân công dự án
              <UserPlus className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="space-y-2.5">
            {loadingStaff ? (
              <div className="text-xs text-[#64748B] py-6 text-center">Đang tải danh sách nhân sự...</div>
            ) : staffRoster.length === 0 ? (
              <div className="text-xs text-[#64748B] py-6 text-center">Chưa có nhân viên nào trong danh sách</div>
            ) : (
              staffRoster.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0652CC]/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-[#EFF6FF] text-[#0652CC] border border-[#BFDBFE] flex items-center justify-center font-bold text-xs shrink-0">
                      {staff.fullName ? staff.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0F172A]">{staff.fullName}</p>
                      <p className="text-[11px] text-[#64748B]">{staff.email} • <span className="font-mono text-[10px]">{staff.role}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="text-right">
                      <span className="text-xs font-medium text-[#0F172A]">
                        {staff.activeWorkload} Projects
                      </span>
                      <div className="w-24 h-1.5 bg-[#E2E8F0] rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            staff.activeWorkload > 3 ? 'bg-amber-500' : 'bg-[#0652CC]'
                          }`}
                          style={{ width: `${Math.min(staff.activeWorkload * 25, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        staff.activeWorkload === 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : staff.activeWorkload > 3
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {staff.activeWorkload === 0 ? 'Sẵn sàng' : 'Đang xử lý'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Công việc chờ phân công & Cần hỗ trợ */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-3.5">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Dự Án Cần Chú Ý
              </h3>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Action Required
              </span>
            </div>

            {/* List unassigned or blocked */}
            <div className="space-y-2.5">
              {unassignedProjects.slice(0, 4).map((p) => (
                <div key={p.id} className="p-3 rounded-md bg-amber-50/50 border border-amber-200/80 text-xs">
                  <div className="flex items-center justify-between font-semibold text-[#0F172A]">
                    <span className="truncate">{p.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                      Chưa gán
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Đối tác: <b className="text-[#0F172A]">{p.partnerName}</b> • Framework: <span className="font-mono text-[#0652CC]">{p.targetFramework}</span>
                  </p>
                  <div className="flex items-center justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/team-lead/projects')}
                      className="text-[11px] font-semibold text-[#0652CC] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Gán nhân viên ngay &rarr;
                    </button>
                  </div>
                </div>
              ))}

              {blockedCount > 0 && (
                <div className="p-3 rounded-md bg-rose-50/60 border border-rose-200/80 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{blockedCount} dự án đang tạm dừng hoặc gặp sự cố</span>
                  </div>
                  <p className="text-[11px] text-rose-700 mt-1">
                    Kiểm tra logs AST và quy tắc mapping để tháo gỡ khó khăn cho nhân viên.
                  </p>
                </div>
              )}

              {unassignedProjects.length === 0 && blockedCount === 0 && (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                  Mọi dự án đều đã được phân công và tiến hành đúng tiến độ!
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[#E2E8F0]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/team-lead/projects')}
              className="w-full text-xs font-semibold justify-center"
            >
              Vào Không Gian Team Lead
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
