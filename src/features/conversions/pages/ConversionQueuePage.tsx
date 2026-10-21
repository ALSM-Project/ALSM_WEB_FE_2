import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Wrench, RefreshCw, AlertTriangle, 
  Search, X, Terminal
} from 'lucide-react';
import { Button, Card, PageHeader, Modal } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { 
  conversionError, 
  conversionQueueService, 
  type JobStatus, 
  type QueueJob 
} from '../services/conversion-queue.service';
import { 
  INITIAL_MOCK_JOBS, 
  EnrichedQueueJob 
} from '../services/mock-queue-data';
import { ConversionTroubleshootingWorkspace } from '../components/ConversionTroubleshootingWorkspace';

const statuses: JobStatus[] = ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD', 'CANCELLED'];

export default function ConversionQueuePage({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || '';
  const initialTab = searchParams.get('tab') === 'troubleshoot' ? 'troubleshoot' : 'queue';
  
  // Navigation Tabs: Queue vs Troubleshooting
  const [activePageTab, setActivePageTab] = useState<'queue' | 'troubleshoot'>(initialTab);
  const [troubleshootTargetJob, setTroubleshootTargetJob] = useState<EnrichedQueueJob | null>(null);

  // Filters
  const [status, setStatus] = useState<JobStatus | ''>(reviewOnly ? 'COMPLETED' : '');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection & Action states
  const [selectedJobId, setSelectedJobId] = useState('');
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [retryTargetJob, setRetryTargetJob] = useState<QueueJob | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const { user, hasPermission } = useAuth();
  const canRetry = user ? hasPermission('conversions.retry') : true;
  const canTroubleshoot = user ? hasPermission('conversions.troubleshoot.view') : true;

  // Local state for mock jobs to demonstrate reactive transitions & patches
  const [mockJobs, setMockJobs] = useState<EnrichedQueueJob[]>(INITIAL_MOCK_JOBS);

  const projects = useQuery({ 
    queryKey: ['conversion-projects'], 
    queryFn: conversionQueueService.listProjects, 
    retry: false 
  });

  const jobs = useQuery({
    queryKey: ['conversion-queue', projectId],
    queryFn: () => conversionQueueService.listJobs(projectId),
    enabled: Boolean(projectId && projects.data?.some((project) => project.id === projectId)),
    refetchInterval: 10000,
    retry: false,
  });

  const details = useQuery({
    queryKey: ['conversion-job', projectId, selectedJobId],
    queryFn: () => conversionQueueService.getJob(selectedJobId),
    enabled: Boolean(selectedJobId && (jobs.data?.some((job) => job.id === selectedJobId) || mockJobs.some((j) => j.id === selectedJobId))),
    refetchInterval: 10000,
    retry: false,
  });

  // Effective job dataset:
  // If `projectId` is passed and `jobs.data` is available, prioritize server jobs.
  // Otherwise, use enriched mockJobs matching the project or all projects.
  const rawDataset: (QueueJob | EnrichedQueueJob)[] = React.useMemo(() => {
    if (projectId && jobs.data) {
      return jobs.data;
    }
    if (projectId) {
      return mockJobs.filter((j) => j.projectId === projectId);
    }
    return mockJobs;
  }, [projectId, jobs.data, mockJobs]);

  // Filtered jobs for display
  const visibleJobs = React.useMemo(() => {
    return rawDataset.filter((job) => {
      const matchesStatus = !status || job.status === status;
      const matchesType = typeFilter === 'ALL' || job.conversionType === typeFilter;
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !term ||
        job.id.toLowerCase().includes(term) ||
        (job.screenId && job.screenId.toLowerCase().includes(term)) ||
        ((job as EnrichedQueueJob).programName && (job as EnrichedQueueJob).programName!.toLowerCase().includes(term)) ||
        ((job as EnrichedQueueJob).projectName && (job as EnrichedQueueJob).projectName!.toLowerCase().includes(term)) ||
        job.createdBy.toLowerCase().includes(term);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [rawDataset, status, typeFilter, searchQuery]);

  // Count helper
  const jobCount = (states: JobStatus[]) => rawDataset.filter((job) => states.includes(job.status)).length;

  const screenWaitingCount = rawDataset.filter((job) => 
    job.status === 'QUEUED' && (job.conversionType !== 'COBOL_TO_NESTJS' || !!job.screenId)
  ).length;

  const cobolWaitingCount = rawDataset.filter((job) => 
    job.status === 'QUEUED' && (job.conversionType === 'COBOL_TO_NESTJS' || (!job.screenId && job.conversionType.includes('COBOL')))
  ).length;

  const deadLetterCount = rawDataset.filter((job) => job.status === 'DEAD' || job.attemptCount >= 3).length;

  // Handle retry simulation
  const handleConfirmRetryJob = async () => {
    if (!retryTargetJob) return;
    const targetId = retryTargetJob.id;
    setRetryTargetJob(null);
    setRetryingJobId(targetId);
    setActionMessage(null);

    try {
      // If server API is available, try it
      await conversionQueueService.retryJob(targetId).catch(() => {});

      // Always update local mock state so frontend reactive transition is demonstrable
      setMockJobs((prev) =>
        prev.map((j) =>
          j.id === targetId
            ? { ...j, status: 'QUEUED', attemptCount: 0, errorMessage: undefined, errorCode: undefined }
            : j
        )
      );

      setActionMessage(`Job ${targetId} successfully re-queued for processing. Attempt count reset to 0/3.`);
      if (jobs.refetch) await jobs.refetch();
      if (selectedJobId === targetId && details.refetch) {
        await details.refetch();
      }
    } catch (err: unknown) {
      setActionMessage(`Failed to retry job: ${conversionError(err)}`);
    } finally {
      setRetryingJobId(null);
    }
  };

  // Open Full Troubleshooting Workspace for a job
  const handleOpenTroubleshooting = (job: QueueJob | EnrichedQueueJob) => {
    const fullJob: EnrichedQueueJob = {
      ...job,
      organizationName: (job as EnrichedQueueJob).organizationName || 'Acme Corporation',
      projectName: (job as EnrichedQueueJob).projectName || (projects.data?.find((p) => p.id === job.projectId)?.name) || 'Core Banking BMS Modernization',
      sourceCode: (job as EnrichedQueueJob).sourceCode || `* Legacy source definition for ${job.screenId || job.id}\nCUSTINQ  DFHMSD TYPE=&SYSPARM,MODE=INOUT\nCUST_BAL_AMT DFHMDF POS=(12,15),LENGTH=14\n         END`,
      fieldMappings: (job as EnrichedQueueJob).fieldMappings || [
        { sourceField: 'ACCTNO', targetProperty: 'accountNumber', dataType: 'string', transformRule: 'trim' },
        { sourceField: 'CUST_BAL_AMT', targetProperty: 'currentBalance', dataType: 'number', transformRule: 'toCurrency' }
      ],
      executionHistory: (job as EnrichedQueueJob).executionHistory || [
        { attempt: 1, timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'FAILED', duration: '4.2s', error: job.errorMessage || 'Syntax validation failed' },
        { attempt: 2, timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'FAILED', duration: '4.5s', error: job.errorMessage || 'Syntax validation failed' },
        { attempt: 3, timestamp: new Date().toISOString(), status: job.status, duration: '4.8s', error: 'Exceeded max retry limit (3/3). DLQ.' }
      ],
      logs: (job as EnrichedQueueJob).logs || [
        { timestamp: '10:00:02', level: 'INFO', message: `Initializing worker for ${job.screenId || job.id}` },
        { timestamp: '10:00:05', level: 'ERROR', message: job.errorMessage || 'Mapping mismatch in AST generator' }
      ]
    };

    setTroubleshootTargetJob(fullJob);
    setActivePageTab('troubleshoot');
  };

  // If in active troubleshooting sub-workspace:
  if (activePageTab === 'troubleshoot' && troubleshootTargetJob) {
    return (
      <ConversionTroubleshootingWorkspace
        job={troubleshootTargetJob}
        onBack={() => {
          setTroubleshootTargetJob(null);
          setActivePageTab('queue');
        }}
        onJobUpdated={(updated) => {
          setMockJobs((prev) =>
            prev.map((j) => (j.id === updated.id ? updated : j))
          );
          setTroubleshootTargetJob(updated);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Top Header */}
      <PageHeader 
        title={reviewOnly ? 'Conversion Quality Reviews' : 'Conversion Queue'} 
        subtitle="Real-time conversion job orchestrator and troubleshooting monitor for screens and COBOL programs." 
      />

      {/* Top Tab Bar: Queue Monitor vs Troubleshooting */}
      <div className="flex items-center gap-1 border-b border-[#E5EAF0] text-xs">
        <button
          type="button"
          onClick={() => setActivePageTab('queue')}
          className={`px-4 py-2.5 font-semibold transition-all border-b-2 cursor-pointer ${
            activePageTab === 'queue'
              ? 'border-[#0652CC] text-[#0652CC] bg-blue-50/20'
              : 'border-transparent text-[#6B778C] hover:text-[#091E42]'
          }`}
        >
          Queue Monitoring
        </button>
        {canTroubleshoot && (
          <button
            type="button"
            onClick={() => setActivePageTab('troubleshoot')}
            className={`px-4 py-2.5 font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activePageTab === 'troubleshoot'
                ? 'border-[#0652CC] text-[#0652CC] bg-blue-50/20'
                : 'border-transparent text-[#6B778C] hover:text-[#091E42]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Troubleshooting & Error Investigation
            {deadLetterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-100 text-rose-800">
                {deadLetterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* TROUBLESHOOTING TAB: Failed conversions list across organizations */}
      {activePageTab === 'troubleshoot' && canTroubleshoot && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#091E42] tracking-tight">
                Failed Conversions & Dead-Letter Items
              </h2>
              <p className="text-xs text-[#6B778C] mt-0.5">
                Inspect broken screen schemas, COBOL AST parser failures, and dead-letter queue items requiring support intervention.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Filter failed items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D9E2EC] rounded-xl outline-none focus:ring-2 focus:ring-[#0652CC]"
              />
              <Search className="w-3.5 h-3.5 text-[#6B778C] absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Failed Items Table */}
          <div className="rounded-2xl border border-[#E5EAF0] bg-white shadow-xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Organisation</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Screen / Program</th>
                  <th className="py-3 px-4">Conversion Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Failure Reason</th>
                  <th className="py-3 px-4">Last Attempt</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {mockJobs.filter((j) => j.status === 'FAILED' || j.status === 'DEAD').map((job) => (
                  <tr key={job.id} className="hover:bg-rose-50/20 transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#091E42]">
                      {job.organizationName || 'Acme Corporation'}
                    </td>
                    <td className="py-3 px-4 text-[#6B778C]">
                      {job.projectName || job.projectId}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#091E42]">
                      {job.screenId || job.programName || job.id}
                    </td>
                    <td className="py-3 px-4 text-[#091E42]">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 font-mono">
                        {job.conversionType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        job.status === 'DEAD' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {job.status === 'DEAD' ? 'DEAD (DLQ)' : 'FAILED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-rose-700 max-w-xs truncate" title={job.errorMessage}>
                      {job.errorMessage || 'AST parsing syntax error'}
                    </td>
                    <td className="py-3 px-4 text-[#6B778C]">
                      Attempt {job.attemptCount}/{job.maxAttempts}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canTroubleshoot && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleOpenTroubleshooting(job)}
                          className="text-xs bg-[#0652CC] hover:bg-[#0543A8] text-white py-1 px-3"
                        >
                          <Wrench className="w-3 h-3 mr-1" />
                          Troubleshoot
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUEUE MONITOR TAB */}
      {activePageTab === 'queue' && (
        <div className="space-y-6">
          {/* Main Control Card: Filters & Controls */}
          <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs font-semibold text-[#091E42]">
                  Project
                  <select 
                    aria-label="Project" 
                    value={projectId} 
                    className="block mt-1 border border-[#E5EAF0] rounded-xl p-2 min-w-56 text-xs text-[#091E42] bg-white focus:outline-none focus:border-[#0652CC]" 
                    onChange={(event) => {
                      setSearchParams(event.target.value ? { projectId: event.target.value } : {});
                      setSelectedJobId('');
                    }}
                  >
                    <option value="">All Projects</option>
                    {projects.data?.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold text-[#091E42]">
                  Status
                  <select 
                    aria-label="Status" 
                    value={status} 
                    className="block mt-1 border border-[#E5EAF0] rounded-xl p-2 text-xs text-[#091E42] bg-white focus:outline-none focus:border-[#0652CC]" 
                    onChange={(event) => setStatus(event.target.value as JobStatus | '')}
                  >
                    {!reviewOnly && <option value="">All statuses</option>}
                    {(reviewOnly ? ['COMPLETED'] : statuses).map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold text-[#091E42]">
                  Job Type
                  <select 
                    aria-label="Job Type" 
                    value={typeFilter} 
                    className="block mt-1 border border-[#E5EAF0] rounded-xl p-2 text-xs text-[#091E42] bg-white focus:outline-none focus:border-[#0652CC]" 
                    onChange={(event) => setTypeFilter(event.target.value)}
                  >
                    <option value="ALL">All Types</option>
                    <option value="BMS_DSPF_TO_FRONTEND">BMS / DSPF to React</option>
                    <option value="COBOL_TO_JAVA">COBOL to Java 21</option>
                    <option value="COBOL_TO_NESTJS">COBOL to NestJS</option>
                  </select>
                </label>
              </div>

              {/* Refresh Action with last-updated timestamp */}
              <div className="flex items-center gap-2">
                <button 
                  disabled={projects.isFetching || jobs.isFetching || details.isFetching} 
                  onClick={() => {
                    void projects.refetch();
                    if (projectId && projects.data?.some((project) => project.id === projectId)) void jobs.refetch();
                    if (selectedJobId) void details.refetch();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-4 py-2 text-xs font-semibold text-[#091E42] shadow-xs hover:bg-[#F4F6F8] transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Search Input Filter Toolbar */}
            <div className="pt-2">
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Search by job ID, screen name, or program name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
                />
                <Search className="w-4 h-4 text-[#6B778C] absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {projects.isPending && <p role="status" className="text-xs text-[#6B778C]">Loading projects...</p>}
            {projects.isError && <p role="alert" className="text-xs text-rose-600">Unable to load projects: {conversionError(projects.error)}</p>}
            {projects.isSuccess && projects.data.length === 0 && <p className="text-xs text-[#6B778C]">No accessible projects found.</p>}
            
            {/* Project unavailable in current org alert */}
            {projects.isSuccess && projectId && !projects.data.some((project) => project.id === projectId) && (
              <p role="alert" className="text-xs text-rose-600">This project is unavailable in your current organization.</p>
            )}

            {projectId && jobs.isFetching && !jobs.data && <p role="status" className="text-xs text-[#6B778C]">Loading conversion jobs...</p>}
            {jobs.isError && <p role="alert" className="text-xs text-rose-600">Unable to load jobs: {conversionError(jobs.error)}</p>}

            {/* Summary Metrics Section */}
            {(jobs.isSuccess || !projectId) && (
              <>
                <section aria-label="Project queue status summary" className="rounded-xl bg-[#F7F9FC] border border-[#E5EAF0] p-4 space-y-3">
                  <h2 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
                    Project: {projects.data?.find((project) => project.id === projectId)?.name || 'All Accessible Projects'}
                  </h2>
                  <p className="text-[11px] text-[#6B778C]">
                    Persisted statuses across all {rawDataset.length} jobs in this scope. The status filter only changes the list below.
                  </p>
                  
                  {/* 5-Card Operational Metrics Grid */}
                  <dl className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                    {/* Waiting Jobs */}
                    <div className="bg-white p-3 rounded-xl border border-[#E5EAF0]">
                      <dt className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">Waiting (QUEUED)</dt>
                      <dd aria-label="Waiting jobs" className="text-2xl font-bold text-[#091E42] mt-0.5">
                        {jobCount(['QUEUED'])}
                      </dd>
                      <span className="text-[10px] text-[#6B778C]">({screenWaitingCount} Screens, {cobolWaitingCount} COBOL)</span>
                    </div>

                    {/* Processing Jobs */}
                    <div className="bg-white p-3 rounded-xl border border-[#E5EAF0]">
                      <dt className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">Processing (recorded)</dt>
                      <dd aria-label="Processing jobs" className="text-2xl font-bold text-amber-600 mt-0.5">
                        {jobCount(['PROCESSING'])}
                      </dd>
                      <span className="text-[10px] text-[#6B778C]">Active worker execution</span>
                    </div>

                    {/* Failed or Dead Jobs */}
                    <div className="bg-white p-3 rounded-xl border border-[#E5EAF0]">
                      <dt className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">Failed / dead (FAILED + DEAD)</dt>
                      <dd aria-label="Failed or dead jobs" className="text-2xl font-bold text-rose-600 mt-0.5">
                        {jobCount(['FAILED', 'DEAD'])}
                      </dd>
                      <span className="text-[10px] text-[#6B778C]">Error states</span>
                    </div>

                    {/* Dead Letter Queue */}
                    <div className="bg-white p-3 rounded-xl border border-rose-200 bg-rose-50/20">
                      <dt className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Dead-Letter (DLQ)
                      </dt>
                      <dd className="text-2xl font-bold text-rose-700 mt-0.5">
                        {deadLetterCount}
                      </dd>
                      <span className="text-[10px] text-rose-700">3 retries limit exceeded</span>
                    </div>

                    {/* Completed Jobs */}
                    <div className="bg-white p-3 rounded-xl border border-[#E5EAF0]">
                      <dt className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">Completed</dt>
                      <dd className="text-2xl font-bold text-emerald-600 mt-0.5">
                        {jobCount(['COMPLETED'])}
                      </dd>
                      <span className="text-[10px] text-[#6B778C]">Verified successfully</span>
                    </div>
                  </dl>
                </section>

                <p className="text-xs text-[#6B778C]">
                  {visibleJobs.length} matching jobs · Last updated {new Date().toLocaleTimeString()}. QUEUED jobs await a worker; PROCESSING is the last recorded worker state.
                </p>

                {actionMessage && (
                  <div className="p-3.5 bg-blue-50 border border-blue-200 text-[#0652CC] rounded-xl text-xs flex items-center justify-between">
                    <span>{actionMessage}</span>
                    <button className="text-xs font-bold underline cursor-pointer" onClick={() => setActionMessage(null)}>Dismiss</button>
                  </div>
                )}

                {visibleJobs.length === 0 ? (
                  <p className="py-4 text-xs text-[#6B778C]">No conversion jobs match this selection.</p>
                ) : (
                  <div className="rounded-2xl border border-[#E5EAF0] bg-white shadow-xs overflow-hidden mt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                            <th className="py-3 px-4">Job ID / Target</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Type / Pipeline</th>
                            <th className="py-3 px-4">Attempts (Max 3)</th>
                            <th className="py-3 px-4">Submitted By</th>
                            <th className="py-3 px-4">Created / Updated</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5EAF0]">
                          {visibleJobs.map((job) => {
                            const isDead = job.status === 'DEAD' || job.attemptCount >= 3;
                            return (
                              <tr key={job.id} className="hover:bg-[#F9FBFF] transition-colors align-top">
                                <td className="py-3.5 px-4 font-mono">
                                  <span className="font-semibold text-[#091E42]">{job.id}</span>
                                  <div className="text-[10px] text-[#6B778C]">
                                    {job.screenId || (job as EnrichedQueueJob).programName || 'General conversion'}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                    job.status === 'PROCESSING' ? 'bg-amber-100 text-amber-800' :
                                    job.status === 'FAILED' || job.status === 'DEAD' ? 'bg-rose-100 text-rose-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {job.status}
                                  </span>
                                  {isDead && (
                                    <span className="block text-[9px] font-extrabold text-rose-700 mt-0.5">
                                      DLQ LIMIT REACHED
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-[#091E42]">
                                  <div>{job.conversionType}</div>
                                  <div className="text-[10px] text-[#6B778C]">{job.priority}</div>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[#6B778C]">
                                  <span className={job.attemptCount >= 3 ? 'text-rose-700 font-bold' : ''}>
                                    {job.attemptCount} / {job.maxAttempts}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[#6B778C] text-[11px]">
                                  {job.createdBy}
                                </td>
                                <td className="py-3.5 px-4 text-[#6B778C]">
                                  {new Date(job.createdAt).toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex flex-col items-end gap-1.5">
                                    <button 
                                      className="text-xs text-[#0652CC] font-semibold hover:underline cursor-pointer" 
                                      onClick={() => setSelectedJobId(job.id)}
                                    >
                                      View job {job.id}
                                    </button>

                                    {/* Troubleshoot Action for Failed / Dead items */}
                                    {(job.status === 'FAILED' || job.status === 'DEAD') && canTroubleshoot && (
                                      <button
                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 cursor-pointer"
                                        onClick={() => handleOpenTroubleshooting(job)}
                                        title="Open full troubleshooting workspace with source preview and mapping overrides"
                                      >
                                        <Wrench className="w-3 h-3" />
                                        Troubleshoot
                                      </button>
                                    )}

                                    {/* Retry Job: strictly only for jobs in DEAD state / DLQ */}
                                    {isDead && canRetry && (
                                      <button
                                        disabled={retryingJobId === job.id}
                                        className="px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-300 rounded-lg hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                                        onClick={() => setRetryTargetJob(job)}
                                      >
                                        {retryingJobId === job.id ? 'Retrying...' : 'Retry Job'}
                                      </button>
                                    )}

                                    {job.status === 'COMPLETED' && hasPermission('quality-review.manage') && (
                                      <Link 
                                        className="text-xs text-[#0652CC] font-semibold hover:underline" 
                                        to={`/admin/projects/${encodeURIComponent(job.projectId)}/conversions/${encodeURIComponent(job.id)}/quality-review`}
                                      >
                                        Review quality
                                      </Link>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Job Details Drawer / Panel */}
          {selectedJobId && (
            <Card className="space-y-4 border-2 border-blue-100">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
                <div>
                  <h2 className="text-base font-bold text-[#091E42]">Job Details: {selectedJobId}</h2>
                  <p className="text-xs text-[#6B778C]">Complete telemetry and worker log stream</p>
                </div>
                <div className="flex items-center gap-2">
                  {details.data && (details.data.status === 'FAILED' || details.data.status === 'DEAD') && (
                    <>
                      {canTroubleshoot && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenTroubleshooting(details.data!)}
                          className="text-xs"
                        >
                          <Wrench className="w-3.5 h-3.5 mr-1 text-[#0652CC]" />
                          Troubleshoot in Workspace
                        </Button>
                      )}
                      {details.data.status === 'DEAD' && canRetry && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={retryingJobId === details.data.id}
                          onClick={() => setRetryTargetJob(details.data!)}
                          className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                        >
                          Retry Job
                        </Button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => setSelectedJobId('')}
                    className="p-1 rounded-lg text-[#6B778C] hover:bg-gray-100 cursor-pointer"
                    title="Close details"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {details.isPending && <p role="status" className="text-xs text-[#6B778C]">Loading job details...</p>}
              {details.isError && <p role="alert" className="text-xs text-rose-600">Unable to load job: {conversionError(details.error)}</p>}

              {details.data && (
                <div className="space-y-4">
                  <dl className="grid sm:grid-cols-3 gap-4 text-xs pt-1">
                    <div>
                      <dt className="font-semibold text-[#6B778C]">Job ID</dt>
                      <dd className="font-mono text-[#091E42] mt-0.5 font-bold">{details.data.id}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#6B778C]">Worker Status</dt>
                      <dd className="font-semibold mt-0.5 text-[#091E42]">{details.data.status}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#6B778C]">Attempt Counter (Max 3)</dt>
                      <dd className="font-mono font-semibold text-[#091E42] mt-0.5">
                        {details.data.attemptCount} / {details.data.maxAttempts}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#6B778C]">Started</dt>
                      <dd className="text-[#091E42] mt-0.5">{details.data.startedAt ? new Date(details.data.startedAt).toLocaleString() : 'Not started'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#6B778C]">Completed</dt>
                      <dd className="text-[#091E42] mt-0.5">{details.data.completedAt ? new Date(details.data.completedAt).toLocaleString() : 'Not completed'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#6B778C]">Engine version</dt>
                      <dd className="font-mono text-[#091E42] mt-0.5">{details.data.toolVersion || 'Not reported'}</dd>
                    </div>
                  </dl>

                  {details.data.errorCode && (
                    <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                      <dt className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        Error Code: {details.data.errorCode}
                      </dt>
                      <dd className="font-mono text-xs">{details.data.errorMessage}</dd>
                    </div>
                  )}

                  {/* Terminal Execution Logs */}
                  <div className="bg-slate-900 rounded-xl p-3 text-slate-100 font-mono text-[11px] space-y-1 max-h-40 overflow-y-auto">
                    <div className="text-slate-400 border-b border-slate-700 pb-1 mb-1 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      Worker Execution Stream
                    </div>
                    <div>[08:24:02] Worker dispatched to container alsm-worker-pod-02</div>
                    <div>[08:24:03] Parsing input source AST for target {details.data.screenId || details.data.id}</div>
                    {details.data.errorMessage && (
                      <div className="text-rose-400">[08:24:05] [ERROR] {details.data.errorMessage}</div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Dead-Letter Retry Confirmation Modal */}
          <Modal
            isOpen={Boolean(retryTargetJob)}
            onClose={() => setRetryTargetJob(null)}
            title="Re-Queue Dead-Letter Job"
          >
            {retryTargetJob && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    Dead-Letter Re-queue Confirmation
                  </div>
                  <p>
                    Job <strong className="font-mono">{retryTargetJob.id}</strong> has reached the automatic retry limit (
                    <span className="font-bold">3 attempts</span>) and was placed in the Dead-Letter Queue.
                  </p>
                  <p>
                    Confirming this action will reset its retry counter to 0/3, set its status back to <strong>QUEUED</strong>, and position it for worker re-processing.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5EAF0]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRetryTargetJob(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConfirmRetryJob}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Confirm & Re-Queue Job
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}
    </div>
  );
}
