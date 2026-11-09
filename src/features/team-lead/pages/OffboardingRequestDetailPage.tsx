import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  Check,
  X,
  Key,
  Laptop,
  UserMinus,
  Ban,
  CheckSquare,
} from 'lucide-react';
import { Button, Modal } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  offboardingApprovalApi,
  OffboardingRequestDetailResponse,
  OffboardingRequestDto,
  OffboardingLiveSummary,
} from '../api/offboarding-approval.api';
import { formatDateTime, formatDate } from '@/shared/utils/date';

export const OffboardingRequestDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: actor } = useAuth();

  const isUnderAdmin = location.pathname.startsWith('/admin');
  const basePath = isUnderAdmin ? '/admin/offboarding-approvals' : '/team-lead/offboarding-approvals';

  const [detailData, setDetailData] = useState<OffboardingRequestDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Approval Modal State
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [approvalNote, setApprovalNote] = useState<string>('');
  const [selectedSuccessorId, setSelectedSuccessorId] = useState<string>('');
  const [perProjectAssignments, setPerProjectAssignments] = useState<Record<string, string>>({});
  const [approvalConfirmed, setApprovalConfirmed] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionNote, setRejectionNote] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!requestId) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await offboardingApprovalApi.getRequestDetails(requestId);
      setDetailData(res);
      if (res.request.transferToUserId) {
        setSelectedSuccessorId(res.request.transferToUserId);
      }
      if (res.request.projectTransfers && res.request.projectTransfers.length > 0) {
        const assignments: Record<string, string> = {};
        res.request.projectTransfers.forEach((pt) => {
          assignments[pt.projectId] = pt.targetStaffId;
        });
        setPerProjectAssignments(assignments);
      }
    } catch (err: unknown) {
      console.error('Failed to load offboarding request details:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load offboarding request details';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const req: OffboardingRequestDto | undefined = detailData?.request;
  const liveSummary: OffboardingLiveSummary | undefined = detailData?.liveSummary;
  const isAuthorizedToReview = detailData?.isAuthorizedToReview ?? false;

  const canCancel = useMemo(() => {
    if (!req) return false;
    const isPendingOrDraft = req.status === 'PENDING' || req.status === 'DRAFT' || req.status === 'PENDING_APPROVAL';
    const isOwner = req.requestedById === actor?.id;
    const isAdmin = actor?.isPlatformAdmin ?? false;
    return isPendingOrDraft && (isOwner || isAdmin);
  }, [req, actor]);

  const canReview = useMemo(() => {
    if (!req) return false;
    const isPending = req.status === 'PENDING' || req.status === 'PENDING_APPROVAL';
    return isPending && isAuthorizedToReview;
  }, [req, isAuthorizedToReview]);

  // Handle Approve
  const handleApprove = async () => {
    if (!req || !approvalConfirmed) return;
    try {
      setIsApproving(true);
      setApprovalError(null);

      const projectTransfers = Object.entries(perProjectAssignments).map(([projectId, targetStaffId]) => {
        const proj = liveSummary?.assignedProjects?.find((p) => p.id === projectId);
        return {
          projectId,
          projectName: proj?.name,
          targetStaffId,
        };
      }).filter((pt) => Boolean(pt.targetStaffId));

      await offboardingApprovalApi.approveRequest(req.id, {
        transferToUserId: selectedSuccessorId || undefined,
        projectTransfers: projectTransfers.length > 0 ? projectTransfers : undefined,
        note: approvalNote.trim() || undefined,
      });

      setShowApproveModal(false);
      setSuccessMsg('Offboarding request approved and executed successfully.');
      fetchDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed. Please try again.';
      setApprovalError(msg);
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!req) return;
    if (!rejectionReason.trim()) {
      setRejectError('A formal rejection reason is mandatory.');
      return;
    }
    try {
      setIsRejecting(true);
      setRejectError(null);
      await offboardingApprovalApi.rejectRequest(req.id, {
        rejectionReason: rejectionReason.trim(),
        note: rejectionNote.trim() || undefined,
      });
      setShowRejectModal(false);
      setSuccessMsg('Offboarding request has been rejected.');
      fetchDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rejection failed. Please try again.';
      setRejectError(msg);
    } finally {
      setIsRejecting(false);
    }
  };

  // Handle Cancel
  const handleCancel = async () => {
    if (!req) return;
    try {
      setIsCancelling(true);
      setCancelError(null);
      await offboardingApprovalApi.cancelRequest(req.id, cancelReason.trim() || undefined);
      setShowCancelModal(false);
      setSuccessMsg('Offboarding request has been cancelled.');
      fetchDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cancellation failed. Please try again.';
      setCancelError(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'APPROVED':
      case 'COMPLETED':
      case 'HANDOVER_COMPLETED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Approved & Executed
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
            Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Ban className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Cancelled
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Draft
          </span>
        );
      case 'PENDING':
      case 'PENDING_APPROVAL':
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 animate-pulse" />
            Pending Review
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="w-8 h-8 text-[#244A70] animate-spin" />
        <p className="text-sm text-slate-600 font-medium">Loading offboarding dossier...</p>
      </div>
    );
  }

  if (!req) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Offboarding Request Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          The requested offboarding record does not exist or you do not have permission to access it.
        </p>
        <Button onClick={() => navigate(basePath)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Offboarding Approvals
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#17263A]">
                {req.targetUserName}
              </h1>
              {renderStatusBadge(req.status)}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {req.offboardingType || 'Resignation'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Request ID: {req.id} • Created {formatDateTime(req.createdAt)}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(basePath)}
            className="text-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to List
          </Button>

          {canCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCancelModal(true)}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              <Ban className="w-4 h-4 mr-1.5" />
              Cancel Request
            </Button>
          )}

          {canReview && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRejectModal(true)}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                <X className="w-4 h-4 mr-1.5" />
                Reject
              </Button>
              <Button
                type="button"
                onClick={() => setShowApproveModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Approve & Execute
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 flex items-start space-x-3 text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-emerald-600" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Action Complete</h4>
            <p className="text-sm mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 flex items-start space-x-3 text-rose-800 animate-in fade-in">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-rose-600" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Error</h4>
            <p className="text-sm mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Main Grid Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sections 1, 2, 3, 4 (2 cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: EMPLOYEE PROFILE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Employee Profile</h3>
                  <p className="text-xs text-slate-500">
                    Personnel profile and operational team scope.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Full Name
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {req.targetUserName}
                  </p>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Email Address
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {req.targetUserEmail}
                  </p>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Employee ID
                  </span>
                  <p className="text-sm font-mono text-slate-700 mt-0.5">
                    {req.targetUserId.slice(-8).toUpperCase()}
                  </p>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Assigned Roles
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(req.targetUserRoles && req.targetUserRoles.length > 0) ? (
                      req.targetUserRoles.map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Standard Staff</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Department
                  </span>
                  <p className="text-sm text-slate-800 mt-0.5">
                    {req.department || req.teamName || 'Modernization Operations'}
                  </p>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Assigned Team
                  </span>
                  <p className="text-sm text-slate-800 mt-0.5">
                    {req.teamName || 'Conversion Engineering Core'}
                  </p>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Direct Manager
                  </span>
                  <p className="text-sm text-slate-800 mt-0.5">
                    {req.directManager || req.requestedByName}
                  </p>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Target User ID
                  </span>
                  <p className="text-xs font-mono text-slate-500 mt-0.5 truncate" title={req.targetUserId}>
                    {req.targetUserId}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: OFFBOARDING INFORMATION */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Offboarding Information</h3>
                <p className="text-xs text-slate-500">
                  Formal departure categorization, timeline, and requested reason.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Offboarding Type
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 mt-1">
                    {req.offboardingType || 'Resignation'}
                  </span>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Scheduled Effective Date
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {req.effectiveDate ? formatDate(req.effectiveDate) : 'Not specified'}
                  </p>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Requested By
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {req.requestedByName}
                  </p>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Offboarding Reason
                </span>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {req.reason}
                </div>
              </div>

              {req.note && (
                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Additional Context / Requester Notes
                  </span>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-800 whitespace-pre-wrap">
                    {req.note}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: PROJECT & RESOURCE IMPACT */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Project Impact Assessment</h3>
                  <p className="text-xs text-slate-500">
                    Live assigned modernization projects and destination transfer leads.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {(liveSummary?.assignedProjects || []).length} Assigned Project(s)
              </span>
            </div>

            <div className="p-6 space-y-4">
              {(!liveSummary?.assignedProjects || liveSummary.assignedProjects.length === 0) ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center bg-slate-50/50">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                  <p className="text-sm font-medium text-slate-700">
                    No active modernization projects assigned to this employee.
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Zero project handover blockages identified.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Project Status</th>
                        <th className="px-4 py-3">Handover Destination</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {liveSummary.assignedProjects.map((proj) => {
                        const directTransfer = req.projectTransfers?.find((pt) => pt.projectId === proj.id);
                        const assignedLead =
                          directTransfer?.targetStaffName ||
                          req.transferToUserName ||
                          'Pending Lead Assignment';

                        return (
                          <tr key={proj.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-900 block">{proj.name}</span>
                              <span className="text-xs font-mono text-slate-500">
                                {proj.code || proj.id.slice(-8).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                {proj.role || 'Conversion Lead'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {proj.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-1.5 text-xs text-slate-800">
                                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                                <span className="font-medium">{assignedLead}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: HANDOVER PLAN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                4
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Handover Plan</h3>
                <p className="text-xs text-slate-500">
                  Successor assignment, task completion milestones, and technical documentation.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Primary Successor
                  </span>
                  <div className="flex items-center space-x-2 mt-1">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-slate-900">
                      {req.transferToUserName || 'Not specified'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Handover Deadline
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {req.handoverDeadline ? formatDate(req.handoverDeadline) : 'Not specified'}
                  </p>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Documentation Status
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 mt-1">
                    {req.documentationStatus || 'In Progress'}
                  </span>
                </div>
              </div>

              {req.pendingTasks && (
                <div>
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Pending Tasks & Deliverables
                  </span>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-800 whitespace-pre-wrap">
                    {req.pendingTasks}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sections 5 & 6 (1 col wide) */}
        <div className="space-y-6">
          {/* SECTION 5: ACCESS REVOCATION PLAN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                5
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Access Revocation Plan</h3>
                <p className="text-xs text-slate-500">
                  Security credentials and token invalidation.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <Laptop className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <span className="text-xs text-slate-500 block">Active Sessions</span>
                  <span className="text-lg font-bold text-slate-900">
                    {liveSummary?.activeSessionsCount ?? 0}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <Key className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <span className="text-xs text-slate-500 block">API Credentials</span>
                  <span className="text-lg font-bold text-slate-900">
                    {liveSummary?.apiCredentialsCount ?? liveSummary?.apiKeysCount ?? 0}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center space-x-2.5 text-xs text-slate-700">
                  <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Revoke all authenticated web sessions</span>
                </div>
                <div className="flex items-center space-x-2.5 text-xs text-slate-700">
                  <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Invalidate API keys & personal access tokens</span>
                </div>
                <div className="flex items-center space-x-2.5 text-xs text-slate-700">
                  <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Remove repository & source code write access</span>
                </div>
                <div className="flex items-center space-x-2.5 text-xs text-slate-700">
                  <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Deactivate internal user account in DB</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                Status: {req.status === 'APPROVED' ? (
                  <span className="font-semibold text-emerald-700">Executed & Access Revoked</span>
                ) : (
                  <span className="font-semibold text-amber-700">
                    Scheduled for {req.effectiveDate ? formatDate(req.effectiveDate) : 'Effective Date'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 6: APPROVAL WORKFLOW & AUDIT */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                6
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Workflow & Audit Trail</h3>
                <p className="text-xs text-slate-500">
                  State timeline and governance audit history.
                </p>
              </div>
            </div>

            <div className="p-6">
              <ol className="relative border-l border-slate-200 ml-3 space-y-6">
                {/* Event 1: Requested */}
                <li className="ml-6">
                  <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 ring-4 ring-white">
                    <UserMinus className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-900">Request Submitted</h4>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(req.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Initiated by <span className="font-medium">{req.requestedByName}</span>
                  </p>
                </li>

                {/* Event 2: Review Outcome */}
                {req.reviewedAt && (
                  <li className="ml-6">
                    <span
                      className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-rose-100 text-rose-600'
                      }`}
                    >
                      {req.status === 'APPROVED' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-900">
                        {req.status === 'APPROVED' ? 'Approved & Executed' : 'Request Rejected'}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {formatDateTime(req.reviewedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Reviewed by <span className="font-medium">{req.reviewedByName || 'Authorized Reviewer'}</span>
                    </p>
                    {req.rejectionReason && (
                      <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                        <span className="font-semibold block">Rejection Reason:</span>
                        {req.rejectionReason}
                      </div>
                    )}
                    {req.reviewNote && (
                      <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                        <span className="font-semibold block">Review Note:</span>
                        {req.reviewNote}
                      </div>
                    )}
                  </li>
                )}

                {/* Event 3: Cancelled */}
                {req.status === 'CANCELLED' && (
                  <li className="ml-6">
                    <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 ring-4 ring-white">
                      <Ban className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-900">Request Cancelled</h4>
                      <span className="text-[11px] text-slate-400">
                        {formatDateTime(req.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Cancelled by requester or administrator.
                    </p>
                    {req.reviewNote && (
                      <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                        {req.reviewNote}
                      </div>
                    )}
                  </li>
                )}

                {/* Pending step indicator */}
                {(req.status === 'PENDING' || req.status === 'PENDING_APPROVAL') && (
                  <li className="ml-6">
                    <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-600 ring-4 ring-white animate-pulse">
                      <Clock className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="text-xs font-semibold text-amber-900">Awaiting Team Lead / Admin Review</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pending review of resource handover and access deactivation.
                    </p>
                  </li>
                )}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* APPROVE CONFIRMATION MODAL */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => !isApproving && setShowApproveModal(false)}
        title="Approve & Execute User Offboarding"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs leading-relaxed flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold block text-sm text-amber-950 mb-0.5">
                Executing Controlled Offboarding Workflow
              </span>
              Approving this request will transfer active projects to the designated successors,
              terminate all active user sessions, revoke API keys, and set the user account to inactive.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Primary Handover Successor
            </label>
            <select
              value={selectedSuccessorId}
              onChange={(e) => setSelectedSuccessorId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- Retain Current Proposed Successor ({req.transferToUserName || 'None'}) --</option>
              {(liveSummary?.eligibleSuccessors || liveSummary?.eligibleStaff || []).map((cand) => (
                <option key={cand.id} value={cand.id}>
                  {cand.fullName} ({cand.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Approval Note (Optional)
            </label>
            <textarea
              rows={2}
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="e.g. Verified project handovers completed with conversion team..."
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={approvalConfirmed}
              onChange={(e) => setApprovalConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-700 leading-normal">
              I confirm that I have reviewed the impact on active projects and authorize immediate deactivation and resource transfer for <strong>{req.targetUserName}</strong>.
            </span>
          </label>

          {approvalError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-medium">
              {approvalError}
            </p>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowApproveModal(false)}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              disabled={isApproving || !approvalConfirmed}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isApproving ? 'Executing...' : 'Confirm & Approve'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => !isRejecting && setShowRejectModal(false)}
        title="Reject Offboarding Request"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Provide a mandatory justification for rejecting this offboarding request. The requester will be notified.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Critical project deadline on Cobol conversion pending; request rescheduled..."
              required
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Internal reviewer comments..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {rejectError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-medium">
              {rejectError}
            </p>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRejectModal(false)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleReject}
              disabled={isRejecting || !rejectionReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* CANCEL MODAL */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => !isCancelling && setShowCancelModal(false)}
        title="Cancel Offboarding Request"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to cancel this offboarding request for <strong>{req.targetUserName}</strong>?
            The request will be marked as Cancelled and no further actions will be taken.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Cancellation Reason (Optional)
            </label>
            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Contract extension agreed; employee remaining in role..."
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {cancelError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-medium">
              {cancelError}
            </p>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={isCancelling}
            >
              Dismiss
            </Button>
            <Button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-slate-700 hover:bg-slate-800 text-white"
            >
              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default OffboardingRequestDetailPage;
