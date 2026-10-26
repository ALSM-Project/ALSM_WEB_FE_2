import React, { useState, useEffect } from 'react';
import { X, TrendingUp, AlertCircle, CheckCircle, Loader2, ChevronRight } from 'lucide-react';
import type { Lead, LeadStatus } from '../types/lead';
import {
  LEAD_STATUS_LABELS,
  getAllowedTransitions,
} from '../types/lead';
import { useUpdateLeadStatus } from '../hooks/useLeads';
import { useAuth } from '@/features/auth/hooks/useAuth';

const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string; dot: string }> = {
  NEW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  CONTACTED: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500' },
  QUALIFIED: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  PROPOSAL: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  NEGOTIATION: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  WON: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  LOST: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
};

interface UpdateLeadStatusModalProps {
  lead: Lead | null;
  onClose: () => void;
  onSuccess?: (updatedLead: Lead) => void;
}

export const UpdateLeadStatusModal: React.FC<UpdateLeadStatusModalProps> = ({
  lead,
  onClose,
  onSuccess,
}) => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('sales.leads.manage');

  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const mutation = useUpdateLeadStatus();

  // Reset when lead changes
  useEffect(() => {
    setSelectedStatus(null);
    setNotes(lead?.notes ?? '');
    setSuccessMessage('');
    mutation.reset();
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lead) return null;

  const allowedNext = getAllowedTransitions(lead.status);
  const currentColors = STATUS_COLORS[lead.status];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus || !lead) return;

    mutation.mutate(
      { id: lead.id, status: selectedStatus, notes: notes.trim() || undefined },
      {
        onSuccess: (res) => {
          setSuccessMessage(res.message);
          onSuccess?.(res.lead);
        },
      },
    );
  };

  const handleClose = () => {
    mutation.reset();
    setSuccessMessage('');
    setSelectedStatus(null);
    onClose();
  };

  const isSubmitting = mutation.isPending;
  const isSuccess = mutation.isSuccess;
  const errorMsg = mutation.isError
    ? ((mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      'An unexpected error occurred. Please try again.')
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        id="update-lead-status-modal"
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-[#E8ECF1] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8ECF1] bg-[#F7F9FC]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0652CC] to-[#4C9AFF] flex items-center justify-center text-white shadow-sm">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#091E42]">Update Lead Status</h2>
              <p className="text-[11px] text-[#6B778C] truncate max-w-[260px]">{lead.companyName}</p>
            </div>
          </div>
          <button
            id="close-update-status-modal-btn"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[#6B778C] hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Current Status */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#6B778C] font-medium">Current status:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentColors.bg} ${currentColors.text} ${currentColors.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${currentColors.dot}`} />
              {LEAD_STATUS_LABELS[lead.status]}
            </span>
          </div>

          {/* Permission guard */}
          {!canManage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>You do not have permission to update lead status. Requires <strong>sales.leads.manage</strong>.</span>
            </div>
          )}

          {/* Success state */}
          {isSuccess && successMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error state */}
          {errorMsg && (
            <div
              id="update-status-error-msg"
              className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" id="update-lead-status-form">
            {/* Status Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#091E42] mb-2 uppercase tracking-wider">
                Select New Status
              </label>
              {allowedNext.length === 0 ? (
                <p className="text-xs text-[#6B778C] italic">No further transitions are available from this status.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {allowedNext.map((status) => {
                    const c = STATUS_COLORS[status];
                    const isSelected = selectedStatus === status;
                    return (
                      <button
                        key={status}
                        id={`status-option-${status.toLowerCase()}`}
                        type="button"
                        disabled={!canManage || isSubmitting || isSuccess}
                        onClick={() => setSelectedStatus(status)}
                        className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-lg border-2 text-left transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                          ${isSelected
                            ? `${c.bg} ${c.border} ${c.text} shadow-sm ring-2 ring-offset-1 ring-current/20`
                            : 'bg-white border-[#E8ECF1] text-[#42526E] hover:border-[#0652CC]/40 hover:bg-[#F7F9FC]'
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                          <span className="text-xs font-semibold">{LEAD_STATUS_LABELS[status]}</span>
                        </div>
                        {isSelected && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="status-update-notes" className="block text-xs font-semibold text-[#091E42] mb-1.5 uppercase tracking-wider">
                Notes <span className="text-[#6B778C] font-normal normal-case">(optional)</span>
              </label>
              <textarea
                id="status-update-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canManage || isSubmitting || isSuccess}
                rows={3}
                maxLength={2000}
                placeholder="Add context, reason, or next steps for this status change…"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] text-[#091E42] placeholder-[#8993A4] resize-none focus:outline-none focus:ring-2 focus:ring-[#0652CC]/40 focus:border-[#0652CC] transition-colors disabled:bg-[#F7F9FC] disabled:opacity-60"
              />
              <p className="text-[10px] text-[#8993A4] mt-1">{notes.length}/2000 characters</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-1">
              <button
                id="cancel-update-status-btn"
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-[#D9E2EC] text-[#091E42] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {isSuccess ? 'Close' : 'Cancel'}
              </button>
              {canManage && !isSuccess && (
                <button
                  id="submit-update-status-btn"
                  type="submit"
                  disabled={!selectedStatus || isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0652CC] text-white hover:bg-[#0747b8] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating…</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Update Status</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdateLeadStatusModal;
