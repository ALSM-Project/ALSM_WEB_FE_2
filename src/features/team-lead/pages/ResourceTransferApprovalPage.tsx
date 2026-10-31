import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  ShieldCheck,
  Search,
  RefreshCw,
  FolderKanban,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  Plus,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { Button, Modal } from '@/shared/ui';
import {
  transferApprovalApi,
  ResourceTransferRequestDto,
  TransferRequestDetailResponse,
  TransferRequestStatus,
} from '../api/transfer-approval.api';
import { partnersApi } from '@/features/partners/api/partners.api';
import { PartnerProject } from '@/features/partners/types/partner.types';

export const ResourceTransferApprovalPage: React.FC = () => {
  const [requests, setRequests] = useState<ResourceTransferRequestDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransferRequestStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Detail Modal State
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<TransferRequestDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

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

  // Create Request Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [projectsList, setProjectsList] = useState<PartnerProject[]>([]);
  const [staffRoster, setStaffRoster] = useState<Array<{ id: string; fullName: string; email: string; activeWorkload: number }>>([]);
  const [newProjectId, setNewProjectId] = useState<string>('');
  const [newStaffId, setNewStaffId] = useState<string>('');
  const [newReason, setNewReason] = useState<string>('Workload Balancing');
  const [newNote, setNewNote] = useState<string>('');
  const [isSubmittingNew, setIsSubmittingNew] = useState<boolean>(false);
  const [newRequestError, setNewRequestError] = useState<string | null>(null);

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
  }, [statusFilter]);

  const openDetailsModal = async (id: string) => {
    try {
      setDetailTargetId(id);
      setDetailLoading(true);
      const details = await transferApprovalApi.getRequestDetails(id);
      setDetailData(details);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load transfer request details');
    } finally {
      setDetailLoading(false);
    }
  };

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
        `Transfer request for "${approveTarget.projectName}" successfully approved. Ownership transferred to ${approveTarget.targetAssigneeName} (UC-88 / UC-84).`
      );
      setApproveTarget(null);
      setDetailTargetId(null);
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
      setDetailTargetId(null);
      await fetchRequests();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setRejectError(err?.message || 'Failed to reject transfer request');
    } finally {
      setIsRejecting(false);
    }
  };

  const openCreateModal = async () => {
    setIsCreateOpen(true);
    setNewProjectId('');
    setNewStaffId('');
    setNewReason('Workload Balancing');
    setNewNote('');
    setNewRequestError(null);

    try {
      const [projs, staff] = await Promise.all([
        partnersApi.getProjects().catch(() => []),
        partnersApi.getAssignableStaff().catch(() => []),
      ]);
      setProjectsList(projs || []);
      setStaffRoster(staff || []);
    } catch {
      // Continue with empty rosters if fetch fails
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectId || !newStaffId) {
      setNewRequestError('Please select both a project and target Conversion Staff.');
      return;
    }

    try {
      setIsSubmittingNew(true);
      setNewRequestError(null);
      const created = await transferApprovalApi.createRequest({
        projectId: newProjectId,
        targetStaffId: newStaffId,
        reason: newReason,
        note: newNote,
      });

      setSuccessMsg(`Transfer request for "${created.projectName}" created successfully and queued for approval.`);
      setIsCreateOpen(false);
      await fetchRequests();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setNewRequestError(err?.message || 'Failed to submit transfer request');
    } finally {
      setIsSubmittingNew(false);
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF2FC] text-[#0652CC] uppercase tracking-wider">
              Governance & Supervision
            </span>
            <span className="text-[11px] text-[#6B778C]">UC-88 Approve Resource Transfer</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091E42] mt-1">
            Resource Transfer Approvals
          </h1>
          <p className="text-xs text-[#6B778C] mt-1 max-w-3xl">
            Review, validate, and authorize resource ownership transfers across modernization projects. Approved requests immediately update workspace allocation and log in the immutable audit trail (integrated with UC-84).
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={fetchRequests}
            disabled={loading}
            className="text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={openCreateModal}
            className="bg-[#0652CC] hover:bg-[#0543A8] text-white text-xs h-9 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Transfer Request
          </Button>
          <Link
            to="/team-lead/projects"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-3.5 py-2 text-xs font-semibold text-[#091E42] shadow-2xs hover:bg-[#F4F6F8] transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-[#0652CC]" />
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
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
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
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#E5EAF0] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#6B778C] uppercase tracking-wider block">Total Requests</span>
          <div className="text-2xl font-bold text-[#091E42] mt-1">{totalCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#E5EAF0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{pendingCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#E5EAF0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Approved Transfers</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{approvedCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#E5EAF0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">Rejected</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-800 mt-1">{rejectedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#F4F6F8] rounded-xl border border-[#E5EAF0] w-fit">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-white text-[#091E42] shadow-2xs'
                : 'text-[#6B778C] hover:text-[#091E42]'
            }`}
          >
            All Requests ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-white text-amber-800 shadow-2xs'
                : 'text-[#6B778C] hover:text-[#091E42]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Pending Review ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusFilter === 'APPROVED'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-[#6B778C] hover:text-[#091E42]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'REJECTED'
                ? 'bg-white text-rose-800 shadow-2xs'
                : 'text-[#6B778C] hover:text-[#091E42]'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B778C]" />
          <input
            type="text"
            placeholder="Search projects, staff, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs text-[#091E42] outline-none focus:ring-2 focus:ring-[#0652CC]"
          />
        </div>
      </div>

      {/* Main Requests Table */}
      <div className="bg-white border border-[#E5EAF0] rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[11px] font-bold text-[#6B778C] uppercase tracking-wider">
                <th className="py-3 px-4">Resource / Project</th>
                <th className="py-3 px-4">Current Assignee</th>
                <th className="py-3 px-4">Proposed Successor</th>
                <th className="py-3 px-4">Reason & Briefing</th>
                <th className="py-3 px-4">Requested By</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B778C]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-5 h-5 text-[#0652CC] animate-spin" />
                      <span>Loading transfer requests...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B778C]">
                    <ArrowRightLeft className="w-8 h-8 mx-auto text-[#C1C7D0] mb-2" />
                    <p className="font-semibold text-[#091E42] text-sm">No transfer requests found</p>
                    <p className="text-xs text-[#6B778C] mt-1">
                      {searchTerm
                        ? 'Try adjusting your search criteria.'
                        : 'There are no resource transfer requests matching this filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#F9FAFC] transition-colors">
                    {/* Resource / Project */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#091E42] flex items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5 text-[#0652CC]" />
                        <span>{req.projectName}</span>
                      </div>
                      <div className="text-[10px] font-mono text-[#6B778C] mt-0.5">{req.projectId}</div>
                    </td>

                    {/* Current Assignee */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                          {(req.currentAssigneeName || 'U').charAt(0)}
                        </div>
                        <span className="font-medium text-[#091E42]">
                          {req.currentAssigneeName || 'Unallocated'}
                        </span>
                      </div>
                    </td>

                    {/* Proposed Successor */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                          {req.targetAssigneeName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-[#091E42] flex items-center gap-1">
                            <span>{req.targetAssigneeName}</span>
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                          </div>
                          <span className="text-[10px] text-[#6B778C]">Conversion Staff</span>
                        </div>
                      </div>
                    </td>

                    {/* Reason & Briefing */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#0652CC] border border-blue-100">
                        {req.reason}
                      </span>
                      {req.note && (
                        <p className="text-[11px] text-[#6B778C] truncate mt-1" title={req.note}>
                          "{req.note}"
                        </p>
                      )}
                    </td>

                    {/* Requested By */}
                    <td className="py-3.5 px-4">
                      <div className="text-[#091E42] font-medium">{req.requestedByName}</div>
                      <div className="text-[10px] text-[#6B778C] mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {req.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending Review
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Approved
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <X className="w-3 h-3 text-rose-600" />
                          Rejected
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <Button
                        variant="secondary"
                        onClick={() => openDetailsModal(req.id)}
                        className="text-xs h-7 px-2.5"
                      >
                        Details
                      </Button>
                      {req.status === 'PENDING' && (
                        <>
                          <Button
                            onClick={() => openApproveModal(req)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5 shadow-2xs"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => openRejectModal(req)}
                            className="text-xs h-7 px-2.5"
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
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Detail View Modal (Section 4.4 & 4.5)                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!detailTargetId}
        onClose={() => setDetailTargetId(null)}
        title="Transfer Request Details & Validation Check"
        size="lg"
      >
        {detailLoading || !detailData ? (
          <div className="py-12 text-center text-[#6B778C]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0652CC] mb-2" />
            <p className="text-xs">Fetching authoritative backend request validation...</p>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Live Authoritative Validity Banner */}
            {detailData.isValid ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 font-medium">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold">Authoritative Validation Passed</div>
                  <div className="text-[11px] text-emerald-700">
                    Project is active, target Conversion Staff is confirmed eligible, and resource state allows approval.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Validation Warning / Conflict Detected</div>
                  <ul className="list-disc list-inside text-[11px] text-rose-700 mt-1 space-y-0.5">
                    {detailData.validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Request Summary Card */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl">
              <div>
                <span className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider block">Project</span>
                <span className="font-bold text-[#091E42] text-sm mt-0.5 block">{detailData.request.projectName}</span>
                <span className="text-[10px] font-mono text-[#6B778C]">{detailData.request.projectId}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider block">Status</span>
                <span className="font-bold text-[#091E42] mt-0.5 inline-block">
                  {detailData.request.status}
                </span>
                <span className="text-[10px] text-[#6B778C] block mt-0.5">
                  Created {new Date(detailData.request.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Ownership Transition Preview */}
            <div className="p-3.5 bg-white border border-[#E5EAF0] rounded-xl">
              <span className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider block mb-2">
                Resource Ownership Transition
              </span>
              <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Current Assignee</div>
                  <div className="font-bold text-[#091E42] mt-0.5">
                    {detailData.request.currentAssigneeName || 'Unallocated'}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#0652CC] shrink-0" />
                <div>
                  <div className="text-[10px] text-emerald-700 font-semibold uppercase">Proposed Successor</div>
                  <div className="font-bold text-emerald-800 mt-0.5">
                    {detailData.request.targetAssigneeName}
                  </div>
                  <div className="text-[10px] text-slate-500">{detailData.request.targetAssigneeEmail}</div>
                </div>
              </div>
            </div>

            {/* Reason & Notes */}
            <div className="p-3 bg-white border border-[#E5EAF0] rounded-xl space-y-2">
              <div>
                <span className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider block">Reason</span>
                <span className="font-semibold text-[#091E42] mt-0.5 inline-block">{detailData.request.reason}</span>
              </div>
              {detailData.request.note && (
                <div>
                  <span className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider block">Briefing Notes</span>
                  <p className="text-slate-700 mt-0.5 bg-[#F4F6F8] p-2 rounded-lg border border-[#E5EAF0]">
                    {detailData.request.note}
                  </p>
                </div>
              )}
              {detailData.request.reviewNote && (
                <div>
                  <span className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider block">Approval Remarks</span>
                  <p className="text-emerald-800 mt-0.5 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    {detailData.request.reviewNote}
                  </p>
                </div>
              )}
              {detailData.request.rejectionReason && (
                <div>
                  <span className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider block">Rejection Reason</span>
                  <p className="text-rose-800 mt-0.5 bg-rose-50 p-2 rounded-lg border border-rose-200">
                    {detailData.request.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
              <Button variant="secondary" onClick={() => setDetailTargetId(null)}>
                Close
              </Button>
              {detailData.request.status === 'PENDING' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setDetailTargetId(null);
                      openRejectModal(detailData.request);
                    }}
                  >
                    Reject Request
                  </Button>
                  <Button
                    onClick={() => {
                      setDetailTargetId(null);
                      openApproveModal(detailData.request);
                    }}
                    disabled={!detailData.isValid}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Proceed to Approve
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Explicit Approval Confirmation Dialog (Section 4.6)          */}
      {/* ──────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="Confirm Resource Transfer Approval (UC-88)"
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

            <div className="p-3.5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl space-y-2">
              <div className="font-bold text-[#091E42] text-sm">
                Project: {approveTarget.projectName}
              </div>
              <div className="text-[11px] text-[#6B778C]">
                Resource ID: <span className="font-mono">{approveTarget.projectId}</span>
              </div>
            </div>

            {/* Transition Assessment */}
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Assignment Transition Summary
              </span>
              <div className="flex items-center justify-between text-xs font-semibold text-[#091E42]">
                <div>
                  <span className="text-[10px] text-slate-500 block">Current Owner</span>
                  {approveTarget.currentAssigneeName || 'Unallocated'}
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="text-[10px] text-emerald-700 block">Approved Successor</span>
                  <span className="text-emerald-800">{approveTarget.targetAssigneeName}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 pt-1 border-t border-emerald-100">
                Reason: <strong>{approveTarget.reason}</strong>
              </div>
            </div>

            {/* Optional Approval Remarks */}
            <div>
              <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
                Approval Remarks / Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="e.g. Approved during sprint capacity reallocation. All items transition immediately."
                className="w-full px-3 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs text-[#091E42] outline-none focus:ring-2 focus:ring-[#0652CC]"
              />
            </div>

            {/* Explicit Confirmation Checkbox (Requirement 4.6 & 5) */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approvalConfirmed}
                  onChange={(e) => setApprovalConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-amber-300 text-[#0652CC] focus:ring-[#0652CC]"
                />
                <span className="text-[11px] text-amber-900 font-medium">
                  I confirm the approval of this resource ownership transfer (UC-88). The assignment will immediately update in workspace and be recorded in the immutable audit trail.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
              <Button variant="secondary" onClick={() => setApproveTarget(null)} disabled={isApproving}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isApproving || !approvalConfirmed}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
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

            <p className="text-slate-600">
              Please specify the reason for rejecting the transfer of project <strong>"{rejectTarget.projectName}"</strong> to {rejectTarget.targetAssigneeName}.
            </p>

            <div>
              <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
                Rejection Reason *
              </label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Proposed engineer has reached maximum capacity or project remains in milestone delivery."
                className="w-full px-3 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs text-[#091E42] outline-none focus:ring-2 focus:ring-[#0652CC]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
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

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Create Transfer Request Modal                                 */}
      {/* ──────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Initiate Resource Transfer Request"
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {newRequestError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{newRequestError}</span>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Select Modernization Project *
            </label>
            <select
              required
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs text-[#091E42] outline-none focus:ring-2 focus:ring-[#0652CC]"
            >
              <option value="">Choose project...</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.assignedStaffName || 'Unallocated'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Select Target Assignee (Eligible Conversion Staff) *
            </label>
            <select
              required
              value={newStaffId}
              onChange={(e) => setNewStaffId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs text-[#091E42] outline-none focus:ring-2 focus:ring-[#0652CC]"
            >
              <option value="">Choose target staff member...</option>
              {staffRoster.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.email}) — Workload: {s.activeWorkload} active
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Transfer Reason *
            </label>
            <select
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs text-[#091E42] outline-none focus:ring-2 focus:ring-[#0652CC]"
            >
              <option value="Workload Balancing">Workload Balancing</option>
              <option value="Reassignment">Reassignment</option>
              <option value="Offboarding">Offboarding</option>
              <option value="Leave of Absence">Leave of Absence</option>
              <option value="Skill Alignment">Skill Alignment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider block mb-1">
              Briefing / Transition Notes
            </label>
            <textarea
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="e.g. Rebalancing screen migration queue for sprint completion."
              className="w-full px-3 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs text-[#091E42] outline-none focus:ring-2 focus:ring-[#0652CC]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={isSubmittingNew}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingNew || !newProjectId || !newStaffId}
              className="bg-[#0652CC] hover:bg-[#0543A8] text-white"
            >
              {isSubmittingNew ? 'Submitting...' : 'Submit Transfer Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ResourceTransferApprovalPage;
