import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UserMinus,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Plus,
  FileText,
  Ban,
} from 'lucide-react';
import { Button, Modal } from '@/shared/ui';
import {
  offboardingApprovalApi,
  OffboardingRequestDto,
  OffboardingRequestStatus,
} from '../api/offboarding-approval.api';

export const UserOffboardingApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isUnderAdmin = location.pathname.startsWith('/admin');
  const basePath = isUnderAdmin ? '/admin/offboarding-approvals' : '/team-lead/offboarding-approvals';

  const [requests, setRequests] = useState<OffboardingRequestDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | OffboardingRequestStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick Approval Modal State (from list)
  const [approveTarget, setApproveTarget] = useState<OffboardingRequestDto | null>(null);
  const [approvalNote, setApprovalNote] = useState<string>('');
  const [approvalConfirmed, setApprovalConfirmed] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Quick Rejection Modal State (from list)
  const [rejectTarget, setRejectTarget] = useState<OffboardingRequestDto | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionNote, setRejectionNote] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Load initial offboarding requests
  const loadRequests = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await offboardingApprovalApi.listRequests({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setRequests(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load offboarding requests';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  // Navigate to dedicated create page
  const handleNavigateCreate = () => {
    navigate(`${basePath}/create`);
  };

  // Navigate to dedicated detail page
  const handleNavigateDetail = (requestId: string) => {
    navigate(`${basePath}/${requestId}`);
  };

  // Open Approval Confirmation
  const handleOpenApprove = (e: React.MouseEvent, req: OffboardingRequestDto) => {
    e.stopPropagation();
    setApproveTarget(req);
    setApprovalNote('');
    setApprovalConfirmed(false);
    setApprovalError(null);
  };

  // Execute Approval
  const handleConfirmApprove = async () => {
    if (!approveTarget) return;
    if (!approvalConfirmed) {
      setApprovalError('Please confirm that you have reviewed the security and resource impact');
      return;
    }

    try {
      setIsApproving(true);
      setApprovalError(null);

      await offboardingApprovalApi.approveRequest(approveTarget.id, {
        transferToUserId: approveTarget.transferToUserId,
        note: approvalNote.trim() || undefined,
      });

      setSuccessMsg(
        `Offboarding for ${approveTarget.targetUserName} approved and executed successfully.`,
      );
      setApproveTarget(null);
      loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to execute offboarding approval';
      setApprovalError(msg);
    } finally {
      setIsApproving(false);
    }
  };

  // Open Rejection Modal
  const handleOpenReject = (e: React.MouseEvent, req: OffboardingRequestDto) => {
    e.stopPropagation();
    setRejectTarget(req);
    setRejectionReason('');
    setRejectionNote('');
    setRejectError(null);
  };

  // Submit Rejection
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      setRejectError('A rejection reason is mandatory to guide the requester');
      return;
    }

    try {
      setIsRejecting(true);
      setRejectError(null);
      await offboardingApprovalApi.rejectRequest(rejectTarget.id, {
        rejectionReason: rejectionReason.trim(),
        note: rejectionNote.trim() || undefined,
      });
      setSuccessMsg(`Offboarding request for ${rejectTarget.targetUserName} rejected.`);
      setRejectTarget(null);
      loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject offboarding request';
      setRejectError(msg);
    } finally {
      setIsRejecting(false);
    }
  };

  // Computed filtered list
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        searchTerm === '' ||
        r.targetUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.targetUserEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.teamName && r.teamName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        r.requestedByName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [requests, searchTerm]);

  // KPI Metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'PENDING' || r.status === 'PENDING_APPROVAL').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED' || r.status === 'COMPLETED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">
            Offboarding Approvals
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage employee departure requests, project handovers, and credential revocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadRequests}
            className="flex items-center gap-1.5"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleNavigateCreate}
            className="flex items-center gap-1.5 bg-[#244A70] hover:bg-[#244A70]/90 text-white"
          >
            <Plus className="w-4 h-4" />
            Request Offboarding
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Requests
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{totalCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Pending Review
            </div>
            <div className="text-2xl font-bold text-amber-900 mt-1 flex items-center gap-2">
              {pendingCount}
              {pendingCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Approved
            </div>
            <div className="text-2xl font-bold text-emerald-900 mt-1">{approvedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Rejected
            </div>
            <div className="text-2xl font-bold text-rose-900 mt-1">{rejectedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? 'All Requests' : status}
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                  {status === 'ALL'
                    ? totalCount
                    : status === 'PENDING'
                    ? pendingCount
                    : status === 'APPROVED'
                    ? approvedCount
                    : rejectedCount}
                </span>
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search staff, team, requester..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#244A70] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#244A70] mb-2" />
            <p className="text-xs">Loading offboarding requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <UserMinus className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No offboarding requests found</p>
            <p className="text-xs text-slate-400 mt-1">
              {statusFilter !== 'ALL'
                ? `There are no requests matching filter "${statusFilter}".`
                : 'No offboarding requests have been submitted yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Target Staff</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4">Successor</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => handleNavigateDetail(req.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    {/* Staff info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {req.targetUserName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{req.targetUserName}</div>
                          <div className="text-[11px] text-slate-500">{req.targetUserEmail}</div>
                        </div>
                      </div>
                    </td>

                    {/* Offboarding Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {req.offboardingType || 'Resignation'}
                      </span>
                    </td>

                    {/* Team */}
                    <td className="py-3.5 px-4">
                      <span className="text-slate-700 font-medium">
                        {req.teamName || 'Operational Team'}
                      </span>
                    </td>

                    {/* Requested By */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 font-medium">{req.requestedByName}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Proposed Successor */}
                    <td className="py-3.5 px-4">
                      {req.transferToUserName ? (
                        <span className="font-medium text-slate-800">
                          {req.transferToUserName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <span className="text-slate-700 line-clamp-1" title={req.reason}>
                        {req.reason}
                      </span>
                      {req.note && (
                        <span className="text-[10px] text-slate-400 italic block line-clamp-1" title={req.note}>
                          "{req.note}"
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {(req.status === 'PENDING' || req.status === 'PENDING_APPROVAL') && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 text-amber-700" />
                          Pending Review
                        </span>
                      )}
                      {(req.status === 'APPROVED' || req.status === 'COMPLETED') && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          Approved
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3 text-rose-700" />
                          Rejected
                        </span>
                      )}
                      {req.status === 'CANCELLED' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 w-fit">
                          <Ban className="w-3 h-3 text-slate-500" />
                          Cancelled
                        </span>
                      )}
                      {req.status === 'DRAFT' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 text-slate-500" />
                          Draft
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNavigateDetail(req.id)}
                          className="text-xs font-semibold hover:bg-slate-50"
                        >
                          Review Impact
                        </Button>

                        {(req.status === 'PENDING' || req.status === 'PENDING_APPROVAL') && (
                          <>
                            <button
                              onClick={(e) => handleOpenApprove(e, req)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#244A70] hover:bg-[#1B3856] text-white flex items-center gap-1 transition-colors shadow-xs"
                              title="Approve and execute offboarding"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={(e) => handleOpenReject(e, req)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 flex items-center gap-1 transition-colors"
                              title="Reject offboarding request"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QUICK APPROVAL CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        title="Approve User Offboarding"
        className="max-w-md"
      >
        {approveTarget && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
              <p className="font-semibold text-emerald-800">
                You are approving offboarding for:
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {approveTarget.targetUserName} ({approveTarget.targetUserEmail})
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Reason: "{approveTarget.reason}"
              </p>
            </div>

            {approvalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {approvalError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approver Note (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Add handover or archival instructions..."
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approvalConfirmed}
                  onChange={(e) => setApprovalConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700 text-[11px] leading-tight">
                  I confirm that I have reviewed the resource impact. This action will immediately terminate active sessions, reassign projects, and deactivate this account.
                </span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setApproveTarget(null)}
                disabled={isApproving}
              >
                Cancel
              </Button>
              <button
                onClick={handleConfirmApprove}
                disabled={isApproving || !approvalConfirmed}
                className="px-4 py-2 rounded-md text-xs font-semibold bg-[#244A70] hover:bg-[#1B3856] disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {isApproving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {isApproving ? 'Executing Offboard...' : 'Approve & Execute Offboarding'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* QUICK REJECTION MODAL */}
      <Modal
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Reject User Offboarding Request"
        className="max-w-md"
      >
        {rejectTarget && (
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <p className="text-slate-500">Target Staff Member:</p>
              <p className="font-bold text-slate-800 text-sm">
                {rejectTarget.targetUserName} ({rejectTarget.targetUserEmail})
              </p>
            </div>

            {rejectError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {rejectError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explain why this request is rejected (e.g. project deliverables still active, wrong successor)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Mandatory: This explanation will be sent to the requester in a system notification.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Feedback Note (Optional)
              </label>
              <input
                type="text"
                placeholder="Optional internal reviewer note..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setRejectTarget(null)}
                disabled={isRejecting}
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={isRejecting || !rejectionReason.trim()}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {isRejecting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {isRejecting ? 'Rejecting...' : 'Reject Offboarding Request'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
export default UserOffboardingApprovalPage;
