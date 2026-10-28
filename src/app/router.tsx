import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '@/shared/layouts/AppLayout';
import StaffDashboardPage from '@/features/dashboard/pages/StaffDashboardPage';
import { MenuBuilderPage } from '@/features/menus';
import RolesPage from '@/features/rbac/pages/RolesPage';
import UserRolesPage from '@/features/rbac/pages/UserRolesPage';
import { TemporaryRolesPage } from '@/features/rbac';
import { AdminQualityReviewPage } from '@/features/conversions/pages/AdminQualityReviewPage';
import ConversionQueuePage from '@/features/conversions/pages/ConversionQueuePage';
import { PullRequestStatusPage } from '@/features/ci-status/pages/PullRequestStatusPage';
import TeamPerformancePage from '@/features/team-performance/pages/TeamPerformancePage';
import { UsageDashboardPage, AdminQuoteRequestsPage } from '@/features/billing';
import { CreateMeetingRoomPage, MeetingsListPage } from '@/features/meetings';
import { LeadsListPage } from '@/features/leads';
import {
  LeadListPage,
  LeadDetailPage,
  SalesPipelinePage,
  SalesReportsPage,
  DiscountApprovalPage,
} from '@/features/crm';
import {
  OrganizationsPage,
  OrganizationDetailPage,
  AuditLogsPage,
  RevenueDashboardPage,
  AdminProjectsPage,
  EngagementTypesPage,
} from '@/features/admin';
import { TeamLeadProjectsPage } from '@/features/team-lead/pages/TeamLeadProjectsPage';
import { EmployeeWorkQueuePage } from '@/features/employees/pages/EmployeeWorkQueuePage';
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

export const router = createBrowserRouter([
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
      { path: '/', element: <StaffDashboardPage /> },
      { path: '/dashboard', element: <StaffDashboardPage /> },
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
        path: '/admin/users', 
        element: (
          <PermissionGuard permission="users.manage">
            <UserRolesPage />
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
        path: '/rbac/temporary-roles',
        element: (
          <PermissionGuard permission="roles.temporary.view">
            <TemporaryRolesPage />
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
        element: (
          <PermissionGuard permission="conversions.view">
            <EmployeeWorkQueuePage />
          </PermissionGuard>
        ),
      },
      {
        path: '/employee/work-queue',
        element: (
          <PermissionGuard permission="conversions.view">
            <EmployeeWorkQueuePage />
          </PermissionGuard>
        ),
      },
      {
        path: '/team-lead/projects',
        element: (
          <PermissionGuard permission="teams.manage">
            <TeamLeadProjectsPage />
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
            <LeadsListPage />
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
            <TeamPerformancePage />
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
        path: '/admin/audit-logs',
        element: (
          <PermissionGuard permission="audit.view" platformAdminOnly>
            <AuditLogsPage />
          </PermissionGuard>
        ),
      },

      { path: '/team-performance', element: <TeamPerformancePage /> },
      { path: '/team-performance/monitor', element: <TeamPerformancePage /> },
      { path: '/diagnostics', element: <StaffDashboardPage /> },
      { path: '/account/security/password', element: <StaffDashboardPage /> },
      
      // UC-35: Service Usage & Quotas
      {
        path: '/billing/usage',
        element: (
          <PermissionGuard permission="billing.usage.view">
            <UsageDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/billing/usage',
        element: (
          <PermissionGuard permission="billing.usage.view">
            <UsageDashboardPage />
          </PermissionGuard>
        ),
      },
      
      // UC-32: Enterprise Quote Requests Approval & Management
      {
        path: '/billing/quotes',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <AdminQuoteRequestsPage />
          </PermissionGuard>
        ),
      },
      {
        path: '/admin/billing/quotes',
        element: (
          <PermissionGuard permission="billing.quotes.manage">
            <AdminQuoteRequestsPage />
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
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
