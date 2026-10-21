import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase,
  Cpu,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { partnersApi } from '@/features/partners/api/partners.api';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const ConversionStaffOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load projects & conversion items
  const { data: allProjects = [], isLoading: loadingProjects } = useQuery<PartnerProject[]>({
    queryKey: ['staff', 'dashboard', 'projects'],
    queryFn: () => partnersApi.getProjects(),
    staleTime: 15000,
  });

  // Filter projects assigned to this staff member
  // If no assigned project is strictly filtered or user is test, show active projects
  const myProjects = allProjects.filter(
    (p) => p.assignedStaffId === user?.id || !p.assignedStaffId || p.status === 'IN_PROGRESS'
  );

  const activeProjects = myProjects.filter((p) => p.status === 'IN_PROGRESS');
  const reviewProjects = myProjects.filter((p) => p.status === 'READY_FOR_EXPORT');
    const failedProjects = myProjects.filter((p) => p.status === 'FAILED');

  const web1Url = 'http://localhost:5173';

  return (
    <div className="space-y-6">
      {/* ── Banner: Truy cập nhanh vào Web 1 Conversion Workspace ──── */}
      <div className="bg-gradient-to-r from-[#0652CC] to-[#0A387E] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 pointer-events-none transform skew-x-12" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Web 1 Core Conversion Engine (Port 5173)</span>
            </div>
            <h3 className="text-xl font-black tracking-tight text-white">
              Web 1 Conversion Workspace
            </h3>
            <p className="text-xs text-blue-100 leading-relaxed">
              Truy cập trình phân tích cú pháp AST, cấu hình ánh xạ biến, xem trước màn hình WinForms/Oracle Forms sang React & Flutter theo thời gian thực.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href={web1Url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-[#0652CC] hover:bg-blue-50 shadow-sm transition-all"
            >
              <span>Mở Web 1 Workspace</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/employee/queue')}
              className="text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold"
            >
              Hàng đợi của tôi
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI Row: Công việc cá nhân ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Assigned Projects */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/employee/queue')}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:border-[#0652CC] hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">Project Được Giao</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0652CC]">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#091E42] mt-3">
            {loadingProjects ? '...' : myProjects.length}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-[#6B778C]">
            <span className="font-semibold text-blue-600">{activeProjects.length} Đang thực hiện</span>
            <span>•</span>
            <span className="text-[#0652CC] hover:underline flex items-center">Xem chi tiết &rarr;</span>
          </div>
        </div>

        {/* Conversions Running */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/queue')}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:border-[#0652CC] hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">Conversion Đang Chạy</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#091E42] mt-3">
            {activeProjects.length}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-indigo-700 font-semibold">
            <span>AST Parse & Code Gen</span>
          </div>
        </div>

        {/* Cần Review & Validation */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/employee/queue')}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:border-amber-500 hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">Cần Review & Validate</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#091E42] mt-3">
            {reviewProjects.length}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-amber-700 font-semibold">
            <span>Kiểm tra AST & Diff</span>
          </div>
        </div>

        {/* Gặp Lỗi / Cần Xử Lý */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/employee/queue')}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:border-rose-500 hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B778C]">Conversion Gặp Lỗi</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#091E42] mt-3">
            {failedProjects.length}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-rose-700 font-semibold">
            <span>Cần chỉnh sửa rule mapping</span>
          </div>
        </div>
      </div>

      {/* ── Main Section: Danh Sách Project Được Giao ─────────────── */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-4">
          <div>
            <h3 className="text-base font-bold text-[#091E42] flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#0652CC]" />
              Danh Sách Dự Án Được Giao Cho Bạn
            </h3>
            <p className="text-xs text-[#6B778C] mt-0.5">
              Chọn bất kỳ dự án nào để mở Workspace làm việc trực tiếp hoặc kiểm tra các file mã nguồn
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/employee/queue')}
            className="text-xs font-semibold"
          >
            Mở Toàn Bộ Hàng Đợi
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <div className="space-y-3">
          {loadingProjects ? (
            <div className="text-xs text-[#6B778C] py-8 text-center">Đang tải danh sách dự án...</div>
          ) : myProjects.length === 0 ? (
            <div className="text-xs text-[#6B778C] py-8 text-center">
              Hiện tại bạn chưa được phân công dự án nào. Vui lòng liên hệ Team Lead để nhận việc!
            </div>
          ) : (
            myProjects.map((p) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0] hover:border-[#0652CC] transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#091E42]">{p.name}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : p.status === 'READY_FOR_EXPORT'
                          ? 'bg-amber-100 text-amber-800'
                          : p.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B778C] mt-1">
                    Đối tác: <b className="text-[#091E42]">{p.partnerName}</b> • Target:{' '}
                    <span className="font-mono font-semibold text-[#0652CC]">{p.targetFramework}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/partners/projects/${p.id}/workspace`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#E8F1FF] text-[#0652CC] hover:bg-[#D0E2FF] border border-[#B3D4FF] transition-all cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Workspace</span>
                  </button>

                  <a
                    href={`${web1Url}/projects/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0652CC] text-white hover:bg-[#0543A8] transition-all cursor-pointer shadow-2xs"
                  >
                    <span>Mở Web 1</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
