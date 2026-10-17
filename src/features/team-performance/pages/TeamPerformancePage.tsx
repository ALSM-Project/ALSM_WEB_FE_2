import { useLocation } from 'react-router-dom';
import SalesTeamPerformancePage from './SalesTeamPerformancePage';
import TeamWorkloadPage from './TeamWorkloadPage';

export default function TeamPerformancePage() {
  return useLocation().pathname.endsWith('/monitor') ? <TeamWorkloadPage /> : <SalesTeamPerformancePage />;
}
