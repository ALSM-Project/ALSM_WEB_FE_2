import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BankAccountsPage } from '../pages/BankAccountsPage';
import { bankAccountApi } from '../api/bankAccountApi';
import { BankAccount, BankAccountsListResponse } from '../types/bankAccount.types';

const mockAccounts: BankAccount[] = [
  {
    id: 'ba-01',
    bankName: 'Vietcombank',
    bankCode: 'VCB',
    bin: '970436',
    accountHolderName: 'ALSM SOFTWARE JOINT STOCK COMPANY',
    accountNumberMasked: '•••• •••• 7890',
    accountNumberLast4: '7890',
    currency: 'VND',
    country: 'VN',
    branchName: 'Thang Long Branch',
    swiftBic: 'BFTVVNVX',
    bankAddress: '198 Tran Quang Khai, Hanoi',
    description: 'Main receiving account for VND contracts',
    status: 'active',
    isDefault: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  },
  {
    id: 'ba-02',
    bankName: 'Standard Chartered Vietnam',
    bankCode: 'SCB',
    bin: '970410',
    accountHolderName: 'ALSM SOFTWARE JOINT STOCK COMPANY',
    accountNumberMasked: '•••• •••• 4321',
    accountNumberLast4: '4321',
    currency: 'USD',
    country: 'VN',
    branchName: 'Hanoi Branch',
    swiftBic: 'SCBLVNVX',
    bankAddress: 'Hanoi',
    description: 'International USD receiving account',
    status: 'active',
    isDefault: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-16T00:00:00.000Z',
  },
  {
    id: 'ba-03',
    bankName: 'MB Bank',
    bankCode: 'MB',
    bin: '970422',
    accountHolderName: 'ALSM SOFTWARE JOINT STOCK COMPANY',
    accountNumberMasked: '•••• •••• 9999',
    accountNumberLast4: '9999',
    currency: 'VND',
    country: 'VN',
    branchName: 'Military Commercial Bank - Hanoi',
    swiftBic: null,
    bankAddress: null,
    description: 'Secondary receiving account',
    status: 'inactive',
    isDefault: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    deactivatedAt: '2026-10-01T00:00:00.000Z',
    deactivationReason: 'Replaced by Vietcombank primary account',
  },
];

