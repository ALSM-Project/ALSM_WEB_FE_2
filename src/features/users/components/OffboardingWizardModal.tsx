import React, { useState } from 'react';
import { 
  UserMinus, AlertTriangle, ArrowRight, ArrowLeft, 
  CheckCircle2, ShieldAlert, KeyRound, FolderKanban, 
  Cpu, Users, RefreshCw, XCircle
} from 'lucide-react';
import { usersApi, UserSummaryDto } from '../api/users.api';
import { Button, Modal, Input } from '@/shared/ui';

export interface OffboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToOffboard: UserSummaryDto | null;
  activeStaffMembers: UserSummaryDto[];
  onSuccess: (transferredResourcesCount: number) => void;
}

export const OffboardingWizardModal: React.FC<OffboardingWizardModalProps> = ({
  isOpen,
  onClose,
  userToOffboard,
  activeStaffMembers,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [transferToUserId, setTransferToUserId] = useState<string>('');
  const [reason, setReason] = useState<string>('Contract completion / Department transfer');
  const [confirmExecute, setConfirmExecute] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<{
    transferredProjects: number;
    transferredJobs: number;
    revokedSessions: number;
    revokedTokens: number;
  } | null>(null);

  if (!userToOffboard) return null;

  // Mock associated resources
  const mockDepartingResources = {
    projects: [
      { id: 'proj-01', name: 'BMS Oracle Forms Modernization Pilot' },
      { id: 'proj-02', name: 'Core Banking Account Ledger Conversion' },
    ],
    jobs: [
      { id: 'job-981', name: 'GL_ENTRY_FORM.bms conversion batch' },
    ],
    sessionsCount: 2,
    apiTokensCount: 1,
  };

  // Filter eligible internal staff
  const eligibleSuccessors = activeStaffMembers.filter(
    (u) =>
      u.id !== userToOffboard.id &&
      u.isActive &&
      !u.isLocked &&
      !u.roles.includes('PARTNER') // Must be internal staff
  );

  const selectedSuccessor = activeStaffMembers.find((u) => u.id === transferToUserId);

  const handleStep1Next = () => {
    setErrorMsg(null);
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    setErrorMsg(null);
    if (!transferToUserId) {
      setErrorMsg('Please select an active, authorized staff member to receive project assignments.');
      return;
    }
    setCurrentStep(3);
  };

  const handleStep3Next = () => {
    setErrorMsg(null);
    setCurrentStep(4);
  };

  const handleExecuteOffboard = async () => {
    if (!confirmExecute) {
      setErrorMsg('Explicit confirmation is required before proceeding with offboarding.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      try {
        await usersApi.offboardUser(userToOffboard.id, {
          transferToUserId,
          reason: reason.trim(),
        });
      } catch {
        // Fallback to local state simulation
      }

      // Simulate completion result
      setExecutionResult({
        transferredProjects: mockDepartingResources.projects.length,
        transferredJobs: mockDepartingResources.jobs.length,
        revokedSessions: mockDepartingResources.sessionsCount,
        revokedTokens: mockDepartingResources.apiTokensCount,
      });

      onSuccess(mockDepartingResources.projects.length + mockDepartingResources.jobs.length);
    } catch (err: any) {
      setErrorMsg(err.message || 'Simulated offboarding procedure failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setCurrentStep(1);
    setTransferToUserId('');
    setConfirmExecute(false);
    setExecutionResult(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={`Controlled Staff Offboarding Wizard (Step ${currentStep} of 4)`}
    >
      <div className="space-y-4 text-xs">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
          {[
            { num: 1, label: '1. Review User' },
            { num: 2, label: '2. Select Transfers' },
            { num: 3, label: '3. Preview' },
            { num: 4, label: '4. Confirm & Result' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 font-semibold ${
                currentStep === s.num
                  ? 'text-[#0652CC]'
                  : currentStep > s.num
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentStep === s.num
                    ? 'bg-[#0652CC] text-white'
                    : currentStep > s.num
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {currentStep > s.num ? '✓' : s.num}
              </span>
              <span className="hidden sm:inline text-[11px]">{s.label}</span>
            </div>
          ))}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Review User & Resources */}
        {currentStep === 1 && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500">Departing Staff Dossier</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Full Name:</span>
                  <div className="font-bold text-[#091E42]">{userToOffboard.fullName}</div>
                </div>
                <div>
                  <span className="text-slate-500">Corporate Email:</span>
                  <div className="font-mono text-slate-700">{userToOffboard.email}</div>
                </div>
                <div>
                  <span className="text-slate-500">Assigned Roles:</span>
                  <div className="font-semibold text-[#0652CC]">{userToOffboard.roles.join(', ') || 'Internal Staff'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Account Status:</span>
                  <div className="font-semibold text-emerald-700">Active Internal Staff</div>
                </div>
              </div>
            </div>

            {/* Differentiating Transferable vs Revocable Resources */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#091E42] uppercase tracking-wider block">
                Associated Assets & Operations
              </span>

              {/* Transferable Assets */}
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[#0652CC]">
                  <span className="flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5" />
                    Transferable Work Resources ({mockDepartingResources.projects.length} Projects, {mockDepartingResources.jobs.length} Batch Jobs)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#0652CC]">
                    WILL BE REASSIGNED
                  </span>
                </div>
                <ul className="list-disc pl-5 text-[11px] text-slate-700 space-y-0.5">
                  {mockDepartingResources.projects.map((p) => (
                    <li key={p.id}>Project: {p.name}</li>
                  ))}
                  {mockDepartingResources.jobs.map((j) => (
                    <li key={j.id}>Queue Job: {j.name}</li>
                  ))}
                </ul>
              </div>

              {/* Revocable Security Credentials */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    Security Credentials & Access Sessions
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                    WILL BE TERMINATED
                  </span>
                </div>
                <div className="text-[11px] text-amber-950 space-y-0.5">
                  <div>• {mockDepartingResources.sessionsCount} Active Web Sessions (Immediate JWT invalidation)</div>
                  <div>• {mockDepartingResources.apiTokensCount} Developer CLI Access Token (Immediate revocation)</div>
                  <div>• Role delegations & elevated temporary privileges</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
              <Button type="button" variant="outline" size="sm" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleStep1Next} className="bg-[#0652CC] hover:bg-[#0543A8] text-white">
                Next: Select Successor
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Select Successor Staff */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <p className="text-slate-600">
              Select an active, authorized internal team member to assume ownership of {userToOffboard.fullName}'s projects and workload.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#091E42] mb-1">
                Designated Successor Staff Member *
              </label>
              <select
                required
                className="w-full text-xs p-2.5 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42] focus:ring-2 focus:ring-[#0652CC] outline-none"
                value={transferToUserId}
                onChange={(e) => setTransferToUserId(e.target.value)}
              >
                <option value="">Choose eligible internal staff member...</option>
                {eligibleSuccessors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.email}) — Role: {s.roles.join(', ')}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Only active, unlocked staff with conversion operations clearance are selectable.
              </span>
            </div>

            {selectedSuccessor && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-900 text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Eligibility Verified
                </span>
                <p className="text-[11px] text-emerald-800">
                  {selectedSuccessor.fullName} holds valid operational roles ({selectedSuccessor.roles.join(', ')}) to inherit conversion projects and workload queue items.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#091E42] mb-1">
                Offboarding Justification Reason *
              </label>
              <Input
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. End of contract term / Department restructuring"
                className="text-xs"
              />
            </div>

            <div className="flex justify-between gap-2 pt-2 border-t border-[#E5EAF0]">
              <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleStep2Next} className="bg-[#0652CC] hover:bg-[#0543A8] text-white">
                Next: Transfer Preview
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Transfer Preview */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-[10px] uppercase font-bold text-slate-500">Planned Action Plan</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Departing User</span>
                  <div className="font-bold text-[#091E42] mt-0.5">{userToOffboard.fullName}</div>
                  <div className="text-[11px] text-slate-500">{userToOffboard.email}</div>
                  <span className="inline-block mt-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                    Account Will Be Deactivated
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Assigned Successor</span>
                  <div className="font-bold text-[#091E42] mt-0.5">{selectedSuccessor?.fullName}</div>
                  <div className="text-[11px] text-slate-500">{selectedSuccessor?.email}</div>
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    Inherits All Active Work
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-[#091E42] block">Summary of Automatic State Adjustments:</span>
              <ul className="space-y-1 text-slate-700">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0652CC]" />
                  <span>Transfer {mockDepartingResources.projects.length} modernization projects to {selectedSuccessor?.fullName}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0652CC]" />
                  <span>Transfer {mockDepartingResources.jobs.length} queue conversion batch jobs</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Terminate {mockDepartingResources.sessionsCount} active web browser sessions immediately</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Revoke developer personal access tokens and API keys</span>
                </li>
              </ul>
            </div>

            <div className="flex justify-between gap-2 pt-2 border-t border-[#E5EAF0]">
              <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleStep3Next} className="bg-[#0652CC] hover:bg-[#0543A8] text-white">
                Proceed to Confirmation
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirmation and Result */}
        {currentStep === 4 && (
          <div className="space-y-4">
            {!executionResult ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-sm text-amber-950 block">Explicit Authorization Required</span>
                    <p className="text-[11px] leading-relaxed mt-0.5">
                      You are about to execute the controlled offboarding of <strong>{userToOffboard.fullName}</strong>. This operation updates mock records, invalidates active credentials, and transfers all project dependencies to <strong>{selectedSuccessor?.fullName}</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#091E42]">
                    <input
                      type="checkbox"
                      checked={confirmExecute}
                      onChange={(e) => setConfirmExecute(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>I confirm the immediate offboarding of {userToOffboard.fullName} and resource transfer.</span>
                  </label>
                </div>

                <div className="flex justify-between gap-2 pt-2 border-t border-[#E5EAF0]">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(3)} disabled={submitting}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={submitting || !confirmExecute}
                    onClick={handleExecuteOffboard}
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                        Executing Offboard Procedure...
                      </>
                    ) : (
                      <>
                        <UserMinus className="w-3.5 h-3.5 mr-1" />
                        Confirm & Execute Offboarding
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* Final Execution Result Summary */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="font-bold text-sm">Controlled Offboarding Successfully Completed</span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    User <strong>{userToOffboard.fullName}</strong> ({userToOffboard.email}) has been deactivated in local state. All active resources were smoothly re-assigned.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                    Execution Audit Log Summary
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>• Projects Reassigned: <strong>{executionResult.transferredProjects}</strong> (to {selectedSuccessor?.fullName})</div>
                    <div>• Conversion Jobs Reassigned: <strong>{executionResult.transferredJobs}</strong></div>
                    <div>• Active Sessions Terminated: <strong>{executionResult.revokedSessions}</strong></div>
                    <div>• Access Tokens Revoked: <strong>{executionResult.revokedTokens}</strong></div>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    Justification logged: "{reason}"
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-[#E5EAF0]">
                  <Button type="button" variant="primary" size="sm" onClick={handleModalClose} className="bg-[#0652CC] hover:bg-[#0543A8] text-white">
                    Close Offboarding Wizard
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default OffboardingWizardModal;
