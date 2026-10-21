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
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { partnersApi } from '@/features/partners/api/partners.api';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const TeamLeadOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch Projects & Staff Roster
  const { data: allProjects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['team-lead', 'dashboard', 'projects'],
    queryFn: partnersApi.getProjects,
    staleTime: 20000,
  });

  const { data: staffRoster = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['team-lead', 'dashboard', 'staff'],
    queryFn: partnersApi.getAssignableStaff,
    staleTime: 30000,
  });

  // Filter projects in this team's scope
  // If user is a specific team lead, filter by assignedTeamLeadId, else if admin or inspecting, show all
  const isDedicatedLead = allProjects.some((p) => p.assignedTeamLeadId === user?.id);
  const teamProjects = isDedicatedLead
    ? allProjects.filter((p) => p.assignedTeamLeadId === user?.id)
    : allProjects;

  const inProgressCount = teamProjects.filter((p) => p.status === 'IN_PROGRESS').length;
  const reviewCount = teamProjects.filter((p) => p.status === 'REVIEW').length;
  const completedCount = teamProjects.filter((p) => p.status === 'COMPLETED').length;
  const blockedCount = teamProjects.filter((p) => p.status === 'ON_HOLD').length;

  // Items / Projects awaiting assignment
  const unassignedProjects = teamProjects.filter((p) => !p.assignedStaffId && p.status !== 'COMPLETED');

  return (
    <div className="space-y-6">
      {/* ── KPI Row: Trong phạm vi Team ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Team Projects */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/team-lead/projects')}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:border-[#0652CC] hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">Project Giao Cho Team</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0652CC]">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#091E42] mt-3">
            {loadingProjects ? '...' : teamProjects.length}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-[#6B778C]">
            <span className="font-semibold text-blue-600">{inProgressCount} Đang thực hiện</span>
            <span>•</span>
            <span className="text-[#0652CC] hover:underline flex items-center">Xem danh sách &rarr;</span>
          </div>
        </div>

        {/* Work Awaiting Assignment */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/team-lead/projects')}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:border-amber-500 hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">Chờ Phân Công</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#091E42] mt-3">
            {unassignedProjects.length}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-amber-700 font-semibold">
            <span>Cần phân bổ nhân sự</span>
            <span>•</span>
            <span className="underline">Phân công ngay &rarr;</span>
          </div>
        </div>

        {/* Team Staff Members */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/team-lead/projects')}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:border-[#0652CC] hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">Nhân Sự Trong Team</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#091E42] mt-3">
            {loadingStaff ? '...' : staffRoster.length}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-purple-700 font-semibold">
            <span>Conversion Staff & Reviewers</span>
          </div>
        </div>

        {/* Blocked / Job Lỗi */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/team-lead/projects')}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:border-rose-500 hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">Job Lỗi / Chậm Tiến Độ</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#091E42] mt-3">
            {blockedCount}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-rose-700 font-semibold">
            <span>Cần hỗ trợ giải quyết</span>
          </div>
        </div>
      </div>

      {/* ── Main Section: Nhân Sự & Tiến Độ Conversion ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nhân Viên & Workload */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5EAF0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#091E42] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0652CC]" />
                Tiến Độ Conversion & Workload Nhân Viên
              </h3>
              <p className="text-xs text-[#6B778C] mt-0.5">
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

          <div className="space-y-3">
            {loadingStaff ? (
              <div className="text-xs text-[#6B778C] py-6 text-center">Đang tải danh sách nhân sự...</div>
            ) : staffRoster.length === 0 ? (
              <div className="text-xs text-[#6B778C] py-6 text-center">Chưa có nhân viên nào trong danh sách</div>
            ) : (
              staffRoster.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0] hover:border-[#0652CC]/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E8F1FF] text-[#0652CC] flex items-center justify-center font-bold text-xs shrink-0">
                      {staff.fullName ? staff.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#091E42]">{staff.fullName}</p>
                      <p className="text-[11px] text-[#6B778C]">{staff.email} • <span className="font-mono text-[10px]">{staff.role}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#091E42]">
                        {staff.activeWorkload} Projects đang chạy
                      </span>
                      <div className="w-24 h-1.5 bg-[#E5EAF0] rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            staff.activeWorkload > 3 ? 'bg-amber-500' : 'bg-[#0652CC]'
                          }`}
                          style={{ width: `${Math.min(staff.activeWorkload * 25, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                        staff.activeWorkload === 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : staff.activeWorkload > 3
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
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
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#091E42] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Dự Án Cần Chú Ý
              </h3>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Action Required
              </span>
            </div>

            {/* List unassigned or blocked */}
            <div className="space-y-3">
              {unassignedProjects.slice(0, 4).map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-[#091E42]">
                    <span className="truncate">{p.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-semibold">
                      Chưa gán
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B778C] mt-1">
                    Đối tác: <b className="text-[#091E42]">{p.partnerName}</b> • Framework: <span className="font-mono">{p.targetFramework}</span>
                  </p>
                  <div className="flex items-center justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/team-lead/projects')}
                      className="text-[11px] font-bold text-[#0652CC] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Gán nhân viên ngay &rarr;
                    </button>
                  </div>
                </div>
              ))}

              {blockedCount > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                  <div className="flex items-center gap-2 font-bold text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{blockedCount} dự án đang tạm dừng hoặc gặp sự cố</span>
                  </div>
                  <p className="text-[11px] text-rose-700 mt-1">
                    Kiểm tra logs AST và quy tắc mapping để tháo gỡ khó khăn cho nhân viên.
                  </p>
                </div>
              )}

              {unassignedProjects.length === 0 && blockedCount === 0 && (
                <div className="py-8 text-center text-xs text-[#6B778C]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  Mọi dự án đều đã được phân công và tiến hành đúng tiến độ!
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[#E5EAF0]">
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
