import React, { useState } from 'react';
import { Card, PageHeader, Button } from '@/shared/ui';
import {
  Cpu,
  ShieldCheck,
  ClipboardCheck,
  Activity,
  ArrowRight,
  Zap,
  Building2,
  User,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  PhoneCall,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quoteApi } from '@/features/billing/api/quote.api';
import type { QuoteRequest } from '@/features/billing/types/quote';

export const StaffDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);

  // Fetch pending enterprise quote requests
  const {
    data: quoteData,
    isLoading: isLoadingQuotes,
    isFetching: isFetchingQuotes,
    isError: quoteError,
    refetch: refetchQuotes,
  } = useQuery({
    queryKey: ['billing', 'quote-requests-dashboard'],
    queryFn: () => quoteApi.listQuoteRequests({ status: 'PENDING' }),
    staleTime: 1000 * 15,
  });

  // Mutation to approve or contact quote request
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'CONTACTED' | 'APPROVED' }) =>
      quoteApi.updateQuoteStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      const actionText = updated.status === 'APPROVED'
        ? `Đã DUYỆT và kích hoạt gói Enterprise cho "${updated.companyName || updated.fullName}" thành công!`
        : `Đã cập nhật trạng thái "Đã liên hệ" cho "${updated.companyName || updated.fullName}"!`;
      setApprovalSuccess(actionText);
      setTimeout(() => setApprovalSuccess(null), 6000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Không thể cập nhật trạng thái';
      alert(`Lỗi: ${msg}`);
    },
  });

  const pendingQuotes: QuoteRequest[] = quoteData?.items || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Staff Dashboard"
        subtitle="Operational overview, conversion pipeline control, and system validation metrics."
      />

      {/* ── Success Alert ────────────────────────────────────────────── */}
      {approvalSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm px-4 py-3 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{approvalSuccess}</span>
          </div>
          <button
            onClick={() => setApprovalSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1"
          >
            Đóng
          </button>
        </div>
      )}

      {/* ── 5 Metric Cards Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Conversion Queue */}
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6B778C]">Conversion Queue</span>
            <div className="p-2 rounded-lg bg-[#E8F1FF] text-[#0652CC]">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <button onClick={() => navigate('/queue')} className="text-lg font-bold text-blue-700 mt-3 underline">Open live queue</button>
          <p className="text-xs text-[#6B778C] mt-1">Select a project to see persisted job statuses</p>
        </Card>

        {/* Card 2: Validation Rate */}
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6B778C]">Validation Rate</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-[#091E42] mt-3">Not available</p>
          <p className="text-xs text-[#6B778C] mt-1">No aggregate validation metric is connected</p>
        </Card>

        {/* Card 3: Review Queue */}
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6B778C]">Review Queue</span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold mt-3">Select completed jobs</p>
          <p className="text-xs text-[#6B778C] mt-1">Inspect completed conversions and persisted decisions</p>
        </Card>

        {/* Card 4: Engine Health */}
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6B778C]">Engine Health</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-[#091E42] mt-3">Not monitored</p>
          <p className="text-xs text-[#6B778C] mt-1">Use job details to inspect actual worker progress</p>
        </Card>

        {/* Card 5: Enterprise Quotes Approval */}
        <div
          onClick={() => navigate('/admin/billing/quotes')}
          className={`cursor-pointer transition-all rounded-xl p-4 border ${
            pendingQuotes.length > 0
              ? 'bg-amber-50/70 border-amber-300 hover:border-amber-500 shadow-xs'
              : 'bg-white border-[#D9E2EC] hover:border-[#0652CC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6B778C]">Enterprise Quotes</span>
            <div className={`p-2 rounded-lg ${pendingQuotes.length > 0 ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <p className={`text-2xl font-extrabold ${pendingQuotes.length > 0 ? 'text-amber-900' : 'text-[#091E42]'}`}>
              {quoteError ? 'Unavailable' : isLoadingQuotes ? 'Loading...' : `${pendingQuotes.length} Chờ duyệt`}
            </p>
            {pendingQuotes.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-amber-700/80 mt-1 font-medium flex items-center gap-1">
            Duyệt nâng cấp ngay &rarr;
          </p>
        </div>
      </div>

      {/* ── Enterprise Quote Requests Approval Section ────────────────── */}
      <Card
        variant="default"
        padding="md"
        className={pendingQuotes.length > 0 ? 'border-amber-300 ring-1 ring-amber-300/60 shadow-xs' : ''}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                pendingQuotes.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#091E42]">
                  Duyệt Yêu Cầu Nâng Cấp Enterprise (Enterprise Quote Approval)
                </h3>
                {pendingQuotes.length > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {pendingQuotes.length} yêu cầu cần duyệt
                  </span>
                ) : !quoteError && !isLoadingQuotes ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Đã duyệt hết
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-[#6B778C]">
                Xét duyệt và kích hoạt quyền lợi gói Enterprise trực tiếp cho khách hàng đăng ký từ cổng User (UC-32)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchQuotes()}
              disabled={isFetchingQuotes}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingQuotes ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/billing/quotes')}
              className="text-xs flex items-center gap-1.5"
            >
              Tất cả yêu cầu
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Requests List */}
        <div className="mt-4">
          {quoteError ? <p role="alert" className="p-6 text-rose-700">Không thể tải yêu cầu nâng cấp. Vui lòng thử làm mới.</p> : isLoadingQuotes ? (
            <div className="p-8 text-center text-xs text-slate-500">Đang kiểm tra yêu cầu...</div>
          ) : pendingQuotes.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-800">Không có yêu cầu nâng cấp nào đang chờ duyệt</p>
              <p className="text-xs text-slate-500 mt-1">
                Tất cả các yêu cầu báo giá Enterprise từ khách hàng đã được xử lý xong.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingQuotes.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 hover:bg-amber-50/50 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-[#091E42] flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-[#0652CC]" />
                        {req.companyName || 'Công ty chưa đặt tên'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                        CHỜ DUYỆT
                      </span>
                      {req.currentPlanTier && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Gói hiện tại: {req.currentPlanTier}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#42526E]">
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{req.fullName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={`mailto:${req.email}`} className="text-[#0652CC] hover:underline truncate">
                          {req.email}
                        </a>
                      </div>
                      {req.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{req.phone}</span>
                        </div>
                      )}
                    </div>

                    {req.message && (
                      <div className="text-xs text-slate-600 bg-white/80 rounded-lg p-2.5 border border-amber-100 flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="italic">{req.message}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Gửi lúc: {new Date(req.createdAt).toLocaleString()}
                      </span>
                      <span>
                        Mã yêu cầu: <code className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">{req.id}</code>
                      </span>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-amber-100">
                    <button
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: req.id, status: 'CONTACTED' })}
                      className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                      title="Đánh dấu đã liên hệ"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-[#0652CC]" />
                      <span>Đã liên hệ</span>
                    </button>
                    <button
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Xác nhận DUYỆT và kích hoạt gói ENTERPRISE cho công ty "${req.companyName || req.fullName}"?`
                          )
                        ) {
                          updateMutation.mutate({ id: req.id, status: 'APPROVED' });
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                      title="Duyệt yêu cầu và kích hoạt gói Enterprise"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Duyệt Enterprise</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── Quick Staff Operations & System Environment ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="default" padding="md">
          <h3 className="text-base font-bold text-[#091E42] mb-1">Quick Staff Operations</h3>
          <p className="text-xs text-[#6B778C] mb-4">Direct access to core internal staff workflows</p>
          <div className="space-y-3">
            {/* Enterprise Quote Approval shortcut */}
            <button
              onClick={() => navigate('/admin/billing/quotes')}
              className="w-full p-3 rounded-lg border border-amber-200 bg-amber-50/20 hover:border-[#0652CC] hover:bg-[#F7F9FC] flex items-center justify-between transition-colors text-left cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#091E42]">Enterprise Quotes & Approvals</span>
                  {pendingQuotes.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                      {pendingQuotes.length} chờ duyệt
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6B778C]">
                  Quản lý danh sách báo giá Enterprise, liên hệ khách hàng & kích hoạt tài khoản
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#0652CC]" />
            </button>

            <button
              onClick={() => navigate('/admin/menu-builder')}
              className="w-full p-3 rounded-lg border border-[#D9E2EC] hover:border-[#0652CC] hover:bg-[#F7F9FC] flex items-center justify-between transition-colors text-left cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold text-[#091E42]">Menu Builder</span>
                <p className="text-[11px] text-[#6B778C]">Configure staff runtime application navigation hierarchy</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#0652CC]" />
            </button>

            <button
              onClick={() => navigate('/queue')}
              className="w-full p-3 rounded-lg border border-[#D9E2EC] hover:border-[#0652CC] hover:bg-[#F7F9FC] flex items-center justify-between transition-colors text-left cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold text-[#091E42]">Conversion Operations Queue</span>
                <p className="text-[11px] text-[#6B778C]">Monitor active BMS/DSPF to React & COBOL to Java conversions</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#0652CC]" />
            </button>
          </div>
        </Card>

        <Card variant="default" padding="md">
          <h3 className="text-base font-bold text-[#091E42] mb-1">System Environment</h3>
          <p className="text-xs text-[#6B778C] mb-4">Web 2 Internal Staff Node configuration</p>
          <div className="space-y-2 text-xs text-[#42526E]">
            <div className="flex justify-between py-1 border-b border-[#E5EAF0]">
              <span>Portal Identity</span>
              <strong className="text-[#091E42]">ALSM_WEB_FE_2 (Web 2 Internal Staff)</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5EAF0]">
              <span>Navigation Control</span>
              <strong className="text-[#0652CC]">Single Source of Truth Menu Builder Active</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5EAF0]">
              <span>Backend Auth</span>
              <strong className="text-[#091E42]">Authenticated API requests</strong>
            </div>
            <div className="flex justify-between py-1">
              <span>Enterprise Module</span>
              <strong className="text-[#091E42]">UC-32 Quotas & Approvals</strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboardPage;
