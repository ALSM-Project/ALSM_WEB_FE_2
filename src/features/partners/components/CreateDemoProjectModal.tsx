import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Monitor, Cpu, Trash2, CheckCircle2, 
  ArrowRight, FileCode, Check 
} from 'lucide-react';
import { Modal, Button, Input } from '@/shared/ui';
import { PartnerProject } from '../types/partner.types';

export interface CreateDemoProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newProject: PartnerProject) => void;
}

interface SampleFile {
  id: string;
  name: string;
  type: 'SCREEN' | 'PROGRAM';
  sizeKb: number;
  description: string;
  selected: boolean;
}

const DEFAULT_SAMPLE_FILES: SampleFile[] = [
  {
    id: 'bms-1',
    name: 'CUSTINQ.bms',
    type: 'SCREEN',
    sizeKb: 14.2,
    description: 'Customer Account Inquiry 3270 Terminal Screen',
    selected: true,
  },
  {
    id: 'bms-2',
    name: 'ACCTPAY.bms',
    type: 'SCREEN',
    sizeKb: 18.5,
    description: 'Accounts Payable Billing Form with validation fields',
    selected: true,
  },
  {
    id: 'dspf-1',
    name: 'BALCHK.dspf',
    type: 'SCREEN',
    sizeKb: 9.8,
    description: 'AS/400 Balance Check Display File',
    selected: true,
  },
  {
    id: 'cbl-1',
    name: 'TRANSPROC.cbl',
    type: 'PROGRAM',
    sizeKb: 48.6,
    description: 'Core Transaction Batch Processor (Enterprise COBOL)',
    selected: true,
  },
  {
    id: 'cbl-2',
    name: 'CALCRATE.cbl',
    type: 'PROGRAM',
    sizeKb: 32.1,
    description: 'Interest & Exchange Rate Computation Engine',
    selected: true,
  },
  {
    id: 'cbl-3',
    name: 'VALACCT.cbl',
    type: 'PROGRAM',
    sizeKb: 22.4,
    description: 'Account Format and Checksum Validator',
    selected: false,
  },
];

