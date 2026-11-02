import { Card } from '@/shared/ui';
import type { SupportNotice } from '../state/SupportSession';

export function SupportOutcomeNotice({ notice }: { notice: SupportNotice }) {
  return (
    <Card role="status" className="border-amber-300 bg-amber-50 text-sm space-y-2">
      <p className="font-semibold">{notice.message}</p>
      {notice.reference && (
        <dl className="text-xs space-y-1">
          {(['organizationId', 'contextId', 'operationId'] as const).map((key) =>
            notice.reference?.[key] ? (
              <div key={key} className="flex flex-wrap gap-2">
                <dt>{key}</dt>
                <dd className="font-mono break-all">{notice.reference[key]}</dd>
              </div>
            ) : null,
          )}
        </dl>
      )}
      {notice.reference && (
        <p className="text-xs">
          Keep these references for authorized review. Checking context status records new activity
          and cannot reconcile this operation.
        </p>
      )}
    </Card>
  );
}
