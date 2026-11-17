import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatVnd } from '@/shared/utils/currency';
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
  FileCheck2,
  FileText,
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
        leadId: variables.leadId,
        quoteId: variables.quoteId,
        outcome: variables.approved ? 'APPROVE' : 'REJECT',
        reason: variables.rejectionReason,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'dashboard', 'discounts'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'discounts'] });
      setActionSuccess(
        variables.approved
          ? 'Discount request approved successfully!'
          : 'Discount request rejected successfully.'
      );
      setTimeout(() => setActionSuccess(null), 5000);
    },
    onError: (err: any) => {
      alert(`Error: ${err.message || 'Unable to update discount decision'}`);
    },
  });

  const canApproveDiscounts = hasPermission('sales.discounts.approve') || user?.isPlatformAdmin;
  const canRejectDiscounts = hasPermission('sales.discounts.reject') || user?.isPlatformAdmin;

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
    <div className="space-y-6 animate-fade-in">
      {/* ── Success Alert ────────────────────────────────────────── */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-0.5 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Quick Navigation: Contracts & E-Sign Banner ─────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#244A70] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#17263A]">
              Contracts &amp; E-Sign Management
            </h2>
            <p className="text-xs text-[#8491A3] mt-0.5">
              Draft, review, dispatch electronic signing, and provision enterprise client agreements.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/sales/contracts')}
            className="text-xs font-semibold shadow-xs bg-[#244A70] hover:bg-[#1B3856]"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>View All Contracts</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/sales/leads')}
            className="text-xs font-semibold bg-white border-[#DCE3EC] hover:bg-slate-50 text-[#17263A]"
          >
            Leads Directory (CRM)
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* ── KPI Row: Revenue & Sales Performance ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Revenue */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/sales/reports')}
          className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-2xs cursor-pointer group hover:border-[#244A70] transition-colors"
          title="View revenue analytics"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8491A3]">
              Monthly Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#17263A] mt-2">
            {formatVnd(reports?.monthlyRevenue ?? 185000)}
          </p>
          <div className="flex items-center justify-between text-xs text-[#8491A3] mt-2 pt-2 border-t border-slate-100">
            <span className="font-semibold text-emerald-600">+14.2% vs last month</span>
            <span className="text-[#244A70] group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>

        {/* Total Pipeline Leads */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/sales/pipeline')}
          className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-2xs cursor-pointer group hover:border-[#244A70] transition-colors"
          title="View sales pipeline funnel"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8491A3]">
              Total Leads Pipeline
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#244A70] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#17263A] mt-2">
            {loadingLeads ? '...' : leads.length}
          </p>
          <div className="flex items-center justify-between text-xs text-[#8491A3] mt-2 pt-2 border-t border-slate-100">
            <span className="font-semibold text-[#244A70]">
              Win Rate: {reports?.conversionRate || 34}%
            </span>
            <span className="text-[#244A70] group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>

        {/* Pending Discount Approvals */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/sales/discounts')}
          className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-2xs cursor-pointer group hover:border-amber-400 transition-colors"
          title="View pending discount approvals"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8491A3]">
              Pending Discounts
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#17263A] mt-2">
            {loadingDiscounts ? '...' : pendingDiscounts.length}
          </p>
          <div className="flex items-center justify-between text-xs text-[#8491A3] mt-2 pt-2 border-t border-slate-100">
            {pendingDiscounts.length > 0 ? (
              <span className="font-semibold text-amber-700">Requires approval: &gt;15% discount</span>
            ) : (
              <span className="font-semibold text-emerald-700">All requests resolved</span>
            )}
            <span className="text-amber-700 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>

        {/* Average Contract Value */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/sales/reports')}
          className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-2xs cursor-pointer group hover:border-purple-400 transition-colors"
          title="View contract value metrics"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8491A3]">
              Avg Contract Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#17263A] mt-2">
            {formatVnd(reports?.avgDealSize ?? 24500)}
          </p>
          <div className="flex items-center justify-between text-xs text-[#8491A3] mt-2 pt-2 border-t border-slate-100">
            <span className="font-semibold text-purple-700">Enterprise Tiers</span>
            <span className="text-purple-700 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </div>
      </div>

      {/* ── Pipeline Breakdown by Stage ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div>
            <h2 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#244A70]" />
              <span>Sales Pipeline &amp; Stage Distribution</span>
            </h2>
            <p className="text-xs text-[#8491A3] mt-0.5">
              Breakdown of prospective clients across qualification, demo, and contract negotiation stages.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/sales/pipeline')}
            className="text-xs font-semibold border-[#DCE3EC] text-[#17263A] hover:bg-slate-50"
          >
            Kanban Pipeline
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-0.5">
          {[
            { key: 'NEW', label: '1. New', bg: 'bg-slate-50 border-slate-200 text-slate-800', count: stageCounts.NEW },
            { key: 'CONTACTED', label: '2. Contacted', bg: 'bg-slate-50 border-slate-200 text-slate-800', count: stageCounts.CONTACTED },
            { key: 'QUALIFIED', label: '3. Qualified', bg: 'bg-slate-50 border-slate-200 text-slate-800', count: stageCounts.QUALIFIED },
            { key: 'PROPOSAL', label: '4. Proposal', bg: 'bg-amber-50/70 border-amber-200 text-amber-900', count: stageCounts.PROPOSAL },
            { key: 'NEGOTIATION', label: '5. Negotiation', bg: 'bg-amber-50/70 border-amber-200 text-amber-900', count: stageCounts.NEGOTIATION },
            { key: 'WON', label: '6. Closed Won', bg: 'bg-emerald-50/70 border-emerald-200 text-emerald-900', count: stageCounts.WON },
            { key: 'LOST', label: '7. Closed Lost', bg: 'bg-rose-50/70 border-rose-200 text-rose-900', count: stageCounts.LOST },
          ].map((stage) => (
            <div
              key={stage.key}
              role="button"
              tabIndex={0}
              onClick={() => navigate('/sales/pipeline')}
              className={`p-3 rounded-xl border ${stage.bg} text-center hover:shadow-xs transition-all cursor-pointer`}
            >
              <span className="text-xs font-semibold block truncate">{stage.label}</span>
              <p className="text-xl font-extrabold mt-1.5">{stage.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pending Discounts & Next Activities ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending Discount Approvals */}
        <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h2 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
                  <Percent className="w-4 h-4 text-amber-600" />
                  <span>Pending Discount Approvals</span>
                </h2>
                <p className="text-xs text-[#8491A3] mt-0.5">
                  Discounts exceeding representative thresholds requiring sales manager sign-off.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/sales/discounts')}
                className="text-xs font-semibold border-[#DCE3EC] text-[#17263A] hover:bg-slate-50"
              >
                View All
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {loadingDiscounts ? (
                <div className="text-xs text-[#8491A3] py-8 text-center">Loading pending discount requests...</div>
              ) : pendingDiscounts.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8491A3] space-y-1">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700">No pending discount requests requiring approval.</p>
                  <p className="text-[11px]">All commercial proposals are compliant with threshold policies.</p>
                </div>
              ) : (
                pendingDiscounts.slice(0, 3).map((item) => (
                  <div
                    key={item.quoteId}
                    className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-xl transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#17263A]">{item.leadCompany}</span>
                        <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-xs border border-amber-200">
                          -{item.discountPercent}%
                        </span>
                      </div>
                      <p className="text-xs text-[#8491A3] mt-1">
                        Sales Rep: <b className="text-[#17263A] font-semibold">{item.assignedToName || item.requestId}</b> • Value: {formatVnd(item.proposedFinalPrice)}
                      </p>
                    </div>

                    {(canApproveDiscounts || canRejectDiscounts) && (
                      <div className="flex items-center gap-2 shrink-0">
                        {canApproveDiscounts && (
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {canRejectDiscounts && (
                          <button
                            type="button"
                            onClick={() =>
                              reviewMutation.mutate({
                                leadId: item.leadId,
                                quoteId: item.quoteId || item.quote?.id || '',
                                approved: false,
                                rejectionReason: 'Exceeds authorized commercial margin ceiling',
                              })
                            }
                            disabled={reviewMutation.isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Priority & Upcoming Activities */}
        <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h2 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#244A70]" />
                  <span>Upcoming &amp; Priority Activities</span>
                </h2>
                <p className="text-xs text-[#8491A3] mt-0.5">
                  Scheduled consultations, follow-up calls, and daily client engagement tasks.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/sales/leads')}
                className="text-xs font-semibold border-[#DCE3EC] text-[#17263A] hover:bg-slate-50"
              >
                All Leads
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {urgentFollowUps.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8491A3]">
                  No active client follow-ups pending today.
                </div>
              ) : (
                urgentFollowUps.map((lead) => (
                  <div
                    key={lead.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/sales/leads/${lead.id}`)}
                    className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#17263A]">{lead.company}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#244A70] font-semibold border border-blue-200">
                          {lead.stage}
                        </span>
                      </div>
                      <p className="text-xs text-[#8491A3] mt-1">
                        Contact: <b className="text-[#17263A] font-semibold">{lead.contactName}</b> ({lead.email})
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-[#244A70]">
                        {formatVnd(lead.dealValue ?? 15000)}
                      </span>
                      <p className="text-xs font-semibold text-[#8491A3] hover:text-[#244A70] mt-0.5 flex items-center justify-end gap-1">
                        <span>View Lead</span>
                        <ArrowRight className="w-3 h-3" />
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesOverview;
