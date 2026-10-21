import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { crmStore } from '../services/crm-store';
import { SalesReportsPage } from '../pages/SalesReportsPage';
import { DiscountApprovalPage } from '../pages/DiscountApprovalPage';
import { SalesTeamPerformanceView } from '../components/SalesTeamPerformanceView';

// Mock auth hook
let mockUserPermissions: string[] = [
  'sales.reports.view',
  'sales.team-performance.view',
  'sales.discounts.view',
  'sales.discounts.approve',
  'sales.discounts.reject',
];

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'usr-mgr-1', name: 'Alex Mercer', email: 'alex.mercer@alsm.io', role: 'SALES_MANAGER', isPlatformAdmin: false },
    hasPermission: (perm: string) => mockUserPermissions.includes(perm),
    isLoading: false,
  }),
}));

describe('Section 3.12: Sales Reporting and Discount Approval Workflows', () => {
  beforeEach(() => {
    localStorage.clear();
    crmStore.resetToDefaults();
    mockUserPermissions = [
      'sales.reports.view',
      'sales.team-performance.view',
      'sales.discounts.view',
      'sales.discounts.approve',
      'sales.discounts.reject',
    ];
  });

  describe('1. Sales & Revenue Reports Accounting', () => {
    it('strictly counts only WON deals with confirmed contracts towards realised revenue', () => {
      const reports = crmStore.getReports();
      // Realised revenue must strictly come from WON deals with signed contracts (Global Transit $150,000)
      // Pending proposals/quotes (e.g. Apex $80k, FNX $85k, Titan $95k) must NEVER count as realised revenue
      expect(reports.monthlyRevenue).toBe(150000);
      expect(reports.wonLeads).toBe(1);
      expect(reports.averageDealSize).toBe(150000);
      expect(reports.totalLeads).toBe(8);
      expect(reports.conversionRate).toBe(13); // 1 / 8 = 12.5% -> 13%
    });

    it('correctly filters reports by representative, region, and date range', () => {
      // Filter by Sarah Jenkins
      const sarahReports = crmStore.getReports({ teamMember: 'Sarah Jenkins' });
      expect(sarahReports.wonLeads).toBe(1);
      expect(sarahReports.monthlyRevenue).toBe(150000);
      expect(sarahReports.totalLeads).toBe(3);

      // Filter by David Nguyen
      const davidReports = crmStore.getReports({ teamMember: 'David Nguyen' });
      expect(davidReports.wonLeads).toBe(0);
      expect(davidReports.monthlyRevenue).toBe(0);
      expect(davidReports.totalLeads).toBe(2);

      // Filter by North America region
      const naReports = crmStore.getReports({ region: 'North America' });
      expect(naReports.totalLeads).toBe(4);
      expect(naReports.wonLeads).toBe(1);
      expect(naReports.monthlyRevenue).toBe(150000);
    });

    it('renders the SalesReportsPage with KPI cards and monthly revenue cadence', async () => {
      render(
        <MemoryRouter>
          <SalesReportsPage />
        </MemoryRouter>
      );

      // Verify page titles and tab buttons
      expect(screen.getByText('Commercial Sales & Performance')).toBeInTheDocument();
      expect(screen.getByText('Sales & Revenue Overview')).toBeInTheDocument();
      expect(screen.getByText('Team Representative Performance')).toBeInTheDocument();

      // Wait for data load
      await waitFor(() => {
        expect(screen.getAllByText('$150,000').length).toBeGreaterThan(0);
      });

      // Verify KPI titles
      expect(screen.getAllByText('Realised Revenue').length).toBeGreaterThan(0);
      expect(screen.getByText('Average Deal Size')).toBeInTheDocument();
      expect(screen.getByText('Total Leads in Scope')).toBeInTheDocument();

      // Verify Revenue Over Time section
      expect(screen.getByText('Revenue Over Time & Booking Cadence')).toBeInTheDocument();
      expect(screen.getByText('Recent Closed Won Deals (Audited Revenue)')).toBeInTheDocument();
    });

    it('generates a CSV export containing filtered metadata and lead dossiers', () => {
      const csv = crmStore.exportReportsCsv({
        dateRange: 'ALL',
        teamMember: 'Sarah Jenkins',
        region: 'North America',
      });

      expect(csv).toContain('ALSM ENTERPRISE SALES & REVENUE REPORT');
      expect(csv).toContain('Filtered By Representative,Sarah Jenkins');
      expect(csv).toContain('Filtered By Region,North America');
      expect(csv).toContain('Monthly Realised Revenue ($ USD),150000');
      expect(csv).toContain('"Global Transit Logistics"');
    });
  });

  describe('2. Sales Team Performance Tracking', () => {
    it('computes individual metrics and variance from team benchmark average', () => {
      const perf = crmStore.getTeamPerformance();
      expect(perf.members.length).toBe(3);

      // Team Benchmark
      expect(perf.teamTotalRevenue).toBe(150000);
      expect(perf.teamWonDeals).toBe(1);

      const sarah = perf.members.find((m: any) => m.repName === 'Sarah Jenkins')!;
      expect(sarah).toBeDefined();
      expect(sarah.revenueGenerated).toBe(150000);
      expect(sarah.wonDeals).toBe(1);
      expect(sarah.diffFromTeamAvgPercent).toBeDefined();

      const elena = perf.members.find((m: any) => m.repName === 'Elena Rostova')!;
      expect(elena).toBeDefined();
      expect(elena.wonDeals).toBe(0);
      expect(elena.revenueGenerated).toBe(0);
    });

    it('renders the SalesTeamPerformanceView with representative scorecards and sortable columns', async () => {
      render(
        <MemoryRouter>
          <SalesTeamPerformanceView />
        </MemoryRouter>
      );

      // Wait for member scorecard
      await waitFor(() => {
        expect(screen.getByText('Representative Scorecard & Output')).toBeInTheDocument();
      });

      // Check manager scope banner
      expect(screen.getByText(/Alex Mercer \(Sales Manager\)/)).toBeInTheDocument();

      // Verify representative rows (use getAllByText as they also appear in options/chart)
      expect(screen.getAllByText('Sarah Jenkins').length).toBeGreaterThan(0);
      expect(screen.getAllByText('David Nguyen').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Elena Rostova').length).toBeGreaterThan(0);

      // Verify Comparison Chart exists
      expect(screen.getByText('Representative Comparison Chart')).toBeInTheDocument();
    });
  });

  describe('3. Discount Approval Queue and Manager Authority Limit (20%)', () => {
    it('identifies discount requests and enforces the 20% manager authority threshold', () => {
      const pending = crmStore.getPendingDiscounts();
      expect(pending.length).toBeGreaterThan(0);

      // Find quote with <= 20% discount (Fintech Nexus has 20%)
      const standardReq = pending.find((p) => p.quoteNumber === 'Q-2026-FNX-01')!;
      expect(standardReq).toBeDefined();
      expect(standardReq.discountPercent).toBe(20);
      expect(standardReq.requiresHigherApproval).toBe(false);

      // Find quote with > 20% discount (Titan Cloud has 25%)
      const overLimitReq = pending.find((p) => p.quoteNumber === 'Q-2026-TITAN-001')!;
      expect(overLimitReq).toBeDefined();
      expect(overLimitReq.discountPercent).toBe(25);
      expect(overLimitReq.requiresHigherApproval).toBe(true);
    });

    it('allows manager to directly approve discounts <= 20%', () => {
      const req = crmStore.getPendingDiscounts().find((p) => p.quoteNumber === 'Q-2026-FNX-01')!;
      const result = crmStore.reviewDiscount({
        leadId: req.leadId,
        quoteId: req.quoteId!,
        approved: true,
        reviewer: 'Alex Mercer',
      });

      expect(result.status).toBe('APPROVED');
      expect(result.quote.discountApproved).toBe(true);

      // Lead stage audit should register the approval
      const lead = crmStore.getLead(req.leadId)!;
      const latestAudit = lead.stageAudit![lead.stageAudit!.length - 1];
      expect(latestAudit.notes).toContain('Commercial discount of 20% approved');
    });

    it('prevents direct approval of discounts > 20% and requires escalation to VP', () => {
      const req = crmStore.getPendingDiscounts().find((p) => p.quoteNumber === 'Q-2026-TITAN-001')!;
      
      // Attempting standard approval should throw authority violation
      expect(() => {
        crmStore.reviewDiscount({
          leadId: req.leadId,
          quoteId: req.quoteId!,
          approved: true,
          reviewer: 'Alex Mercer',
        });
      }).toThrow(/Discount of 25% exceeds Manager approval authority limit/);

      // Escalating to VP succeeds
      const result = crmStore.reviewDiscount({
        leadId: req.leadId,
        quoteId: req.quoteId!,
        approved: false,
        escalateToVP: true,
        reviewer: 'Alex Mercer',
      });

      expect(result.status).toBe('ESCALATED');
      const lead = crmStore.getLead(req.leadId)!;
      const latestAudit = lead.stageAudit![lead.stageAudit!.length - 1];
      expect(latestAudit.notes).toMatch(/escalated to VP of Commercial Sales/i);
    });

    it('requires a mandatory reason when rejecting a discount request', () => {
      const req = crmStore.getPendingDiscounts().find((p) => p.quoteNumber === 'Q-2026-FNX-01')!;

      // Empty rejection reason throws
      expect(() => {
        crmStore.reviewDiscount({
          leadId: req.leadId,
          quoteId: req.quoteId!,
          approved: false,
          rejectionReason: '',
          reviewer: 'Alex Mercer',
        });
      }).toThrow(/Rejection reason is required/);

      // Rejection with valid justification succeeds
      const result = crmStore.reviewDiscount({
        leadId: req.leadId,
        quoteId: req.quoteId!,
        approved: false,
        rejectionReason: 'Standard volume margins do not permit 20% discount on 1-year commitments.',
        reviewer: 'Alex Mercer',
      });

      expect(result.status).toBe('REJECTED');
      expect(result.quote.status).toBe('REJECTED');
    });

    it('renders the DiscountApprovalPage and displays authority limits on high discount quotes', async () => {
      render(
        <MemoryRouter>
          <DiscountApprovalPage />
        </MemoryRouter>
      );

      // Wait for table to load
      await waitFor(() => {
        expect(screen.getByText('Discount Approval Requests')).toBeInTheDocument();
      });

      // Wait for list items to render after async fetch
      await waitFor(() => {
        expect(screen.getByText('Fintech Nexus International')).toBeInTheDocument();
      });

      // Titan Cloud 25% should have 'Requires VP Approval'
      expect(screen.getByText('Titan Cloud Infrastructures')).toBeInTheDocument();
      expect(screen.getAllByText('Requires VP Approval').length).toBeGreaterThan(0);
    });

    it('enforces granular action-level permissions: hides action buttons and displays View Only when lacking approve/reject rights', async () => {
      // Set permissions to ONLY view queue (no approve, no reject)
      mockUserPermissions = ['sales.discounts.view'];

      render(
        <MemoryRouter>
          <DiscountApprovalPage />
        </MemoryRouter>
      );

      // Wait for table to load
      await waitFor(() => {
        expect(screen.getByText('Discount Approval Requests')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Fintech Nexus International')).toBeInTheDocument();
      });

      // Approve and Reject buttons should NOT be rendered in table
      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /escalate to vp/i })).not.toBeInTheDocument();

      // View Only indicators should be displayed
      expect(screen.getAllByText('View Only').length).toBeGreaterThan(0);
    });

    it('displays Approve button when user has sales.discounts.approve, but hides Reject if sales.discounts.reject is missing', async () => {
      mockUserPermissions = ['sales.discounts.view', 'sales.discounts.approve'];

      render(
        <MemoryRouter>
          <DiscountApprovalPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Discount Approval Requests')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Fintech Nexus International')).toBeInTheDocument();
      });

      // Approve button should be visible
      expect(screen.getAllByRole('button', { name: /approve/i }).length).toBeGreaterThan(0);

      // Reject button should NOT be visible
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    it('displays Reject button when user has sales.discounts.reject, but hides Approve if sales.discounts.approve is missing', async () => {
      mockUserPermissions = ['sales.discounts.view', 'sales.discounts.reject'];

      render(
        <MemoryRouter>
          <DiscountApprovalPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Discount Approval Requests')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Fintech Nexus International')).toBeInTheDocument();
      });

      // Reject button should be visible
      expect(screen.getAllByRole('button', { name: /reject/i }).length).toBeGreaterThan(0);

      // Approve and Escalate buttons should NOT be visible
      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /escalate to vp/i })).not.toBeInTheDocument();
    });
  });
});
