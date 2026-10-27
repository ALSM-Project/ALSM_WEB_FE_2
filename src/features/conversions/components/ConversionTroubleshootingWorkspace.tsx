import { ArrowLeft } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import type { QueueJob } from '../services/conversion-queue.service';
import { SupportPatchPanel } from './SupportPatchPanel';

export interface ConversionTroubleshootingWorkspaceProps {
  job: QueueJob;
  projectName?: string;
  onBack: () => void;
  onRetry?: () => void;
  retrying?: boolean;
  /** Called with the re-queued job after a support patch was applied on the server. */
  onPatched?: (job: QueueJob) => void;
}

// The queue endpoint supplies job metadata, not source files, worker logs, or a
// per-attempt timeline. Field mappings come from the support patch endpoint.
export function ConversionTroubleshootingWorkspace({ job, projectName, onBack, onRetry, retrying, onPatched }: ConversionTroubleshootingWorkspaceProps) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Back to Queue</Button>
        <h2 className="text-base font-semibold">Troubleshooting Workspace: {job.screenId || job.id}</h2>
        {onRetry && ['FAILED', 'DEAD'].includes(job.status) && (
          <Button size="sm" disabled={retrying} onClick={onRetry}>Retry Conversion</Button>
        )}
      </div>
      <dl className="grid sm:grid-cols-3 gap-4 text-xs">
        {[
          ['Job ID', job.id], ['Organization ID', job.organizationId], ['Project', projectName || job.projectId],
          ['Status', job.status], ['Conversion type', job.conversionType], ['Priority', job.priority],
          ['Attempts / Limit', `${job.attemptCount} / ${job.maxAttempts}`], ['Created by', job.createdBy],
          ['Created', job.createdAt], ['Updated', job.updatedAt], ['Started', job.startedAt],
          ['Completed', job.completedAt], ['Engine version', job.toolVersion],
          ['Error code', job.errorCode], ['Error message', job.errorMessage],
        ].map(([label, value]) => (
          <div key={label}><dt className="font-semibold text-slate-500">{label}</dt><dd className="break-words mt-1">{value || 'Not available'}</dd></div>
        ))}
      </dl>
      <SupportPatchPanel job={job} onApplied={onPatched} />
      {['Legacy source code', 'Execution history', 'Worker logs'].map((label) => (
        <section key={label} aria-label={label} className="border-t border-slate-200 pt-3 text-xs">
          <h3 className="font-semibold">{label}</h3>
          <p className="text-slate-500 mt-1">Not available from the conversion job endpoint.</p>
        </section>
      ))}
    </Card>
  );
}
