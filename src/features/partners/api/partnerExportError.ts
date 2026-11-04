/** A failed export action, carrying a message that is safe to show to the user. */
export class PartnerExportError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'PartnerExportError';
  }
}

/** Codes whose server message is written for end users and contains nothing internal. */
const USER_FACING_CODES = new Set([
  'NO_COMPLETED_ITEMS',
  'EXPORT_BUNDLE_NOT_FOUND',
  'EXPORT_BUNDLE_FILE_MISSING',
  'PROJECT_NOT_FOUND',
]);

const RELEASE_NOT_SAVED_CODES = new Set([
  'MONGO_TRANSACTIONS_REQUIRED',
  'ATOMIC_MUTATION_ABORTED',
  'TEAM_MUTATION_OUTCOME_UNCONFIRMED',
]);

interface ErrorBody {
  code?: string;
  message?: unknown;
}

/** A ZIP request (responseType "blob") gets its JSON error body back as a Blob. */
async function readBody(data: unknown): Promise<ErrorBody | undefined> {
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      return JSON.parse(await data.text()) as ErrorBody;
    } catch {
      return undefined;
    }
  }
  return data && typeof data === 'object' ? (data as ErrorBody) : undefined;
}

/** Turns an axios error into a PartnerExportError without leaking server internals. */
export async function toPartnerExportError(err: unknown): Promise<PartnerExportError> {
  if (err instanceof PartnerExportError) return err;
  const response = (err as { response?: { status?: number; data?: unknown } })?.response;
  if (!response) {
    return new PartnerExportError('Cannot reach the server. Please try again.');
  }
  const { status } = response;
  const body = await readBody(response.data);
  const code = body?.code;
  const raw = body?.message;

  if (code && USER_FACING_CODES.has(code) && typeof raw === 'string') {
    return new PartnerExportError(raw, status, code);
  }
  if (code && RELEASE_NOT_SAVED_CODES.has(code)) {
    return new PartnerExportError(
      'The release could not be saved, so the partner was not notified. Please try again.',
      status,
      code,
    );
  }
  if (status === 400) {
    const message = Array.isArray(raw) ? raw.join('; ') : typeof raw === 'string' ? raw : undefined;
    return new PartnerExportError(message || 'Please check the export details and try again.', status, code);
  }
  if (status === 403) {
    return new PartnerExportError('You do not have permission to export this project', status, code);
  }
  if (status === 404) {
    return new PartnerExportError('This project was not found on the server', status, code);
  }
  return new PartnerExportError('The export could not be completed. Please try again later.', status, code);
}
