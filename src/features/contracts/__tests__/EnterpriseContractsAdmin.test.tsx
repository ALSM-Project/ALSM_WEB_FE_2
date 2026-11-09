import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CreateContractWizardPage } from '../pages/CreateContractWizardPage';
import { ContractDetailPage } from '../pages/ContractDetailPage';
import { contractsApi } from '../api/contracts.api';

vi.mock('../api/contracts.api', () => ({
  contractsApi: {
    getSelectableCustomers: vi.fn(),
    getTemplatesAndClauses: vi.fn(),
    createContract: vi.fn(),
    submitForReview: vi.fn(),
    getContractById: vi.fn(),
    signContract: vi.fn(),
    reviewContract: vi.fn(),
    activateContract: vi.fn(),
    amendContract: vi.fn(),
    sendToCustomer: vi.fn(),
    getPdfUrl: vi.fn(() => 'http://localhost:3000/api/v1/enterprise-contracts/mock/pdf'),
  },
}));

describe('ALSM Web 2 Enterprise Contract Management (CRM & Sales)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (contractsApi.getSelectableCustomers as any).mockResolvedValue({
      organizations: [
        {
          id: 'org-fpt-01',
          name: 'FPT Software Corp',
          taxId: '0101234567',
          businessAddress: 'Duy Tan, Cau Giay, Hanoi',
          representativeName: 'Nguyen Van A',
          representativeTitle: 'Technology Director',
          contactEmail: 'contact@fpt.com',
        },
      ],
      leads: [
        {
          id: 'lead-fpt-01',
          company: 'fpt software',
          contactName: 'Cuong Nguyen',
          email: 'cuong@fpt.com',
          phone: '+8498888888',
          estimatedValue: 85000000,
        },
      ],
    });

    (contractsApi.getTemplatesAndClauses as any).mockResolvedValue({
      templates: [{ id: 'tmpl-1', name: 'Standard SOW' }],
      clauses: [
        {
          category: 'IP_OWNERSHIP',
          title: 'Customer Intellectual Property Retention',
          description: 'Customer retains 100% intellectual property ownership of legacy source and converted code.',
        },
      ],
    });
  });

  it('renders 6-step CreateContractWizardPage and navigates through steps', async () => {
    render(
      <MemoryRouter initialEntries={['/sales/contracts/new?leadId=lead-fpt-01']}>
        <Routes>
          <Route path="/sales/contracts/new" element={<CreateContractWizardPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Step 1: Select Enterprise Customer & Legal Entity/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Select Customer')).toBeInTheDocument();
    expect(screen.getByText('Contract Type')).toBeInTheDocument();
    expect(screen.getByText('Configure Services')).toBeInTheDocument();
    expect(screen.getByText('Commercial Terms')).toBeInTheDocument();
    expect(screen.getByText('Legal Clauses')).toBeInTheDocument();
    expect(screen.getByText('Generate Draft')).toBeInTheDocument();

    // Click Continue to step 2
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => {
      expect(screen.getByText(/Step 2: Choose Service Track & Contract Category/i)).toBeInTheDocument();
    });
  });

  it('renders 14-section ContractDetailPage with tabs and action buttons', async () => {
    (contractsApi.getContractById as any).mockResolvedValue({
      id: 'ctr-123',
      contractNumber: 'ALSM-CTR-2026-0001',
      title: 'Enterprise Modernization Agreement - FPT',
      serviceMode: 'WE_CONVERT_FOR_YOU',
      contractType: 'MANAGED_CONVERSION_SOW',
      status: 'SIGNED',
      lifecycleStatus: 'SIGNED',
      totalValue: 750000000,
      currency: 'VND',
      effectiveDate: '2026-11-05',
      endDate: '2027-11-05',
      customer: {
        companyName: 'FPT Software Corp',
        taxId: '0101234567',
        businessAddress: 'Duy Tan, Cau Giay, Hanoi',
        representativeName: 'Nguyen Van A',
        representativeTitle: 'Technology Director',
        contactEmail: 'contact@fpt.com',
      },
      commercialTerms: {
        subtotal: 750000000,
        discountPercent: 0,
        discountAmount: 0,
        vatRate: 10,
        vatAmount: 75000000,
        totalValue: 825000000,
        currency: 'VND',
        paymentStructure: 'MILESTONE_BASED',
      },
      signingProcess: {
        providerSigningStatus: 'SIGNED',
        customerSigningStatus: 'SIGNED',
        alsmSigner: {
          name: 'ALSM CEO',
          title: 'CEO',
          email: 'ceo@alsm.io',
          signedAt: '2026-11-05T00:00:00Z',
          signatureHash: 'hash-123',
        },
        customerSigner: {
          name: 'Nguyen Van A',
          title: 'Director',
          email: 'contact@fpt.com',
          signedAt: '2026-11-05T00:00:00Z',
          signatureHash: 'hash-456',
        },
      },
      clauses: [],
      milestones: [],
      paymentSchedule: [],
      amendments: [],
      auditTrail: [],
      createdAt: '2026-11-05T00:00:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/sales/contracts/ctr-123']}>
        <Routes>
          <Route path="/sales/contracts/:id" element={<ContractDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('ALSM-CTR-2026-0001').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('Overview & Parties')).toBeInTheDocument();
    expect(screen.getByText('Service Scope & SLA')).toBeInTheDocument();
    expect(screen.getByText('Commercial & Payment')).toBeInTheDocument();
    expect(screen.getByText('Legal Clauses')).toBeInTheDocument();
    expect(screen.getByText('Document Preview')).toBeInTheDocument();
    expect(screen.getByText('E-Signing & Evidence')).toBeInTheDocument();
    expect(screen.getByText('Milestones & Handover')).toBeInTheDocument();
    expect(screen.getByText('Amendments & Audit')).toBeInTheDocument();

    // Check PDF contract download presence
    expect(screen.getByRole('link', { name: /pdf contract/i })).toBeInTheDocument();
  });
});
