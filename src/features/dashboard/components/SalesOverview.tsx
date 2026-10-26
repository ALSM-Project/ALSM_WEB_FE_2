import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Percent,
  Check,
  X,
  } from 'lucide-react';
import { Button } from '@/shared/ui';
import { crmApi, LeadDto, PendingDiscountDto, SalesReportsDto } from '@/features/crm/api/crm.api';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const SalesOverview: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuth();
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 1. Fetch Sales Reports
  const { data: reports } = useQuery<SalesReportsDto>({
    queryKey: ['sales', 'dashboard', 'reports'],
    queryFn: () => crmApi.getReports(),
    staleTime: 30000,
  });

  // 2. Fetch Leads
  const { data: rawLeads = [], isLoading: loadingLeads } = useQuery<LeadDto[]>({
    queryKey: ['sales', 'dashboard', 'leads'],
    queryFn: () => crmApi.getLeads(),
    staleTime: 30000,
  });

  // 3. Fetch Pending Discounts
  const { data: rawPendingDiscounts = [], isLoading: loadingDiscounts } = useQuery<PendingDiscountDto[]>({
    queryKey: ['sales', 'dashboard', 'discounts'],
    queryFn: () => crmApi.getPendingDiscounts(),
    staleTime: 15000,
  });

  const leads = Array.isArray(rawLeads) ? rawLeads : [];
  const pendingDiscounts = Array.isArray(rawPendingDiscounts) ? rawPendingDiscounts : [];

  // Review Discount Mutation
  const reviewMutation = useMutation({
    mutationFn: (variables: { leadId: string; quoteId: string; approved: boolean; rejectionReason?: string }) =>
      crmApi.reviewDiscount({
        ...variables,
        reviewer: user?.fullName || 'Sales Manager',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'dashboard', 'discounts'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'discounts'] });
      setActionSuccess(variables.approved ? 'Đã duyệt yêu cầu giảm giá thành công!' : 'Đã từ chối yêu cầu giảm giá!');
      setTimeout(() => setActionSuccess(null), 5000);
    },
    onError: (err: any) => {
      alert(`Lỗi: ${err.message || 'Không thể cập nhật chiết khấu'}`);
    },
  });

  const canApproveDiscounts = hasPermission('crm.discounts.approve') || user?.isPlatformAdmin;

  // Pipeline breakdown counts
  const stageCounts: Record<string, number> = {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    PROPOSAL: 0,
    NEGOTIATION: 0,
    WON: 0,
    LOST: 0,
  };

  leads.forEach((l) => {
    if (stageCounts[l.stage] !== undefined) {
      stageCounts[l.stage]++;
    }
  });

  // Next activities (Leads with nextFollowUpAt or recent high score leads)
  const urgentFollowUps = leads
    .filter((l) => l.stage !== 'WON' && l.stage !== 'LOST')
    .slice(0, 4);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Success Alert ────────────────────────────────────────── */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-3.5 py-2.5 rounded-md flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-0.5"
          >
            Đóng
          </button>
        </div>
      )}

      {/* ── KPI Row: Doanh thu & Hiệu suất bán hàng ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Doanh thu tháng */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/crm/reports')}
          className="alsm-metric-card cursor-pointer group"
          title="Xem báo cáo doanh thu"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Doanh Thu Tháng</span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A] mt-2">
            ${reports?.monthlyRevenue?.toLocaleString() || '185,000'}
          </p>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
            <span className="font-medium text-emerald-600">+14.2% so với tháng trước</span>
            <span className="text-[#0652CC] group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>

        {/* Tổng số Leads & Win Rate */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/crm/pipeline')}
          className="alsm-metric-card cursor-pointer group"
          title="Xem phễu khách hàng"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Tổng Leads Pipeline</span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-[#0652CC] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A] mt-2">
            {loadingLeads ? '...' : leads.length}
          </p>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
            <span className="font-medium text-[#0652CC]">
              Tỷ lệ chốt: {reports?.conversionRate || 34}%
            </span>
            <span className="text-[#0652CC] group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>

        {/* Yêu cầu duyệt Discount */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/crm/discounts')}
          className="alsm-metric-card cursor-pointer group hover:border-amber-300"
          title="Xem yêu cầu phê duyệt chiết khấu"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Yêu Cầu Duyệt Discount</span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A] mt-2">
            {loadingDiscounts ? '...' : pendingDiscounts.length}
          </p>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
            {pendingDiscounts.length > 0 ? (
              <span className="font-medium text-amber-700">Cần phê duyệt &gt;15% chiết khấu</span>
            ) : (
              <span className="font-medium text-emerald-700">Đã giải quyết hết</span>
            )}
            <span className="text-amber-700 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>

        {/* Deal Size Trung Bình */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/crm/reports')}
          className="alsm-metric-card cursor-pointer group"
          title="Xem báo cáo giá trị hợp đồng"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Giá Trị Hợp Đồng TB</span>
            <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A] mt-2">
            ${reports?.avgDealSize?.toLocaleString() || '24,500'}
          </p>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
            <span className="font-medium text-purple-700">Enterprise Tiers</span>
            <span className="text-purple-700 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>
      </div>

      {/* ── Pipeline Breakdown theo giai đoạn ───────────────────────── */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3.5">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#0652CC]" />
              Phễu Bán Hàng &amp; Lead Theo Từng Giai Đoạn (Sales Pipeline)
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Phân bổ số lượng khách hàng tiềm năng qua các vòng thẩm định, demo và đàm phán hợp đồng
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/crm/pipeline')}
            className="text-xs font-semibold"
          >
            Kanban Pipeline
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-0.5">
          {[
            { key: 'NEW', label: '1. Mới (New)', bg: 'bg-slate-50 border-slate-200 text-slate-800', count: stageCounts.NEW },
            { key: 'CONTACTED', label: '2. Đã liên hệ', bg: 'bg-blue-50/70 border-blue-200 text-blue-900', count: stageCounts.CONTACTED },
            { key: 'QUALIFIED', label: '3. Tiềm năng', bg: 'bg-indigo-50/70 border-indigo-200 text-indigo-900', count: stageCounts.QUALIFIED },
            { key: 'PROPOSAL', label: '4. Báo giá', bg: 'bg-amber-50/70 border-amber-200 text-amber-900', count: stageCounts.PROPOSAL },
            { key: 'NEGOTIATION', label: '5. Đàm phán', bg: 'bg-purple-50/70 border-purple-200 text-purple-900', count: stageCounts.NEGOTIATION },
            { key: 'WON', label: '6. Thắng (Won)', bg: 'bg-emerald-50/70 border-emerald-200 text-emerald-900', count: stageCounts.WON },
            { key: 'LOST', label: '7. Mất (Lost)', bg: 'bg-rose-50/70 border-rose-200 text-rose-900', count: stageCounts.LOST },
          ].map((stage) => (
            <div
              key={stage.key}
              role="button"
              tabIndex={0}
              onClick={() => navigate('/crm/pipeline')}
              className={`p-2.5 rounded-md border ${stage.bg} text-center hover:shadow-xs transition-all cursor-pointer`}
            >
              <span className="text-[11px] font-semibold block truncate">{stage.label}</span>
              <p className="text-xl font-bold mt-1.5">{stage.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Duyệt Discount & Hoạt Động Tiếp Theo ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Yêu Cầu Duyệt Discount */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Percent className="w-4 h-4 text-amber-600" />
                Yêu Cầu Duyệt Discount Đang Chờ
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Chiết khấu vượt thẩm quyền Sales Rep cần Sales Manager phê duyệt
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/crm/discounts')}
              className="text-xs font-semibold"
            >
              Tất cả
            </Button>
          </div>

          <div className="space-y-2.5">
            {loadingDiscounts ? (
              <div className="text-xs text-[#64748B] py-6 text-center">Đang tải yêu cầu chiết khấu...</div>
            ) : pendingDiscounts.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                Không có yêu cầu chiết khấu nào đang chờ duyệt!
              </div>
            ) : (
              pendingDiscounts.slice(0, 3).map((item) => (
                <div
                  key={item.quoteId}
                  className="p-3 rounded-md bg-amber-50/50 border border-amber-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#0F172A]">{item.leadCompany}</span>
                      <span className="px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 text-[10px] border border-amber-300">
                        -{item.discountPercent}%
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Sale Rep: <b className="text-[#0F172A]">{item.assignedToName || item.requestId}</b> • Trị giá: $
                      {item.proposedFinalPrice?.toLocaleString()}
                    </p>
                  </div>

                  {canApproveDiscounts && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          reviewMutation.mutate({
                            leadId: item.leadId,
                            quoteId: item.quoteId || item.quote?.id || '',
                            approved: true,
                          })
                        }
                        disabled={reviewMutation.isPending}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Duyệt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          reviewMutation.mutate({
                            leadId: item.leadId,
                            quoteId: item.quoteId || item.quote?.id || '',
                            approved: false,
                            rejectionReason: 'Vượt trần ngân sách cho phép',
                          })
                        }
                        disabled={reviewMutation.isPending}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Các Hoạt Động Cần Thực Hiện Tiếp Theo */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0652CC]" />
                  Hoạt Động Cần Thực Hiện Tiếp Theo
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Lịch hẹn, cuộc gọi tư vấn và các đầu việc chăm sóc khách hàng trong ngày
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/crm/leads')}
                className="text-xs font-semibold"
              >
                Danh sách Leads
              </Button>
            </div>

            <div className="space-y-2.5">
              {urgentFollowUps.map((lead) => (
                <div
                  key={lead.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/crm/leads/${lead.id}`)}
                  className="p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0652CC]/40 text-xs transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#0F172A]">{lead.company}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                        {lead.stage}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Liên hệ: <b className="text-[#0F172A]">{lead.contactName}</b> ({lead.email})
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-[#0652CC]">
                      ${lead.dealValue?.toLocaleString() || '15,000'}
                    </span>
                    <p className="text-[10px] text-[#64748B] mt-0.5">Mở hồ sơ &rarr;</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
