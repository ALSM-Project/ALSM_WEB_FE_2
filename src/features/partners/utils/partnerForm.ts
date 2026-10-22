import { PartnerApiError } from '../api/partners.api';

export const PARTNER_NAME_MAX_LENGTH = 200;

export interface PartnerFormValues {
  name: string;
  domain: string;
  contactName: string;
  contactEmail: string;
}

export type PartnerFormField = keyof PartnerFormValues;
export type PartnerFormErrors = Partial<Record<PartnerFormField | 'form', string>>;

const DOMAIN_PATTERN = /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side checks mirroring the backend's UC-44 rules, shown inline under each field. */
export function validatePartnerForm(values: PartnerFormValues): PartnerFormErrors {
  const errors: PartnerFormErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Organization name is required';
  else if (name.length > PARTNER_NAME_MAX_LENGTH) {
    errors.name = `Organization name must be at most ${PARTNER_NAME_MAX_LENGTH} characters`;
  }

  const domain = values.domain.trim();
  if (!domain) errors.domain = 'Primary domain is required';
  else if (!DOMAIN_PATTERN.test(domain)) errors.domain = 'Please enter a valid domain (e.g. partner.com)';

  if (!values.contactName.trim()) errors.contactName = 'Primary contact name is required';

  const email = values.contactEmail.trim();
  if (!email) errors.contactEmail = 'Contact email is required';
  else if (!EMAIL_PATTERN.test(email)) errors.contactEmail = 'Please enter a valid email address';

  return errors;
}

const FIELD_BY_SERVER_CODE: Record<string, PartnerFormField> = {
  PARTNER_ALREADY_EXISTS: 'contactEmail',
  INVALID_CONTACT_EMAIL: 'contactEmail',
  PARTNER_NAME_REQUIRED: 'name',
  CONTACT_NAME_REQUIRED: 'contactName',
  INVALID_PRIMARY_DOMAIN: 'domain',
};

/** Maps a failed create to form errors: a known server code is shown under its field
 * (e.g. 409 duplicate email under Contact Email) as well as in the form banner. */
export function partnerErrorToFormErrors(err: unknown): PartnerFormErrors {
  if (err instanceof PartnerApiError) {
    const field = (err.code && FIELD_BY_SERVER_CODE[err.code]) || (err.status === 409 ? 'contactEmail' : undefined);
    return field ? { [field]: err.message, form: err.message } : { form: err.message };
  }
  return { form: 'Failed to register partner organization. Please try again.' };
}