export const CreateDemoProjectModal: React.FC<CreateDemoProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [projectName, setProjectName] = useState('Demo Core Banking Showcase');
  const [description, setDescription] = useState('Interactive sandbox project demonstrating BMS 3270 screen and COBOL batch modernization');
  const [targetFramework, setTargetFramework] = useState('React 19 + Java 21 / Spring Boot');
  const [files, setFiles] = useState<SampleFile[]>(DEFAULT_SAMPLE_FILES);
  const [createdProject, setCreatedProject] = useState<PartnerProject | null>(null);

  const resetForm = () => {
    setStep(1);
    setProjectName('Demo Core Banking Showcase');
    setDescription('Interactive sandbox project demonstrating BMS 3270 screen and COBOL batch modernization');
    setTargetFramework('React 19 + Java 21 / Spring Boot');
    setFiles(DEFAULT_SAMPLE_FILES);
    setCreatedProject(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleFile = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f))
    );
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const selectedFiles = files.filter((f) => f.selected);
  const screenFiles = selectedFiles.filter((f) => f.type === 'SCREEN');
  const programFiles = selectedFiles.filter((f) => f.type === 'PROGRAM');

  const handleCreateDemo = () => {
    const demoId = `demo-${Date.now().toString(36)}`;
    const newDemoProj: PartnerProject = {
      id: demoId,
      name: projectName.trim(),
      partnerId: 'partner-internal-demo',
      partnerName: 'ALSM Internal Sandbox',
      organizationId: 'org-demo-sandbox',
      conversionType: 'BMS_DSPF_TO_FRONTEND',
      targetFramework,
      status: 'IN_PROGRESS',
      screensTotal: screenFiles.length,
      screensCompleted: Math.max(1, Math.floor(screenFiles.length / 2)),
      programsTotal: programFiles.length,
      programsCompleted: Math.max(1, Math.floor(programFiles.length / 2)),
      assignedTeamLeadName: 'Demo Team Lead',
      assignedStaffName: 'Internal Conversion Staff',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      isExported: false,
      isDemo: true,
      description,
    };

    // Store in localStorage for persistence
    try {
      const stored = localStorage.getItem('alsm_demo_projects');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(newDemoProj);
      localStorage.setItem('alsm_demo_projects', JSON.stringify(list));
    } catch {
      // Ignore storage errors
    }

    setCreatedProject(newDemoProj);
    if (onSuccess) {
      onSuccess(newDemoProj);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdProject ? 'Demo Project Created Successfully' : 'Create Demo Project Sandbox'}
      maxWidth="2xl"
    >
      {createdProject ? (
        <div className="space-y-5 py-2">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Demo Project Initialized</span>
            </div>
            <p className="text-xs text-emerald-800">
              Demo project <strong>{createdProject.name}</strong> has been created with{' '}
              {createdProject.screensTotal} BMS screens and {createdProject.programsTotal} COBOL programs.
            </p>
          </div>

          <div className="rounded-xl border border-[#E5EAF0] p-4 bg-[#FAFBFD] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#6B778C]">Project Identifier:</span>
              <span className="font-mono font-semibold text-[#091E42]">{createdProject.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B778C]">Framework Stack:</span>
              <span className="font-semibold text-[#091E42]">{createdProject.targetFramework}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B778C]">Sample Scope:</span>
              <span className="font-semibold text-[#091E42]">
                {createdProject.screensTotal} Screens · {createdProject.programsTotal} Programs
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5EAF0]">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                handleClose();
                navigate(`/partners/projects/${createdProject.id}/workspace`);
              }}
              className="bg-[#0652CC] text-white hover:bg-[#0543A8]"
            >
              Open Conversion Workspace
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Step Indicator */}
          <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3 text-xs">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`font-semibold pb-1 flex items-center gap-1.5 ${
                  step === 1 ? 'text-[#0652CC] border-b-2 border-[#0652CC]' : 'text-[#6B778C]'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-[#E5EAF0] text-[#091E42] text-[11px] flex items-center justify-center font-bold">1</span>
                Project Information
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`font-semibold pb-1 flex items-center gap-1.5 ${
                  step === 2 ? 'text-[#0652CC] border-b-2 border-[#0652CC]' : 'text-[#6B778C]'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-[#E5EAF0] text-[#091E42] text-[11px] flex items-center justify-center font-bold">2</span>
                Sample Files
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className={`font-semibold pb-1 flex items-center gap-1.5 ${
                  step === 3 ? 'text-[#0652CC] border-b-2 border-[#0652CC]' : 'text-[#6B778C]'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-[#E5EAF0] text-[#091E42] text-[11px] flex items-center justify-center font-bold">3</span>
                Review & Confirm
              </button>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
              DEMO SANDBOX
            </span>
          </div>

          {/* Step 1: Project Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="demo-project-name" className="block text-xs font-semibold text-[#091E42] mb-1">
                  Demo Project Name *
                </label>
                <Input
                  id="demo-project-name"
                  required
                  placeholder="e.g. Core Banking Showcase Demo"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">
                  Description / Showcase Scope
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D9E2EC] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
                  placeholder="Explain the purpose of this demonstration..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#091E42] mb-1">
                  Target Framework Stack
                </label>
                <select
                  value={targetFramework}
                  onChange={(e) => setTargetFramework(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D9E2EC] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
                >
                  <option value="React 19 + Java 21 / Spring Boot">Full Stack (React 19 Frontend + Spring Boot 3.3 Backend)</option>
                  <option value="React 19 + Tailwind CSS">Frontend Only (BMS/DSPF to Modern React)</option>
                  <option value="Spring Boot 3.3 + Java 21">Backend Only (COBOL to Java 21 Services)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-[#0652CC] text-xs">
                Demo projects are isolated sandboxes for internal staff demonstrations and proof-of-concept previews.
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setStep(2)}
                  disabled={!projectName.trim()}
                >
                  Next: Select Sample Files
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Sample Files */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#6B778C]">
                  Choose legacy sample files to seed into this demo project workspace:
                </p>
                <span className="text-xs font-bold text-[#091E42]">
                  {selectedFiles.length} files selected
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => toggleFile(file.id)}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      file.selected
                        ? 'border-[#0652CC] bg-blue-50/40'
                        : 'border-[#E5EAF0] bg-white hover:bg-[#F7F9FC]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          file.selected
                            ? 'bg-[#0652CC] border-[#0652CC] text-white'
                            : 'border-[#D9E2EC] bg-white'
                        }`}
                      >
                        {file.selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-gray-100 text-[#091E42] flex items-center justify-center shrink-0">
                        {file.type === 'SCREEN' ? <Monitor className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="font-mono font-bold text-[#091E42]">{file.name}</div>
                        <div className="text-[11px] text-[#6B778C]">{file.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[#6B778C] text-[11px]">{file.sizeKb} KB</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setStep(3)}
                  disabled={selectedFiles.length === 0}
                >
                  Next: Review & Confirm
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#E5EAF0] p-4 bg-[#FAFBFD] space-y-3 text-xs">
                <h4 className="font-bold text-[#091E42] uppercase tracking-wider text-[11px]">
                  Project Summary
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#6B778C]">Project Name:</span>{' '}
                    <strong className="text-[#091E42]">{projectName}</strong>
                  </div>
                  <div>
                    <span className="text-[#6B778C]">Architecture:</span>{' '}
                    <strong className="text-[#091E42]">{targetFramework}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#6B778C]">Description:</span>{' '}
                    <span className="text-[#091E42]">{description}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-[#091E42] text-xs">
                    Included Source Files ({selectedFiles.length})
                  </h4>
                  <span className="text-[11px] text-[#6B778C]">
                    {screenFiles.length} screens · {programFiles.length} programs
                  </span>
                </div>

                <div className="border border-[#E5EAF0] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase">
                      <tr>
                        <th className="py-2 px-3">File Name</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Size</th>
                        <th className="py-2 px-3 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0]">
                      {selectedFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-[#FAFBFD]">
                          <td className="py-2 px-3 font-mono font-medium text-[#091E42]">
                            <div className="flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5 text-[#0652CC]" />
                              {file.name}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                              {file.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[#6B778C]">
                            {file.sizeKb} KB
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeFile(file.id)}
                              className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                              title="Remove file before confirmation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E5EAF0]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCreateDemo}
                  disabled={selectedFiles.length === 0}
                  className="bg-purple-700 hover:bg-purple-800 text-white"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Confirm & Create Demo Project
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
