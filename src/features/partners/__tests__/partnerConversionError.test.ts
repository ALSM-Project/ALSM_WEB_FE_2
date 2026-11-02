import { describe, expect, it } from 'vitest';
import { toPartnerConversionError } from '../api/partnerConversionError';

function httpError(status: number, data: Record<string, unknown>) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });
}

describe('toPartnerConversionError', () => {
  it('explains a missing project assignment instead of a generic permission error', () => {
    const error = toPartnerConversionError(
      httpError(403, { code: 'CONVERSION_PROJECT_ASSIGNMENT_REQUIRED', message: 'You are not assigned to this conversion project' }),
      'load',
    );
    expect(error.message).toBe(
      'You are not assigned to this project. Ask your Team Lead to add you to the project in a Conversion Team, then reload the page.',
    );
    expect(error).toMatchObject({ status: 403, code: 'CONVERSION_PROJECT_ASSIGNMENT_REQUIRED' });
  });

  it('explains a missing organization membership', () => {
    expect(
      toPartnerConversionError(httpError(403, { code: 'ORGANIZATION_ACCESS_DENIED' })).message,
    ).toBe('You are not a member of the organization that owns this project.');
  });

  it('does not talk about starting conversions when only loading the workspace failed', () => {
    expect(toPartnerConversionError(httpError(403, { code: 'FORBIDDEN' }), 'load').message).toBe(
      "You do not have permission to view this project's files and conversions",
    );
    expect(toPartnerConversionError(httpError(500, {}), 'load').message).toMatch(/could not be loaded/);
  });

  it('keeps the start-conversion wording for a refused start', () => {
    expect(toPartnerConversionError(httpError(403, { code: 'FORBIDDEN' })).message).toBe(
      'You do not have permission to start conversions for this project',
    );
    expect(toPartnerConversionError(httpError(500, {})).message).toBe(
      'The conversion could not be started. Please try again later.',
    );
  });
});
