// App.js
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import AuthRedirect from "./AuthRedirect";   // 👈 add this
import { UserProvider } from "./UserContext";
import Header from "./Header";
import ProtectedRoute from "./ProtectedRoute";

// Client routes
import ClientPage from "./ClientPage";
import ExecutiveSummary from "./ClientExecutiveSummary";
import FacetsPage from "./ClientFacetsPage";
import ProclaimPage from "./ClientProclaimPage";
import ImpactPage from "./ClientImpactPage";

// Team Lead routes
import TeamLeadPage from "./TeamLeadPage";
import TeamLeadCasesPage2 from "./TeamLeadCasesPage2";

// Agent routes
import AgentPage from "./AgentPage";
import AgentCasesPage from "./AgentCasesPage";

// POC routes
import POCPage2 from "./POCPage2";

// Future: ManagerPage, AdminPage, etc.

function App() {
  return (
    <UserProvider>
      <Router basename="/pages/cigna_appeals">
        <Header />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/auth-redirect" element={<AuthRedirect />} />  {/* 👈 SSO landing route */}

          {/* Protected Client routes */}
          <Route path="/client" element={<ProtectedRoute><ClientPage /></ProtectedRoute>}>
            <Route path="executive-summary" element={<ExecutiveSummary />} />
            <Route path="facets" element={<FacetsPage />} />
            <Route path="proclaim" element={<ProclaimPage />} />
            <Route path="impact" element={<ImpactPage />} />
          </Route>

          {/* Protected Team Lead routes */}
          <Route path="/teamlead" element={<ProtectedRoute><TeamLeadPage /></ProtectedRoute>}>
            <Route path="teamlead-cases" element={<TeamLeadCasesPage2 />} />
          </Route>

          {/* Protected Agent routes */}
          <Route path="/agent" element={<ProtectedRoute><AgentPage /></ProtectedRoute>}>
            <Route path="agent-cases" element={<AgentCasesPage />} />
          </Route>

          {/* Protected POC routes */}
          <Route path="/poc" element={<ProtectedRoute><POCPage2 /></ProtectedRoute>} />
       
          {/* Catch-all for 404 */}
          <Route path="*" element={<div>Page not found</div>} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
