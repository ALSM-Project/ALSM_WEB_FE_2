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

/** Forbidden reasons the server reports with a code, explained in user terms. */
const FORBIDDEN_MESSAGES: Record<string, string> = {
  CONVERSION_PROJECT_ASSIGNMENT_REQUIRED:
    'You are not assigned to this project. Ask your Team Lead to add you to the project in a Conversion Team, then reload the page.',
  ORGANIZATION_ACCESS_DENIED: 'You are not a member of the organization that owns this project.',
};

/**
 * Turns an axios error into a PartnerConversionError without leaking server internals.
 * `action` says what failed - loading the workspace or starting a conversion - so the
 * message does not blame a conversion the user never started.
 */
export function toPartnerConversionError(
  err: unknown,
  action: 'load' | 'start' = 'start',
): PartnerConversionError {
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
    const known = code ? FORBIDDEN_MESSAGES[code] : undefined;
    if (known) return new PartnerConversionError(known, status, code);
    return new PartnerConversionError(
      action === 'load'
        ? "You do not have permission to view this project's files and conversions"
        : 'You do not have permission to start conversions for this project',
      status,
      code,
    );
  }
  if (status === 404) {
    return new PartnerConversionError('This project or file was not found on the server', status, code);
  }
  return new PartnerConversionError(
    action === 'load'
      ? "The project's files and conversions could not be loaded. Please try again later."
      : 'The conversion could not be started. Please try again later.',
    status,
    code,
  );
}
