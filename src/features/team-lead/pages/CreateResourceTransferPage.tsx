import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  FolderKanban,
  UserCheck,
  RefreshCw,
  Plus,
  AlertCircle,
  FileText,
  Tag,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { transferApprovalApi } from '../api/transfer-approval.api';
import { partnersApi } from '@/features/partners/api/partners.api';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { ProjectSearchSelect } from '@/shared/components/ProjectSearchSelect';
import { EmployeeSearchSelect } from '@/shared/components/EmployeeSearchSelect';
import { WorkforceEmployee } from '@/shared/api/workforce.api';

export const CreateResourceTransferPage: React.FC = () => {
  const navigate = useNavigate();

  const [projectsList, setProjectsList] = useState<PartnerProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form selections
  const [selectedProject, setSelectedProject] = useState<PartnerProject | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<WorkforceEmployee | null>(null);
  const [reason, setReason] = useState<string>('Workload Balancing');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const projs = await partnersApi.getProjects().catch(() => []);
        setProjectsList(Array.isArray(projs) ? projs : []);
      } catch (err: unknown) {
        console.error('Failed to load projects:', err);
        setErrorMsg('Failed to load projects roster. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) {
      setErrorMsg('Please search and select a modernization project to transfer.');
      return;
    }
    if (!selectedStaff) {
      setErrorMsg('Please search and select an eligible target Conversion Staff member.');
      return;
    }
    if (selectedProject.assignedStaffId && selectedProject.assignedStaffId === selectedStaff.userId) {
      setErrorMsg('The selected staff member is already assigned as the current owner of this project.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const created = await transferApprovalApi.createRequest({
        projectId: selectedProject.id,
        targetStaffId: selectedStaff.userId,
        reason: reason.trim(),
        note: note.trim() || undefined,
      });

      // Navigate directly to the dedicated detail page
      navigate(`/team-lead/resource-transfers/${created.id}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit transfer request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-24 text-center text-[#8491A3]">
        <div className="flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#244A70] animate-spin" />
          <span className="text-sm font-medium">Loading project rosters...</span>
        </div>
      </div>
    );
  }

  const excludeStaffIds = selectedProject?.assignedStaffId ? [selectedProject.assignedStaffId] : [];

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* Page Header                                                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#17263A]">
              Initiate Resource Transfer Request
            </h1>
            <p className="text-xs text-[#8491A3] mt-1">
              Submit a project ownership transfer request for Team Lead approval and staff reallocation.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/team-lead/resource-transfers"
              className="inline-flex items-center justify-center font-medium rounded-xl border border-[#DCE3EC] bg-white text-xs font-semibold text-[#17263A] hover:bg-[#F8FAFC] px-4 py-2 transition-colors shadow-2xs"
            >
              Cancel
            </Link>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedProject || !selectedStaff}
              className="bg-[#244A70] hover:bg-[#244A70] text-white text-xs h-9 px-4 shadow-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {isSubmitting ? 'Submitting Request...' : 'Submit Transfer Request'}
            </Button>
          </div>
        </div>
      </div>

      {/* Error notification */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Main Full-Width Form Grid                                    */}
      {/* ──────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Column (Inputs & Detailed Context) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Card 1: Searchable Project Selection */}
          <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs space-y-4 relative z-40">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DCE3EC]">
              <FolderKanban className="w-4 h-4 text-[#244A70]" />
              <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                1. Select Modernization Project
              </h2>
            </div>

            <ProjectSearchSelect
              projects={projectsList}
              value={selectedProject}
              onChange={(p) => {
                setSelectedProject(p);
                // If the selected staff member was the owner of this new project, reset target staff
                if (p && selectedStaff && p.assignedStaffId === selectedStaff.userId) {
                  setSelectedStaff(null);
                }
              }}
              required
              label="Modernization Project"
              placeholder="Search by project name, ID, partner, or pipeline..."
              helperText="Type to search through all eligible modernization projects in your workspace."
            />
          </div>

          {/* Card 2: Searchable Target Assignee Selection */}
          <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs space-y-4 relative z-30">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DCE3EC]">
              <UserCheck className="w-4 h-4 text-[#244A70]" />
              <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                2. Select Target Assignee (Eligible Conversion Staff)
              </h2>
            </div>

            <EmployeeSearchSelect
              portalType="WEB2"
              allowedMemberType="INTERNAL_EMPLOYEE"
              allowedEmploymentStatus="ACTIVE"
              excludeUserIds={excludeStaffIds}
              value={selectedStaff}
              onChange={setSelectedStaff}
              required
              label="Target Staff Member"
              placeholder="Search internal staff by name, email, employee code, or department..."
              helperText="Live search strictly scoped to ALSM Internal Workforce. Cannot transfer to current assignee."
            />
          </div>

          {/* Card 3: Briefing & Transition Notes */}
          <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs space-y-3 relative z-10">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DCE3EC]">
              <FileText className="w-4 h-4 text-[#244A70]" />
              <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                3. Briefing & Transition Notes
              </h2>
            </div>

            <div>
              <label htmlFor="notes-textarea" className="text-xs font-bold text-[#17263A] block mb-1.5">
                Technical Handover & Milestone Briefing
              </label>
              <textarea
                id="notes-textarea"
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Specify high-priority screen conversion queues, open PRs, sprint milestone commitments, and handover instructions for the successor..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#DCE3EC] rounded-xl text-xs text-[#17263A] outline-none focus:ring-2 focus:ring-[#244A70]/15"
              />
              <p className="text-[11px] text-[#8491A3] mt-1">
                Provide clear instructions so the successor can pick up ongoing modernization tasks immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (Reason, Preview & Policies) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Card 4: Transfer Classification */}
          <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DCE3EC]">
              <Tag className="w-4 h-4 text-[#244A70]" />
              <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                Transfer Classification
              </h2>
            </div>

            <div>
              <label htmlFor="reason-select" className="text-xs font-bold text-[#17263A] block mb-1.5">
                Transfer Reason *
              </label>
              <select
                id="reason-select"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#DCE3EC] rounded-xl text-xs text-[#17263A] outline-none focus:ring-2 focus:ring-[#244A70]/15"
              >
                <option value="Workload Balancing">Workload Balancing</option>
                <option value="Offboarding">Offboarding</option>
                <option value="Leave of Absence">Leave of Absence</option>
                <option value="Skill Alignment">Skill Alignment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC] text-xs">
              <span className="font-semibold text-[#17263A] block mb-1">Reason Category:</span>
              <p className="text-[#8491A3]">
                {reason === 'Workload Balancing' && 'Reallocates tasks to optimize team capacity across active sprint deliverables.'}
                {reason === 'Offboarding' && 'Handover required due to employee departure or transfer out of the organization.'}
                {reason === 'Leave of Absence' && 'Temporary or permanent coverage during planned staff leave.'}
                {reason === 'Skill Alignment' && 'Assigns domain-specialized engineers for specific legacy technologies.'}
                {reason === 'Other' && 'Operational reassignment requiring administrative approval.'}
              </p>
            </div>
          </div>

          {/* Card 5: Ownership Transition Preview */}
          <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DCE3EC]">
              <ShieldCheck className="w-4 h-4 text-[#244A70]" />
              <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                Ownership Transition Preview
              </h2>
            </div>

            <div className="space-y-3">
              {/* Current Assignee */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-[#8491A3] uppercase tracking-wider block">
                  Current Owner
                </span>
                <div className="font-bold text-[#17263A] text-xs mt-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {selectedProject?.assignedStaffName || 'Unallocated'}
                </div>
                <div className="text-[11px] text-[#8491A3]">
                  {selectedProject ? `${selectedProject.name} (#${selectedProject.id.slice(-8).toUpperCase()})` : 'No project selected'}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center text-[#8491A3]">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Proposed Successor */}
              <div
                className={`p-3.5 rounded-xl border ${
                  selectedStaff ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-dashed border-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Proposed Successor
                </span>
                <div className="font-bold text-emerald-950 text-xs mt-1">
                  {selectedStaff?.fullName || 'Choose staff member...'}
                </div>
                <div className="text-[11px] text-emerald-700">
                  {selectedStaff ? `${selectedStaff.email} • #${selectedStaff.employeeCode}` : 'Pending selection'}
                </div>
              </div>
            </div>
          </div>

          {/* SLA & Submit Action */}
          <div className="p-6 bg-white border border-[#DCE3EC] rounded-2xl shadow-2xs space-y-4">
            <div className="text-xs text-[#8491A3] space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-[#17263A]">
                <ShieldCheck className="w-4 h-4 text-[#244A70]" />
                Administrative Approval SLA
              </div>
              <p className="text-[11px]">
                Upon submission, the request enters <strong className="text-amber-700">Pending Review</strong> status. Once approved by a Team Lead or Platform Admin, project ownership and assignment updates execute immediately across all workspaces.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedProject || !selectedStaff}
              className="w-full bg-[#244A70] hover:bg-[#244A70] text-white text-xs h-10 shadow-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {isSubmitting ? 'Submitting Request...' : 'Submit Transfer Request'}
            </Button>

            <div className="text-center">
              <Link
                to="/team-lead/resource-transfers"
                className="text-[11px] font-medium text-[#8491A3] hover:text-[#17263A] transition-colors"
              >
                Cancel and Return
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
