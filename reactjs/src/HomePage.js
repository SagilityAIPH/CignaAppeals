// Layout.js
import React from "react";
import { MdDashboard } from "react-icons/md";
import { useNavigate } from "react-router-dom";

function HomePage({ active, setActive, children }) {
  const navigate = useNavigate();

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
          <li className="nav-item mb-3 px-2">
            <button
              className={`btn w-100 d-flex align-items-center sidebar-btn ${
                active === "appeal" ? "active" : ""
              }`}
              onClick={() => {
                setActive("appeal");
                navigate("/");
              }}
              style={{
                padding: "10px 15px",
                fontWeight: 500,
                border: "none",
                backgroundColor: "transparent",
                color: "white",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <MdDashboard
                style={{ marginRight: "10px", fontSize: "20px", flexShrink: 0 }}
              />
              <span style={{ flexGrow: 1 }}>Appeal Command Center</span>
            </button>
          </li>

          {/* Appeal Status Overview */}
          <li className="nav-item mb-3 px-2">
            <button
              className={`btn w-100 d-flex align-items-center sidebar-btn ${
                active === "appealStatus" ? "active" : ""
              }`}
              onClick={() => {
                setActive("appealStatus");
                navigate("/appeal-status");
              }}
              style={{
                padding: "10px 15px",
                fontWeight: 500,
                border: "none",
                backgroundColor: "transparent",
                color: "white",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <MdDashboard
                style={{ marginRight: "10px", fontSize: "20px", flexShrink: 0 }}
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
