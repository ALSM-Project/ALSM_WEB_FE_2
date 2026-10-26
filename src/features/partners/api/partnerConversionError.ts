/** A failed conversion action, carrying a message that is safe to show to the user. */
export class PartnerConversionError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'PartnerConversionError';
  }
}

/** Codes whose server message is written for end users and contains nothing internal. */
const USER_FACING_CODES = new Set([
  'SCREEN_NOT_FOUND',
  'CONVERSION_ALREADY_IN_PROGRESS',
  'COPYBOOK_DEPENDENCY_BLOCKED',
]);

/** Turns an axios error into a PartnerConversionError without leaking server internals. */
export function toPartnerConversionError(err: unknown): PartnerConversionError {
  const response = (
    err as { response?: { status?: number; data?: { code?: string; message?: unknown } } }
  )?.response;
  if (!response) {
    return new PartnerConversionError('Cannot reach the server. Please try again.');
  }
  const { status } = response;
  const code = response.data?.code;
  const raw = response.data?.message;
  if (code && USER_FACING_CODES.has(code) && typeof raw === 'string') {
    return new PartnerConversionError(raw, status, code);
  }
  if (code === 'CONVERSION_QUEUE_UNAVAILABLE') {
    return new PartnerConversionError(
      'The conversion queue is temporarily unavailable. Please try again in a moment.',
      status,
      code,
    );
  }
  if (status === 403) {
    return new PartnerConversionError('You do not have permission to start conversions for this project', status, code);
  }
  if (status === 404) {
    return new PartnerConversionError('This project or file was not found on the server', status, code);
  }
  return new PartnerConversionError('The conversion could not be started. Please try again later.', status, code);
}