const mockListResponse: BankAccountsListResponse = {
  items: mockAccounts,
  pagination: {
    page: 1,
    limit: 10,
    total: 3,
    totalPages: 1,
  },
  summary: {
    total: 3,
    active: 2,
    inactive: 1,
    defaultCount: 2,
  },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(['currentUser'], {
    id: 'user-admin',
    fullName: 'System Administrator',
    email: 'admin@alsm.io',
    isPlatformAdmin: true,
    effectivePermissions: [
      'bank_accounts.view',
      'bank_accounts.create',
      'bank_accounts.update',
      'bank_accounts.set_default',
      'bank_accounts.deactivate',
      'bank_accounts.reveal_sensitive_data',
    ],
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/administration/finance/bank-accounts']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('BankAccountsPage - Admin Bank Account Management Module', () => {
  beforeEach(() => {
    vi.spyOn(bankAccountApi, 'list').mockResolvedValue(mockListResponse);
    vi.spyOn(bankAccountApi, 'create').mockResolvedValue({
      id: 'ba-04',
      bankName: 'Techcombank',
      bankCode: 'TCB',
      bin: '970407',
      accountHolderName: 'ALSM SOFTWARE JOINT STOCK COMPANY',
      accountNumberMasked: '•••• •••• 1111',
      accountNumberLast4: '1111',
      currency: 'VND',
      country: 'VN',
      branchName: 'Headquarters',
      swiftBic: 'VTCBVNVX',
      bankAddress: null,
      description: null,
      status: 'active',
      isDefault: false,
    });
    vi.spyOn(bankAccountApi, 'setDefault').mockResolvedValue({
      ...mockAccounts[0],
      isDefault: true,
    });
    vi.spyOn(bankAccountApi, 'deactivate').mockResolvedValue({
      ...mockAccounts[0],
      status: 'inactive',
      isDefault: false,
    });
    vi.spyOn(bankAccountApi, 'revealAccountNumber').mockResolvedValue({
      id: 'ba-01',
      accountNumber: '0011001234567',
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders page header, summary statistics, and bank accounts table', async () => {
    const Wrapper = createWrapper();
    render(<BankAccountsPage />, { wrapper: Wrapper });

    // Page title and subtitle
    expect(screen.getByText('Bank Accounts')).toBeInTheDocument();
    expect(
      screen.getByText(/Manage company bank accounts used to receive customer payments/),
    ).toBeInTheDocument();

    // Summary cards metrics & accounts rendered in table
    await waitFor(() => {
      expect(screen.getByText('Total Accounts')).toBeInTheDocument();
      expect(screen.getByText('Active Accounts')).toBeInTheDocument();
      expect(screen.getByText('Default Receiving')).toBeInTheDocument();
      expect(screen.getByText('Inactive Accounts')).toBeInTheDocument();
      expect(screen.getByText('Vietcombank')).toBeInTheDocument();
      expect(screen.getByText('Standard Chartered Vietnam')).toBeInTheDocument();
      expect(screen.getByText('MB Bank')).toBeInTheDocument();
    });

    // Masked account numbers are rendered (never raw plaintext in table)
    expect(screen.getByText('•••• •••• 7890')).toBeInTheDocument();
    expect(screen.getByText('•••• •••• 4321')).toBeInTheDocument();
    expect(screen.getByText('•••• •••• 9999')).toBeInTheDocument();
  });

  it('opens Add Bank Account modal and validates required fields', async () => {
    const Wrapper = createWrapper();
    render(<BankAccountsPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Add Bank Account')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Bank Account'));

    // Modal opens
    expect(screen.getByRole('heading', { name: 'Add Bank Account' })).toBeInTheDocument();

    // Submit without input triggers validation errors
    const submitBtn = screen.getByRole('button', { name: 'Create Bank Account' });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Bank name is required')).toBeInTheDocument();
    expect(screen.getByText('Account holder name is required')).toBeInTheDocument();
    expect(screen.getByText('Account number is required')).toBeInTheDocument();
  });

  it('creates a new bank account on valid form submission', async () => {
    const Wrapper = createWrapper();
    render(<BankAccountsPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Add Bank Account')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Bank Account'));

    const bankNameInput = screen.getByPlaceholderText('e.g. Vietcombank');
    const holderInput = screen.getByPlaceholderText('e.g. ALSM SOFTWARE JOINT STOCK COMPANY');
    const numberInput = screen.getByPlaceholderText('e.g. 01234567890');

    fireEvent.change(bankNameInput, { target: { value: 'Techcombank' } });
    fireEvent.change(holderInput, { target: { value: 'ALSM SOFTWARE JOINT STOCK COMPANY' } });
    fireEvent.change(numberInput, { target: { value: '19035678901111' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Bank Account' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(bankAccountApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bankName: 'Techcombank',
          bankCode: 'TCB',
          bin: '970407',
          accountHolderName: 'ALSM SOFTWARE JOINT STOCK COMPANY',
          accountNumber: '19035678901111',
          currency: 'VND',
        }),
      );
    });
  });

  it('automatically populates Bank BIN when selecting a popular bank button', async () => {
    const Wrapper = createWrapper();
    render(<BankAccountsPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Add Bank Account')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Bank Account'));

    // Click the popular "MBBank" quick button
    const mbBtn = screen.getByRole('button', { name: 'MBBank' });
    fireEvent.click(mbBtn);

    // Verify BIN input is automatically populated with 970422
    const binInput = screen.getByPlaceholderText('e.g. 970436') as HTMLInputElement;
    expect(binInput.value).toBe('970422');

    // Fill remaining required fields
    const holderInput = screen.getByPlaceholderText('e.g. ALSM SOFTWARE JOINT STOCK COMPANY');
    const numberInput = screen.getByPlaceholderText('e.g. 01234567890');
    fireEvent.change(holderInput, { target: { value: 'CONG TY CP ALSM' } });
    fireEvent.change(numberInput, { target: { value: '090123456789' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Bank Account' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(bankAccountApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bankName: 'MBBank',
          bankCode: 'MB',
          bin: '970422',
          accountHolderName: 'CONG TY CP ALSM',
          accountNumber: '090123456789',
          currency: 'VND',
        }),
      );
    });
  });

  it('opens Detail Modal and allows audited account number reveal', async () => {
    const Wrapper = createWrapper();
    render(<BankAccountsPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Vietcombank')).toBeInTheDocument();
    });

    // Click on row to open detail modal
    fireEvent.click(screen.getByText('Vietcombank'));

    await waitFor(() => {
      expect(screen.getByText('Receiving Bank Account Details')).toBeInTheDocument();
      expect(screen.getByText('Reveal (Audited)')).toBeInTheDocument();
    });

    // Click Reveal
    fireEvent.click(screen.getByText('Reveal (Audited)'));

    await waitFor(() => {
      expect(bankAccountApi.revealAccountNumber).toHaveBeenCalledWith('ba-01');
      expect(screen.getByText('0011001234567')).toBeInTheDocument();
      expect(
        screen.getByText(/Full account number revealed. This security event has been logged/),
      ).toBeInTheDocument();
    });
  });

  it('opens Deactivate confirmation modal and calls deactivate API', async () => {
    const Wrapper = createWrapper();
    render(<BankAccountsPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Vietcombank')).toBeInTheDocument();
    });

    // Find and click deactivate button for Vietcombank
    const deactivateButtons = screen.getAllByTitle('Deactivate account');
    fireEvent.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Deactivate Receiving Bank Account')).toBeInTheDocument();
      expect(
        screen.getByText(/Confirm Deactivation: Vietcombank/),
      ).toBeInTheDocument();
    });

    // Enter reason and confirm
    const reasonInput = screen.getByPlaceholderText(/Account closed at banking institution/);
    fireEvent.change(reasonInput, { target: { value: 'Closing secondary account' } });

    const confirmBtn = screen.getByRole('button', { name: 'Confirm Deactivation' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(bankAccountApi.deactivate).toHaveBeenCalledWith('ba-01', 'Closing secondary account');
    });
  });
});
