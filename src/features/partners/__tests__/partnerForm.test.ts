import { describe, expect, it } from 'vitest';
import { PartnerApiError } from '../api/partnerApiError';
import { partnerErrorToFormErrors, validatePartnerForm } from '../utils/partnerForm';

const valid = {
  name: 'Pacific Banking Systems Ltd.',
  domain: 'pacificbanking.com',
  contactName: 'Jonathan Reynolds',
  contactEmail: 'jreynolds@pacificbanking.com',
};

describe('validatePartnerForm', () => {
  it('accepts a complete, well-formed form', () => {
    expect(validatePartnerForm(valid)).toEqual({});
  });

  it('flags every missing required field', () => {
    expect(validatePartnerForm({ name: ' ', domain: '', contactName: '', contactEmail: '' })).toEqual({
      name: 'Organization name is required',
      domain: 'Primary domain is required',
      contactName: 'Primary contact name is required',
      contactEmail: 'Contact email is required',
    });
  });

  it('rejects a name over 200 characters and malformed email/domain', () => {
    const errors = validatePartnerForm({
      ...valid,
      name: 'A'.repeat(201),
      domain: 'not a domain',
      contactEmail: 'not-an-email',
    });
    expect(errors.name).toMatch(/at most 200 characters/);
    expect(errors.domain).toMatch(/valid domain/);
    expect(errors.contactEmail).toMatch(/valid email/);
  });
});

describe('partnerErrorToFormErrors', () => {
  it('shows a 409 duplicate under Contact Email and in the banner', () => {
    const message = "A partner with contact email 'x@y.com' already exists";
    expect(partnerErrorToFormErrors(new PartnerApiError(message, 409, 'PARTNER_ALREADY_EXISTS'))).toEqual({
      contactEmail: message,
      form: message,
    });
  });

  it('falls back to a generic banner for unexpected errors', () => {
    expect(partnerErrorToFormErrors(new Error('boom'))).toEqual({
      form: 'Failed to register partner organization. Please try again.',
    });
  });
});
