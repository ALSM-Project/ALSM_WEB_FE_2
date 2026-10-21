import React, { useState } from 'react';
import { 
  ArrowRight, ShieldCheck, AlertCircle, CheckCircle2, 
  FolderKanban, User, Check, AlertTriangle, FileText
} from 'lucide-react';
import { Modal, Button } from '@/shared/ui';

export interface TransferableResource {
  id: string;
  name: string;
  type: string; // e.g. 'Modernization Project', 'Batch Queue Job', 'Customer Account'
  currentOwnerId?: string;
  currentOwnerName?: string;
  details?: string;
  pendingTasksCount?: number;
}

export interface CandidateAssignee {
  id: string;
  fullName: string;
  email: string;
  role?: string;
  isActive: boolean;
  isLocked?: boolean;
  activeWorkload?: number; // active projects or tasks assigned
  maxCapacity?: number;
}

interface ResourceTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: TransferableResource | null;
  candidates: CandidateAssignee[];
  onTransferConfirm: (
    resourceId: string, 
    newAssignee: CandidateAssignee, 
    reason: string, 
    notes: string
  ) => Promise<void> | void;
}

const COMMON_REASONS = [
  'Workload Balancing',
  'Reassignment',
  'Offboarding',
  'Leave of Absence',
  'Other',
];

export const ResourceTransferModal: React.FC<ResourceTransferModalProps> = ({
  isOpen,
  onClose,
  resource,
  candidates,
  onTransferConfirm,
}) => {
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [reason, setReason] = useState<string>('Workload Balancing');
  const [notes, setNotes] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!resource) return null;

  // Filter eligible assignees: must be active, not locked, and not current owner
  const eligibleCandidates = candidates.filter(
    (c) => c.isActive && !c.isLocked && c.id !== resource.currentOwnerId
  );

  const selectedCandidate = candidates.find((c) => c.id === selectedAssigneeId);
  const isSelectedAtCapacity = selectedCandidate && (selectedCandidate.activeWorkload ?? 0) >= (selectedCandidate.maxCapacity ?? 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedAssigneeId) {
      setErrorMessage('Please select an eligible successor assignee.');
      return;
    }

    if (!selectedCandidate) {
      setErrorMessage('The selected candidate was not found.');
      return;
    }

    if (!confirmed) {
      setErrorMessage('You must check the explicit confirmation box to execute ownership transfer.');
      return;
    }

    try {
      setSubmitting(true);
      await onTransferConfirm(resource.id, selectedCandidate, reason, notes);
      setSuccessMessage(`Ownership of "${resource.name}" successfully transferred to ${selectedCandidate.fullName}.`);
      setTimeout(() => {
        setSuccessMessage(null);
        setSelectedAssigneeId('');
        setConfirmed(false);
        setNotes('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to complete ownership transfer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Resource Ownership"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Resource Details Header */}
        <div className="p-3.5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-[#0652CC]">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-[#091E42] text-sm">{resource.name}</div>
              <div className="text-[11px] text-[#6B778C] flex items-center gap-2 mt-0.5">
                <span className="font-mono">{resource.id}</span>
                <span>•</span>
                <span className="font-medium text-[#091E42]">{resource.type}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider block">Current Owner</span>
            <span className="font-semibold text-[#091E42] mt-0.5 inline-block">
              {resource.currentOwnerName || 'Unassigned / System'}
            </span>
          </div>
        </div>

        {/* Select New Assignee (Single Assignee Rule Enforced) */}
        <div>
          <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
            New Assignee (Eligible Internal Staff) *
          </label>
          <div className="space-y-1.5">
            <select
              value={selectedAssigneeId}
              onChange={(e) => setSelectedAssigneeId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-[#D9E2EC] rounded-xl text-xs font-medium text-[#091E42] focus:ring-2 focus:ring-[#0652CC] outline-none"
            >
              <option value="">Select single eligible successor assignee...</option>
              {eligibleCandidates.map((c) => {
                const load = c.activeWorkload ?? 0;
                const cap = c.maxCapacity ?? 5;
                const isFull = load >= cap;
                return (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.email}) — [{c.role || 'Staff'}] — Load: {load}/{cap} {isFull ? '(AT CAPACITY)' : ''}
                  </option>
                );
              })}
            </select>

            {selectedCandidate && (
              <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                isSelectedAtCapacity 
                  ? 'bg-amber-50 border-amber-200 text-amber-800' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <div className="flex items-center gap-2">
                  {isSelectedAtCapacity ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>
                    Selected: <strong>{selectedCandidate.fullName}</strong> ({selectedCandidate.role || 'Staff'})
                  </span>
                </div>
                <div className="text-[11px] font-mono font-bold">
                  Workload: {selectedCandidate.activeWorkload ?? 0} / {selectedCandidate.maxCapacity ?? 5} active projects
                  {isSelectedAtCapacity && ' (Warning: At full capacity)'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reason for Transfer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Reason for Transfer *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
            >
              {COMMON_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Reference / Note
            </label>
            <input
              type="text"
              placeholder="e.g. Q4 workload rebalance, Ticket #402"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
            />
          </div>
        </div>

        {/* Transfer Preview Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
          <span className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider block">
            Transfer Preview & Impact Assessment
          </span>
          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-[#E5EAF0]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[#6B778C]">
                {(resource.currentOwnerName || 'U').charAt(0)}
              </div>
              <div>
                <div className="text-[10px] text-[#6B778C]">Current Owner</div>
                <div className="font-semibold text-[#091E42]">{resource.currentOwnerName || 'Unassigned'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[#0652CC] font-bold">
              <span className="text-[10px] uppercase font-mono tracking-wider">Transfer To</span>
              <ArrowRight className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2 text-right">
              <div>
                <div className="text-[10px] text-[#6B778C]">New Assignee</div>
                <div className="font-semibold text-[#091E42]">
                  {selectedCandidate ? selectedCandidate.fullName : 'Select above...'}
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center font-bold text-[#0652CC]">
                {(selectedCandidate?.fullName || '?').charAt(0)}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#6B778C] bg-white p-2.5 rounded-lg border border-[#E5EAF0] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0652CC] shrink-0" />
            <span>
              <strong>Impact Statement:</strong> Modernization queue items, active conversions, and repository access
              for <strong>"{resource.name}"</strong> will transition immediately to the designated successor.
            </span>
          </div>
        </div>

        {/* Explicit Confirmation Step */}
        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-[#0652CC] focus:ring-[#0652CC]"
            />
            <span className="text-xs text-[#091E42] font-semibold leading-relaxed">
              I confirm the ownership transfer of this resource under reason "{reason}". The transfer will be logged in audit history.
            </span>
          </label>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5EAF0]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || !selectedAssigneeId || !confirmed}
            className="bg-[#0652CC] text-white hover:bg-[#0543A8]"
          >
            {submitting ? 'Executing Transfer...' : 'Execute Ownership Transfer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
