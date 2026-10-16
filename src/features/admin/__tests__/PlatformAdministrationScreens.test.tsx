import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrganizationsPage } from '../pages/OrganizationsPage';
import { OrganizationDetailPage } from '../pages/OrganizationDetailPage';
import { RevenueDashboardPage } from '../pages/RevenueDashboardPage';
import { EngagementTypesPage } from '../pages/EngagementTypesPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { UserRolesPage } from '@/features/rbac/pages/UserRolesPage';
import { adminApi } from '../api/admin.api';
import { usersApi } from '@/features/users/api/users.api';
import { rbacApi } from '@/features/rbac/api/rbac.api';
import { SupportViewProvider } from '../context/SupportViewContext';

// Mock Auth
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-1',
      fullName: 'System Administrator',
      email: 'admin@alsm.io',
      isPlatformAdmin: true,
      roles: ['ADMIN'],
    },
    hasPermission: () => true,
    isLoading: false,
  }),
}));

// Mock APIs
vi.mock('../api/admin.api', () => ({
  adminApi: {
    getOrganizations: vi.fn(),
    getOrganizationById: vi.fn(),
    createEnterpriseOrganization: vi.fn(),
    updateEngagement: vi.fn(),
    createDemoProject: vi.fn(),
    getEngagementTypes: vi.fn(),
    createEngagementType: vi.fn(),
    updateEngagementType: vi.fn(),
    getRevenueSummary: vi.fn(),
    getRevenueTransactions: vi.fn(),
    getAuditLogs: vi.fn(),
    exportAuditLogsCsv: vi.fn(),
  },
}));

vi.mock('@/features/users/api/users.api', () => ({
  usersApi: {
    lockUser: vi.fn(),
    unlockUser: vi.fn(),
    onboardUser: vi.fn(),
    offboardUser: vi.fn(),
  },
}));

vi.mock('@/features/rbac/api/rbac.api', () => ({
  rbacApi: {
    getAllUsers: vi.fn(),
    getRoles: vi.fn(),
    getRolePermissions: vi.fn(),
    updateUserRoles: vi.fn(),
  },
}));

