/** A failed source-file upload, carrying a message that is safe to show to the user. */
export class PartnerUploadError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'PartnerUploadError';
  }
}

/** Turns an axios error into a PartnerUploadError without leaking stack traces or internals. */
export function toPartnerUploadError(err: unknown): PartnerUploadError {
  const response = (
    err as { response?: { status?: number; data?: { code?: string; message?: unknown } } }
  )?.response;
  if (!response) {
    return new PartnerUploadError(
      'Cannot reach the server. Nothing was uploaded - please try again.',
    );
  }
  const { status } = response;
  const code = response.data?.code;
  const raw = response.data?.message;
  const serverMessage = Array.isArray(raw)
    ? raw.join('; ')
    : typeof raw === 'string'
      ? raw
      : undefined;
  if (status === 400) {
    return new PartnerUploadError(serverMessage || 'The selected files were rejected', status, code);
  }
  if (status === 403) {
    return new PartnerUploadError('You do not have permission to upload files to this project', status, code);
  }
  if (status === 404) {
    return new PartnerUploadError('This project was not found on the server', status, code);
  }
  if (status === 413) {
    return new PartnerUploadError('A file is larger than the 50 MB upload limit', status, code);
  }
  return new PartnerUploadError('The upload failed. Please try again later.', status, code);
}
