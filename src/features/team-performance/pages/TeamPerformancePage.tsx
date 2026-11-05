import { useLocation } from 'react-router-dom';
import SalesTeamPerformancePage from './SalesTeamPerformancePage';
import SalesTeamManagementPage from './SalesTeamManagementPage';
import TeamWorkloadPage from './TeamWorkloadPage';

export default function TeamPerformancePage() {
  const { pathname } = useLocation();
  if (pathname.endsWith('/manage')) return <SalesTeamManagementPage />;
  if (pathname.endsWith('/monitor')) return <TeamWorkloadPage />;
  return <SalesTeamPerformancePage />;
}
