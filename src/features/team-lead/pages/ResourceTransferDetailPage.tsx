import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  Users,
  FolderKanban,
  RefreshCw,
  Check,
  X,
  FileText,
  Calendar,
  User,
  Hash,
} from 'lucide-react';
import { Button, Modal } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  transferApprovalApi,
  TransferRequestDetailResponse,
} from '../api/transfer-approval.api';
import { partnersApi } from '@/features/partners/api/partners.api';
import { formatDateTime, formatDate } from '@/shared/utils/date';

interface AssignableStaffMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  activeWorkload: number;
}

export const ResourceTransferDetailPage: React.FC = () => {
  const { transferId } = useParams<{ transferId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManageTransfers = hasPermission('teams.manage');

  const [detailData, setDetailData] = useState<TransferRequestDetailResponse | null>(null);
  const [staffRoster, setStaffRoster] = useState<AssignableStaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Approval Modal State
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [approvalNote, setApprovalNote] = useState<string>('');
  const [approvalConfirmed, setApprovalConfirmed] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!transferId) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const [details, staff] = await Promise.all([
        transferApprovalApi.getRequestDetails(transferId),
        partnersApi.getAssignableStaff().catch(() => []),
      ]);
      setDetailData(details);
      setStaffRoster(staff || []);
    } catch (err: any) {
      console.error('Failed to load transfer request details:', err);
      setErrorMsg(err?.message || 'Transfer request was not found or failed to load.');
    } finally {
      setLoading(false);
    }
  }, [transferId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const req = detailData?.request;
  const liveProject = detailData?.liveProject;

  // Find target staff and current staff metadata from roster
  const targetStaffInfo = useMemo(() => {
    if (!req) return null;
    return staffRoster.find((s) => s.id === req.targetAssigneeId) || null;
  }, [req, staffRoster]);

  const currentStaffInfo = useMemo(() => {
    if (!req?.currentAssigneeId) return null;
    return staffRoster.find((s) => s.id === req.currentAssigneeId) || null;
  }, [req, staffRoster]);

  // Handle Approve action
  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!req || !transferId) return;

    if (!approvalConfirmed) {
      setApprovalError('Please check the confirmation box to execute transfer approval.');
      return;
    }

    try {
      setIsApproving(true);
      setApprovalError(null);
      const response = await transferApprovalApi.approveRequest(transferId, {
        note: approvalNote.trim() || undefined,
      });

      setSuccessMsg(
        `Transfer request for "${req.projectName}" successfully approved. Ownership transferred to ${req.targetAssigneeName}.`
      );
      setShowApproveModal(false);
      setDetailData((prev) =>
        prev
          ? {
              ...prev,
              request: response.request,
              liveProject: response.project || prev.liveProject,
            }
          : null
      );
    } catch (err: any) {
      setApprovalError(err?.message || 'Failed to execute transfer approval.');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Reject action
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!req || !transferId) return;

    if (!rejectionReason.trim()) {
      setRejectError('Please specify an explicit rejection reason.');
      return;
    }

    try {
      setIsRejecting(true);
      setRejectError(null);
      const response = await transferApprovalApi.rejectRequest(transferId, {
        reason: rejectionReason.trim(),
      });

      setSuccessMsg(`Transfer request for "${req.projectName}" has been rejected.`);
      setShowRejectModal(false);
      setDetailData((prev) =>
        prev
          ? {
              ...prev,
              request: response.request,
            }
          : null
      );
    } catch (err: any) {
      setRejectError(err?.message || 'Failed to reject transfer request.');
    } finally {
      setIsRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-24 text-center text-[#8491A3]">
        <div className="flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#244A70] animate-spin" />
          <span className="text-sm font-medium">Loading transfer request details...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !detailData || !req) {
    return (
      <div className="w-full py-12">
        <div className="p-8 text-center bg-white rounded-2xl border border-[#DCE3EC] max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#17263A]">Transfer Request Unavailable</h2>
          <p className="text-xs text-[#8491A3] mt-1">{errorMsg || 'The requested transfer request could not be found.'}</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="secondary" size="sm" onClick={fetchDetails}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Try Again
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/team-lead/resource-transfers')}
              className="bg-[#244A70] hover:bg-[#244A70] text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back to Transfer Approvals
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isPending = req.status === 'PENDING';

  return (
    <div className="w-full space-y-6">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* Top Return Navigation                                        */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div>
        <Link
          to="/team-lead/resource-transfers"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#DCE3EC] bg-white text-xs font-semibold text-[#17263A] hover:bg-[#F8FAFC] transition-colors shadow-2xs w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#8491A3]" />
          <span>Back to Transfer Approvals</span>
        </Link>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* PAGE HEADER (Section 2)                                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#17263A]">
                {req.projectName}
              </h1>

              {/* Current Status Badge */}
              {req.status === 'PENDING' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Pending Review
                </span>
              )}
              {req.status === 'APPROVED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Approved
                </span>
              )}
              {req.status === 'REJECTED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Rejected
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#8491A3]">
              <div className="flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-[#8491A3]" />
                <span>Request ID:</span>
                <span className="font-mono font-medium text-[#17263A]">{req.id}</span>
              </div>
              <span className="text-[#DCE3EC]">•</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#8491A3]" />
                <span>Requested on:</span>
                <span className="font-medium text-[#17263A]">{formatDateTime(req.createdAt)}</span>
              </div>
              <span className="text-[#DCE3EC]">•</span>
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#8491A3]" />
                <span>Requested by:</span>
                <span className="font-medium text-[#17263A]">{req.requestedByName}</span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons (Pending Review + Authorized Admin) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {isPending && canManageTransfers && (
              <>
                <Button
                  variant="danger"
                  onClick={() => {
                    setRejectionReason('');
                    setRejectError(null);
                    setShowRejectModal(true);
                  }}
                  className="text-xs h-9 px-3.5 shadow-2xs font-semibold"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Reject Request
                </Button>
                <Button
                  onClick={() => {
                    setApprovalNote('');
                    setApprovalConfirmed(false);
                    setApprovalError(null);
                    setShowApproveModal(true);
                  }}
                  disabled={!detailData.isValid}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 shadow-xs font-semibold"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Approve Transfer
                </Button>
              </>
            )}
            {!isPending && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC] text-xs font-medium text-[#8491A3]">
                <ShieldCheck className="w-4 h-4 text-[#8491A3]" />
                <span>Finalized ({req.status})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Live Feedback Messages                                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Authoritative Live Validation Status Banner */}
      {detailData.isValid ? (
        <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3 shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold">Authoritative Validation Passed</span>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Project is active, proposed Conversion Staff is eligible and verified, and resource state permits immediate ownership reassignment.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Pre-Approval Validation Warnings</span>
            <ul className="list-disc list-inside text-[11px] text-rose-700 mt-1 space-y-0.5">
              {detailData.validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* DETAIL PAGE MAIN MULTI-COLUMN LAYOUT (Full-width grid)       */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Column (Main Information, Sections B, C, D) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* ──────────────────────────────────────────────────────── */}
          {/* SECTION B — Assignment Information (Two-Column Compare) */}
          {/* ──────────────────────────────────────────────────────── */}
          <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3EC]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#244A70]" />
                <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                  Assignment Information
                </h2>
              </div>
              <span className="text-[11px] font-medium text-[#8491A3]">
                Ownership Transition Comparison
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              {/* CURRENT ASSIGNEE */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                      Current Assignee
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Existing Allocation</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {(req.currentAssigneeName || 'U').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[#17263A] text-sm truncate">
                        {req.currentAssigneeName || 'Unallocated'}
                      </div>
                      <div className="text-xs text-[#8491A3]">
                        {currentStaffInfo?.role || 'Conversion Specialist'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 text-xs space-y-1.5 text-[#8491A3]">
                  {req.currentAssigneeId && (
                    <div className="flex items-center justify-between">
                      <span>Staff ID:</span>
                      <span className="font-mono text-[#17263A] text-[11px]">{req.currentAssigneeId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Workload:</span>
                    <span className="font-medium text-[#17263A]">
                      {currentStaffInfo ? `${currentStaffInfo.activeWorkload} active project(s)` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Current Status:</span>
                    <span className="font-medium text-slate-700">
                      {req.currentAssigneeName ? 'Active Owner' : 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>

              {/* PROPOSED SUCCESSOR */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      Proposed Successor
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Target Assignee</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-2xs">
                      {req.targetAssigneeName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-emerald-950 text-sm truncate flex items-center gap-1.5">
                        <span>{req.targetAssigneeName}</span>
                      </div>
                      <div className="text-xs text-emerald-700">
                        {targetStaffInfo?.role || 'Conversion Staff'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-emerald-200 text-xs space-y-1.5 text-emerald-900">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8491A3]">Email:</span>
                    <span className="font-medium text-[#17263A] text-[11px] truncate max-w-[160px]">
                      {req.targetAssigneeEmail || targetStaffInfo?.email || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8491A3]">Staff ID:</span>
                    <span className="font-mono text-[#17263A] text-[11px]">{req.targetAssigneeId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8491A3]">Active Workload:</span>
                    <span className="font-semibold text-emerald-800">
                      {targetStaffInfo ? `${targetStaffInfo.activeWorkload} active project(s)` : 'Eligible staff'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* SECTION C — Briefing & Transition Notes                  */}
          {/* ──────────────────────────────────────────────────────── */}
          <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DCE3EC]">
              <FileText className="w-4 h-4 text-[#244A70]" />
              <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                Briefing & Transition Notes
              </h2>
            </div>

            {req.note ? (
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC] text-xs text-[#17263A] whitespace-pre-wrap break-words leading-relaxed">
                {req.note}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC] text-xs text-[#8491A3] italic">
                No briefing or transition notes were provided for this transfer request.
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* SECTION D — Project / Resource Context                   */}
          {/* ──────────────────────────────────────────────────────── */}
          <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3EC]">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-[#244A70]" />
                <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                  Project / Resource Context
                </h2>
              </div>
              <span className="text-[11px] font-medium text-[#8491A3]">Live Repository Context</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Project Name */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
                <span className="text-[10px] font-bold text-[#8491A3] uppercase tracking-wider block">
                  Project Name
                </span>
                <span className="font-semibold text-[#17263A] mt-0.5 block truncate">
                  {liveProject?.name || req.projectName}
                </span>
              </div>

              {/* Project ID */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
                <span className="text-[10px] font-bold text-[#8491A3] uppercase tracking-wider block">
                  Project ID
                </span>
                <span className="font-mono text-[#17263A] mt-0.5 block truncate text-[11px]">
                  {liveProject?.id || req.projectId}
                </span>
              </div>

              {/* Project Status */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
                <span className="text-[10px] font-bold text-[#8491A3] uppercase tracking-wider block">
                  Project Status
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {liveProject?.status || 'ACTIVE'}
                </span>
              </div>

              {/* Organization */}
              {(liveProject?.organizationId || req.organizationId) && (
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
                  <span className="text-[10px] font-bold text-[#8491A3] uppercase tracking-wider block">
                    Organization ID
                  </span>
                  <span className="font-mono text-[#17263A] mt-0.5 block truncate text-[11px]">
                    {liveProject?.organizationId || req.organizationId}
                  </span>
                </div>
              )}

              {/* Conversion Type */}
              {liveProject?.conversionType && (
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
                  <span className="text-[10px] font-bold text-[#8491A3] uppercase tracking-wider block">
                    Conversion Type
                  </span>
                  <span className="font-semibold text-[#17263A] mt-0.5 block">
                    {liveProject.conversionType.replace(/_/g, ' ')}
                  </span>
                </div>
              )}

              {/* Service Type */}
              {liveProject?.serviceType && (
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
                  <span className="text-[10px] font-bold text-[#8491A3] uppercase tracking-wider block">
                    Service Delivery Type
                  </span>
                  <span className="font-semibold text-[#17263A] mt-0.5 block">
                    {liveProject.serviceType}
                  </span>
                </div>
              )}

              {/* Assigned Team Lead */}
              {liveProject?.assignedTeamLeadId && (
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
                  <span className="text-[10px] font-bold text-[#8491A3] uppercase tracking-wider block">
                    Assigned Team Lead ID
                  </span>
                  <span className="font-mono text-[#17263A] mt-0.5 block truncate text-[11px]">
                    {liveProject.assignedTeamLeadId}
                  </span>
                </div>
              )}

              {/* Current Assignee in Live Project */}
              {liveProject?.assignedStaffName && (
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
                  <span className="text-[10px] font-bold text-[#8491A3] uppercase tracking-wider block">
                    Live Record Owner
                  </span>
                  <span className="font-semibold text-[#17263A] mt-0.5 block">
                    {liveProject.assignedStaffName}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Overview, Approval Information, History, Sections A & E) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* ──────────────────────────────────────────────────────── */}
          {/* SECTION A — Transfer Overview                            */}
          {/* ──────────────────────────────────────────────────────── */}
          <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DCE3EC]">
              <ArrowRightLeft className="w-4 h-4 text-[#244A70]" />
              <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                Transfer Overview
              </h2>
            </div>

            <div className="space-y-3 text-xs divide-y divide-[#DCE3EC]">
              <div className="pt-2 flex justify-between items-start gap-2">
                <span className="text-[#8491A3]">Transfer Request ID</span>
                <span className="font-mono font-medium text-[#17263A] text-right truncate max-w-[180px]">
                  {req.id}
                </span>
              </div>

              <div className="pt-3 flex justify-between items-start gap-2">
                <span className="text-[#8491A3]">Resource / Project</span>
                <span className="font-semibold text-[#17263A] text-right truncate max-w-[180px]">
                  {req.projectName}
                </span>
              </div>

              <div className="pt-3 flex justify-between items-start gap-2">
                <span className="text-[#8491A3]">Project ID</span>
                <span className="font-mono text-[#17263A] text-right truncate max-w-[180px] text-[11px]">
                  {req.projectId}
                </span>
              </div>

              <div className="pt-3 flex justify-between items-start gap-2">
                <span className="text-[#8491A3]">Transfer Type</span>
                <span className="font-medium text-[#17263A]">Resource Reassignment</span>
              </div>

              <div className="pt-3 flex justify-between items-center gap-2">
                <span className="text-[#8491A3]">Transfer Reason</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#244A70] border border-blue-100">
                  {req.reason}
                </span>
              </div>

              <div className="pt-3 flex justify-between items-start gap-2">
                <span className="text-[#8491A3]">Request Date</span>
                <span className="font-medium text-[#17263A] text-right">
                  {formatDateTime(req.createdAt)}
                </span>
              </div>

              <div className="pt-3 flex justify-between items-start gap-2">
                <span className="text-[#8491A3]">Requested By</span>
                <span className="font-medium text-[#17263A] text-right">{req.requestedByName}</span>
              </div>

              <div className="pt-3 flex justify-between items-center gap-2">
                <span className="text-[#8491A3]">Current Status</span>
                {req.status === 'PENDING' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Pending Review
                  </span>
                )}
                {req.status === 'APPROVED' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Approved
                  </span>
                )}
                {req.status === 'REJECTED' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                    <XCircle className="w-3 h-3 text-rose-600" />
                    Rejected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* SECTION E — Approval Information & History               */}
          {/* ──────────────────────────────────────────────────────── */}
          <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DCE3EC]">
              <ShieldCheck className="w-4 h-4 text-[#244A70]" />
              <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                Approval Information
              </h2>
            </div>

            {/* Decision & Reviewer Information */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#8491A3]">Decision Status</span>
                <span className="font-bold text-[#17263A]">{req.status}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#8491A3]">Requested By</span>
                <span className="font-medium text-[#17263A]">{req.requestedByName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#8491A3]">Reviewed By</span>
                <span className="font-medium text-[#17263A]">
                  {req.reviewedByName || (isPending ? 'Pending Review' : '—')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#8491A3]">Review Date</span>
                <span className="font-medium text-[#17263A]">
                  {req.reviewedAt ? formatDateTime(req.reviewedAt) : (isPending ? 'Pending Review' : '—')}
                </span>
              </div>

              {/* Reviewer Comments (Approval Note) */}
              {req.reviewNote && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Reviewer Comments
                  </span>
                  <p className="text-xs text-emerald-900 whitespace-pre-wrap">{req.reviewNote}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {req.rejectionReason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                    Rejection Reason
                  </span>
                  <p className="text-xs text-rose-900 whitespace-pre-wrap">{req.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Approval History / Timeline */}
            <div className="pt-3 border-t border-[#DCE3EC]">
              <span className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block mb-3">
                Approval History
              </span>

              <div className="space-y-3 text-xs relative pl-4 border-l-2 border-[#DCE3EC] ml-1">
                {/* Event 1: Request Created */}
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#244A70] absolute -left-[21px] top-1" />
                  <div className="font-semibold text-[#17263A]">Request Submitted</div>
                  <div className="text-[11px] text-[#8491A3]">
                    By {req.requestedByName} on {formatDate(req.createdAt)}
                  </div>
                </div>

                {/* Event 2: Finalized or Pending */}
                <div className="relative">
                  {req.status === 'APPROVED' && (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 absolute -left-[21px] top-1" />
                      <div className="font-semibold text-emerald-800">Transfer Approved & Reassigned</div>
                      <div className="text-[11px] text-[#8491A3]">
                        By {req.reviewedByName || 'Authorized Reviewer'} on {formatDateTime(req.reviewedAt)}
                      </div>
                    </>
                  )}
                  {req.status === 'REJECTED' && (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-600 absolute -left-[21px] top-1" />
                      <div className="font-semibold text-rose-800">Transfer Request Rejected</div>
                      <div className="text-[11px] text-[#8491A3]">
                        By {req.reviewedByName || 'Authorized Reviewer'} on {formatDateTime(req.reviewedAt)}
                      </div>
                    </>
                  )}
                  {req.status === 'PENDING' && (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute -left-[21px] top-1" />
                      <div className="font-semibold text-amber-800">Pending Review</div>
                      <div className="text-[11px] text-[#8491A3]">
                        Awaiting decision by Team Lead or Platform Admin
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Approval Action Panel for Pending requests */}
            {isPending && (
              <div className="pt-4 border-t border-[#DCE3EC] space-y-2">
                <span className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block">
                  Reviewer Actions
                </span>

                {canManageTransfers ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="danger"
                      onClick={() => {
                        setRejectionReason('');
                        setRejectError(null);
                        setShowRejectModal(true);
                      }}
                      className="w-full text-xs"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => {
                        setApprovalNote('');
                        setApprovalConfirmed(false);
                        setApprovalError(null);
                        setShowApproveModal(true);
                      }}
                      disabled={!detailData.isValid}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Approve
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs">
                    You do not have administrative permissions to approve or reject resource transfer requests.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* APPROVAL CONFIRMATION MODAL                                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Confirm Resource Transfer Approval"
        size="md"
      >
        <form onSubmit={handleApproveSubmit} className="space-y-4 text-xs">
          {approvalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{approvalError}</span>
            </div>
          )}

          <div className="p-3.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl space-y-1.5">
            <div className="font-bold text-[#17263A] text-sm">{req.projectName}</div>
            <div className="text-[11px] text-[#8491A3]">
              Project ID: <span className="font-mono text-[#17263A]">{req.projectId}</span>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Transition Summary
            </span>
            <div className="flex items-center justify-between text-xs font-semibold text-[#17263A]">
              <div>
                <span className="text-[10px] text-slate-500 block">Current Assignee</span>
                <span>{req.currentAssigneeName || 'Unallocated'}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-[10px] text-emerald-700 block">Approved Successor</span>
                <span className="text-emerald-800">{req.targetAssigneeName}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-600 pt-1 border-t border-emerald-100">
              Reason: <strong>{req.reason}</strong>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1">
              Reviewer Comments / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="e.g. Approved during sprint capacity reallocation. All assets transition immediately."
              className="w-full px-3 py-2 bg-white border border-[#DCE3EC] rounded-xl text-xs text-[#17263A] outline-none focus:ring-2 focus:ring-[#244A70]"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={approvalConfirmed}
                onChange={(e) => setApprovalConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-amber-300 text-[#244A70] focus:ring-[#244A70]"
              />
              <span className="text-[11px] text-amber-900 font-medium">
                I confirm the approval of this resource ownership transfer. The assignment will immediately update in the workspace and be recorded in the audit trail.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#DCE3EC]">
            <Button
              variant="secondary"
              onClick={() => setShowApproveModal(false)}
              disabled={isApproving}
            >
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
      </Modal>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* REJECTION CONFIRMATION MODAL                                 */}
      {/* ──────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Resource Transfer Request"
        size="md"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
          {rejectError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{rejectError}</span>
            </div>
          )}

          <p className="text-slate-600">
            Please specify the reason for rejecting the transfer of project{' '}
            <strong>"{req.projectName}"</strong> to {req.targetAssigneeName}.
          </p>

          <div>
            <label className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1">
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

          <div className="flex justify-end gap-2 pt-2 border-t border-[#DCE3EC]">
            <Button
              variant="secondary"
              onClick={() => setShowRejectModal(false)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ResourceTransferDetailPage;
