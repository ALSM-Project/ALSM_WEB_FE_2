import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Plus, RefreshCw, Trash2, Wrench, XCircle } from 'lucide-react';
import { Button, Modal } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { conversionQueueService, queueError, type QueueJob } from '../services/conversion-queue.service';
import {
  SUPPORT_PATCH_DATA_TYPES,
  summarizeRuleChanges,
  validateSupportPatchRules,
  type SupportPatchDataType,
  type SupportPatchRule,
  type SupportPatchValidation,
} from '../utils/supportPatchRules';

export interface SupportPatchPanelProps {
  job: QueueJob;
  /** Called with the re-queued job once the server has applied the patch. */
  onApplied?: (job: QueueJob) => void;
}

const NOTE_MAX_LENGTH = 1000;
const EMPTY_RULE: SupportPatchRule = { sourceField: '', targetProperty: '', dataType: 'string', transformRule: '' };

const inputClass =
  'w-full rounded-md border border-[#D9E2EC] bg-white px-2 py-1.5 text-xs text-[#091E42] outline-none focus:ring-1 focus:ring-[#0652CC]';

function sameRules(a: SupportPatchRule[], b: SupportPatchRule[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Field-mapping support patch for a failed conversion job: edit the rules, validate them,
 * then save them on the server and re-queue the job. Everything shown comes from the server.
 */
export function SupportPatchPanel({ job, onApplied }: SupportPatchPanelProps) {
  const { hasPermission } = useAuth();
  const canApply = hasPermission('conversions.support_patch.apply');
  const patchable = job.status === 'FAILED' || job.status === 'DEAD';
  const queryClient = useQueryClient();
  const queryKey = ['conversion-support-patch', job.organizationId, job.id];

  const saved = useQuery({
    queryKey,
    queryFn: ({ signal }) => conversionQueueService.getSupportPatch(job.id, job.organizationId, signal),
    retry: false,
  });

  const [rules, setRules] = useState<SupportPatchRule[]>([]);
  const [loadedFrom, setLoadedFrom] = useState<SupportPatchRule[] | null>(null);
  const [draft, setDraft] = useState<SupportPatchRule>(EMPTY_RULE);
  const [note, setNote] = useState('');
  const [validation, setValidation] = useState<SupportPatchValidation | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Load the saved rules once, and again whenever the server copy changes while the
  // editor has no unsaved edits (e.g. another staff member applied a patch).
  useEffect(() => {
    if (!saved.data) return;
    const serverRules = saved.data.rules;
    if (loadedFrom === null || sameRules(rules, loadedFrom)) {
      setRules(serverRules);
      setLoadedFrom(serverRules);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.data]);

  const savedRules = loadedFrom ?? [];
  const changes = useMemo(() => summarizeRuleChanges(savedRules, rules), [savedRules, rules]);
  const dirty = changes.total > 0;

  const updateRule = (index: number, patch: Partial<SupportPatchRule>) => {
    setRules((current) => current.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
    setValidation(null);
  };
  const removeRule = (index: number) => {
    setRules((current) => current.filter((_, i) => i !== index));
    setValidation(null);
  };
  const addRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.sourceField.trim() || !draft.targetProperty.trim()) return;
    setRules((current) => [...current, { ...draft, sourceField: draft.sourceField.trim().toUpperCase() }]);
    setDraft(EMPTY_RULE);
    setValidation(null);
  };

  const runValidation = () => {
    const result = validateSupportPatchRules(rules);
    setValidation(result);
    return result;
  };

  const apply = useMutation({
    mutationFn: () =>
      conversionQueueService.applySupportPatch(
        job.id,
        {
          rules: rules.map((r) => ({
            sourceField: r.sourceField.trim(),
            targetProperty: r.targetProperty.trim(),
            dataType: r.dataType,
            ...(r.transformRule?.trim() ? { transformRule: r.transformRule.trim() } : {}),
          })),
          note: note.trim(),
        },
        job.organizationId,
      ),
    onSuccess: (result) => {
      setConfirming(false);
      setNote('');
      setValidation(null);
      setLoadedFrom(result.patch.rules);
      setRules(result.patch.rules);
      setMessage({
        kind: 'success',
        text: `Patch applied: ${result.patch.changedRuleCount} rule(s) changed. Job ${result.job.id} is ${result.job.status} again with attempts reset to ${result.job.attemptCount}/${result.job.maxAttempts} at ${result.job.priority} priority.`,
      });
      void queryClient.invalidateQueries({ queryKey });
      onApplied?.(result.job);
    },
    onError: (error) => {
      setConfirming(false);
      setMessage({ kind: 'error', text: `The patch was not applied: ${queueError(error)}` });
    },
  });

  const openConfirm = () => {
    setMessage(null);
    if (runValidation().errors.length > 0) return;
    setConfirming(true);
  };

  const noteMissing = note.trim().length === 0;
  const applyDisabled = !patchable || !dirty || noteMissing || apply.isPending;

  return (
    <section aria-label="Field mappings" className="border-t border-slate-200 pt-3 text-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Field mappings</h3>
        {saved.data && saved.data.history.length > 0 && (
          <span className="text-[11px] text-slate-500">
            Last patch {new Date(saved.data.history[0].appliedAt).toLocaleString()} ({saved.data.history.length} in total)
          </span>
        )}
      </div>

      {saved.isPending && <p role="status" className="text-slate-500">Loading saved mapping rules...</p>}
      {saved.isError && <p role="alert" className="text-rose-600">Unable to load mapping rules: {queueError(saved.error)}</p>}

      {saved.isSuccess && (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#E5EAF0]">
            <table className="w-full text-left">
              <thead className="bg-[#F7F9FC] text-[11px] uppercase text-[#6B778C]">
                <tr>
                  <th className="px-2 py-2">Legacy source field</th>
                  <th className="px-2 py-2">Target property</th>
                  <th className="px-2 py-2">Data type</th>
                  <th className="px-2 py-2">Transform rule</th>
                  {canApply && <th className="px-2 py-2"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={canApply ? 5 : 4} className="px-2 py-3 text-slate-500">
                      No mapping rules saved for this job yet.
                    </td>
                  </tr>
                )}
                {rules.map((rule, index) => (
                  <tr key={`${index}-${rule.sourceField}`} className="border-t border-[#E5EAF0]">
                    <td className="px-2 py-1.5 font-mono">{rule.sourceField}</td>
                    <td className="px-2 py-1.5">
                      <input
                        aria-label={`Target property for ${rule.sourceField}`}
                        className={inputClass}
                        value={rule.targetProperty}
                        disabled={!canApply}
                        onChange={(e) => updateRule(index, { targetProperty: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        aria-label={`Data type for ${rule.sourceField}`}
                        className={inputClass}
                        value={rule.dataType}
                        disabled={!canApply}
                        onChange={(e) => updateRule(index, { dataType: e.target.value as SupportPatchDataType })}
                      >
                        {SUPPORT_PATCH_DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        aria-label={`Transform rule for ${rule.sourceField}`}
                        className={`${inputClass} font-mono`}
                        value={rule.transformRule ?? ''}
                        disabled={!canApply}
                        onChange={(e) => updateRule(index, { transformRule: e.target.value })}
                      />
                    </td>
                    {canApply && (
                      <td className="px-2 py-1.5 text-right">
                        <button
                          type="button"
                          aria-label={`Remove rule ${rule.sourceField}`}
                          onClick={() => removeRule(index)}
                          className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canApply && (
            <form onSubmit={addRule} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end" aria-label="Add mapping rule">
              <label className="space-y-1">
                <span className="text-[11px] text-[#6B778C]">Source field</span>
                <input className={`${inputClass} font-mono`} value={draft.sourceField}
                  onChange={(e) => setDraft({ ...draft, sourceField: e.target.value })} placeholder="CUST_BAL_AMT" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-[#6B778C]">Target property</span>
                <input className={inputClass} value={draft.targetProperty}
                  onChange={(e) => setDraft({ ...draft, targetProperty: e.target.value })} placeholder="currentBalance" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-[#6B778C]">Data type</span>
                <select className={inputClass} value={draft.dataType}
                  onChange={(e) => setDraft({ ...draft, dataType: e.target.value as SupportPatchDataType })}>
                  {SUPPORT_PATCH_DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-[#6B778C]">Transform rule</span>
                <input className={`${inputClass} font-mono`} value={draft.transformRule ?? ''}
                  onChange={(e) => setDraft({ ...draft, transformRule: e.target.value })} placeholder="optional" />
              </label>
              <Button type="submit" variant="outline" size="sm"
                disabled={!draft.sourceField.trim() || !draft.targetProperty.trim()}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add rule
              </Button>
            </form>
          )}

          {validation && (
            <div role="status" aria-label="Validation result" className="space-y-1.5">
              {validation.errors.length === 0 ? (
                <p className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />All {rules.length} rule(s) are valid.
                </p>
              ) : (
                <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-800">
                  <p className="flex items-center gap-1.5 font-semibold"><XCircle className="w-4 h-4" />{validation.errors.length} error(s)</p>
                  <ul className="list-disc pl-5 mt-1">{validation.errors.map((e) => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">
                  <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="w-4 h-4" />{validation.warnings.length} warning(s)</p>
                  <ul className="list-disc pl-5 mt-1">{validation.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {canApply && (
            <div className="space-y-2">
              <label className="block space-y-1">
                <span className="font-semibold">Support note</span>
                <textarea
                  className={`${inputClass} min-h-16`}
                  value={note}
                  maxLength={NOTE_MAX_LENGTH}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Changed the balance type from string to decimal"
                />
              </label>
              {!patchable && (
                <p className="text-slate-500">Patches can be applied only while the job is FAILED or DEAD (it is {job.status}).</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={runValidation}>
                  Validate
                </Button>
                <Button type="button" size="sm" onClick={openConfirm} disabled={applyDisabled}>
                  <Wrench className="w-3.5 h-3.5 mr-1" />Apply Patch &amp; Re-run
                </Button>
              </div>
            </div>
          )}

          {message && (
            <p role={message.kind === 'error' ? 'alert' : 'status'}
              className={message.kind === 'error' ? 'text-rose-600' : 'text-emerald-700'}>
              {message.text}
            </p>
          )}
        </>
      )}

      <Modal isOpen={confirming} onClose={() => !apply.isPending && setConfirming(false)} title="Apply support patch?">
        <div className="space-y-3 text-xs">
          <p>
            {changes.total} rule(s) will change on job <span className="font-mono">{job.id}</span>:
            {' '}{changes.added} added, {changes.edited} edited, {changes.removed} removed.
          </p>
          <p>The job goes back to QUEUED at HIGH priority with its attempt count reset to 0.</p>
          {validation && validation.warnings.length > 0 && (
            <p className="text-amber-800">{validation.warnings.length} warning(s) remain; check them before applying.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={apply.isPending}>Cancel</Button>
            <Button size="sm" onClick={() => apply.mutate()} disabled={apply.isPending}>
              {apply.isPending && <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Confirm &amp; Apply
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
