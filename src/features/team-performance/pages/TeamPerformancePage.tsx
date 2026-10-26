import { useLocation } from 'react-router-dom';
import SalesTeamPerformancePage from './SalesTeamPerformancePage';
import TeamWorkloadPage from './TeamWorkloadPage';
import { SalesTeamPerformanceView } from '@/features/crm/components/SalesTeamPerformanceView';

export default function TeamPerformancePage() {
  const { pathname } = useLocation();
  if (pathname.endsWith('/monitor')) return <TeamWorkloadPage />;
  if (pathname.includes('/reports/team-performance')) return <SalesTeamPerformanceView />;
  return <SalesTeamPerformancePage />;
}
