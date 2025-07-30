// ClientPage.js
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { MdDashboard, MdBarChart, MdPeople } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";

function ClientPage({ children }) {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState(null); // 🆕

const handleNavClick = (path, itemKey) => {
  setSelectedItem(itemKey);

  // Step 1: Set auto-load flag if going to /client/proclaim
  if (path === "/client/proclaim") {
    localStorage.setItem("autoLoadProclaim", "true");

  } else if (path === "/client/facets") {
  localStorage.setItem("autoLoadFacets", "true");   // new flag for Facets
  }

  navigate(path);
};



  return (
    <>
    
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
    flexDirection: "column",
    justifyContent: "space-between", // pushes logout to bottom
  }}
>
  {/* Navigation links */}
  <ul
    className="nav flex-column"
    style={{
      listStyleType: "none",
      paddingLeft: 0,
    }}
  >
    {/* <li className="nav-item px-3 mb-2">
      <button
        onClick={() => handleNavClick("/client/executive-summary", "executive-summary")}
        style={{
          backgroundColor: selectedItem === "executive-summary" ? "#005b9f" : "transparent",
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
        Executive Summary
      </button>
    </li> */}

    <li className="nav-item px-3 mb-2">
      <button
        onClick={() => handleNavClick("/client/facets", "facets")}
        style={{
          backgroundColor: selectedItem === "facets" ? "#005b9f" : "transparent",
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
        Facets
      </button>
    </li>

    <li className="nav-item px-3 mb-2">
      <button
        onClick={() => handleNavClick("/client/proclaim", "proclaim")}
        style={{
          backgroundColor: selectedItem === "proclaim" ? "#005b9f" : "transparent",
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
        Proclaim
      </button>
    </li>

        <li className="nav-item px-3 mb-2">
      <button
        onClick={() => handleNavClick("/client/impact", "impact")}
        style={{
          backgroundColor: selectedItem === "impact" ? "#005b9f" : "transparent",
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
        Impact
      </button>
    </li>

  </ul>

  {/* Logout Button at Bottom */}
  <div style={{ padding: "0 20px 40px" }}>
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

export default ClientPage;
