// AppRouter.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppealCommandCenter from "./AppealCommandCenter";
import AppealStatusOverview from "./AppealStatusOverview";

function approuter_temp() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppealCommandCenter  />} />
        <Route path="/appeal-status" element={<AppealStatusOverview />} />
      </Routes>
    </Router>
  );
}

export default approuter_temp;