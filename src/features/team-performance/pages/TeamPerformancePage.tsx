import { useLocation } from 'react-router-dom';
import SalesTeamPerformancePage from './SalesTeamPerformancePage';
import SalesTeamManagementPage from './SalesTeamManagementPage';
import TeamWorkloadPage from './TeamWorkloadPage';
import { SalesTeamPerformanceView } from '@/features/crm/components/SalesTeamPerformanceView';

export default function TeamPerformancePage() {
  const { pathname } = useLocation();
  if (pathname.endsWith('/manage')) return <SalesTeamManagementPage />;
  if (pathname.endsWith('/monitor')) return <TeamWorkloadPage />;
  if (pathname.includes('/reports/team-performance')) return <SalesTeamPerformanceView />;
  return <SalesTeamPerformancePage />;
}
