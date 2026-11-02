import { useEffect, useState } from 'react';
import { LockKeyhole, LogOut } from 'lucide-react';
import { Badge, Button, Card } from '@/shared/ui';
import { RESOURCE_LABELS, type ResourceKind } from '../api/support.types';
import type { SupportSession, SupportState } from '../state/SupportSession';
import { SupportDiagnosticDetail } from './SupportDiagnosticDetail';

const remaining = (deadline: number | null, now: number) => {
  const seconds = Math.max(0, Math.floor(((deadline ?? now) - now) / 1000));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};
export function SupportWorkspace({
  session,
  state,
  actor,
}: {
  session: SupportSession;
  state: SupportState;
  actor: string;
}) {
  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    // Local display/expiry guard only. Never sends a request or refreshes server idle activity.
    const tick = () => {
      session.tick();
      setTime(Date.now());
    };
    const timer = window.setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    window.addEventListener('pageshow', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', tick);
      window.removeEventListener('pageshow', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [session]);
  const context = state.context!,
    organization = state.organization!;
  const busy = state.pending !== null;
  const rows = state.kind === 'projects' ? state.projects?.items : state.page?.items;
  return (
    <div className="space-y-5">
      <section
        aria-label="Active Support Context"
        className="rounded-lg border border-amber-300 bg-amber-50 p-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex gap-2 items-center text-amber-900 font-bold">
              <LockKeyhole className="w-5 h-5" />
              Read-only Support View
            </div>
            <h2 className="text-xl font-bold mt-2">{organization.name}</h2>
            <p className="text-xs text-slate-600 mt-1">Original staff identity: {actor}</p>
          </div>
          <Button variant="outline" onClick={() => void session.exit()}>
            <LogOut className="w-4 h-4 mr-2" />
            Exit Organisation
          </Button>
        </div>
        <dl className="grid sm:grid-cols-2 gap-3 mt-5 text-xs">
          <div>
            <dt className="text-slate-500">Organisation ID</dt>
            <dd className="font-mono break-all">{organization.id}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Context ID · {context.state}</dt>
            <dd className="font-mono break-all">{context.id}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Absolute expiry · server deadline</dt>
            <dd>
              {context.expiresAt} · local guard {remaining(state.absoluteDeadline, time)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Idle guard · 15 minutes after confirmed activity</dt>
            <dd>{remaining(state.idleDeadline, time)}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-3 items-center mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void session.checkContext()}
          >
            Check Context
          </Button>
          <p className="text-xs text-slate-600">
            Checking context counts as activity. Access and expiry are confirmed by the backend on
            each request.
          </p>
        </div>
        <p className="text-xs text-amber-900 mt-3">
          Exit before leaving this page. No customer login or membership is granted.
        </p>
      </section>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <Card className="w-full lg:w-72 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Projects</h2>
            <Badge variant="secondary">Metadata</Badge>
          </div>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void session.list('projects')}
          >
            Load Projects
          </Button>
          <ul className="space-y-2 mt-4" aria-label="Scoped Projects">
            {state.projects?.items.map((project) => (
              <li key={project.id}>
                <Button
                  variant={state.project?.id === project.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-left break-all h-auto"
                  disabled={busy}
                  onClick={() => void session.detail('projects', project.id)}
                  aria-label={`Open project ${project.name}`}
                >
                  {project.name || project.id}
                </Button>
              </li>
            ))}
          </ul>
          {!state.projects && (
            <p className="text-xs text-slate-500 mt-3">
              Load a bounded page, then open a Project to inspect its resources.
            </p>
          )}
        </Card>
        <div className="flex-1 min-w-0 w-full space-y-4">
          {state.project && (
            <Card padding="sm">
              <p className="text-xs text-slate-500">Selected Project</p>
              <h2 className="font-bold">{state.project.name}</h2>
              <p className="text-xs font-mono break-all mt-1">{state.project.id}</p>
            </Card>
          )}
          <div
            role="tablist"
            aria-label="Diagnostic collections"
            className="flex flex-wrap gap-1 border-b border-slate-200 pb-3"
          >
            {(Object.keys(RESOURCE_LABELS) as ResourceKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={state.kind === kind}
                disabled={busy || (kind !== 'projects' && !state.project)}
                onClick={() => void session.list(kind)}
                className={`px-3 py-2 text-xs font-semibold rounded-md disabled:opacity-40 ${state.kind === kind ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {RESOURCE_LABELS[kind]}
              </button>
            ))}
          </div>
          <Card
            padding="none"
            className="overflow-hidden"
            role="tabpanel"
            aria-label={RESOURCE_LABELS[state.kind]}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
              <h2 className="font-semibold">{RESOURCE_LABELS[state.kind]}</h2>
              <span className="text-xs text-slate-500">Up to 10 records per page</span>
            </div>
            {state.pending ? (
              <p role="status" className="p-6 text-sm text-slate-500">
                {state.pending}…
              </p>
            ) : rows ? (
              <>
                {rows.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No records in this scope.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {rows.map((item) => (
                      <li key={item.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-sm break-all">
                            {'name' in item
                              ? item.name
                              : 'severity' in item
                                ? item.severity
                                : item.status}
                          </p>
                          <p className="text-xs font-mono text-slate-500 break-all mt-1">
                            {item.id}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void session.detail(state.kind, item.id)}
                          aria-label={`Inspect ${state.kind} ${item.id}`}
                        >
                          Inspect
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="p-3 border-t border-slate-100 flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => void session.list(state.kind)}>
                    First page
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!state.page?.nextAfterId}
                    onClick={() =>
                      void session.list(state.kind, state.page?.nextAfterId ?? undefined)
                    }
                  >
                    Next page
                  </Button>
                </div>
              </>
            ) : (
              <p className="p-6 text-sm text-slate-500">
                Select a collection to load its diagnostic metadata.
              </p>
            )}
          </Card>
          {state.detail && (
            <SupportDiagnosticDetail
              kind={state.kind}
              item={state.detail}
              close={session.closeDetail}
            />
          )}
          {state.operationId && (
            <p className="text-xs text-slate-500 break-all">
              Last confirmed operation: <span className="font-mono">{state.operationId}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