const renderWithContext = (ui: React.ReactNode, initialPath = '/') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <SupportViewProvider>{ui}</SupportViewProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Platform Administration UI Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Feature A & C: Organisation Management & 2-Step Provisioning', () => {
    it('renders organisation list with types, member counts, sorting, and type filtering', async () => {
      vi.mocked(adminApi.getOrganizations).mockResolvedValue([
        {
          id: 'org-acme',
          name: 'Acme Corporation',
          domain: 'acme.corp',
          contactEmail: 'contact@acme.corp',
          type: 'ENTERPRISE',
          status: 'ACTIVE',
          memberCount: 24,
          createdAt: '2026-06-12T10:00:00Z',
          updatedAt: '2026-10-18T14:00:00Z',
        },
        {
          id: 'org-tokyo',
          name: 'Tokyo Marine Global Insurance',
          domain: 'tokyomarine.jp',
          contactEmail: 'support@tokyomarine.jp',
          type: 'PARTNER',
          status: 'ACTIVE',
          memberCount: 8,
          createdAt: '2026-09-01T08:00:00Z',
          updatedAt: '2026-10-20T16:45:00Z',
        },
      ]);
      vi.mocked(adminApi.getEngagementTypes).mockResolvedValue([]);

      renderWithContext(<OrganizationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
        expect(screen.getByText('Tokyo Marine Global Insurance')).toBeInTheDocument();
      });

      // Verify member count and type badges
      expect(screen.getByText('24 members')).toBeInTheDocument();
      expect(screen.getByText('8 members')).toBeInTheDocument();
      expect(screen.getByText('PARTNER')).toBeInTheDocument();
      expect(screen.getByText('ENTERPRISE')).toBeInTheDocument();

      // Filter by Type: PARTNER
      const typeSelect = screen.getByDisplayValue('All Types');
      fireEvent.change(typeSelect, { target: { value: 'PARTNER' } });

      expect(screen.getByText('Tokyo Marine Global Insurance')).toBeInTheDocument();
      expect(screen.queryByText('Acme Corporation')).not.toBeInTheDocument();
    });

    it('implements 2-step enterprise organisation provisioning with email validation and review', async () => {
      vi.mocked(adminApi.getOrganizations)
        .mockResolvedValueOnce([])
        .mockResolvedValue([{ id: 'org-stellar', name: 'Stellar FinTech', type: 'ENTERPRISE', status: 'TRIAL', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]);
      vi.mocked(adminApi.getEngagementTypes).mockResolvedValue([]);
      vi.mocked(adminApi.createEnterpriseOrganization).mockResolvedValue({
        organization: {
          id: 'org-stellar',
          name: 'Stellar FinTech',
          type: 'ENTERPRISE',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        invitationStatus: 'SENT',
        replayed: false,
      });

      renderWithContext(<OrganizationsPage />);

      // Open Provisioning Modal
      const openBtn = screen.getByRole('button', { name: /(New Enterprise Org|Add Organisation)/i });
      fireEvent.click(openBtn);

      expect(screen.getByText(/Provision Enterprise Organisation \(Step 1\/2\)/i)).toBeInTheDocument();

      // Enter company name but invalid email
      const nameInput = screen.getByPlaceholderText('Global FinTech Solutions Inc.');
      const emailInput = screen.getByPlaceholderText('admin@fintechsolutions.com');

      fireEvent.change(nameInput, { target: { value: 'Stellar FinTech' } });
      fireEvent.change(emailInput, { target: { value: 'invalid-email-format' } });

      const continueBtn = screen.getByRole('button', { name: /Continue to Review/i });
      fireEvent.click(continueBtn);

      // Validation error displayed
      expect(
        screen.getByText(/Please enter a valid admin email address format/i)
      ).toBeInTheDocument();

      // Enter valid email and continue
      fireEvent.change(emailInput, { target: { value: 'admin@stellarfintech.com' } });
      fireEvent.click(continueBtn);

      // Advanced to Step 2: Review & Confirm
      await waitFor(() => {
        expect(screen.getByText(/Review & Confirm Provisioning \(Step 2\/2\)/i)).toBeInTheDocument();
        expect(screen.getByText('Provisioning Summary Verification')).toBeInTheDocument();
      });

      expect(screen.getByText('admin@stellarfintech.com')).toBeInTheDocument();

      // Confirm provisioning
      const confirmBtn = screen.getByRole('button', { name: /Confirm & Provision Organisation/i });
      fireEvent.click(confirmBtn);

      // Added to directory and success notification shown
      await waitFor(() => {
        expect(screen.getByText(/secure account setup link was sent/i)).toBeInTheDocument();
        expect(screen.getByText('Stellar FinTech')).toBeInTheDocument();
      });
      expect(screen.queryByText(/temporary password|TempPassword/i)).not.toBeInTheDocument();
      expect(adminApi.createEnterpriseOrganization).toHaveBeenCalledWith(expect.objectContaining({
        contactEmail: 'admin@stellarfintech.com',
        engagementType: 'Enterprise Pilot',
        requestId: expect.any(String),
      }));
    });
  });

  describe('Feature A & D: Organisation Details & Engagement Management', () => {
    it('renders organisation details, usage statistics, billing history, members, and updates engagement limits', async () => {
      vi.mocked(adminApi.getOrganizationById).mockResolvedValue({
        id: 'org-fnx-prod',
        name: 'Fintech Nexus International',
        domain: 'fintechnexus.io',
        contactEmail: 'support@fintechnexus.io',
        type: 'ENTERPRISE',
        status: 'ACTIVE',
        engagementType: 'ENTERPRISE_T2',
        createdAt: '2026-08-15T09:00:00Z',
        updatedAt: '2026-10-19T11:30:00Z',
        usageStats: {
          totalScreensConverted: 142,
          activeProjects: 3,
          storageUsedGb: 18.4,
          conversionsThisMonth: 64,
        },
        billingHistory: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-2026-0891',
            date: '2026-10-01',
            plan: 'Enterprise Tier 2',
            amount: 18000,
            paymentMethod: 'Bank Transfer (MB Bank)',
            status: 'PAID',
          },
        ],
        members: [
          {
            userId: 'usr-1',
            fullName: 'Alexander Vance',
            email: 'a.vance@fintechnexus.io',
            role: 'Organisation Admin',
            status: 'ACTIVE',
          },
        ],
      });
      vi.mocked(adminApi.updateEngagement).mockResolvedValue({
        id: 'org-fnx-prod',
        name: 'Fintech Nexus International',
        type: 'ENTERPRISE',
        status: 'ACTIVE',
        engagementType: 'ENTERPRISE_T2',
        createdAt: '2026-08-15T09:00:00Z',
        updatedAt: '2026-10-19T11:30:00Z',
      });

      renderWithContext(
        <Routes>
          <Route path="/admin/organizations/:orgId" element={<OrganizationDetailPage />} />
        </Routes>,
        '/admin/organizations/org-fnx-prod'
      );

      await waitFor(() => {
        expect(screen.getByText('Fintech Nexus International')).toBeInTheDocument();
      });

      // Verify Usage Statistics
      expect(screen.getByText('Resource & Platform Usage Statistics')).toBeInTheDocument();
      expect(screen.getByText('142')).toBeInTheDocument();
      expect(screen.getByText('18.4 GB')).toBeInTheDocument();

      // Verify Billing History
      expect(screen.getByText('Commercial Billing & Invoices')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-0891')).toBeInTheDocument();
      expect(screen.getByText('18.000 VND')).toBeInTheDocument();

      // Verify Members
      expect(screen.getByText('Organisation Members')).toBeInTheDocument();
      expect(screen.getByText('Alexander Vance')).toBeInTheDocument();
      expect(screen.getByText('a.vance@fintechnexus.io')).toBeInTheDocument();

      // Verify Admin Action Buttons: Edit Engagement
      const editBtn = screen.getByRole('button', { name: /Edit Engagement/i });
      fireEvent.click(editBtn);

      expect(screen.getByText(/1\. Trial Limits/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Post-Upgrade Production Usage Limits/i)).toBeInTheDocument();

      // Save changes
      const saveBtn = screen.getByRole('button', { name: /Save Engagement Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Engagement settings were saved successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Feature E: Finance Dashboard', () => {
    it('renders total revenue from confirmed contracts, payment methods, bank transfer stats, and date filter', async () => {
      vi.mocked(adminApi.getRevenueSummary).mockResolvedValue({
        totalRevenue: 398000,
        annualRecurringRevenue: 286000,
        activeContractsCount: 6,
        revenueByEngagementType: {
          'Enterprise Tier 1': 132000,
          'Enterprise Tier 2': 92000,
          'Managed Partner': 150000,
        },
        topClients: [],
        breakdownByPaymentMethod: {
          BANK_TRANSFER: 276000,
          CORPORATE_WIRE: 60000,
          PURCHASE_ORDER: 38000,
          DIRECT_DEBIT: 24000,
        },
        bankTransferVolume: 276000,
        bankTransferCount: 3,
      });

      vi.mocked(adminApi.getRevenueTransactions).mockResolvedValue([
        {
          id: 'TXN-2026-101',
          client: 'Acme Corporation',
          engagementType: 'Enterprise Tier 1',
          contractValue: 72000,
          paymentMethod: 'BANK_TRANSFER',
          settlementDate: '2026-10-15',
          status: 'CONFIRMED',
          bankReference: 'MB-899886249-ACME-01',
        },
        {
          id: 'TXN-2026-102',
          client: 'Fintech Nexus International',
          engagementType: 'Enterprise Tier 2',
          contractValue: 54000,
          paymentMethod: 'BANK_TRANSFER',
          settlementDate: '2026-10-02',
          status: 'CONFIRMED',
          bankReference: 'MB-899886249-FNX-02',
        },
        {
          id: 'TXN-2026-103',
          client: 'Tokyo Marine Global Insurance',
          engagementType: 'Enterprise Tier 1',
          contractValue: 60000,
          paymentMethod: 'CORPORATE_WIRE',
          settlementDate: '2026-09-18',
          status: 'CONFIRMED',
        },
        {
          id: 'TXN-2026-104',
          client: 'Global Transit Logistics',
          engagementType: 'Managed Partner',
          contractValue: 150000,
          paymentMethod: 'BANK_TRANSFER',
          settlementDate: '2026-09-01',
          status: 'CONFIRMED',
          bankReference: 'MB-899886249-GTL-03',
        },
        {
          id: 'TXN-2026-105',
          client: 'MetLife Modernization Labs',
          engagementType: 'Enterprise Tier 2',
          contractValue: 38000,
          paymentMethod: 'PURCHASE_ORDER',
          settlementDate: '2026-08-20',
          status: 'CONFIRMED',
        },
        {
          id: 'TXN-2026-106',
          client: 'Zurich Financial Tech Labs',
          engagementType: 'Standard Tier',
          contractValue: 24000,
          paymentMethod: 'DIRECT_DEBIT',
          settlementDate: '2026-07-15',
          status: 'CONFIRMED',
        },
      ]);

      renderWithContext(<RevenueDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/(Revenue Dashboard|Total Commercial Revenue)/)).toBeInTheDocument();
      });

      // Authoritative Live Ledger
      await waitFor(() => { expect(screen.getByText('Confirmed Contracts & Realised Payment Ledger')).toBeInTheDocument(); });
      expect(screen.getByText(/Live ledger of executed enterprise agreements/i)).toBeInTheDocument();

      // Realised revenue KPI
      expect(screen.getByText('398.000 VND')).toBeInTheDocument();

      // Bank Transfer stats
      expect(screen.getByText('Bank Transfer Payment Infrastructure Statistics')).toBeInTheDocument();
      expect(screen.getByText(/MB Bank \(STK: 0899886249\)/i)).toBeInTheDocument();

      // Payment method breakdown
      expect(screen.getByText('Revenue by Payment Method')).toBeInTheDocument();
      expect(screen.getByText(/Direct Bank Transfer \(MB Bank\)/i)).toBeInTheDocument();

      // Filter by Date Range: Last 30 Days
      const dateSelect = screen.getByDisplayValue('All Time (Audited)');
      fireEvent.change(dateSelect, { target: { value: 'LAST_30D' } });

      // Transactions update dynamically
      await waitFor(() => {
        expect(screen.getByText('Confirmed Contracts & Realised Payment Ledger')).toBeInTheDocument();
      });
    });
  });

  describe('Feature F: Engagement Type Management', () => {
    it('renders engagement types with search, trial and usage limits, and shows warning if limits reduced', async () => {
      vi.mocked(adminApi.getEngagementTypes).mockResolvedValue([{
        id: 'plan-premium',
        name: 'Enterprise Tier 1 (Unlimited Acceleration)',
        code: 'ENTERPRISE_T1',
        description: 'Premium enterprise plan',
        price: 36000,
        trialLimits: { maxScreens: 30, maxPrograms: 15, maxStorageGb: 10 },
        usageLimits: { maxScreens: 500, maxPrograms: 200, maxStorageGb: 150 },
        features: ['AST Grammar Verification', 'COBOL 85 Modernizer'],
        includesCobolConversion: true,
        supportTier: 'PREMIER',
        slaHours: 4,
        isActive: true,
        createdAt: '2026-01-15T08:00:00Z',
      }]);

      renderWithContext(<EngagementTypesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Enterprise Tier 1 \(Unlimited Acceleration\)/i)).toBeInTheDocument();
      });

      // Verify trial & usage limits displayed
      expect(screen.getAllByText(/screens/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/progs/i).length).toBeGreaterThan(0);

      // Open Edit Plan Modal for Enterprise Tier 1
      const editBtns = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editBtns[0]);

      expect(screen.getByText('Edit Engagement Type')).toBeInTheDocument();

      // Reduce trial screens from 30 to 5
      const trialScreensInput = screen.getByDisplayValue('30');
      fireEvent.change(trialScreensInput, { target: { value: '5' } });

      // Warning notice should dynamically appear
      expect(screen.getByText(/Quota Reduction Detected/i)).toBeInTheDocument();
      expect(screen.getByText(/review organisation usage before saving/i)).toBeInTheDocument();
    });

    it('creates an engagement type through the API and refreshes the persisted catalog', async () => {
      const createdPlan = {
        id: 'plan-new',
        name: 'New Enterprise Plan',
        code: 'NEW_ENTERPRISE_PLAN',
        description: 'New plan description',
        price: 18000,
        trialLimits: { maxScreens: 15, maxPrograms: 8, maxStorageGb: 5 },
        usageLimits: { maxScreens: 150, maxPrograms: 60, maxStorageGb: 50 },
        features: ['BMS conversion'],
        includesCobolConversion: true,
        supportTier: 'STANDARD',
        slaHours: 12,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      vi.mocked(adminApi.getEngagementTypes).mockResolvedValueOnce([]).mockResolvedValueOnce([createdPlan]);
      vi.mocked(adminApi.createEngagementType).mockResolvedValue({ engagementType: createdPlan, replayed: false });

      renderWithContext(<EngagementTypesPage />);
      fireEvent.click(await screen.findByRole('button', { name: /Create Engagement Type/i }));
      fireEvent.change(screen.getByPlaceholderText('Enterprise Pro Plus'), { target: { value: 'New Enterprise Plan' } });
      fireEvent.change(screen.getByPlaceholderText('Targeted at tier-1 enterprise migrations'), { target: { value: 'New plan description' } });
      const submitButtons = screen.getAllByRole('button', { name: /Create Engagement Type/i });
      fireEvent.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(adminApi.createEngagementType).toHaveBeenCalledWith(expect.objectContaining({
          name: 'New Enterprise Plan',
          code: 'NEW_ENTERPRISE_PLAN',
          requestId: expect.any(String),
        }));
        expect(screen.getByText(/was created and saved to the platform catalog/i)).toBeInTheDocument();
        expect(screen.getByText('New Enterprise Plan')).toBeInTheDocument();
      });
    });

    it('edits an engagement type through the API and shows the persisted response', async () => {
      const existing = {
        id: 'plan-edit',
        name: 'Editable Plan',
        code: 'EDITABLE_PLAN',
        description: 'Original description',
        price: 18000,
        trialLimits: { maxScreens: 15, maxPrograms: 8, maxStorageGb: 5 },
        usageLimits: { maxScreens: 150, maxPrograms: 60, maxStorageGb: 50 },
        features: ['BMS conversion'],
        includesCobolConversion: true,
        supportTier: 'STANDARD',
        slaHours: 12,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const updated = {
        ...existing,
        name: 'Editable Plan Plus',
        code: 'EDITABLE_PLAN_PLUS',
        price: 22000,
        updatedAt: new Date().toISOString(),
      };
      vi.mocked(adminApi.getEngagementTypes).mockResolvedValueOnce([existing]).mockResolvedValueOnce([updated]);
      vi.mocked(adminApi.updateEngagementType).mockResolvedValue(updated);

      renderWithContext(<EngagementTypesPage />);
      await screen.findByText('Editable Plan');
      fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
      fireEvent.change(screen.getByPlaceholderText('Enterprise Pro Plus'), { target: { value: 'Editable Plan Plus' } });
      fireEvent.change(screen.getByPlaceholderText('ENTERPRISE_PRO'), { target: { value: 'EDITABLE_PLAN_PLUS' } });
      fireEvent.change(screen.getByPlaceholderText('Targeted at tier-1 enterprise migrations'), { target: { value: 'Updated plan description' } });
      fireEvent.change(screen.getByLabelText('Annual Price (VND) *'), { target: { value: '22000' } });
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(adminApi.updateEngagementType).toHaveBeenCalledWith('plan-edit', expect.objectContaining({
          name: 'Editable Plan Plus',
          code: 'EDITABLE_PLAN_PLUS',
          price: 22000,
        }));
        expect(screen.getByText(/was updated and saved/i)).toBeInTheDocument();
        expect(screen.getByText('Editable Plan Plus')).toBeInTheDocument();
      });
    });
  });

  describe('Feature G: User Account Locking', () => {
    it('locks user account with reason, duration, and confirmation, and updates local state', async () => {
      vi.mocked(rbacApi.getAllUsers).mockResolvedValue([
        {
          id: 'usr-analyst-1',
          fullName: 'Marcus Brody',
          email: 'm.brody@alsm.io',
          isPlatformAdmin: false,
          isActive: true,
          isLocked: false,
          roles: ['CONVERSION_STAFF'],
        },
      ]);
      vi.mocked(rbacApi.getRoles).mockResolvedValue([
        { id: 'CONVERSION_STAFF', name: 'Conversion Staff', description: 'Worker', isSystem: true },
      ]);
      vi.mocked(usersApi.lockUser).mockResolvedValue({ ok: true, message: 'Locked' });
      vi.mocked(usersApi.unlockUser).mockResolvedValue({ ok: true, message: 'Unlocked' });

      renderWithContext(<UserRolesPage />);

      await waitFor(() => {
        expect(screen.getByText('Marcus Brody')).toBeInTheDocument();
      });

      // Click Lock
      const lockBtn = screen.getByRole('button', { name: /Lock/i });
      fireEvent.click(lockBtn);

      expect(screen.getByText('Lock Staff Account & Invalidate Sessions')).toBeInTheDocument();

      // Check for duration selector
      expect(screen.getByText('Lock Duration *')).toBeInTheDocument();
      const durationSelect = screen.getByDisplayValue(/24 Hours/i);
      fireEvent.change(durationSelect, { target: { value: '7_DAYS' } });

      // Check confirmation checkbox
      const confirmCheckbox = screen.getByRole('checkbox', {
        name: /I confirm that locking this account is authorized/i,
      });
      fireEvent.click(confirmCheckbox);

      // Submit lock
      const confirmLockBtn = screen.getByRole('button', { name: /Confirm Account Lock/i });
      fireEvent.click(confirmLockBtn);

      // Success feedback and account locked badge in table
      await waitFor(() => {
        expect(screen.getByText(/has been locked/i)).toBeInTheDocument();
        expect(screen.getByText('ACCOUNT LOCKED')).toBeInTheDocument();
      });

      // Unlock Account
      const unlockBtn = screen.getByRole('button', { name: /Unlock/i });
      fireEvent.click(unlockBtn);

      await waitFor(() => {
        expect(screen.getByText(/has been unlocked/i)).toBeInTheDocument();
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });
    });
  });

  describe('Feature H: Platform Audit Logs', () => {
    it('renders simulated audit log entries with IP addresses, filters, sorting, and export controls', async () => {
      vi.mocked(adminApi.getAuditLogs).mockResolvedValue([]);

      renderWithContext(<AuditLogsPage />);

      await waitFor(() => {
        expect(screen.getByText(/(Audit Logs|Activity & Security Audit Log)/)).toBeInTheDocument();
      });

      // Simulation banner
      expect(screen.getByText(/Simulated Audit Trail/i)).toBeInTheDocument();
      expect(screen.getByText('Mock Audit Data')).toBeInTheDocument();

      // Verify IP address column
      expect(screen.getByText('IP Address')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.42')).toBeInTheDocument();
      expect(screen.getAllByText('10.0.4.18').length).toBeGreaterThan(0);

      // Verify Actions and Targets
      expect(screen.getAllByText('DISCOUNT_APPROVED').length).toBeGreaterThan(0);
      expect(screen.getAllByText('IMPERSONATE').length).toBeGreaterThan(0);

      // Filter by Action: USER_LOCKED
      const actionSelect = screen.getByDisplayValue('All Actions');
      fireEvent.change(actionSelect, { target: { value: 'USER_LOCKED' } });

      expect(screen.getByText('USER_LOCKED')).toBeInTheDocument();
      expect(document.querySelector('tbody')?.textContent).not.toContain('IMPERSONATE');

      // Verify Export Controls
      expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export PDF/i })).toBeInTheDocument();
    });
  });
});
