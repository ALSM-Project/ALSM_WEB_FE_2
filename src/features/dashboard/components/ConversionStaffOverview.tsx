import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase,
  Cpu,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  FolderKanban,
  Search,
  ArrowRight,
  Code2,
} from 'lucide-react';
import { StatusBadge } from '@/shared/ui/Badge';
import { partnersApi } from '@/features/partners/api/partners.api';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const ConversionStaffOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Load projects from API
  const { data: rawProjects = [], isLoading: loadingProjects } = useQuery<PartnerProject[]>({
    queryKey: ['staff', 'dashboard', 'projects'],
    queryFn: () => partnersApi.getProjects(),
    staleTime: 15000,
  });

  const allProjects = Array.isArray(rawProjects) ? rawProjects : [];

  // Filter projects assigned to this staff member
  const myProjects = useMemo(() => {
    return allProjects.filter(
      (p) => p.assignedStaffId === user?.id || !p.assignedStaffId || p.status === 'IN_PROGRESS'
    );
  }, [allProjects, user?.id]);

  const activeProjects = useMemo(
    () => myProjects.filter((p) => p.status === 'IN_PROGRESS'),
    [myProjects]
  );
  const reviewProjects = useMemo(
    () => myProjects.filter((p) => p.status === 'READY_FOR_EXPORT'),
    [myProjects]
  );
  const failedProjects = useMemo(
    () => myProjects.filter((p) => p.status === 'FAILED'),
    [myProjects]
  );

  // Filtered list based on user search and status tabs
  const filteredProjects = useMemo(() => {
    return myProjects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.partnerName && p.partnerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.targetFramework && p.targetFramework.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [myProjects, searchTerm, statusFilter]);

  const web1Url = import.meta.env.VITE_CONVERSION_WORKSPACE_URL || 'http://localhost:5173';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── 1. Compact Engineering Workspace Launch Bar ────────────────── */}
      <div className="bg-white border border-[#E2E8F0] border-l-4 border-l-[#0652CC] rounded-lg p-4 sm:p-5 shadow-xs transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                Web 1 Conversion Workspace
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Engine Ready</span>
              </span>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed max-w-2xl">
              Truy cập trình phân tích cú pháp AST, cấu hình ánh xạ biến và kiểm tra mã nguồn chuyển đổi sang React &amp; Flutter.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            <a
              href={web1Url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-[#0652CC] text-white hover:bg-[#0544AB] transition-colors shadow-xs"
              title="Mở Conversion Workspace trên tab mới"
            >
              <span>Mở Web 1 Workspace</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => navigate('/employee/queue')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC] transition-colors shadow-xs cursor-pointer"
            >
              <span>Hàng đợi của tôi</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. KPI Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Assigned Projects */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/employee/queue')}
          className="alsm-metric-card cursor-pointer group"
          title="Xem toàn bộ dự án được phân công"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Project Được Giao
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-[#0652CC] flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {loadingProjects ? '...' : myProjects.length}
          </div>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
            <span className="font-medium text-[#0652CC]">
              {activeProjects.length} Đang thực hiện
            </span>
            <span className="text-[#0652CC] group-hover:translate-x-0.5 transition-transform">
              &rarr;
            </span>
          </div>
        </div>

        {/* Metric 2: Conversions Running */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/queue')}
          className="alsm-metric-card cursor-pointer group"
          title="Xem hàng đợi chuyển đổi"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Conversion Đang Chạy
            </span>
            <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {activeProjects.length}
          </div>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
            <span className="font-medium text-indigo-600">
              AST Parse &amp; Code Gen
            </span>
            <span className="text-indigo-600 group-hover:translate-x-0.5 transition-transform">
              &rarr;
            </span>
          </div>
        </div>

        {/* Metric 3: Needs Review & Validation */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/employee/queue')}
          className="alsm-metric-card cursor-pointer group hover:border-amber-300"
          title="Kiểm tra các mục chờ nghiệm thu chất lượng"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Cần Review &amp; Validate
            </span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {reviewProjects.length}
          </div>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
            <span className="font-medium text-amber-700">
              Kiểm tra AST &amp; Diff
            </span>
            <span className="text-amber-700 group-hover:translate-x-0.5 transition-transform">
              &rarr;
            </span>
          </div>
        </div>

        {/* Metric 4: Conversion Errors */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/employee/queue')}
          className="alsm-metric-card cursor-pointer group hover:border-rose-300"
          title="Xem các mục lỗi cần sửa rule mapping"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Conversion Gặp Lỗi
            </span>
            <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {failedProjects.length}
          </div>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
            <span className="font-medium text-rose-700">
              Cần sửa rule mapping
            </span>
            <span className="text-rose-700 group-hover:translate-x-0.5 transition-transform">
              &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Actionable Priority Alert (Real Data Only) ──────────────── */}
      {(failedProjects.length > 0 || reviewProjects.length > 0) && (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3.5 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Tác vụ cần ưu tiên:</strong> Có <b>{failedProjects.length}</b> dự án gặp lỗi chuyển đổi và <b>{reviewProjects.length}</b> dự án cần kiểm tra chất lượng.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {failedProjects.length > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('FAILED')}
                className="px-2.5 py-1 bg-white border border-amber-300 text-amber-800 rounded font-semibold text-[11px] hover:bg-amber-100/50 transition-colors cursor-pointer"
              >
                Xem dự án lỗi
              </button>
            )}
            {reviewProjects.length > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('READY_FOR_EXPORT')}
                className="px-2.5 py-1 bg-white border border-amber-300 text-amber-800 rounded font-semibold text-[11px] hover:bg-amber-100/50 transition-colors cursor-pointer"
              >
                Xem chờ review
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Main Section: Data Table of Assigned Projects ──────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-[#0652CC]" />
            <h3 className="text-sm font-bold text-[#0F172A]">
              Danh Sách Dự Án Được Giao Cho Bạn
            </h3>
            <span className="text-xs text-[#64748B] font-medium ml-1">
              ({filteredProjects.length}/{myProjects.length})
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm dự án, đối tác, framework..."
                className="w-full sm:w-60 pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:border-[#0652CC] outline-none transition-colors"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="inline-flex items-center p-0.5 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-[#0652CC] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('IN_PROGRESS')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'IN_PROGRESS'
                    ? 'bg-white text-[#0652CC] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Đang chạy
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('READY_FOR_EXPORT')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'READY_FOR_EXPORT'
                    ? 'bg-white text-[#0652CC] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Chờ Review
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('FAILED')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'FAILED'
                    ? 'bg-white text-rose-600 shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Lỗi
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="alsm-table">
            <thead>
              <tr>
                <th className="w-1/3">Dự Án / Mã Hệ Thống</th>
                <th>Đối Tác</th>
                <th>Target Tech</th>
                <th>Tiến Độ Màn Hình</th>
                <th>Trạng Thái</th>
                <th className="text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loadingProjects ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[#64748B]">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải danh sách dự án...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[#64748B]">
                    <div className="max-w-sm mx-auto space-y-1.5">
                      <FolderKanban className="w-6 h-6 mx-auto text-[#94A3B8]" />
                      <p className="font-semibold text-[#0F172A]">
                        {searchTerm || statusFilter !== 'ALL'
                          ? 'Không tìm thấy dự án phù hợp với bộ lọc'
                          : 'Hiện tại bạn chưa được phân công dự án nào'}
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        {searchTerm || statusFilter !== 'ALL'
                          ? 'Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc trạng thái.'
                          : 'Vui lòng liên hệ Team Lead để nhận phân bổ dự án chuyển đổi mới.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const screensDone = p.screensCompleted || 0;
                  const screensTotal = p.screensTotal || 0;
                  const percent = screensTotal > 0 ? Math.round((screensDone / screensTotal) * 100) : 0;

                  return (
                    <tr key={p.id} className="transition-colors">
                      {/* Project Name & Code */}
                      <td>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#0F172A] hover:text-[#0652CC] transition-colors">
                            {p.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#64748B]">
                            <span className="font-mono text-[#94A3B8]">#{p.id.slice(0, 8)}</span>
                            {p.conversionType && (
                              <>
                                <span>•</span>
                                <span>{p.conversionType.replace(/_/g, ' ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Partner Name */}
                      <td className="text-xs text-[#334155]">
                        <span className="font-medium">{p.partnerName || 'Internal / ALSM'}</span>
                      </td>

                      {/* Target Tech */}
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1]">
                          <Code2 className="w-3 h-3 mr-1 text-[#0652CC]" />
                          {p.targetFramework || 'React'}
                        </span>
                      </td>

                      {/* Screen Progress */}
                      <td>
                        <div className="w-32 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-[#475569]">
                            <span>{screensDone}/{screensTotal} screens</span>
                            <span className="font-medium">{percent}%</span>
                          </div>
                          <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#0652CC] h-full rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td>
                        <StatusBadge status={p.status} />
                      </td>

                      {/* Action Buttons */}
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => navigate(`/partners/projects/${p.id}/workspace`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#EFF6FF] text-[#0652CC] border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-colors cursor-pointer"
                            title="Mở Workspace dự án"
                          >
                            <span>Workspace</span>
                          </button>
                          <a
                            href={`${web1Url}/projects/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-white text-[#0F172A] border border-[#CBD5E1] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                            title="Mở chi tiết trên Web 1"
                          >
                            <span>Mở Web 1</span>
                            <ExternalLink className="w-3 h-3 text-[#64748B]" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-4 py-2.5 bg-[#FAFBFD] border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
          <span>Hiển thị {filteredProjects.length} dự án</span>
          <button
            type="button"
            onClick={() => navigate('/employee/queue')}
            className="text-[#0652CC] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Mở toàn bộ hàng đợi công việc</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversionStaffOverview;
