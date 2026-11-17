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
  ChevronLeft,
  ChevronRight,
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

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
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredRequests.length);
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  // KPI Metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'PENDING' || r.status === 'PENDING_APPROVAL').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED' || r.status === 'COMPLETED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">
            Offboarding Approvals
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={loadRequests}
            className="text-xs h-9"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <button
            type="button"
            onClick={handleNavigateCreate}
            className="inline-flex items-center justify-center gap-1.5 font-medium rounded-xl transition-colors bg-[#244A70] hover:bg-[#1b3855] text-white text-xs h-9 px-3.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Request Offboarding</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#DCE3EC] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8491A3] uppercase tracking-wider block">
              Total Requests
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#17263A] mt-2">{totalCount}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#DCE3EC] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
              Pending Review
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-800 mt-2 flex items-center gap-2">
            {pendingCount}
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#DCE3EC] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              Approved
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-800 mt-2">{approvedCount}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#DCE3EC] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
              Rejected
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-800 mt-2">{rejectedCount}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#F8FAFC] rounded-xl border border-[#DCE3EC] w-fit">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => {
            const label =
              status === 'ALL'
                ? 'All Requests'
                : status === 'PENDING'
                ? 'Pending Review'
                : status === 'APPROVED'
                ? 'Approved'
                : 'Rejected';
            const count =
              status === 'ALL'
                ? totalCount
                : status === 'PENDING'
                ? pendingCount
                : status === 'APPROVED'
                ? approvedCount
                : rejectedCount;
            const isSelected = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-white text-[#17263A] shadow-2xs'
                    : 'text-[#8491A3] hover:text-[#17263A]'
                }`}
              >
                {status === 'PENDING' && <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />}
                {status === 'APPROVED' && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />}
                {status === 'REJECTED' && <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />}
                <span>{label}</span>
                <span className="font-mono text-slate-500">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8491A3] pointer-events-none shrink-0" />
          <input
            type="text"
            placeholder="Search staff, team, requester..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs text-[#17263A] outline-none focus:ring-2 focus:ring-[#244A70]"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs overflow-hidden">
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
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-slate-500 font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-5">Target Staff</th>
                  <th className="py-3.5 px-4 sm:px-5">Type</th>
                  <th className="py-3.5 px-4 sm:px-5">Team</th>
                  <th className="py-3.5 px-4 sm:px-5">Requested By</th>
                  <th className="py-3.5 px-4 sm:px-5">Successor</th>
                  <th className="py-3.5 px-4 sm:px-5">Reason</th>
                  <th className="py-3.5 px-4 sm:px-5">Status</th>
                  <th className="py-3.5 px-4 sm:px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC]">
                {paginatedRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => handleNavigateDetail(req.id)}
                    className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                  >
                    {/* Staff info */}
                    <td className="py-4 px-4 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {req.targetUserName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-[#17263A] group-hover:text-[#244A70] transition-colors">
                            {req.targetUserName}
                          </div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">{req.targetUserEmail}</div>
                        </div>
                      </div>
                    </td>

                    {/* Offboarding Type */}
                    <td className="py-4 px-4 sm:px-5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {req.offboardingType || 'Resignation'}
                      </span>
                    </td>

                    {/* Team */}
                    <td className="py-4 px-4 sm:px-5">
                      <span className="text-xs font-medium text-slate-700">
                        {req.teamName || 'Operational Team'}
                      </span>
                    </td>

                    {/* Requested By */}
                    <td className="py-4 px-4 sm:px-5 whitespace-nowrap">
                      <div className="text-xs font-medium text-[#17263A]">{req.requestedByName}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Proposed Successor */}
                    <td className="py-4 px-4 sm:px-5">
                      {req.transferToUserName ? (
                        <span className="text-xs font-medium text-slate-800">
                          {req.transferToUserName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Unassigned</span>
                      )}
                    </td>

                    {/* Reason */}
                    <td className="py-4 px-4 sm:px-5 max-w-[220px]">
                      <span className="text-xs text-slate-800 line-clamp-1 font-medium" title={req.reason}>
                        {req.reason}
                      </span>
                      {req.note && (
                        <span className="text-xs text-slate-500 italic block line-clamp-1 mt-0.5" title={req.note}>
                          "{req.note}"
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 sm:px-5 whitespace-nowrap">
                      {(req.status === 'PENDING' || req.status === 'PENDING_APPROVAL') && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Pending Review
                        </span>
                      )}
                      {(req.status === 'APPROVED' || req.status === 'COMPLETED') && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Approved
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          Rejected
                        </span>
                      )}
                      {req.status === 'CANCELLED' && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1.5">
                          <Ban className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          Cancelled
                        </span>
                      )}
                      {req.status === 'DRAFT' && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          Draft
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 sm:px-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleNavigateDetail(req.id)}
                          className="h-8 px-3 text-xs font-semibold"
                        >
                          Review Impact
                        </Button>

                        {(req.status === 'PENDING' || req.status === 'PENDING_APPROVAL') && (
                          <>
                            <Button
                              onClick={(e) => handleOpenApprove(e, req)}
                              className="h-8 px-3 text-xs font-semibold shadow-xs"
                              title="Approve and execute offboarding"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              onClick={(e) => handleOpenReject(e, req)}
                              className="h-8 px-3 text-xs font-semibold"
                              title="Reject offboarding request"
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
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

        {/* Pagination Controls */}
        {filteredRequests.length > 0 && (
          <div className="px-5 py-3.5 border-t border-[#DCE3EC] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-white">
            <div className="flex items-center gap-3">
              <span className="font-medium text-slate-500">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-[#DCE3EC] bg-white px-2.5 py-1 text-xs font-medium text-slate-700 outline-none focus:border-[#244A70] cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-slate-400">|</span>
              <span>
                Showing <span className="font-semibold text-slate-900">{filteredRequests.length === 0 ? 0 : startIndex + 1}</span> to{' '}
                <span className="font-semibold text-slate-900">{endIndex}</span> of{' '}
                <span className="font-semibold text-slate-900">{filteredRequests.length}</span> requests
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[#DCE3EC] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <span className="px-2 text-xs font-semibold text-slate-700">
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[#DCE3EC] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
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
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <p className="font-semibold text-emerald-800">
                You are approving offboarding for:
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {approveTarget.targetUserName} ({approveTarget.targetUserEmail})
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Reason: "{approveTarget.reason}"
              </p>
            </div>

            {approvalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{approvalError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Approver Note (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Add handover or archival instructions..."
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                className="w-full text-xs p-2.5 border border-[#DCE3EC] rounded-xl outline-none focus:ring-2 focus:ring-[#244A70]"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-[#DCE3EC] space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approvalConfirmed}
                  onChange={(e) => setApprovalConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-[#DCE3EC] text-[#244A70] focus:ring-[#244A70]"
                />
                <span className="text-slate-700 text-xs leading-relaxed">
                  I confirm that I have reviewed the resource impact. This action will immediately terminate active sessions, reassign projects, and deactivate this account.
                </span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#DCE3EC]">
              <Button
                variant="secondary"
                onClick={() => setApproveTarget(null)}
                disabled={isApproving}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={isApproving || !approvalConfirmed}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#244A70] hover:bg-[#1b3855] disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
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
          <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
              <p className="text-xs text-slate-500">Target Staff Member:</p>
              <p className="font-bold text-[#17263A] text-sm mt-0.5">
                {rejectTarget.targetUserName} ({rejectTarget.targetUserEmail})
              </p>
            </div>

            {rejectError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{rejectError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explain why this request is rejected (e.g. project deliverables still active, wrong successor)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full text-xs p-2.5 border border-[#DCE3EC] rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Mandatory: This explanation will be sent to the requester in a system notification.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Additional Feedback Note (Optional)
              </label>
              <input
                type="text"
                placeholder="Optional internal reviewer note..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="w-full text-xs p-2.5 border border-[#DCE3EC] rounded-xl outline-none focus:ring-2 focus:ring-[#244A70]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#DCE3EC]">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setRejectTarget(null)}
                disabled={isRejecting}
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={isRejecting || !rejectionReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
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
