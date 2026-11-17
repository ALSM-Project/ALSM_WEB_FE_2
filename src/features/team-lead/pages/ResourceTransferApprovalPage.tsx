import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  Search,
  RefreshCw,
  FolderKanban,
  Check,
  X,
  ArrowRight,
  Plus,
  Users,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button, Modal } from '@/shared/ui';
import {
  transferApprovalApi,
  ResourceTransferRequestDto,
  TransferRequestStatus,
} from '../api/transfer-approval.api';

export const ResourceTransferApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ResourceTransferRequestDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransferRequestStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Approval Modal State
  const [approveTarget, setApproveTarget] = useState<ResourceTransferRequestDto | null>(null);
  const [approvalNote, setApprovalNote] = useState<string>('');
  const [approvalConfirmed, setApprovalConfirmed] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Rejection Modal State
  const [rejectTarget, setRejectTarget] = useState<ResourceTransferRequestDto | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await transferApprovalApi.listRequests(
        statusFilter === 'ALL' ? undefined : { status: statusFilter }
      );
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load transfer requests:', err);
      setErrorMsg(err?.message || 'Failed to retrieve transfer requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const openApproveModal = (req: ResourceTransferRequestDto) => {
    setApproveTarget(req);
    setApprovalNote('');
    setApprovalConfirmed(false);
    setApprovalError(null);
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveTarget) return;

    if (!approvalConfirmed) {
      setApprovalError('Please check the confirmation box to execute transfer approval.');
      return;
    }

    try {
      setIsApproving(true);
      setApprovalError(null);
      await transferApprovalApi.approveRequest(approveTarget.id, {
        note: approvalNote.trim() || undefined,
      });

      setSuccessMsg(
        `Transfer request for "${approveTarget.projectName}" successfully approved. Ownership transferred to ${approveTarget.targetAssigneeName}.`
      );
      setApproveTarget(null);
      await fetchRequests();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setApprovalError(err?.message || 'Failed to approve transfer request');
    } finally {
      setIsApproving(false);
    }
  };

  const openRejectModal = (req: ResourceTransferRequestDto) => {
    setRejectTarget(req);
    setRejectionReason('');
    setRejectError(null);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;

    if (!rejectionReason.trim()) {
      setRejectError('Please provide an explicit reason for rejection.');
      return;
    }

    try {
      setIsRejecting(true);
      setRejectError(null);
      await transferApprovalApi.rejectRequest(rejectTarget.id, {
        reason: rejectionReason.trim(),
      });

      setSuccessMsg(
        `Transfer request for "${rejectTarget.projectName}" has been rejected.`
      );
      setRejectTarget(null);
      await fetchRequests();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setRejectError(err?.message || 'Failed to reject transfer request');
    } finally {
      setIsRejecting(false);
    }
  };

  // Metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  const filteredRequests = requests.filter((r) => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return true;
    return (
      r.projectName.toLowerCase().includes(s) ||
      r.targetAssigneeName.toLowerCase().includes(s) ||
      (r.currentAssigneeName && r.currentAssigneeName.toLowerCase().includes(s)) ||
      r.requestedByName.toLowerCase().includes(s) ||
      r.reason.toLowerCase().includes(s)
    );
  });

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredRequests.length);
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17263A]">
            Transfer Approvals
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={fetchRequests}
            disabled={loading}
            className="text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Link
            to="/team-lead/resource-transfers/new"
            className="inline-flex items-center justify-center font-medium rounded-md transition-colors bg-[#244A70] hover:bg-[#244A70] text-white text-xs h-9 px-3.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>New Transfer Request</span>
          </Link>
          <Link
            to="/team-lead/projects"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE3EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#17263A] shadow-2xs hover:bg-[#F8FAFC] transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-[#244A70]" />
            Staff Allocation
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#DCE3EC] shadow-2xs">
          <span className="text-xs font-bold text-[#8491A3] uppercase tracking-wider block">Total Requests</span>
          <div className="text-2xl font-extrabold text-[#17263A] mt-2">{totalCount}</div>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#DCE3EC] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">Pending Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-800 mt-2">{pendingCount}</div>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#DCE3EC] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Approved Transfers</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-800 mt-2">{approvedCount}</div>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#DCE3EC] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">Rejected</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-800 mt-2">{rejectedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#F8FAFC] rounded-xl border border-[#DCE3EC] w-fit">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white text-[#17263A] shadow-2xs'
                : 'text-[#8491A3] hover:text-[#17263A]'
            }`}
          >
            All Requests ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-white text-amber-800 shadow-2xs'
                : 'text-[#8491A3] hover:text-[#17263A]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Pending Review ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-[#8491A3] hover:text-[#17263A]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'REJECTED'
                ? 'bg-white text-rose-800 shadow-2xs'
                : 'text-[#8491A3] hover:text-[#17263A]'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8491A3] pointer-events-none shrink-0" />
          <input
            type="text"
            placeholder="Search projects, staff, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs text-[#17263A] outline-none focus:ring-2 focus:ring-[#244A70]"
          />
        </div>
      </div>

      {/* Main Requests Table */}
      <div className="bg-white border border-[#DCE3EC] rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-5">Resource / Project</th>
                <th className="py-3.5 px-4 sm:px-5">Current Assignee</th>
                <th className="py-3.5 px-4 sm:px-5">Proposed Successor</th>
                <th className="py-3.5 px-4 sm:px-5">Reason & Briefing</th>
                <th className="py-3.5 px-4 sm:px-5">Requested By</th>
                <th className="py-3.5 px-4 sm:px-5">Status</th>
                <th className="py-3.5 px-4 sm:px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3EC]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8491A3]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-5 h-5 text-[#244A70] animate-spin" />
                      <span>Loading transfer requests...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8491A3]">
                    <ArrowRightLeft className="w-8 h-8 mx-auto text-[#DCE3EC] mb-2" />
                    <p className="font-semibold text-[#17263A] text-sm">No transfer requests found</p>
                    <p className="text-xs text-[#8491A3] mt-1">
                      {searchTerm
                        ? 'Try adjusting your search criteria.'
                        : 'There are no resource transfer requests matching this filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/team-lead/resource-transfers/${req.id}`)}
                    className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                  >
                    {/* Resource / Project */}
                    <td className="py-4 px-4 sm:px-5">
                      <div className="font-semibold text-xs text-[#17263A] group-hover:text-[#244A70] transition-colors flex items-center gap-1.5">
                        <FolderKanban className="w-4 h-4 text-[#244A70] shrink-0" />
                        <span>{req.projectName}</span>
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-1">{req.projectId}</div>
                    </td>

                    {/* Current Assignee */}
                    <td className="py-4 px-4 sm:px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {(req.currentAssigneeName || 'U').charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-[#17263A]">
                          {req.currentAssigneeName || 'Unallocated'}
                        </span>
                      </div>
                    </td>

                    {/* Proposed Successor */}
                    <td className="py-4 px-4 sm:px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                          {req.targetAssigneeName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-[#17263A] flex items-center gap-1">
                            <span>{req.targetAssigneeName}</span>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          </div>
                          <span className="text-xs font-medium text-slate-500 block">Conversion Staff</span>
                        </div>
                      </div>
                    </td>

                    {/* Reason & Briefing */}
                    <td className="py-4 px-4 sm:px-5 max-w-xs">
                      <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-[#244A70] border border-blue-200">
                        {req.reason}
                      </span>
                      {req.note && (
                        <p className="text-xs text-slate-500 truncate mt-1 italic" title={req.note}>
                          "{req.note}"
                        </p>
                      )}
                    </td>

                    {/* Requested By */}
                    <td className="py-4 px-4 sm:px-5 whitespace-nowrap">
                      <div className="text-xs font-medium text-[#17263A]">{req.requestedByName}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 sm:px-5 whitespace-nowrap">
                      {req.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Pending Review
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Approved
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                          <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          Rejected
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 sm:px-5 text-right space-x-2 whitespace-nowrap">
                      <Button
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/team-lead/resource-transfers/${req.id}`);
                        }}
                        className="text-xs h-8 px-3"
                      >
                        Details
                      </Button>
                      {req.status === 'PENDING' && (
                        <>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              openApproveModal(req);
                            }}
                            className="text-xs h-8 px-3 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRejectModal(req);
                            }}
                            className="text-xs h-8 px-3"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Explicit Approval Confirmation Dialog                        */}
      {/* ──────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="Confirm Transfer Approval"
        size="md"
      >
        {approveTarget && (
          <form onSubmit={handleApproveSubmit} className="space-y-4 text-xs">
            {approvalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{approvalError}</span>
              </div>
            )}

            <div className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl space-y-1.5">
              <div className="font-bold text-[#17263A] text-sm">
                Project: {approveTarget.projectName}
              </div>
              <div className="text-xs text-slate-500">
                Resource ID: <span className="font-mono text-slate-700">{approveTarget.projectId}</span>
              </div>
            </div>

            {/* Transition Assessment */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2.5">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Assignment Transition Summary
              </span>
              <div className="flex items-center justify-between text-xs font-semibold text-[#17263A]">
                <div>
                  <span className="text-xs text-slate-500 block">Current Owner</span>
                  <span className="text-slate-800">{approveTarget.currentAssigneeName || 'Unallocated'}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs text-emerald-700 block">Approved Successor</span>
                  <span className="text-emerald-900 font-bold">{approveTarget.targetAssigneeName}</span>
                </div>
              </div>
              <div className="text-xs text-slate-600 pt-2 border-t border-emerald-100">
                Reason: <strong className="text-slate-800">{approveTarget.reason}</strong>
              </div>
            </div>

            {/* Optional Approval Remarks */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Approval Remarks / Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="e.g. Approved during sprint capacity reallocation. All items transition immediately."
                className="w-full px-3 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs text-[#17263A] outline-none focus:ring-2 focus:ring-[#244A70]"
              />
            </div>

            {/* Explicit Confirmation Checkbox */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approvalConfirmed}
                  onChange={(e) => setApprovalConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-amber-300 text-[#244A70] focus:ring-[#244A70]"
                />
                <span className="text-xs text-amber-900 font-medium leading-relaxed">
                  I confirm the approval of this resource ownership transfer. The assignment will immediately update in workspace and be recorded in the immutable audit trail.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#DCE3EC]">
              <Button variant="secondary" onClick={() => setApproveTarget(null)} disabled={isApproving}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isApproving || !approvalConfirmed}
                variant="primary"
              >
                {isApproving ? 'Executing Approval...' : 'Confirm & Execute Approval'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Rejection Modal                                              */}
      {/* ──────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Resource Transfer Request"
        size="md"
      >
        {rejectTarget && (
          <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
            {rejectError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{rejectError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Please specify the reason for rejecting the transfer of project <strong className="text-slate-900">"{rejectTarget.projectName}"</strong> to <strong className="text-slate-900">{rejectTarget.targetAssigneeName}</strong>.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Rejection Reason *
              </label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Proposed engineer has reached maximum capacity or project remains in milestone delivery."
                className="w-full px-3 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs text-[#17263A] outline-none focus:ring-2 focus:ring-[#244A70]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#DCE3EC]">
              <Button variant="secondary" onClick={() => setRejectTarget(null)} disabled={isRejecting}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={isRejecting || !rejectionReason.trim()}>
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ResourceTransferApprovalPage;
