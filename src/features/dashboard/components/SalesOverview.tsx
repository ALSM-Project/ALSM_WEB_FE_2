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
} from 'lucide-react';
import { Button, StatCard, toast } from '@/shared/ui';
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
      setActionSuccess(variables.approved ? 'Discount request approved successfully.' : 'Discount request rejected.');
      setTimeout(() => setActionSuccess(null), 5000);
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message || 'Unable to update discount'}`, { title: 'Discount Error' });
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
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-0.5 cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* ── KPI Row: Consistent 4-Column Grid ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Revenue */}
        <StatCard
          label="Monthly Revenue"
          value={formatVnd(reports?.monthlyRevenue ?? 185000)}
          icon={DollarSign}
          subtext={
            <span className="font-medium text-emerald-700">
              +14.2% vs last month
            </span>
          }
          onClick={() => navigate('/crm/reports')}
        />

        {/* Total Leads & Win Rate */}
        <StatCard
          label="Active Leads"
          value={loadingLeads ? '...' : leads.length}
          icon={Target}
          subtext={
            <span className="font-medium text-[#244A70]">
              Win rate: {reports?.conversionRate || 34}%
            </span>
          }
          onClick={() => navigate('/crm/pipeline')}
        />

        {/* Discount Approval Requests */}
        <StatCard
          label="Pending Discount Approvals"
          value={loadingDiscounts ? '...' : pendingDiscounts.length}
          icon={Percent}
          subtext={
            pendingDiscounts.length > 0 ? (
              <span className="font-medium text-amber-800">
                Requires discount review
              </span>
            ) : (
              <span className="font-medium text-emerald-700">
                All clear
              </span>
            )
          }
          onClick={() => navigate('/crm/discounts')}
        />

        {/* Average Deal Size */}
        <StatCard
          label="Average Contract Value"
          value={formatVnd(reports?.avgDealSize ?? 24500)}
          icon={TrendingUp}
          subtext={
            <span className="font-medium text-[#17263A]">
              Enterprise Modernization Tiers
            </span>
          }
          onClick={() => navigate('/crm/reports')}
        />
      </div>

      {/* ── Pipeline Breakdown by Stage ───────────────────────── */}
      <div className="bg-white rounded-lg border border-[#DCE3EC] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#EEF1F6] pb-3.5">
          <div>
            <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#244A70]" />
              Sales Pipeline Stages
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/crm/pipeline')}
            className="text-xs font-semibold gap-1"
          >
            <span>Kanban Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-0.5">
          {[
            { key: 'NEW', label: '1. New', bg: 'bg-[#F8FAFC] border-[#DCE3EC] text-[#17263A]', count: stageCounts.NEW },
            { key: 'CONTACTED', label: '2. Contacted', bg: 'bg-blue-50/60 border-blue-200 text-[#244A70]', count: stageCounts.CONTACTED },
            { key: 'QUALIFIED', label: '3. Qualified', bg: 'bg-slate-50 border-slate-200 text-[#17263A]', count: stageCounts.QUALIFIED },
            { key: 'PROPOSAL', label: '4. Proposal', bg: 'bg-amber-50/60 border-amber-200 text-amber-900', count: stageCounts.PROPOSAL },
            { key: 'NEGOTIATION', label: '5. Negotiation', bg: 'bg-[#EEF1F6] border-[#DCE3EC] text-[#17263A]', count: stageCounts.NEGOTIATION },
            { key: 'WON', label: '6. Won', bg: 'bg-emerald-50/60 border-emerald-200 text-emerald-900', count: stageCounts.WON },
            { key: 'LOST', label: '7. Lost', bg: 'bg-rose-50/60 border-rose-200 text-rose-900', count: stageCounts.LOST },
          ].map((stage) => (
            <div
              key={stage.key}
              role="button"
              tabIndex={0}
              onClick={() => navigate('/crm/pipeline')}
              className={`p-2.5 rounded-md border ${stage.bg} text-center hover:shadow-xs transition-all cursor-pointer`}
            >
              <span className="text-xs font-semibold block truncate">{stage.label}</span>
              <p className="text-xl font-bold mt-1.5">{stage.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Discount Approvals & Next Activities ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Discount Approval Requests */}
        <div className="bg-white rounded-lg border border-[#DCE3EC] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EEF1F6] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
                <Percent className="w-4 h-4 text-amber-700" />
                Pending Discount Requests
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/crm/discounts')}
              className="text-xs font-semibold"
            >
              All Requests
            </Button>
          </div>

          <div className="space-y-2.5">
            {loadingDiscounts ? (
              <div className="text-xs text-slate-600 py-6 text-center">Loading discount requests...</div>
            ) : pendingDiscounts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-600">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                No discount requests pending review.
              </div>
            ) : (
              pendingDiscounts.slice(0, 3).map((item) => (
                <div
                  key={item.quoteId}
                  className="p-3 rounded-lg bg-amber-50/70 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#17263A]">{item.leadCompany}</span>
                      <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 text-xs border border-amber-300">
                        -{item.discountPercent}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">
                      Sale Rep: <span className="font-semibold text-[#17263A]">{item.assignedToName || item.requestId}</span> • Value: {formatVnd(item.proposedFinalPrice)}
                    </p>
                  </div>

                  {(canApproveDiscounts || canRejectDiscounts) && (
                    <div className="flex items-center gap-1.5 shrink-0">
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
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
                              rejectionReason: 'Exceeds authorized discount threshold',
                            })
                          }
                          disabled={reviewMutation.isPending}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-700 text-white hover:bg-rose-800 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
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

        {/* Upcoming Activities */}
        <div className="bg-white rounded-lg border border-[#DCE3EC] p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#EEF1F6] pb-3 mb-3">
              <div>
                <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#244A70]" />
                  Upcoming Activities
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/crm/leads')}
                className="text-xs font-semibold"
              >
                View Leads
              </Button>
            </div>

            <div className="space-y-2.5">
              {urgentFollowUps.map((lead) => (
                <div
                  key={lead.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/crm/leads/${lead.id}`)}
                  className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100/70 text-xs transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#17263A]">{lead.company}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#EEF1F6] text-[#244A70] font-medium border border-[#DCE3EC]">
                        {lead.stage}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">
                      Contact: <span className="font-semibold text-[#17263A]">{lead.contactName}</span> ({lead.email})
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-[#244A70]">
                      {formatVnd(lead.dealValue ?? 15000)}
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5">Open &rarr;</p>
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

export default SalesOverview;
