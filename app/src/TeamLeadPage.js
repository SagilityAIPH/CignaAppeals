// ClientPage.js
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { MdDashboard, MdBarChart, MdPeople } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from './UserContext';
function TeamLeadPage({ children }) {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState(null);
  const { user } = useUser();


  const loginState = JSON.parse(sessionStorage.getItem("loginState"));
  const managerName = user?.fullName || "User";

const handleNavClick = (path, itemKey) => {
  setSelectedItem(itemKey);

  // 🆕 Set auto-load flag if navigating to Team Lead Cases
  if (path === "/teamlead/teamlead-cases") {
    localStorage.setItem("autoLoadTeamLead", "true");
  }

  navigate(path);
};

  return (
    <>
    
      {/* Header */}
{/* Header */}
<header
  style={{
    height: "60px",
    background: "linear-gradient(to right, #003b70, #0071ce)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    zIndex: 1100,
    boxSizing: "border-box",
    overflow: "hidden",
  }}
>
  {/* Logo and Title on the left */}
  <div style={{ display: "flex", alignItems: "center" }}>
    <img
      src={`${process.env.PUBLIC_URL}/Cigna logo.png`}
      alt="Cigna Logo"
      style={{ height: "50px", marginRight: "15px", }}
    />
    <span style={{ fontSize: "17px", fontWeight: '500', fontFamily: "'Lexend', sans-serif" ,  marginTop:"7px"}}>
      Appeal Command Center
    </span>
  </div>

  {/* Welcome message on the right */}
  <div style={{ 
    fontSize: "16px", 
    fontWeight: "bold", 
    fontFamily: "'Lexend', sans-serif" 
  }}>
    Welcome, {managerName}
  </div>
</header>


{/* Sidebar */}
<div
  className="sidebar"
  style={{
    position: "fixed",
    top: "60px",
    left: 0,
    width: "220px",
    height: "calc(100% - 60px)", // subtract header height
    backgroundColor: "#131B30",
    color: "white",
    paddingTop: "20px",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column", // allow vertical space distribution
    justifyContent: "space-between", // push logout to bottom
  }}
>
  {/* Top Navigation */}
  <ul
    className="nav flex-column"
    style={{
      listStyleType: "none",
      paddingLeft: 0,
    }}
  >
    <li className="nav-item px-3 mb-2">
      <button
        onClick={() => handleNavClick("/teamlead/teamlead-cases", "teamlead-cases")}
        style={{
          backgroundColor: selectedItem === "teamlead-cases" ? "#005b9f" : "transparent",
          border: "none",
          display: "flex",
          alignItems: "center",
          color: "white",
          cursor: "pointer",
          padding: "10px 15px",
          borderRadius: "4px",
          width: '92%',
          marginLeft: '8px',
          marginBottom: '8px'
        }}
      >
        <MdDashboard style={{ marginRight: "15px" }} />
        Cases
      </button>
    </li>
  </ul>

  {/* Logout Button at Bottom */}
  <div style={{ padding: "0 20px 40px" }}> {/* 👈 padding-bottom: 40px */}
    <button
      onClick={() => {
        localStorage.clear();
        navigate("/");
      }}
      style={{
        backgroundColor: "#ff4d4f",
        border: "none",
        padding: "10px 16px",
        borderRadius: "6px",
        color: "white",
        fontWeight: "bold",
        cursor: "pointer",
        width: "100%",
      }}
    >
      Logout
    </button>
  </div>
</div>



      {/* Main content area */}
      <main
        className="main-content"
        style={{ marginLeft: "250px", marginTop: "60px", padding: "20px" }}
      >
        <Outlet /> {/* 👈 Page-specific content will be rendered here */}
      </main>
    </>
  );
}

export default TeamLeadPage;
