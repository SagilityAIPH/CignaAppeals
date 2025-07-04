// App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import ClientPage from './ClientPage';
import ExecutiveSummary from './ClientExecutiveSummary';
import FacetsPage from './ClientFacetsPage';
import ProclaimPage from './ClientProclaimPage';
import TeamLeadPage from './TeamLeadPage';
import TeamLeadCasesPage from './TeamLeadCasesPage';
import AgentPage from './AgentPage';
import AgentCasesPage from './AgentCasesPage';
import POCPage from './POCPage';


// Future: import ManagerPage, AdminPage, etc.

function AppRouter() {
  return (
    <Router basename='/CignaAppeals'>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        {/* Client routes wrapped with shared layout */}
        <Route path="/client" element={<ClientPage />}>
          <Route path="executive-summary" element={<ExecutiveSummary />} />
          <Route path="facets" element={<FacetsPage />} />
          <Route path="proclaim" element={<ProclaimPage />} />
        </Route>
        <Route path="/teamlead" element={<TeamLeadPage />}>
           <Route path="teamlead-cases" element={<TeamLeadCasesPage />} />
        </Route>
        <Route path="/agent" element={<AgentPage />}>
           <Route path="agent-cases" element={<AgentCasesPage />} />
        </Route>
        <Route path="/poc" element={<POCPage />}>
           
        </Route>
      </Routes>
    </Router>
  );
}

export default AppRouter;
