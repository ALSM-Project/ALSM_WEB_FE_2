import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, RefreshCw, ShieldCheck, 
  AlertTriangle, Eye, Info, Send
} from 'lucide-react';
import { crmApi, PendingDiscountDto } from '../api/crm.api';
import { Button, Modal } from '@/shared/ui';
import { formatVnd } from '@/shared/utils/currency';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const DiscountApprovalPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const canApprove = Boolean(user?.isPlatformAdmin || hasPermission('sales.discounts.approve'));
  const canReject = Boolean(user?.isPlatformAdmin || hasPermission('sales.discounts.reject'));

  const [discounts, setDiscounts] = useState<PendingDiscountDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'REQUIRES_HIGHER_APPROVAL' | 'APPROVED' | 'REJECTED'>('ALL');

  // Modals
  const [detailItem, setDetailItem] = useState<PendingDiscountDto | null>(null);
  const [approveItem, setApproveItem] = useState<PendingDiscountDto | null>(null);
  const [rejectItem, setRejectItem] = useState<PendingDiscountDto | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const MANAGER_LIMIT = 20; // 20% Sales Manager approval threshold

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const data = await crmApi.getPendingDiscounts();
      setDiscounts(data);
    } catch (err: any) {
      console.error('Failed to load pending discounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleApproveConfirm = async () => {
    if (!approveItem || !canApprove) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await crmApi.reviewDiscount({
        leadId: approveItem.leadId,
        quoteId: approveItem.quote.id,
        approved: true,
        reviewer: 'Sales Manager (Alex Mercer)',
      });
      setSuccessMsg(`Quote discount for ${approveItem.leadCompany} approved. Quote is now marked APPROVED and eligible for client delivery.`);
      setApproveItem(null);
      if (detailItem?.quote.id === approveItem.quote.id) setDetailItem(null);
      fetchDiscounts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve discount');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalateToVP = async (item: PendingDiscountDto) => {
    if (!canApprove) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await crmApi.reviewDiscount({
        leadId: item.leadId,
        quoteId: item.quote.id,
        approved: false,
        escalateToVP: true,
        reviewer: 'Sales Manager (Alex Mercer)',
      });
      setSuccessMsg(`Quote discount for ${item.leadCompany} escalated to VP of Sales for executive approval.`);
      if (detailItem?.quote.id === item.quote.id) setDetailItem(null);
      fetchDiscounts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to escalate discount');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectItem || !canReject || !rejectionReason.trim()) {
      if (!canReject) {
        setErrorMsg('You lack permission to reject discount requests.');
      } else {
        setErrorMsg('A specific rejection rationale is mandatory.');
      }
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await crmApi.reviewDiscount({
        leadId: rejectItem.leadId,
        quoteId: rejectItem.quote.id,
        approved: false,
        rejectionReason: rejectionReason.trim(),
        reviewer: 'Sales Manager (Alex Mercer)',
      });
      setSuccessMsg(`Discount request for ${rejectItem.leadCompany} rejected. Rationale recorded in audit log.`);
      setRejectItem(null);
      setRejectionReason('');
      if (detailItem?.quote.id === rejectItem.quote.id) setDetailItem(null);
      fetchDiscounts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject discount');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDiscounts = discounts.filter((d) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return d.status === 'PENDING';
    if (statusFilter === 'REQUIRES_HIGHER_APPROVAL') return d.status === 'REQUIRES_HIGHER_APPROVAL' || (d.discountPercent > MANAGER_LIMIT && d.status === 'PENDING');
    if (statusFilter === 'APPROVED') return d.status === 'APPROVED';
    if (statusFilter === 'REJECTED') return d.status === 'REJECTED';
    return true;
  });

  const pendingCount = discounts.filter((d) => d.status === 'PENDING').length;
  const higherApprovalCount = discounts.filter((d) => d.status === 'REQUIRES_HIGHER_APPROVAL' || (d.discountPercent > MANAGER_LIMIT && d.status === 'PENDING')).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5EAF0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091E42]">Discount Approval Requests</h1>
          <p className="text-xs text-[#6B778C] mt-1">
            Section 3.12: Commercial manager oversight queue. Standard approval authority limit is 20%. Discounts exceeding 20% require VP escalation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDiscounts}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-4 py-2 text-xs font-semibold text-[#091E42] shadow-xs hover:bg-[#F4F6F8] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Authority Policy Card */}
      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-100 text-[#0652CC] shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-blue-950">Active Manager Authorization Scope</h4>
            <p className="text-slate-600 mt-0.5 leading-relaxed">
              You are signed in as <strong>Alex Mercer (Commercial Sales Manager)</strong>. Your pre-authorized margin discount limit is <strong>20.0%</strong>.
              Requests above 20% are flagged as <em>Requires Higher Approval</em> and must be escalated to executive leadership.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Your Limit</span>
            <span className="text-sm font-bold text-[#0652CC]">20% Max</span>
          </div>
          <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">VP Level</span>
            <span className="text-sm font-bold text-indigo-700">&gt;20% Limit</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: `All Requests (${discounts.length})` },
          { key: 'PENDING', label: `Pending Manager Review (${pendingCount})` },
          { key: 'REQUIRES_HIGHER_APPROVAL', label: `Requires VP Approval (${higherApprovalCount})` },
          { key: 'APPROVED', label: `Approved (${discounts.filter(d => d.status === 'APPROVED').length})` },
          { key: 'REJECTED', label: `Rejected (${discounts.filter(d => d.status === 'REJECTED').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === tab.key
                ? 'bg-[#0652CC] text-white shadow-xs'
                : 'bg-white border border-[#E5EAF0] text-[#091E42] hover:bg-[#F7F9FC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 font-bold">&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 font-bold">&times;</button>
        </div>
      )}

      {/* Discount Approvals Table */}
      <div className="rounded-2xl border border-[#E5EAF0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                <th className="py-3 px-4">Request # & Account</th>
                <th className="py-3 px-4">Sales Rep</th>
                <th className="py-3 px-4">Quote Scope</th>
                <th className="py-3 px-4">Base Fee</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Proposed Price</th>
                <th className="py-3 px-4">Status & Authority</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B778C]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin" />
                      <span>Checking approval queue...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B778C]">
                    <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500/60 mb-2" />
                    No discount requests matching current filter.
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((item) => {
                  const isExceedingLimit = item.discountPercent > MANAGER_LIMIT;
                  const isPending = item.status === 'PENDING';
                  const isHigherApproval = item.status === 'REQUIRES_HIGHER_APPROVAL' || (isExceedingLimit && isPending);
                  const isApproved = item.status === 'APPROVED';
                  const isRejected = item.status === 'REJECTED';

                  return (
                    <tr key={item.quote.id} className="hover:bg-[#F9FBFF] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[10px] font-bold text-blue-600">{item.requestId}</div>
                        <div className="font-semibold text-[#091E42] mt-0.5">{item.leadCompany}</div>
                        <div className="text-[11px] text-[#6B778C]">{item.leadContact}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#091E42]">
                        <div className="font-medium">{item.assignedToName}</div>
                        <div className="text-[10px] text-slate-400">Enterprise Rep</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-[#091E42] font-semibold">{item.quote.plan}</div>
                        <div className="text-[11px] font-mono text-[#6B778C]">{item.quote.quoteNumber}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#6B778C]">
                        {formatVnd(item.originalPrice)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          isExceedingLimit ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.discountPercent}% (-{formatVnd(item.discountAmount)})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        {formatVnd(item.proposedFinalPrice)}
                      </td>
                      <td className="py-3.5 px-4">
                        {isApproved && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                            Rejected
                          </span>
                        )}
                        {isHigherApproval && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 block w-fit" title="Exceeds standard 20% manager limit">
                            Requires VP Approval
                          </span>
                        )}
                        {isPending && !isExceedingLimit && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailItem(item)}
                            className="text-xs border-[#E5EAF0] text-[#091E42] hover:bg-[#F7F9FC] py-1"
                            title="View full quote rationale and details"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                            Details
                          </Button>

                          {isPending && (
                            <>
                              {canReject && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={actionLoading}
                                  onClick={() => setRejectItem(item)}
                                  className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 py-1"
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-1" />
                                  Reject
                                </Button>
                              )}

                              {canApprove && (
                                !isExceedingLimit ? (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    disabled={actionLoading}
                                    onClick={() => setApproveItem(item)}
                                    className="text-xs bg-emerald-600 hover:bg-emerald-700 py-1"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                    Approve
                                  </Button>
                                ) : (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    disabled={actionLoading}
                                    onClick={() => handleEscalateToVP(item)}
                                    className="text-xs bg-indigo-600 hover:bg-indigo-700 py-1 text-white"
                                    title="Escalate to VP of Sales for >20% authorization"
                                  >
                                    <Send className="w-3.5 h-3.5 mr-1" />
                                    Escalate to VP
                                  </Button>
                                )
                              )}

                              {!canApprove && !canReject && (
                                <span className="text-[11px] text-slate-400 font-medium px-1.5 py-0.5 rounded bg-slate-100">
                                  View Only
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {detailItem && (
        <Modal
          isOpen={!!detailItem}
          onClose={() => setDetailItem(null)}
          title={`Discount Request: ${detailItem.requestId} - ${detailItem.leadCompany}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Account</span>
                  <div className="font-semibold text-slate-900 mt-0.5">{detailItem.leadCompany}</div>
                  <div className="text-[11px] text-slate-500">{detailItem.leadContact}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Sales Representative</span>
                  <div className="font-semibold text-slate-900 mt-0.5">{detailItem.assignedToName}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Quote Reference</span>
                  <div className="font-mono font-semibold text-blue-600 mt-0.5">{detailItem.quote.quoteNumber}</div>
                  <div className="text-[11px] text-slate-500">{detailItem.quote.plan}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Submitted Date</span>
                  <div className="text-slate-700 mt-0.5">{new Date(detailItem.submittedAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Standard Baseline Fee:</span>
                <span>{formatVnd(detailItem.originalPrice)}</span>
              </div>
              <div className="flex justify-between text-amber-800 font-semibold">
                <span>Requested Discount ({detailItem.discountPercent}%):</span>
                <span>{formatVnd(-detailItem.discountAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                <span>Proposed Annual Contract Value:</span>
                <span className="text-emerald-700">{formatVnd(detailItem.proposedFinalPrice)}</span>
              </div>
            </div>

            {/* Sales Rationale */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">
                Representative Justification
              </span>
              <p className="text-slate-800 leading-relaxed italic">
                "{detailItem.justification}"
              </p>
            </div>

            {/* Authority Limit Notice */}
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              detailItem.discountPercent > MANAGER_LIMIT
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}>
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">
                  {detailItem.discountPercent > MANAGER_LIMIT ? 'Requires Executive Escalation' : 'Within Manager Approval Authority'}
                </span>
                <p className="text-[11px] mt-0.5 leading-relaxed">
                  {detailItem.discountPercent > MANAGER_LIMIT
                    ? `This ${detailItem.discountPercent}% discount request exceeds your 20% limit. As a Commercial Sales Manager, you cannot authorize this directly. Please escalate to the VP of Sales.`
                    : `This ${detailItem.discountPercent}% discount is within your 20% manager discretion threshold. Approving will mark the quote as APPROVED for client acceptance.`}
                </p>
              </div>
            </div>

            {/* Rejection notice if already rejected */}
            {detailItem.status === 'REJECTED' && detailItem.rejectionReason && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                <span className="font-bold text-[11px] uppercase tracking-wider block">Rejection Rationale</span>
                <p className="text-xs italic">"{detailItem.rejectionReason}"</p>
                <span className="text-[10px] text-slate-500 font-mono block mt-1">Reviewer: {detailItem.reviewedBy}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setDetailItem(null)}>
                Close
              </Button>

              {detailItem.status === 'PENDING' && (
                <div className="flex items-center gap-2">
                  {canReject && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => {
                        setRejectItem(detailItem);
                      }}
                    >
                      Reject Request
                    </Button>
                  )}

                  {canApprove && (
                    detailItem.discountPercent <= MANAGER_LIMIT ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setApproveItem(detailItem)}
                      >
                        Approve Discount
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => handleEscalateToVP(detailItem)}
                      >
                        Escalate to VP
                      </Button>
                    )
                  )}

                  {!canApprove && !canReject && (
                    <span className="text-xs text-slate-500 italic">
                      View-only mode (Approval permissions required to process)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Approve Confirmation Modal */}
      {approveItem && (
        <Modal
          isOpen={!!approveItem}
          onClose={() => setApproveItem(null)}
          title="Confirm Discount Authorization"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-700 leading-relaxed">
              You are authorizing a <strong>{approveItem.discountPercent}%</strong> commercial discount for{' '}
              <strong>{approveItem.leadCompany}</strong>.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Baseline Fee:</span>
                <span>{formatVnd(approveItem.originalPrice)}</span>
              </div>
              <div className="flex justify-between text-amber-700 font-semibold">
                <span>Authorized Discount ({approveItem.discountPercent}%):</span>
                <span>{formatVnd(-approveItem.discountAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5">
                <span>Final Contract Value:</span>
                <span className="text-emerald-700">{formatVnd(approveItem.proposedFinalPrice)}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px]">
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Audit Trail Notice
              </span>
              <p className="mt-0.5">
                Upon confirmation, quote <strong>{approveItem.quote.quoteNumber}</strong> will be marked as APPROVED in the shared CRM repository and made available for customer contract execution.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
              <Button type="button" variant="outline" size="sm" onClick={() => setApproveItem(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={actionLoading}
                onClick={handleApproveConfirm}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectItem && (
        <Modal
          isOpen={!!rejectItem}
          onClose={() => setRejectItem(null)}
          title="Reject Discount Request"
        >
          <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
            <p className="text-[#6B778C]">
              Specify why the requested discount of{' '}
              <strong className="text-[#091E42]">{rejectItem.discountPercent}%</strong> for{' '}
              <strong className="text-[#091E42]">{rejectItem.leadCompany}</strong> cannot be approved.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#091E42] mb-1">
                Rejection Reason *
              </label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Exceeds allowable gross margin for Tier 2 scope; recommend maximum 12% discount or multi-year commitment."
                className="w-full text-xs p-2.5 rounded-xl border border-[#D9E2EC] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
              <Button type="button" variant="outline" size="sm" onClick={() => setRejectItem(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={actionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default DiscountApprovalPage;
