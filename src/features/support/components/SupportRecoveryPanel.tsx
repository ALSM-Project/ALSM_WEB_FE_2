import { useState } from 'react';
import { Button, Card, Input } from '@/shared/ui';
import type { SupportSession, SupportState } from '../state/SupportSession';

export function SupportRecoveryPanel({
  session,
  state,
}: {
  session: SupportSession;
  state: SupportState;
}) {
  const reference = state.notice?.reference;
  const [organizationId, setOrganization] = useState(reference?.organizationId ?? '');
  const [contextId, setContext] = useState(reference?.contextId ?? '');
  const [operationId, setOperation] = useState(reference?.operationId ?? '');
  const recovery = state.recovery;
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Recover Support Context</h2>
      <p className="text-sm">
        Inspect your original session’s context after a reload or lost acknowledgement. This does
        not refresh idle time or repeat an operation.
      </p>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void session.recover(organizationId.trim(), {
            contextId: contextId.trim() || undefined,
            operationId: operationId.trim() || undefined,
          });
        }}
      >
        <Input
          label="Recovery Organisation ID"
          value={organizationId}
          onChange={(event) => setOrganization(event.target.value)}
          required
          pattern="[a-f0-9]{24}"
        />
        <Input
          label="Original Context ID (optional)"
          value={contextId}
          onChange={(event) => setContext(event.target.value)}
        />
        <Input
          label="Original Operation ID (optional)"
          value={operationId}
          onChange={(event) => setOperation(event.target.value)}
        />
        <Button type="submit" disabled={state.pending !== null}>
          Inspect recovery
        </Button>
      </form>
      {recovery && (
        <div role="region" aria-label="Recovery result" className="space-y-2 text-sm">
          <p>Context: {recovery.context?.id ?? 'Unresolved'}</p>
          <p>
            Stored state: {recovery.context?.state ?? 'Unresolved'} ·{' '}
            {recovery.usable ? 'Currently usable' : 'Unavailable'}
          </p>
          {recovery.operation && <p>Original operation: {recovery.operation.state}</p>}
          {recovery.usable && recovery.operation?.state !== 'UNRESOLVED' && (
            <Button onClick={session.resumeRecovered} disabled={state.pending !== null}>
              Resume recovered context
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
