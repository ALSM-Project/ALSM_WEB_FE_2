import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Send,
  Users,
  CheckCircle2,
  Clock,
  Briefcase,
  Key,
} from 'lucide-react';
import {
  offboardingApprovalApi,
  OffboardingType,
  DocumentationStatus,
} from '../api/offboarding-approval.api';
import { OffboardingLiveSummary } from '../api/offboarding-approval.api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/ui/Button';
import { EmployeeSearchSelect } from '@/shared/components/EmployeeSearchSelect';
import { WorkforceEmployee } from '@/shared/api/workforce.api';

export const CreateOffboardingRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: actor } = useAuth();

  // Selected employee state
  const [selectedWorkforceEmployee, setSelectedWorkforceEmployee] = useState<WorkforceEmployee | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [liveSummary, setLiveSummary] = useState<OffboardingLiveSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // Form Fields
  const [offboardingType, setOffboardingType] = useState<OffboardingType>('Resignation');
  const [offboardingReason, setOffboardingReason] = useState<string>('');
  const [proposedSuccessorId, setProposedSuccessorId] = useState<string>('');
  const [handoverDeadline, setHandoverDeadline] = useState<string>('');
  const [pendingTasks, setPendingTasks] = useState<string>('');
  const [documentationStatus, setDocumentationStatus] = useState<DocumentationStatus>('In Progress');
  const [projectSuccessors, setProjectSuccessors] = useState<Record<string, string>>({});

  // 14 days standard offboarding notice default
  const [effectiveDate, setEffectiveDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  // Today string for default request date
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle staff selection via EmployeeSearchSelect
  const handleWorkforceSelect = (emp: WorkforceEmployee | null) => {
    setSelectedWorkforceEmployee(emp);
    if (emp) {
      setSelectedUserId(emp.userId);
      setProjectSuccessors({});
      setProposedSuccessorId('');
    } else {
      setSelectedUserId('');
      setLiveSummary(null);
      setProjectSuccessors({});
      setProposedSuccessorId('');
    }
  };

  // Auto-fetch summary when selected staff changes
  useEffect(() => {
    if (!selectedUserId) {
      setLiveSummary(null);
      return;
    }

    const fetchSummary = async () => {
      try {
        setLoadingSummary(true);
        setErrorMsg(null);
        const summary = await offboardingApprovalApi.getUserOffboardingSummary(selectedUserId);
        setLiveSummary(summary);
      } catch (err: unknown) {
        console.error('Failed to load user offboarding summary:', err);
        setLiveSummary(null);
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [selectedUserId]);

  // Filter eligible successors (all other internal conversion staff except target staff)
  const eligibleSuccessors = useMemo(() => {
    if (!liveSummary?.eligibleStaff) return [];
    return liveSummary.eligibleStaff.filter((s: any) => s.id !== selectedUserId);
  }, [liveSummary, selectedUserId]);

  const handleProjectSuccessorChange = (projectId: string, successorStaffId: string) => {
    setProjectSuccessors((prev) => ({
      ...prev,
      [projectId]: successorStaffId,
    }));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setErrorMsg('Please search and select a staff member to offboard.');
      return;
    }

    if (!offboardingReason.trim()) {
      setErrorMsg('Please specify a formal offboarding reason/justification.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // Build project transfers list
      const projectTransfers = Object.entries(projectSuccessors)
        .filter(([, sId]) => Boolean(sId))
        .map(([projId, sId]) => {
          const matchedSuccessor = eligibleSuccessors.find((c: any) => c.id === sId);
          const matchedProject = (liveSummary?.assignedProjects || []).find((p: any) => p.id === projId);
          return {
            projectId: projId,
            projectName: matchedProject?.name,
            targetStaffId: sId,
            targetStaffName: matchedSuccessor?.fullName,
            reason: `Reassignment for offboarding ${selectedWorkforceEmployee?.fullName || selectedUserId}`,
          };
        });

      const payload = {
        targetUserId: selectedUserId,
        offboardingType,
        reason: offboardingReason.trim(),
        effectiveDate,
        handoverDeadline: handoverDeadline || undefined,
        pendingTasks: pendingTasks.trim() || undefined,
        documentationStatus,
        transferToUserId: proposedSuccessorId || undefined,
        projectTransfers: projectTransfers.length > 0 ? projectTransfers : undefined,
      };

      const result = await offboardingApprovalApi.createRequest(payload);
      navigate(`/admin/offboarding-approvals/${result.id}`);
    } catch (err: any) {
      console.error('Failed to create offboarding request:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to create offboarding request.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/offboarding-approvals')}
            className="p-2 h-9 w-9 text-slate-600 hover:text-slate-900 border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Create Offboarding Request
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Submit a formal request to initiate employee offboarding and controlled resource handover.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/offboarding-approvals')}
            disabled={isSubmitting}
            className="text-sm font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedUserId}
            className="bg-[#244A70] hover:bg-[#1B3856] text-white text-sm font-semibold shadow-xs"
          >
            {isSubmitting ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Request
          </Button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start space-x-3">
          <div className="w-5 h-5 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
            !
          </div>
          <div>
            <h4 className="text-sm font-semibold">Action Required</h4>
            <p className="text-sm mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: EMPLOYEE INFORMATION WITH REUSABLE SEARCHABLE SELECTOR */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative z-40">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Employee Information</h3>
                <p className="text-xs text-slate-500">
                  Search and select the employee undergoing offboarding. Details are automatically loaded.
                </p>
              </div>
            </div>
            {loadingSummary && (
              <span className="inline-flex items-center text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-medium">
                <Clock className="w-3.5 h-3.5 mr-1 animate-spin" /> Loading live impact summary...
              </span>
            )}
          </div>

          <div className="p-6">
            <EmployeeSearchSelect
              portalType="WEB2"
              allowedMemberType="INTERNAL_EMPLOYEE"
              allowedEmploymentStatus="ACTIVE"
              value={selectedWorkforceEmployee}
              onChange={handleWorkforceSelect}
              required
              label="Select Staff Member"
              placeholder="Search by name, email, employee code, or department..."
              helperText="Strictly scoped to ALSM Internal Workforce. Partner staff & customer members are excluded."
            />
          </div>
        </div>

        {/* SECTION 2: OFFBOARDING DETAILS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative z-20">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
              2
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Offboarding Details</h3>
              <p className="text-xs text-slate-500">
                Specify the categorization, formal justification, and timeline for this offboarding workflow.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Offboarding Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={offboardingType}
                  onChange={(e) => setOffboardingType(e.target.value as OffboardingType)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15"
                >
                  <option value="Resignation">Resignation (Employee Voluntary Departure)</option>
                  <option value="Contract Expiration">Contract Expiration (Fixed-term completed)</option>
                  <option value="Internal Transfer">Internal Transfer (Department/Role reassignment)</option>
                  <option value="Termination">Termination (Involuntary separation)</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Effective Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Scheduled departure date when system credentials and role access will be revoked.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Offboarding Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={offboardingReason}
                onChange={(e) => setOffboardingReason(e.target.value)}
                placeholder="Provide a formal justification for initiating this offboarding request (e.g. End of 12-month modernization consultant contract)..."
                required
                className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center space-x-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Users className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="text-xs text-slate-500 block">Requested By</span>
                  <span className="font-semibold text-slate-800">
                    {actor?.fullName || actor?.email || 'Operations Admin'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Calendar className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="text-xs text-slate-500 block">Request Date</span>
                  <span className="font-semibold text-slate-800">{todayStr}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: PROJECT & RESOURCE IMPACT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative z-10">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Project & Resource Impact</h3>
                <p className="text-xs text-slate-500">
                  Assess live active project commitments and system credentials requiring transition.
                </p>
              </div>
            </div>
            {liveSummary && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {(liveSummary.assignedProjects || []).length} Assigned Project(s)
              </span>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Metric Overview Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
                    Active Modernization Projects
                  </span>
                  <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                    {liveSummary ? (liveSummary.assignedProjects || []).length : '-'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/40 flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
                    Active User Sessions
                  </span>
                  <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                    {liveSummary ? liveSummary.activeSessionsCount : '-'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-purple-200/80 bg-purple-50/40 flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
                    API Credentials / Tokens
                  </span>
                  <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                    {liveSummary ? liveSummary.apiCredentialsCount : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned Projects Table */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Assigned Modernization Projects</h4>
              {!liveSummary || (liveSummary.assignedProjects || []).length === 0 ? (
                <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    {liveSummary
                      ? 'No active projects assigned to this staff member'
                      : 'Search and select an employee above to inspect their active project assignments.'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    No open conversion deliverables will be disrupted by offboarding.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Project Name & Code</th>
                        <th className="px-4 py-3">Current Assignment</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Successor Assignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(liveSummary.assignedProjects || []).map((proj: any) => {
                        const currentVal = projectSuccessors[proj.id] || proposedSuccessorId || '';
                        return (
                          <tr key={proj.id} className="hover:bg-slate-50/80 transition-colors">
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
                              <select
                                value={currentVal}
                                onChange={(e) => handleProjectSuccessorChange(proj.id, e.target.value)}
                                className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#244A70] focus:outline-none"
                              >
                                <option value="">-- Inherit Proposed Successor --</option>
                                {eligibleSuccessors.map((cand: any) => (
                                  <option key={cand.id} value={cand.id}>
                                    {cand.fullName} ({cand.email})
                                  </option>
                                ))}
                              </select>
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
        </div>

        {/* SECTION 4: HANDOVER PLAN */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative z-0">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
              4
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Handover Plan</h3>
              <p className="text-xs text-slate-500">
                Designate a primary successor, define knowledge transfer milestones, and verify task completion.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Proposed Primary Successor
                </label>
                <select
                  value={proposedSuccessorId}
                  onChange={(e) => setProposedSuccessorId(e.target.value)}
                  disabled={!selectedUserId || eligibleSuccessors.length === 0}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {!selectedUserId
                      ? '-- Select an employee first to view eligible successors --'
                      : eligibleSuccessors.length === 0
                      ? '-- No candidate successors available --'
                      : '-- Select a primary successor staff member --'}
                  </option>
                  {eligibleSuccessors.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.email}) - {s.roles?.join(', ') || 'Staff'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Responsible for receiving project handovers, documents, and ongoing responsibilities.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Handover Deadline
                </label>
                <input
                  type="date"
                  value={handoverDeadline}
                  onChange={(e) => setHandoverDeadline(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Date by which all documentation and task handovers must be completed.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Documentation Status
                </label>
                <select
                  value={documentationStatus}
                  onChange={(e) => setDocumentationStatus(e.target.value as DocumentationStatus)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15"
                >
                  <option value="In Progress">In Progress (Documentation being prepared)</option>
                  <option value="Not Started">Not Started (Pending handover kickoff)</option>
                  <option value="Completed">Completed (All documentation uploaded)</option>
                  <option value="Not Required">Not Required (No specialized documentation)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Pending Tasks & Deliverables
                </label>
                <textarea
                  rows={2}
                  value={pendingTasks}
                  onChange={(e) => setPendingTasks(e.target.value)}
                  placeholder="e.g. Finish AST review on Cobol batch module; merge pull request #142..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
