import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, PageHeader } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { conversionError, conversionQueueService, type JobStatus } from '../services/conversion-queue.service';

const statuses: JobStatus[] = ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD', 'CANCELLED'];

export default function ConversionQueuePage({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || '';
  const [status, setStatus] = useState<JobStatus | ''>(reviewOnly ? 'COMPLETED' : '');
  const [selectedJobId, setSelectedJobId] = useState('');
  const { hasPermission } = useAuth();
  const projects = useQuery({ queryKey: ['conversion-projects'], queryFn: conversionQueueService.listProjects, retry: false });
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
    enabled: Boolean(selectedJobId && jobs.data?.some((job) => job.id === selectedJobId)),
    refetchInterval: 10000,
    retry: false,
  });
  const visibleJobs = jobs.data?.filter((job) => !status || job.status === status) || [];
  const jobCount = (states: JobStatus[]) => jobs.data?.filter((job) => states.includes(job.status)).length ?? 0;

  return <div className="space-y-6">
    <PageHeader title={reviewOnly ? 'Conversion Quality Reviews' : 'Conversion Queue'} subtitle="Live persisted jobs in your authorized organization. Job statuses refresh every 10 seconds." />
    <Card className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-semibold">Project
          <select aria-label="Project" value={projectId} className="block mt-1 border rounded-lg p-2 min-w-56" onChange={(event) => {
            setSearchParams(event.target.value ? { projectId: event.target.value } : {});
            setSelectedJobId('');
          }}>
            <option value="">Select a project</option>
            {projects.data?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Status
          <select aria-label="Status" value={status} className="block mt-1 border rounded-lg p-2" onChange={(event) => setStatus(event.target.value as JobStatus | '')}>
            {!reviewOnly && <option value="">All statuses</option>}
            {(reviewOnly ? ['COMPLETED'] : statuses).map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <Button variant="outline" disabled={projects.isFetching || jobs.isFetching || details.isFetching} onClick={() => {
          void projects.refetch();
          if (projectId && projects.data?.some((project) => project.id === projectId)) void jobs.refetch();
          if (selectedJobId) void details.refetch();
        }}>Refresh</Button>
      </div>
      {projects.isPending && <p role="status">Loading projects...</p>}
      {projects.isError && <p role="alert">Unable to load projects: {conversionError(projects.error)}</p>}
      {projects.isSuccess && projects.data.length === 0 && <p>No accessible projects. Create a project and upload a real conversion source in the user portal.</p>}
      {projects.isSuccess && projects.data.length > 0 && !projectId && <p>Select a project to view its conversion jobs.</p>}
      {projects.isSuccess && projectId && !projects.data.some((project) => project.id === projectId) && <p role="alert">This project is unavailable in your current organization.</p>}
      {projectId && jobs.isFetching && !jobs.data && <p role="status">Loading conversion jobs...</p>}
      {jobs.isError && <p role="alert">Unable to load jobs: {conversionError(jobs.error)}</p>}
      {jobs.isSuccess && <>
        <section aria-label="Project queue status summary" className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-bold">Project: {projects.data?.find((project) => project.id === projectId)?.name}</h2>
          <p className="text-xs text-slate-600">Persisted statuses across all {jobs.data.length} jobs in this project. The status filter only changes the list below.</p>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div><dt className="text-slate-600">Waiting (QUEUED)</dt><dd aria-label="Waiting jobs" className="text-xl font-bold">{jobCount(['QUEUED'])}</dd></div>
            <div><dt className="text-slate-600">Processing (recorded)</dt><dd aria-label="Processing jobs" className="text-xl font-bold">{jobCount(['PROCESSING'])}</dd></div>
            <div><dt className="text-slate-600">Failed / dead (FAILED + DEAD)</dt><dd aria-label="Failed or dead jobs" className="text-xl font-bold">{jobCount(['FAILED', 'DEAD'])}</dd></div>
          </dl>
        </section>
        <p className="text-sm text-slate-600">{visibleJobs.length} matching jobs · Last fetched {new Date(jobs.dataUpdatedAt).toLocaleTimeString()}. QUEUED jobs await a worker; PROCESSING is the last recorded worker state. Ownership below identifies the submitter.</p>
        {visibleJobs.length === 0 ? <p>No conversion jobs match this selection.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left">
          <thead><tr className="border-b"><th className="p-2">Job / screen</th><th>Status</th><th>Type / priority</th><th>Attempts</th><th>Submitted by</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>{visibleJobs.map((job) => <tr key={job.id} className="border-b align-top">
            <td className="p-2 font-mono text-xs">{job.id}<br />{job.screenId || 'No screen linked'}</td>
            <td className="py-2 font-semibold">{job.status}</td><td className="py-2">{job.conversionType}<br />{job.priority}</td>
            <td className="py-2">{job.attemptCount} / {job.maxAttempts}</td><td className="py-2 font-mono text-xs">{job.createdBy}</td>
            <td className="py-2">{new Date(job.createdAt).toLocaleString()}</td>
            <td className="py-2 space-y-2"><button className="text-blue-700 underline block" onClick={() => setSelectedJobId(job.id)}>View job {job.id}</button>
              {job.status === 'COMPLETED' && hasPermission('quality-review.manage') && <Link className="text-blue-700 underline block" to={`/admin/projects/${encodeURIComponent(job.projectId)}/conversions/${encodeURIComponent(job.id)}/quality-review`}>Review quality</Link>}
            </td>
          </tr>)}</tbody>
        </table></div>}
      </>}
    </Card>
    {selectedJobId && <Card className="space-y-3">
      <h2 className="font-bold">Job details</h2>
      {details.isPending && <p role="status">Loading job details...</p>}
      {details.isError && <p role="alert">Unable to load job: {conversionError(details.error)}</p>}
      {details.data && details.data.projectId === projectId && <dl className="grid sm:grid-cols-2 gap-3 text-sm">
        <div><dt className="font-semibold">Job ID</dt><dd>{details.data.id}</dd></div>
        <div><dt className="font-semibold">Worker status</dt><dd>{details.data.status}</dd></div>
        <div><dt className="font-semibold">Started</dt><dd>{details.data.startedAt ? new Date(details.data.startedAt).toLocaleString() : 'Not started'}</dd></div>
        <div><dt className="font-semibold">Completed</dt><dd>{details.data.completedAt ? new Date(details.data.completedAt).toLocaleString() : 'Not completed'}</dd></div>
        <div><dt className="font-semibold">Engine version</dt><dd>{details.data.toolVersion || 'Not reported'}</dd></div>
        {details.data.errorCode && <div role="alert"><dt className="font-semibold">Error</dt><dd>{details.data.errorCode}: {details.data.errorMessage}</dd></div>}
      </dl>}
    </Card>}
  </div>;
}
