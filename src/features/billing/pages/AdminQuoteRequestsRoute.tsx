import { PermissionGuard } from '@/app/guards';
import { AdminQuoteRequestsPage } from './AdminQuoteRequestsPage';

export const AdminQuoteRequestsRoute = () => (
  <PermissionGuard permission="billing.quotes.manage">
    <AdminQuoteRequestsPage />
  </PermissionGuard>
);
