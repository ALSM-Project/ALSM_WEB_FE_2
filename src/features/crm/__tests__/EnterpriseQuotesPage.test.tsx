import { describe, it, expect } from 'vitest';
import {
  isContractCustomerSigned,
  isContractPendingCustomerSign,
  isContractAlsmSigned,
} from '../pages/EnterpriseQuotesPage';
import type { EnterpriseContract } from '@/features/contracts/api/contracts.api';

describe('EnterpriseQuotesPage Signature Classification', () => {
  const signedContract: EnterpriseContract = {
    id: 'ctr-1',
    contractNumber: 'ALSM-CTR-2026-89AA',
    title: 'Enterprise Modernization Agreement - Client Workspace',
    organizationId: 'org-1',
    organizationName: 'Client Workspace',
    serviceMode: 'WE_CONVERT_FOR_YOU',
    contractType: 'ENTERPRISE_HYBRID_MSA',
    status: 'ACTIVE',
    lifecycleStatus: 'COMPLETED',
    plan: 'Enterprise Core Modernization',
    effectiveDate: '2026-11-07',
    endDate: '2027-11-07',
    customer: {
      companyName: 'Client Workspace',
      taxId: '0109988776',
      businessAddress: 'Hanoi',
      representativeName: 'Nguyen Van A',
      representativeTitle: 'Director',
      contactEmail: 'client@workspace.io',
    },
    scope: { screensQuota: 100, programsQuota: 20, storageGb: 50 },
    commercialTerms: {
      subtotal: 11000,
      discountPercent: 0,
      discountAmount: 0,
      vatRate: 10,
      vatAmount: 1100,
      totalValue: 12100,
      currency: 'VND',
      paymentStructure: 'ONE_TIME',
    },
    clauses: [],
    milestones: [],
    paymentSchedule: [],
    signingProcess: {
      providerSigningStatus: 'SIGNED',
      customerSigningStatus: 'SIGNED',
    },
    totalValue: 12100,
    currency: 'VND',
    amendments: [],
    renewals: [],
    auditTrail: [],
    createdAt: '2026-11-07T09:32:26.846Z',
    updatedAt: '2026-11-07T09:32:26.846Z',
  };

  const unsignedContract: EnterpriseContract = {
    ...signedContract,
    id: 'ctr-2',
    contractNumber: 'ALSM-CTR-2026-9A52',
    status: 'DRAFT',
    lifecycleStatus: 'INTERNAL_REVIEW',
    signingProcess: {
      providerSigningStatus: 'SIGNED',
      customerSigningStatus: 'NOT_SIGNED',
    },
  };

  it('correctly identifies a contract signed by customer', () => {
    expect(isContractCustomerSigned(signedContract)).toBe(true);
    expect(isContractPendingCustomerSign(signedContract)).toBe(false);
    expect(isContractAlsmSigned(signedContract)).toBe(true);
  });

  it('correctly identifies a contract pending customer signature', () => {
    expect(isContractCustomerSigned(unsignedContract)).toBe(false);
    expect(isContractPendingCustomerSign(unsignedContract)).toBe(true);
    expect(isContractAlsmSigned(unsignedContract)).toBe(true);
  });

  it('correctly handles case-insensitive status for Active contracts', () => {
    const activeContract = {
      ...signedContract,
      status: 'Active',
      signingProcess: {
        providerSigningStatus: 'SIGNED' as const,
        customerSigningStatus: 'NOT_SIGNED' as const,
      },
    };
    expect(isContractCustomerSigned(activeContract)).toBe(true);
    expect(isContractPendingCustomerSign(activeContract)).toBe(false);
  });
});
