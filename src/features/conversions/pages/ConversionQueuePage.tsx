import { useRef, useState, useSyncExternalStore } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Wrench, RefreshCw, AlertTriangle, 
  Search, X, Terminal
} from 'lucide-react';
import { Button, Card, PageHeader, Modal } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { 
  queueError as conversionError,
  conversionQueueService, 
  type JobStatus, 
  type QueueJob 
} from '../services/conversion-queue.service';
import { tokenStore } from '@/services/api/tokenStore';
import { ConversionTroubleshootingWorkspace } from '../components/ConversionTroubleshootingWorkspace';

const statuses: JobStatus[] = ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD', 'CANCELLED'];

export default function ConversionQueuePage({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const { user, isLoading, hasPermission } = useAuth();
  const session = useSyncExternalStore(tokenStore.subscribe, tokenStore.epoch);
  const [searchParams] = useSearchParams();
  if (isLoading) return <p role="status">Loading session...</p>;
  if (!user || !tokenStore.getRefreshToken() || tokenStore.isLogoutPending()) return <p role="alert">Sign in to view the conversion queue.</p>;
  if (!hasPermission(reviewOnly ? 'quality-review.manage' : 'conversions.queue.view')) return <p role="alert">You do not have permission to view this queue.</p>;
  // A new login, user, permission set, or project must not inherit old selections or cached records.
  const identity = `${user.id}:${session}:${user.effectivePermissions?.join(',')}:${user.isPlatformAdmin}`;
  return <ScopedConversionQueue key={`${identity}:${searchParams.get('projectId') || ''}:${reviewOnly}`} identity={identity} reviewOnly={reviewOnly} />;
}

function ScopedConversionQueue({ identity, reviewOnly }: { identity: string; reviewOnly: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || '';
  const [activePageTab, setActivePageTab] = useState<'queue' | 'troubleshoot'>(searchParams.get('tab') === 'troubleshoot' ? 'troubleshoot' : 'queue');
  const [troubleshootTargetJobId, setTroubleshootTargetJobId] = useState('');
  const [status, setStatus] = useState<JobStatus | ''>(reviewOnly ? 'COMPLETED' : '');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [retryTargetJob, setRetryTargetJob] = useState<QueueJob | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionFailed, setActionFailed] = useState(false);
  const retryInFlight = useRef(false);
  const { hasPermission } = useAuth();
  const canRetry = hasPermission('conversions.retry');
  const canTroubleshoot = hasPermission('conversions.troubleshoot.view');

  const projects = useQuery({
    queryKey: ['conversion-projects', identity],
    queryFn: ({ signal }) => conversionQueueService.listProjects(signal),
    refetchInterval: 10000,
    retry: false,
  });
  const authorizedProject = projects.isSuccess ? projects.data.find((project) => project.id === projectId) : undefined;
  const jobs = useQuery({
    queryKey: ['conversion-queue', identity, authorizedProject?.organizationId, projectId],
    queryFn: ({ signal }) => conversionQueueService.listJobs(projectId, signal, authorizedProject?.organizationId),
    enabled: Boolean(authorizedProject),
    refetchInterval: 10000,
    retry: false,
  });
  // Hide cached data on authorization or refresh errors; never substitute sample records.
  const rawDataset = authorizedProject && jobs.isSuccess
    ? jobs.data.filter((job) => job.projectId === projectId && job.organizationId === authorizedProject.organizationId)
    : [];
  const selectedJob = rawDataset.find((job) => job.id === selectedJobId);
  const details = useQuery({
    queryKey: ['conversion-job', identity, authorizedProject?.organizationId, projectId, selectedJobId],
    queryFn: ({ signal }) => conversionQueueService.getJob(selectedJobId, signal, authorizedProject?.organizationId),
    enabled: Boolean(selectedJob),
    refetchInterval: 10000,
    retry: false,
  });
  const detailJob = selectedJob && details.isSuccess && details.data.id === selectedJobId &&
    details.data.projectId === projectId && details.data.organizationId === authorizedProject?.organizationId ? details.data : undefined;
  const visibleJobs = rawDataset.filter((job) => {
    const term = searchQuery.toLowerCase().trim();
    return (!status || job.status === status) && (typeFilter === 'ALL' || job.conversionType === typeFilter) &&
      (!term || [job.id, job.screenId, job.createdBy, authorizedProject?.name].some((value) => value?.toLowerCase().includes(term)));
  });
  const failedJobs = visibleJobs.filter((job) => job.status === 'FAILED' || job.status === 'DEAD');
  const jobCount = (states: JobStatus[]) => rawDataset.filter((job) => states.includes(job.status)).length;
  const screenWaitingCount = rawDataset.filter((job) => job.status === 'QUEUED' && job.conversionType === 'BMS_DSPF_TO_FRONTEND').length;
  const cobolWaitingCount = rawDataset.filter((job) => job.status === 'QUEUED' && job.conversionType.startsWith('COBOL_')).length;
  const deadLetterCount = jobCount(['DEAD']);

  const handleConfirmRetryJob = async () => {
    if (!retryTargetJob || !canRetry || retryInFlight.current || !rawDataset.some((job) => job.id === retryTargetJob.id && ['FAILED', 'DEAD'].includes(job.status))) return;
    retryInFlight.current = true;
    const targetId = retryTargetJob.id;
    setRetryTargetJob(null);
    setRetryingJobId(targetId);
    setActionMessage(null);
    try {
      await conversionQueueService.retryJob(targetId, authorizedProject?.organizationId);
      // Never infer the new status or attempts: the worker may already have advanced the record.
      const refreshed = await jobs.refetch();
      const refreshedDetail = selectedJobId === targetId ? await details.refetch() : undefined;
      const refreshFailed = refreshed.error || refreshedDetail?.error;
      setActionFailed(Boolean(refreshFailed));
      setActionMessage(refreshFailed
        ? 'Retry accepted, but the queue could not be refreshed. Refresh to see the current state.'
        : `Retry accepted for job ${targetId}. Queue refreshed from the server.`);
    } catch (err: unknown) {
      setActionFailed(true);
      setActionMessage(`Failed to retry job: ${conversionError(err)}`);
      // An enqueue failure can persist FAILED; reload even after a rejected retry.
      await jobs.refetch();
      if (selectedJobId === targetId) await details.refetch();
    } finally {
      retryInFlight.current = false;
      setRetryingJobId(null);
    }
  };
  const handleOpenTroubleshooting = (job: QueueJob) => {
    setSelectedJobId(job.id);
    setTroubleshootTargetJobId(job.id);
    setActivePageTab('troubleshoot');
  };
  return (
    <div className="space-y-6 w-full">
      {/* Top Header */}
      <PageHeader 
        title={reviewOnly ? 'Conversion Quality Reviews' : 'Conversion Queue'} 
        subtitle="Persisted conversion jobs for authorized projects. Conversion Staff see explicitly assigned projects only. Refreshes every 10 seconds."
      />

      {/* Top Tab Bar: Queue Monitor vs Troubleshooting */}
      <div className="flex items-center gap-1 border-b border-slate-200 text-xs sm:text-sm">
        <button
          type="button"
          onClick={() => setActivePageTab('queue')}
          className={`px-4 py-2.5 font-medium transition-all border-b-2 cursor-pointer ${
            activePageTab === 'queue'
              ? 'border-[#0652CC] text-[#0652CC] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          Queue Monitoring
        </button>
        {canTroubleshoot && (
          <button
            type="button"
            onClick={() => setActivePageTab('troubleshoot')}
            className={`px-4 py-2.5 font-medium transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activePageTab === 'troubleshoot'
                ? 'border-[#0652CC] text-[#0652CC] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Troubleshooting & Error Investigation</span>
            {deadLetterCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                {deadLetterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Failed records in the selected authorized project. */}
      {activePageTab === 'troubleshoot' && canTroubleshoot && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                Failed Conversions & Dead-Letter Items
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect broken screen schemas, COBOL AST parser failures, and dead-letter queue items requiring support intervention.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Filter failed items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-[#0652CC] focus:border-[#0652CC] shadow-xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Failed Items Table */}
          <div className="alsm-table-container rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
            <table className="alsm-table w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5">Organisation</th>
                  <th className="py-2.5 px-3.5">Project</th>
                  <th className="py-2.5 px-3.5">Screen / Program</th>
                  <th className="py-2.5 px-3.5">Conversion Type</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Failure Reason</th>
                  <th className="py-2.5 px-3.5">Last Attempt</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {failedJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-slate-900">
                      {job.organizationId}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600">
                      {authorizedProject?.name || job.projectId}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-medium text-slate-900">
                      {job.screenId || job.id}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-700">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">
                        {job.conversionType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        job.status === 'DEAD' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {job.status === 'DEAD' ? 'DEAD (DLQ)' : 'FAILED'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-rose-700 max-w-xs truncate" title={job.errorMessage}>
                      {job.errorMessage || 'Not available'}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-500">
                      Attempt {job.attemptCount}/{job.maxAttempts}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      {canTroubleshoot && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleOpenTroubleshooting(job)}
                          className="text-xs py-1 px-2.5 rounded-md"
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
            {authorizedProject && jobs.isSuccess && failedJobs.length === 0 && <p className="p-4 text-xs text-slate-500">No failed conversion jobs match this selection.</p>}
          </div>
        </div>
      )}

      {/* Shared project scope and controls remain available on both tabs. */}
      {(
        <div className="space-y-5">
          {/* Main Control Card: Filters & Controls */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3.5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs font-medium text-slate-700">
                  Project
                  <select 
                    aria-label="Project" 
                    value={projectId} 
                    className="block mt-1 border border-slate-200 rounded-md p-1.5 min-w-56 text-xs text-slate-900 bg-white shadow-xs focus:outline-none focus:ring-1 focus:ring-[#0652CC] focus:border-[#0652CC]" 
                    onChange={(event) => {
                      setSearchParams(event.target.value ? { projectId: event.target.value } : {});
                      setSelectedJobId('');
                    }}
                  >
                    <option value="">Select a project</option>
                    {projects.data?.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-medium text-slate-700">
                  Status
                  <select 
                    aria-label="Status" 
                    value={status} 
                    className="block mt-1 border border-slate-200 rounded-md p-1.5 text-xs text-slate-900 bg-white shadow-xs focus:outline-none focus:ring-1 focus:ring-[#0652CC] focus:border-[#0652CC]" 
                    onChange={(event) => setStatus(event.target.value as JobStatus | '')}
                  >
                    {!reviewOnly && <option value="">All statuses</option>}
                    {(reviewOnly ? ['COMPLETED'] : statuses).map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-medium text-slate-700">
                  Job Type
                  <select 
                    aria-label="Job Type" 
                    value={typeFilter} 
                    className="block mt-1 border border-slate-200 rounded-md p-1.5 text-xs text-slate-900 bg-white shadow-xs focus:outline-none focus:ring-1 focus:ring-[#0652CC] focus:border-[#0652CC]" 
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
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Search Input Filter Toolbar */}
            <div className="pt-1">
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Search by job ID, screen name, or program name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-[#0652CC] focus:border-[#0652CC] outline-none shadow-xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
              </div>
            </div>

            {projects.isPending && <p role="status" className="text-xs text-slate-500">Loading projects...</p>}
            {projects.isError && <p role="alert" className="text-xs text-rose-600">Unable to load projects: {conversionError(projects.error)}</p>}
            {projects.isSuccess && projects.data.length === 0 && <p className="text-xs text-slate-500">No accessible projects found.</p>}
            
            {/* Project unavailable in current org alert */}
            {projects.isSuccess && projectId && !projects.data.some((project) => project.id === projectId) && (
              <p role="alert" className="text-xs text-rose-600">This project is unavailable in your current authorized assignments or organization.</p>
            )}

            {authorizedProject && jobs.isFetching && !jobs.data && <p role="status" className="text-xs text-slate-500">Loading conversion jobs...</p>}
            {authorizedProject && jobs.isError && <p role="alert" className="text-xs text-rose-600">Unable to load jobs: {conversionError(jobs.error)}</p>}

            {!projectId && projects.isSuccess && projects.data.length > 0 && <p>Select a project to view its conversion queue.</p>}
            {actionMessage && <p role={actionFailed ? 'alert' : 'status'}>{actionMessage}</p>}
            {activePageTab === 'troubleshoot' && troubleshootTargetJobId && canTroubleshoot && selectedJob && (
              details.isPending ? <p role="status">Loading job details...</p> : details.isError
                ? <p role="alert">Unable to load job: {conversionError(details.error)}</p>
                : detailJob && <ConversionTroubleshootingWorkspace job={detailJob} projectName={authorizedProject?.name}
                    onBack={() => { setTroubleshootTargetJobId(''); setActivePageTab('queue'); }}
                    onRetry={canRetry ? () => setRetryTargetJob(detailJob) : undefined} retrying={Boolean(retryingJobId)}
                    onPatched={() => { void jobs.refetch(); void details.refetch(); }} />
            )}
            {/* Summary Metrics Section */}
            {authorizedProject && jobs.isSuccess && (
              <>
                <section aria-label="Project queue status summary" className="rounded-lg bg-slate-50/80 border border-slate-200 p-3.5 space-y-2.5">
                  <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Project: {projects.data?.find((project) => project.id === projectId)?.name || projectId}
                  </h2>
                  <p className="text-[11px] text-[#6B778C]">
                    Persisted statuses across all {rawDataset.length} jobs in this scope. The status filter only changes the list below.
                  </p>
                  
                  {/* 5-Card Operational Metrics Grid */}
                  <dl className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                    {/* Waiting Jobs */}
                    <div className="bg-white p-3 rounded-md border border-slate-200 shadow-xs">
                      <dt className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">Waiting (QUEUED)</dt>
                      <dd aria-label="Waiting jobs" className="text-2xl font-bold text-[#091E42] mt-0.5">
                        {jobCount(['QUEUED'])}
                      </dd>
                      <span className="text-[10px] text-[#6B778C]">({screenWaitingCount} Screens, {cobolWaitingCount} COBOL)</span>
                    </div>

                    {/* Processing Jobs */}
                    <div className="bg-white p-3 rounded-md border border-slate-200 shadow-xs">
                      <dt className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">Processing (recorded)</dt>
                      <dd aria-label="Processing jobs" className="text-2xl font-bold text-amber-600 mt-0.5">
                        {jobCount(['PROCESSING'])}
                      </dd>
                      <span className="text-[10px] text-[#6B778C]">Last recorded processing state</span>
                    </div>

                    {/* Failed or Dead Jobs */}
                    <div className="bg-white p-3 rounded-md border border-slate-200 shadow-xs">
                      <dt className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">Failed / dead (FAILED + DEAD)</dt>
                      <dd aria-label="Failed or dead jobs" className="text-2xl font-bold text-rose-600 mt-0.5">
                        {jobCount(['FAILED', 'DEAD'])}
                      </dd>
                      <span className="text-[10px] text-[#6B778C]">Error states</span>
                    </div>

                    {/* Dead Letter Queue */}
                    <div className="bg-white p-3 rounded-md border border-rose-200 bg-rose-50/20 shadow-xs">
                      <dt className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Dead-Letter (DLQ)
                      </dt>
                      <dd className="text-2xl font-bold text-rose-700 mt-0.5">
                        {deadLetterCount}
                      </dd>
                      <span className="text-[10px] text-rose-700">Recorded DEAD status</span>
                    </div>

                    {/* Completed Jobs */}
                    <div className="bg-white p-3 rounded-md border border-slate-200 shadow-xs">
                      <dt className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">Completed</dt>
                      <dd className="text-2xl font-bold text-emerald-600 mt-0.5">
                        {jobCount(['COMPLETED'])}
                      </dd>
                      <span className="text-[10px] text-[#6B778C]">Recorded COMPLETED status</span>
                    </div>
                  </dl>
                </section>

                <p className="text-xs text-[#6B778C]">
                  {visibleJobs.length} matching jobs · Last updated {new Date(jobs.dataUpdatedAt).toLocaleTimeString()}. QUEUED jobs await a worker; PROCESSING is the last recorded worker state.
                </p>


                {activePageTab === 'queue' && (visibleJobs.length === 0 ? (
                  <p className="py-4 text-xs text-[#6B778C]">No conversion jobs match this selection.</p>
                ) : (
                  <div className="alsm-table-container rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden mt-3">
                    <div className="overflow-x-auto">
                      <table className="alsm-table w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-4">Job ID / Target</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Type / Pipeline</th>
                            <th className="py-3 px-4">Attempts / Limit</th>
                            <th className="py-3 px-4">Submitted By</th>
                            <th className="py-3 px-4">Created / Updated</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5EAF0]">
                          {visibleJobs.map((job) => {
                            const isDead = job.status === 'DEAD';
                            return (
                              <tr key={job.id} className="hover:bg-slate-50/80 transition-colors align-top">
                                <td className="py-3.5 px-4 font-mono">
                                  <span className="font-semibold text-[#091E42]">{job.id}</span>
                                  <div className="text-[10px] text-[#6B778C]">
                                    {job.screenId || 'Not available'}
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
                                  <span className={isDead ? 'text-rose-700 font-bold' : ''}>
                                    {job.attemptCount} / {job.maxAttempts}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[#6B778C] text-[11px]">
                                  {job.createdBy}
                                </td>
                                <td className="py-3.5 px-4 text-[#6B778C]">
                                  {new Date(job.createdAt).toLocaleString()}<br />{new Date(job.updatedAt).toLocaleString()}
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
                                        title="Inspect persisted job metadata"
                                      >
                                        <Wrench className="w-3 h-3" />
                                        Troubleshoot
                                      </button>
                                    )}

                                    {/* The backend accepts retries only for FAILED and DEAD records. */}
                                    {['FAILED', 'DEAD'].includes(job.status) && canRetry && (
                                      <button
                                        disabled={Boolean(retryingJobId)}
                                        className="px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-300 rounded-lg hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                                        onClick={() => setRetryTargetJob(job)}
                                      >
                                        {retryingJobId === job.id ? 'Retrying...' : 'Retry Job'}
                                      </button>
                                    )}

                                    {job.status === 'COMPLETED' && hasPermission('quality-review.manage') && (
                                      <Link 
                                        className="text-xs text-[#0652CC] font-semibold hover:underline" 
                                        to={`/admin/projects/${encodeURIComponent(job.projectId)}/conversions/${encodeURIComponent(job.id)}/quality-review?organizationId=${encodeURIComponent(job.organizationId)}`}
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
                ))}
              </>
            )}
          </div>

          {/* Job Details Drawer / Panel */}
          {selectedJob && !troubleshootTargetJobId && (
            <Card className="space-y-4 border-2 border-blue-100">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
                <div>
                  <h2 className="text-base font-bold text-[#091E42]">Job Details: {selectedJobId}</h2>
                  <p className="text-xs text-[#6B778C]">Persisted job metadata</p>
                </div>
                <div className="flex items-center gap-2">
                  {detailJob && (detailJob.status === 'FAILED' || detailJob.status === 'DEAD') && (
                    <>
                      {canTroubleshoot && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenTroubleshooting(detailJob!)}
                          className="text-xs"
                        >
                          <Wrench className="w-3.5 h-3.5 mr-1 text-[#0652CC]" />
                          Troubleshoot in Workspace
                        </Button>
                      )}
                      {canRetry && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={Boolean(retryingJobId)}
                          onClick={() => setRetryTargetJob(detailJob!)}
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

              {detailJob && (
                <div className="space-y-4">
                  <dl className="grid sm:grid-cols-3 gap-4 text-xs pt-1">
                    <div>
                      <dt className="font-semibold text-[#6B778C]">Job ID</dt>
                      <dd className="font-mono text-[#091E42] mt-0.5 font-bold">{detailJob.id}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#6B778C]">Worker Status</dt>
                      <dd className="font-semibold mt-0.5 text-[#091E42]">{detailJob.status}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#6B778C]">Attempt Counter / Limit</dt>
                      <dd className="font-mono font-semibold text-[#091E42] mt-0.5">
                        {detailJob.attemptCount} / {detailJob.maxAttempts}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#6B778C]">Started</dt>
                      <dd className="text-[#091E42] mt-0.5">{detailJob.startedAt ? new Date(detailJob.startedAt).toLocaleString() : 'Not started'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#6B778C]">Completed</dt>
                      <dd className="text-[#091E42] mt-0.5">{detailJob.completedAt ? new Date(detailJob.completedAt).toLocaleString() : 'Not completed'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#6B778C]">Engine version</dt>
                      <dd className="font-mono text-[#091E42] mt-0.5">{detailJob.toolVersion || 'Not reported'}</dd>
                    </div>
                  </dl>

                  {(detailJob.errorCode || detailJob.errorMessage) && (
                    <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                      <dt className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        Error Code: {detailJob.errorCode}
                      </dt>
                      <dd className="font-mono text-xs">{detailJob.errorMessage}</dd>
                    </div>
                  )}

                  {/* Terminal Execution Logs */}
                  <div className="bg-slate-900 rounded-xl p-3 text-slate-100 font-mono text-[11px] space-y-1 max-h-40 overflow-y-auto">
                    <div className="text-slate-400 border-b border-slate-700 pb-1 mb-1 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      Worker Execution Stream
                    </div>
                    <p>Not available. Worker logs are not provided by this job endpoint.</p>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Dead-Letter Retry Confirmation Modal */}
          <Modal
            isOpen={Boolean(retryTargetJob)}
            onClose={() => setRetryTargetJob(null)}
            title="Retry conversion job"
          >
            {retryTargetJob && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    Retry Confirmation
                  </div>
                  <p>
                    Job <strong className="font-mono">{retryTargetJob.id}</strong> is recorded as {retryTargetJob.status}, with {retryTargetJob.attemptCount}/{retryTargetJob.maxAttempts} attempts.
                  </p>
                  <p>
                    Request a retry from the server. Current status and attempts will be reloaded after the server accepts the request.
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
