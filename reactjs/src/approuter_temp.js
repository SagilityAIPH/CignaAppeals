// AppRouter.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./HomePage";
import AppealCommandCenter from "./AppealCommandCenter";
import AppealStatusOverview from "./AppealStatusOverview";

function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* Redirect base path to /appeal-command-center */}
        <Route path="/" element={<Navigate to="/appeal-command-center" replace />} />

        {/* Routes wrapped with HomePage layout */}
        <Route
          path="/appeal-command-center"
          element={
            <HomePage>
              <AppealCommandCenter />
            </HomePage>
          }
        />
        <Route
          path="/appeal-status-overview"
          element={
            <HomePage>
              <AppealStatusOverview />
            </HomePage>
          }
        />
      </Routes>
    </Router>
  );
}

export default AppRouter;
