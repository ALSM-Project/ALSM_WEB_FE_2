import React, { useState, useEffect, useMemo } from 'react';
import {
  UserMinus,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Search,
  RefreshCw,
  FolderKanban,
  Check,
  X,
  AlertTriangle,
  Plus,
  Key,
  Laptop,
  Briefcase,
  FileText,
  UserCheck,
} from 'lucide-react';
import { Button, Modal } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { rbacApi, UserRbacDto } from '@/features/rbac/api/rbac.api';
import {
  offboardingApprovalApi,
  OffboardingRequestDto,
  OffboardingRequestDetailResponse,
  OffboardingRequestStatus,
  ProjectTransferItemDto,
} from '../api/offboarding-approval.api';

export const UserOffboardingApprovalPage: React.FC = () => {
  const { user: actor } = useAuth();

  const [requests, setRequests] = useState<OffboardingRequestDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | OffboardingRequestStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Review & Impact Detail Modal State
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<OffboardingRequestDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Successor override selection inside detail modal
  const [selectedSuccessorId, setSelectedSuccessorId] = useState<string>('');
  const [perProjectAssignments, setPerProjectAssignments] = useState<Record<string, string>>({});

  // Approval Modal State
  const [approveTarget, setApproveTarget] = useState<OffboardingRequestDto | null>(null);
  const [approvalNote, setApprovalNote] = useState<string>('');
  const [approvalConfirmed, setApprovalConfirmed] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Rejection Modal State
  const [rejectTarget, setRejectTarget] = useState<OffboardingRequestDto | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionNote, setRejectionNote] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Create Request Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [allStaff, setAllStaff] = useState<UserRbacDto[]>([]);
  const [createTargetUserId, setCreateTargetUserId] = useState<string>('');
  const [createReason, setCreateReason] = useState<string>('');
  const [createNote, setCreateNote] = useState<string>('');
  const [createSuccessorId, setCreateSuccessorId] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  // Load staff list for Create Request modal
  const openCreateModal = async () => {
    setIsCreateOpen(true);
    setCreateError(null);
    setCreateTargetUserId('');
    setCreateReason('');
    setCreateNote('');
    setCreateSuccessorId('');
    try {
      const users = await rbacApi.getAllUsers();
      // Filter users: not platform admin, active, and not self
      const staffOnly = users.filter(
        (u) =>
          !u.isPlatformAdmin &&
          (u.isActive ?? true) &&
          u.id !== actor?.id,
      );
      setAllStaff(staffOnly);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load staff list';
      setCreateError(msg);
    }
  };

  // Open Review & Impact modal
  const handleOpenDetail = async (requestId: string) => {
    setDetailTargetId(requestId);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await offboardingApprovalApi.getRequestDetails(requestId);
      setDetailData(res);
      // Pre-select proposed successor if present
      setSelectedSuccessorId(res.request.transferToUserId || '');
      // Pre-populate project assignments
      const initialMap: Record<string, string> = {};
      if (res.request.projectTransfers) {
        for (const pt of res.request.projectTransfers) {
          initialMap[pt.projectId] = pt.targetStaffId;
        }
      }
      setPerProjectAssignments(initialMap);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve request dossier';
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailTargetId(null);
    setDetailData(null);
    setSelectedSuccessorId('');
    setPerProjectAssignments({});
    setDetailError(null);
  };

  // Submit Create Request
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTargetUserId) {
      setCreateError('Please select a target staff member to offboard');
      return;
    }
    if (!createReason.trim()) {
      setCreateError('A clear justification reason is mandatory');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);
      await offboardingApprovalApi.createRequest({
        targetUserId: createTargetUserId,
        reason: createReason.trim(),
        note: createNote.trim() || undefined,
        transferToUserId: createSuccessorId || undefined,
      });
      setSuccessMsg('Offboarding request successfully submitted for approval');
      setIsCreateOpen(false);
      loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit offboarding request';
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // Open Approval Confirmation
  const handleOpenApprove = (req: OffboardingRequestDto) => {
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

      // Build project transfers if defined
      const projectTransfers: ProjectTransferItemDto[] = [];
      for (const [projId, staffId] of Object.entries(perProjectAssignments)) {
        if (staffId) {
          projectTransfers.push({
            projectId: projId,
            targetStaffId: staffId,
          });
        }
      }

      await offboardingApprovalApi.approveRequest(approveTarget.id, {
        transferToUserId: selectedSuccessorId || approveTarget.transferToUserId,
        projectTransfers: projectTransfers.length > 0 ? projectTransfers : undefined,
        note: approvalNote.trim() || undefined,
      });

      setSuccessMsg(
        `Offboarding for ${approveTarget.targetUserName} approved and executed successfully.`,
      );
      setApproveTarget(null);
      handleCloseDetail();
      loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to execute offboarding approval';
      setApprovalError(msg);
    } finally {
      setIsApproving(false);
    }
  };

  // Open Rejection Modal
  const handleOpenReject = (req: OffboardingRequestDto) => {
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
      handleCloseDetail();
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

  // Safe candidates and assigned projects for detail modal
  const eligibleCandidates = useMemo(() => {
    if (!detailData?.liveSummary) return [];
    return (
      detailData.liveSummary.eligibleStaff ||
      detailData.liveSummary.eligibleSuccessors ||
      []
    );
  }, [detailData]);

  const assignedProjects = useMemo(() => {
    if (!detailData?.liveSummary) return [];
    return detailData.liveSummary.assignedProjects || [];
  }, [detailData]);

  // KPI Metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <nav className="text-xs text-[#6B778C] flex items-center gap-1.5 mb-1">
            <span>Team Lead</span>
            <span>&rsaquo;</span>
            <span className="text-[#091E42] font-semibold">Offboarding Approvals</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#091E42]">
              User Offboarding Approvals (S73)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
              <UserMinus className="w-3 h-3" />
              Controlled Lifecycle
            </span>
          </div>
          <p className="text-sm text-[#42526E] mt-1">
            Review security postures, resource allocations, and approve or reject offboarding requests for team members.
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
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-[#0652CC] hover:bg-[#0652CC]/90 text-white"
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
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0652CC] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0652CC] mb-2" />
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
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Staff info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {req.targetUserName.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{req.targetUserName}</div>
                          <div className="text-[11px] text-slate-500">{req.targetUserEmail}</div>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {(req.targetUserRoles || []).map((role) => (
                              <span
                                key={role}
                                className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Team */}
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {req.teamName || 'Operational Team'}
                    </td>

                    {/* Requester */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{req.requestedByName}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Proposed Successor */}
                    <td className="py-3.5 px-4">
                      {req.transferToUserName ? (
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{req.transferToUserName}</span>
                        </div>
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
                      {req.status === 'PENDING' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 text-amber-700" />
                          Pending Review
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
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
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(req.id)}
                          className="text-xs font-semibold hover:bg-slate-50"
                        >
                          Review Impact
                        </Button>

                        {req.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleOpenApprove(req)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition-colors shadow-sm"
                              title="Approve and execute offboarding"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReject(req)}
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

      {/* DETAIL & LIVE IMPACT DRAWER / MODAL */}
      <Modal
        isOpen={Boolean(detailTargetId)}
        onClose={handleCloseDetail}
        title="Offboarding Impact Review (Screen S73)"
        className="max-w-3xl"
      >
        {detailLoading ? (
          <div className="p-8 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0652CC] mb-2" />
            <p className="text-xs">Inspecting live security and resource allocations...</p>
          </div>
        ) : detailError ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {detailError}
          </div>
        ) : detailData ? (
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {/* Target Staff Dossier Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
                    {detailData.request.targetUserName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {detailData.request.targetUserName}
                    </h3>
                    <p className="text-xs text-slate-500">{detailData.request.targetUserEmail}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Team: {detailData.request.teamName || 'Operational Team'} | Requested by:{' '}
                      {detailData.request.requestedByName}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      detailData.request.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : detailData.request.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    Status: {detailData.request.status}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs text-slate-700">
                <span className="font-semibold text-slate-900">Reason: </span>
                <span>{detailData.request.reason}</span>
                {detailData.request.note && (
                  <p className="mt-1 text-slate-500 italic">
                    Handover Note: "{detailData.request.note}"
                  </p>
                )}
                {detailData.request.rejectionReason && (
                  <div className="mt-2 p-2.5 rounded-lg bg-rose-100/70 text-rose-800 border border-rose-200 text-xs">
                    <span className="font-bold">Rejection Justification: </span>
                    {detailData.request.rejectionReason}
                  </div>
                )}
              </div>
            </div>

            {/* Live Security & Resource Posture */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                Live Resource & Security Posture
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Active Sessions</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {detailData.liveSummary.activeSessionsCount ?? detailData.liveSummary.activeSessions?.length ?? 0}
                  </div>
                  {(detailData.liveSummary.activeSessionsCount ?? detailData.liveSummary.activeSessions?.length ?? 0) > 0 && (
                    <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                      Will be terminated
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Key className="w-3.5 h-3.5" />
                    <span>API Credentials</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {detailData.liveSummary.apiCredentialsCount ?? detailData.liveSummary.apiKeysCount ?? 0}
                  </div>
                  {(detailData.liveSummary.apiCredentialsCount ?? detailData.liveSummary.apiKeysCount ?? 0) > 0 && (
                    <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                      Will be revoked
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span>Assigned Projects</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {assignedProjects.length}
                  </div>
                  <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
                    Requires reassignment
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>In-flight Jobs</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {detailData.liveSummary.pendingJobsCount ?? 0}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Conversion pipeline
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned Projects Reassignment Section */}
            {assignedProjects.length > 0 && (
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
                <h4 className="text-xs font-bold text-[#091E42] flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <FolderKanban className="w-4 h-4 text-[#0652CC]" />
                    Transferable Projects ({assignedProjects.length})
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    SRS 4.8: Reassign to an eligible team successor
                  </span>
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {assignedProjects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{proj.name}</div>
                        <div className="text-[10px] text-slate-400">
                          Status: {proj.status} {proj.conversionType ? `| Type: ${proj.conversionType}` : ''}
                        </div>
                      </div>

                      {detailData.request.status === 'PENDING' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500 shrink-0">Hand over to:</span>
                          <select
                            value={perProjectAssignments[proj.id] || selectedSuccessorId}
                            onChange={(e) =>
                              setPerProjectAssignments({
                                ...perProjectAssignments,
                                [proj.id]: e.target.value,
                              })
                            }
                            className="text-xs py-1 px-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0652CC]"
                          >
                            <option value="">Default Successor</option>
                            {eligibleCandidates.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.fullName} ({s.activeWorkload ?? s.activeProjectCount ?? 0} active)
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700">
                          Reassigned
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proposed Default Successor Selection */}
            {detailData.request.status === 'PENDING' && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Default Handover Successor (Primary Owner)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Select an eligible team member to take over unassigned projects and responsibilities:
                </p>
                <select
                  value={selectedSuccessorId}
                  onChange={(e) => setSelectedSuccessorId(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
                >
                  <option value="">Select an active team member...</option>
                  {eligibleCandidates.map((succ) => (
                    <option key={succ.id} value={succ.id}>
                      {succ.fullName} ({succ.email}) - {succ.activeWorkload ?? succ.activeProjectCount ?? 0} active projects
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Controlled Offboarding Impact Banner */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5" />
                Execution Impact (UC-83 Integration):
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800">
                <li>All active sessions on mobile/desktop will be terminated.</li>
                <li>All API keys belonging to this user will be revoked immediately.</li>
                <li>Assigned projects will be transferred to the selected successor.</li>
                <li>Assigned roles will be deactivated and account status set to inactive.</li>
                <li>All actions are recorded in the central immutable audit log.</li>
              </ul>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <Button variant="outline" onClick={handleCloseDetail}>
                Close
              </Button>

              {detailData.request.status === 'PENDING' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRejectTarget(detailData.request);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject Request
                  </button>
                  <button
                    onClick={() => {
                      setApproveTarget(detailData.request);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Proceed to Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* APPROVAL CONFIRMATION MODAL */}
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
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {isApproving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {isApproving ? 'Executing Offboard...' : 'Approve & Execute Offboarding'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* REJECTION MODAL */}
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

      {/* CREATE OFFBOARDING REQUEST MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Submit New Offboarding Request"
        className="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Submit a formal offboarding request for a team member to undergo controlled resource handover and deactivation.
          </p>

          {createError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Select Staff Member <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={createTargetUserId}
              onChange={(e) => setCreateTargetUserId(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
            >
              <option value="">Choose an active staff member...</option>
              {allStaff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || u.email} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Offboarding Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Contract completed, department transfer, resignation..."
              value={createReason}
              onChange={(e) => setCreateReason(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Proposed Handover Successor (Optional)
            </label>
            <select
              value={createSuccessorId}
              onChange={(e) => setCreateSuccessorId(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
            >
              <option value="">Select proposed successor staff...</option>
              {allStaff
                .filter((u) => u.id !== createTargetUserId)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Additional Context / Handover Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Any specifics regarding pending tasks or documentation..."
              value={createNote}
              onChange={(e) => setCreateNote(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isCreating || !createTargetUserId || !createReason.trim()}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#0652CC] hover:bg-[#0652CC]/90 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {isCreating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {isCreating ? 'Submitting...' : 'Submit Offboarding Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
