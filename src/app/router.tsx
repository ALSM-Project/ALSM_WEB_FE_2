import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '@/shared/layouts/AppLayout';
import StaffDashboardPage from '@/features/dashboard/pages/StaffDashboardPage';
import { MenuBuilderPage } from '@/features/menus';
import RolesPage from '@/features/rbac/pages/RolesPage';
import UserRolesPage from '@/features/rbac/pages/UserRolesPage';
import UserDetailPage from '@/features/users/pages/UserDetailPage';
import { TemporaryRolesPage } from '@/features/rbac';
import { AdminQualityReviewPage } from '@/features/conversions/pages/AdminQualityReviewPage';
import ConversionQueuePage from '@/features/conversions/pages/ConversionQueuePage';
import { PullRequestStatusPage } from '@/features/ci-status/pages/PullRequestStatusPage';
import TeamPerformancePage from '@/features/team-performance/pages/TeamPerformancePage';
import { InvoicesPage, OrganizationUsagePage, OrganizationUsageDetailPage, AmendQuotaPage } from '@/features/billing';
import { Web3AdminPage } from '@/features/web3';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { NotFoundPage } from '@/shared/pages/NotFoundPage';
import { ForbiddenPage } from '@/shared/pages/ForbiddenPage';
import { CreateMeetingRoomPage, CreateMeetingRequestPage, MeetingsListPage, MeetingRequestsPage } from '@/features/meetings';
import { LeadsListPage } from '@/features/leads';
import {
  LeadListPage,
  LeadDetailPage,
  SalesPipelinePage,
  SalesReportsPage,
  DiscountApprovalPage,
  ConversationsPage,
  EnterpriseQuotesPage,
  ServiceUsagePage,
} from '@/features/crm';
import { CreateContractWizardPage, ContractDetailPage } from '@/features/contracts';
import { ContractTemplateAdminPage } from '@/features/crm/pages/ContractTemplateAdminPage';
import { ContractLaunchPage } from '@/features/crm/pages/ContractLaunchPage';
import {
  OrganizationsPage,
  OrganizationDetailPage,
  AuditLogsPage,
  RevenueDashboardPage,
  AdminProjectsPage,
  AdminProjectAssignLeadPage,
  EngagementTypesPage,
} from '@/features/admin';
import { TeamLeadProjectsPage } from '@/features/team-lead/pages/TeamLeadProjectsPage';
import { ProjectStaffAllocationPage } from '@/features/team-lead/pages/ProjectStaffAllocationPage';
import { TransferProjectOwnershipPage } from '@/features/team-lead/pages/TransferProjectOwnershipPage';
import { ResourceTransferApprovalPage } from '@/features/team-lead/pages/ResourceTransferApprovalPage';
import { ResourceTransferDetailPage } from '@/features/team-lead/pages/ResourceTransferDetailPage';
import { CreateResourceTransferPage } from '@/features/team-lead/pages/CreateResourceTransferPage';
import { UserOffboardingApprovalPage } from '@/features/team-lead/pages/UserOffboardingApprovalPage';
import { CreateOffboardingRequestPage } from '@/features/team-lead/pages/CreateOffboardingRequestPage';
import { OffboardingRequestDetailPage } from '@/features/team-lead/pages/OffboardingRequestDetailPage';
import {
  PartnerListPage,
  PartnerDetailsPage,
  PartnerProjectsPage,
  CreatePartnerProjectPage,
  PartnerProjectOverviewPage,
  UploadSourceFilesPage,
  PartnerProjectWorkspacePage,
  ConversionItemReviewPage,
} from '@/features/partners';
import { AuthCallbackPage, ProtectedRoute, PermissionGuard } from './guards';
import { SupportPortalPage } from '@/features/support/pages/SupportPortalPage';
import { BankAccountsPage } from '@/features/bank-accounts';


