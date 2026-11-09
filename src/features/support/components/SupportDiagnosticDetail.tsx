import { Button, Card } from '@/shared/ui';
import { diagnosticFields } from '../api/support.api';
import { RESOURCE_LABELS, type Diagnostic, type ResourceKind } from '../api/support.types';

export function SupportDiagnosticDetail({
  kind,
  item,
  close,
}: {
  kind: ResourceKind;
  item: Diagnostic;
  close: () => void;
}) {
  const values = item as unknown as Record<string, unknown>;
  return (
    <Card className="border-blue-200" role="region" aria-label="Diagnostic detail">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold text-[#17263A]">
          {RESOURCE_LABELS[kind]} · Diagnostic detail
        </h3>
        <Button variant="ghost" onClick={close}>
          Close detail
        </Button>
      </div>
      <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        {diagnosticFields(kind).map((field) => (
          <div key={field}>
            <dt className="text-xs text-slate-500 mb-1">{field}</dt>
            <dd className="break-all font-medium">
              {typeof values[field] === 'string' || typeof values[field] === 'number'
                ? String(values[field])
                : '—'}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
