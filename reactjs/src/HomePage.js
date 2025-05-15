// Layout.js
import React from "react";
import { MdDashboard } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";

function HomePage({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Header */}
      <header
        className="navbar navbar-expand-lg"
        style={{
          height: "60px",
          background: "linear-gradient(to right, #003b70, #0071ce)",
          color: "white",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 1100,
        }}
      >
        <div className="container-fluid">
          <img
            src={`${process.env.PUBLIC_URL}/Cigna logo.png`}
            alt="Cigna Logo"
            style={{ height: "50px", marginLeft: "-10px" }}
          />
          <div className="d-flex ms-auto align-items-center gap-3">
            <span
              className="nav-link text-white"
              style={{ cursor: "pointer", fontWeight: 500 }}
            >
              Logout
            </span>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className="sidebar">
        <ul className="nav flex-column mt-4">
          {/* Appeal Command Center */}
          <li className="nav-item mb-2 px-2">
            <button
              className={`btn w-100 d-flex align-items-center sidebar-btn ${
                isActive("/appeal-command-center") ? "active" : ""
              }`}
              onClick={() => {
                if (!isActive("/appeal-command-center")) navigate("/appeal-command-center");
              }}
              style={{
                padding: "10px",
                fontWeight: 500,
                fontSize: '13px',
                border: "none",
                backgroundColor: "transparent",
                color: "white",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <MdDashboard
                style={{ marginRight: "0px", fontSize: "20px", flexShrink: 0 }}
              />
              <span style={{ flexGrow: 1 }}>Appeal Command Center</span>
            </button>
          </li>

          {/* Appeal Status Overview */}
          <li className="nav-item mb-2 px-2">
            <button
              className={`btn w-100 d-flex align-items-center sidebar-btn ${
                isActive("/appeal-status-overview") ? "active" : ""
              }`}
              onClick={() => {
                if (!isActive("/appeal-status-overview")) navigate("/appeal-status-overview");
              }}
              style={{
                padding: "10px",
                fontWeight: 500,
                fontSize: '13px',
                border: "none",
                backgroundColor: "transparent",
                color: "white",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <MdDashboard
                style={{ marginRight: "-10px", fontSize: "20px", flexShrink: 0 }}
              />
              <span style={{ flexGrow: 1 }}>Appeal Status Overview</span>
            </button>
          </li>
        </ul>
      </div>

      {/* Main content area */}
      <main className="main-content">{children}</main>
    </>
  );
}

export default HomePage;
