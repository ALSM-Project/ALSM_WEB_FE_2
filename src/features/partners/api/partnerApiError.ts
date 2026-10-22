/** A failed partner API call with the server's own status/code/message, so the UI can show
 * e.g. a 409 "already exists" next to the email field instead of a generic error. */
export class PartnerApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'PartnerApiError';
  }
}