export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/ci-status',
    element: <PullRequestStatusPage />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <StaffDashboardPage /> },
      // UC66-04: own staff identity and isolated typed Support adapter, never customer APIs.
      { path: '/support', element: <SupportPortalPage /> },
      // UC-31: Admin Quality Review Oversight — restricted to admins with quality-review.manage
      {
        path: '/admin/projects/:projectId/conversions/:conversionJobId/quality-review',
        element: (
          <PermissionGuard permission="quality-review.manage">
            <AdminQualityReviewPage />
          </PermissionGuard>
        ),
      },
      { 
        path: '/admin/menu-builder', 
        element: (
          <PermissionGuard permission="menu.manage">
            <MenuBuilderPage />
          </PermissionGuard>
        ) 
      },
      { 
        path: '/admin/roles', 
        element: (
          <PermissionGuard permission="roles.manage">
            <RolesPage />
          </PermissionGuard>
        ) 
      },
      {
        path: '/admin/contract-templates',
        element: (
          <PermissionGuard permission="sales.contract-templates.manage">
            <ContractTemplateAdminPage />
          </PermissionGuard>
        ),
      },
      { 
        path: '/admin/users', 
        element: (
          <PermissionGuard permission="users.manage">
            <UserRolesPage />
          </PermissionGuard>
        ) 
      },
      { 
        path: '/admin/users/:id', 
        element: (
          <PermissionGuard permission="users.manage">
            <UserDetailPage />
          </PermissionGuard>
        ) 
      },
      {
        path: '/admin/temporary-roles',
        element: (
          <PermissionGuard permission="roles.temporary.view">
            <TemporaryRolesPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/temporary-roles/grant',
        element: (
          <PermissionGuard permission="roles.temporary.grant">
            <TemporaryRolesPage initialView="grant" />
          </PermissionGuard>
        ),
      },
      {
        path: '/rbac/temporary-roles',
        element: (
          <PermissionGuard permission="roles.temporary.view">
            <TemporaryRolesPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/rbac/temporary-roles/grant',
        element: (
          <PermissionGuard permission="roles.temporary.grant">
            <TemporaryRolesPage initialView="grant" />
          </PermissionGuard>
        ),
      },
      // Section 3.10: Technical & Support & Employee Work Queue
      {
        path: '/queue',
        element: (
          <PermissionGuard permission="conversions.queue.view">
            <ConversionQueuePage />
          </PermissionGuard>
        ),
      },
      {
        path: '/system/queue',
        element: (
          <PermissionGuard permission="conversions.queue.view">
            <ConversionQueuePage />
          </PermissionGuard>
        ),
      },
      {
        path: '/my-work',
        element: <Navigate to="/partners/projects" replace />,
      },
      {
        path: '/employee/work-queue',
        element: <Navigate to="/partners/projects" replace />,
      },
      {
        path: '/team-lead/projects',
        element: (
          <PermissionGuard permission="teams.manage">
            <TeamLeadProjectsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/team-lead/projects/:projectId/allocate',
        element: (
          <PermissionGuard permission="teams.manage">
            <ProjectStaffAllocationPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/team-lead/projects/:projectId/transfer',
        element: (
          <PermissionGuard permission="teams.manage">
            <TransferProjectOwnershipPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/team-lead/allocation/:projectId',
        element: (
          <PermissionGuard permission="teams.manage">
            <ProjectStaffAllocationPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/team-lead/resource-transfers',
        element: (
          <PermissionGuard permission="teams.manage">
            <ResourceTransferApprovalPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/team-lead/resource-transfers/new',
        element: (
          <PermissionGuard permission="teams.manage">
            <CreateResourceTransferPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/team-lead/resource-transfers/:transferId',
        element: (
          <PermissionGuard permission="teams.manage">
            <ResourceTransferDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/offboarding-approvals',
        element: (
          <PermissionGuard permission="users.offboard">
            <UserOffboardingApprovalPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/offboarding-approvals/create',
        element: (
          <PermissionGuard permission="users.offboard">
            <CreateOffboardingRequestPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/offboarding-approvals/:requestId',
        element: (
          <PermissionGuard permission="users.offboard">
            <OffboardingRequestDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/team-lead/offboarding-approvals',
        element: (
          <PermissionGuard permission="users.offboard">
            <UserOffboardingApprovalPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/team-lead/offboarding-approvals/create',
        element: (
          <PermissionGuard permission="users.offboard">
            <CreateOffboardingRequestPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/team-lead/offboarding-approvals/:requestId',
        element: (
          <PermissionGuard permission="users.offboard">
            <OffboardingRequestDetailPage />
          </PermissionGuard>
        ),
      },
      { path: '/validation', element: <StaffDashboardPage /> },
      { path: '/review', element: <PermissionGuard permission="quality-review.manage"><ConversionQueuePage reviewOnly /></PermissionGuard> },
      
      // UC-58 & UC-66: CRM & Sales - Leads Management
      {
        path: '/sales/leads',
        element: (
          <PermissionGuard permission="sales.leads.view">
            <LeadListPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/contracts',
        element: (
          <PermissionGuard permission="sales.leads.view">
            <ContractLaunchPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/crm/leads',
        element: (
          <PermissionGuard permission="sales.leads.view">
            <LeadListPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/leads/:leadId',
        element: (
          <PermissionGuard permission="sales.leads.view">
            <LeadDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/crm/leads/:leadId',
        element: (
          <PermissionGuard permission="sales.leads.view">
            <LeadDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/crm/conversations',
        element: (
          <PermissionGuard permission="sales.leads.view">
            <ConversationsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/conversations',
        element: (
          <PermissionGuard permission="sales.leads.view">
            <ConversationsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/pipeline',
        element: (
          <PermissionGuard permission="sales.leads.view">
            <SalesPipelinePage />
          </PermissionGuard>
        ),
      },
      {
        path: '/crm/pipeline',
        element: (
          <PermissionGuard permission="sales.leads.view">
            <SalesPipelinePage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/reports',
        element: (
          <PermissionGuard permission="sales.reports.view">
            <SalesReportsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/reports/sales',
        element: (
          <PermissionGuard permission="sales.reports.view">
            <SalesReportsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/reports/team-performance',
        element: (
          <PermissionGuard permission="sales.team-performance.view">
            <SalesReportsPage initialTab="team" />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/team-performance',
        element: (
          <PermissionGuard permission="sales.team-performance.view">
            <SalesReportsPage initialTab="team" />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/discounts',
        element: (
          <PermissionGuard permission="sales.discounts.view">
            <DiscountApprovalPage />
          </PermissionGuard>
        ),
      },

      // Section 3.13: Platform Administration
      {
        path: '/admin/projects',
        element: (
          <PermissionGuard permission="organizations.manage" platformAdminOnly>
            <AdminProjectsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/projects/:projectId/assign-lead',
        element: (
          <PermissionGuard permission="organizations.manage" platformAdminOnly>
            <AdminProjectAssignLeadPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/engagement-types',
        element: (
          <PermissionGuard permission="engagement-types.manage" platformAdminOnly>
            <EngagementTypesPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/organizations',
        element: (
          <PermissionGuard permission="organizations.view" platformAdminOnly>
            <OrganizationsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/organizations/:orgId',
        element: (
          <PermissionGuard permission="organizations.view" platformAdminOnly>
            <OrganizationDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/organisations',
        element: (
          <PermissionGuard permission="organizations.view" platformAdminOnly>
            <OrganizationsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/organisations/partners',
        element: (
          <PermissionGuard permission="organizations.view" platformAdminOnly>
            <OrganizationsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/organisations/departments',
        element: (
          <PermissionGuard permission="organizations.view" platformAdminOnly>
            <OrganizationsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/organisations/teams/manage',
        element: (
          <PermissionGuard permission="sales.leads.view">
            <TeamPerformancePage />
          </PermissionGuard>
        ),
      },
      {
        path: '/organisations/teams',
        element: (
          <PermissionGuard permission="teams.manage">
            <TeamPerformancePage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/revenue',
        element: (
          <PermissionGuard permission="revenue.view" platformAdminOnly>
            <RevenueDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/finance/revenue',
        element: (
          <PermissionGuard permission="revenue.view" platformAdminOnly>
            <RevenueDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/bank-accounts',
        element: (
          <PermissionGuard permission="bank_accounts.view">
            <BankAccountsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/administration/finance/bank-accounts',
        element: (
          <PermissionGuard permission="bank_accounts.view">
            <BankAccountsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/finance/bank-accounts',
        element: (
          <PermissionGuard permission="bank_accounts.view">
            <BankAccountsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/audit-logs',
        element: (
          <PermissionGuard permission="audit.view" platformAdminOnly>
            <AuditLogsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/web3',
        element: (
          <PermissionGuard permission="organizations.view">
            <Web3AdminPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/settings',
        element: (
          <PermissionGuard permission="organizations.manage">
            <SettingsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/company-profile',
        element: (
          <PermissionGuard permission="organizations.manage">
            <SettingsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/billing/invoices',
        element: (
          <PermissionGuard permission="billing.invoices.view">
            <InvoicesPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/billing/invoices',
        element: (
          <PermissionGuard permission="billing.invoices.view">
            <InvoicesPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/forbidden',
        element: <ForbiddenPage />,
      },

      { path: '/team-performance', element: <TeamPerformancePage /> },
      { path: '/team-performance/monitor', element: <TeamPerformancePage /> },
      { path: '/diagnostics', element: <StaffDashboardPage /> },
      { path: '/account/security/password', element: <StaffDashboardPage /> },
      
      // UC-35: Organization Usage & Quotas (Cross-Organization Capacity & Quotas Monitoring)
      {
        path: '/billing/usage',
        element: (
          <PermissionGuard permission="billing.usage.view">
            <OrganizationUsagePage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/billing/usage/:orgId/amend-quota',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <AmendQuotaPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/billing/usage/:orgId',
        element: (
          <PermissionGuard permission="billing.usage.view">
            <OrganizationUsageDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/organizations/:orgId/amend-quota',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <AmendQuotaPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/organizations/:orgId/usage',
        element: (
          <PermissionGuard permission="billing.usage.view">
            <OrganizationUsageDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/billing/usage',
        element: (
          <PermissionGuard permission="billing.usage.view">
            <OrganizationUsagePage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/billing/service-usage',
        element: (
          <PermissionGuard permission="billing.usage.view">
            <OrganizationUsagePage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/organization-usage',
        element: (
          <PermissionGuard permission="billing.usage.view">
            <OrganizationUsagePage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/service-usage',
        element: (
          <PermissionGuard permission="billing.usage.view">
            <ServiceUsagePage />
          </PermissionGuard>
        ),
      },
      
      // UC-32: Meeting & Consultation Management (Customer Meetings)
      {
        path: '/sales/meeting-requests/new',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <CreateMeetingRequestPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/meeting-requests/create',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <CreateMeetingRequestPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/meeting-requests',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <MeetingRequestsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/consultations',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <MeetingRequestsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/billing/quotes',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <MeetingRequestsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/billing/quotes',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <MeetingRequestsPage />
          </PermissionGuard>
        ),
      },
      // Commercial Quotes & Legal Contracts
      {
        path: '/sales/enterprise-quotes',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <EnterpriseQuotesPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/quotes-contracts',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <EnterpriseQuotesPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/quotes-contracts',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <EnterpriseQuotesPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/quotes',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <EnterpriseQuotesPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/contracts',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <EnterpriseQuotesPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/contracts/new',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <CreateContractWizardPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/contracts/:id',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <ContractDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/enterprise-quotes/new-contract',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <CreateContractWizardPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/enterprise-contracts/:id',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <ContractDetailPage />
          </PermissionGuard>
        ),
      },
      // UC-43: Create Online Meeting Room
      {
        path: '/enterprise/meetings/create',
        element: (
          <PermissionGuard permission="meetings.create">
            <CreateMeetingRoomPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/enterprise/meetings',
        element: (
          <PermissionGuard permission="meetings.create">
            <MeetingsListPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/meetings',
        element: (
          <PermissionGuard permission="meetings.create">
            <MeetingsListPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/meetings/create',
        element: (
          <PermissionGuard permission="meetings.create">
            <CreateMeetingRoomPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/meetings/create',
        element: (
          <PermissionGuard permission="meetings.create">
            <CreateMeetingRoomPage />
          </PermissionGuard>
        ),
      },
      // UC-58 & UC-66: View Lead List (CRM & Sales) alias
      {
        path: '/leads',
        element: (
          <PermissionGuard permission="sales.leads.view">
            <LeadsListPage />
          </PermissionGuard>
        ),
      },

      // Section A: Partner-Assisted Conversion (Internal Staff / Conversion Staff - Web 2)
      {
        path: '/partners',
        element: (
          <PermissionGuard permission="partner.view">
            <PartnerListPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/partners/new',
        element: (
          <PermissionGuard permission="partner.create">
            <PartnerListPage openCreateModalOnInit={true} />
          </PermissionGuard>
        ),
      },
      {
        path: '/partners/:partnerId',
        element: (
          <PermissionGuard permission="partner.view">
            <PartnerDetailsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/partners/:partnerId/projects/new',
        element: (
          <PermissionGuard permission="partner_project.create">
            <CreatePartnerProjectPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/partners/projects',
        element: (
          <PermissionGuard permission="partner.view">
            <PartnerProjectsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/partners/projects/new',
        element: (
          <PermissionGuard permission="partner_project.create">
            <CreatePartnerProjectPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/partners/projects/:projectId',
        element: (
          <PermissionGuard permission="partner_project.view">
            <PartnerProjectOverviewPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/partners/projects/:projectId/upload',
        element: (
          <PermissionGuard permission="partner_project.manage_files">
            <UploadSourceFilesPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/partners/projects/:projectId/workspace',
        element: (
          <PermissionGuard permission="partner_project.view">
            <PartnerProjectWorkspacePage />
          </PermissionGuard>
        ),
      },
      {
        path: '/partners/projects/:projectId/items/:itemId/review',
        element: (
          <PermissionGuard permission="conversion_result.review">
            <ConversionItemReviewPage />
          </PermissionGuard>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
