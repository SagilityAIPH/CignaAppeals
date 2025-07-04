// POCPage.js
import React, { useState, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { MdDashboard, MdBarChart, MdPeople } from "react-icons/md"; // reserved icons

function POCPage() {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedReport, setSelectedReport] = useState("Appeals Inventory Report");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileInputRef = useRef(null);

  const loginState = JSON.parse(sessionStorage.getItem("loginState"));
  const managerName = loginState?.managerNameRaw || "User";

  /* -------- Helpers -------- */
  const triggerFileDialog = () => fileInputRef.current && fileInputRef.current.click();

  const handleNavClick = (path, key) => {
    setSelectedItem(key);
    navigate(path);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setUploadProgress(0);
    setUploadComplete(false);

    /* slower simulated upload */
    let prog = 0;
    const timer = setInterval(() => {
      prog += 1 + Math.random() * 2; // 1 – 3 % every 400 ms
      if (prog >= 100) {
        prog = 100;
        clearInterval(timer);
        setUploadComplete(true);
      }
      setUploadProgress(prog);
    }, 400);
  };

  /* -------- Sub-bar helpers -------- */
  const subBarLabels = [
    "Filter Work Appeals",
    "Check Appeal Status",
    "Sending appeals through email",
    "Checking Backlogs",
    "Updating Dashboard",
    "Cross-checking Appeals Status",
  ];
  const segment = 100 / subBarLabels.length;

  const getSubBarWidth = (i) => {
    const start = i * segment;
    const filled = Math.min(Math.max(uploadProgress - start, 0), segment);
    return (filled / segment) * 100;
  };

  /* -------- JSX -------- */
  return (
    <>
      {/* Header */}
      <header
        style={{
          height: 60,
          background: "linear-gradient(to right, #003b70, #0071ce)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          position: "fixed",
          inset: 0,
          width: "100%",
          zIndex: 1100,
          boxSizing: "border-box",
        }}
      >
        <img
          src={`${process.env.PUBLIC_URL}/Cigna logo.png`}
          alt="Cigna Logo"
          style={{ height: 50 }}
        />
        <div style={{ fontSize: 16, fontWeight: "bold", fontFamily: "'Lexend', sans-serif" }}>
          Welcome, {managerName}
        </div>
      </header>

      {/* Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 60,
          left: 0,
          width: 220,
          height: "calc(100% - 60px)",
          backgroundColor: "#131B30",
          color: "white",
          paddingTop: 20,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <ul style={{ listStyle: "none", paddingLeft: 0 }}></ul>
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
              borderRadius: 6,
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

      {/* Main */}
      <main
        style={{
          marginTop: 60,
          marginLeft: 220,
          padding: 24,
          minHeight: "calc(100vh - 60px)",
          backgroundColor: "#f9f9fb",
          fontFamily: "'Lexend', sans-serif",
        }}
      >
        {/* Upload Controls */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "white",
            padding: 24,
            borderRadius: 10,
            marginBottom: 30,
            maxWidth: 1000,
            marginInline: "auto",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label htmlFor="reportSelect" style={{ fontWeight: 600 }}>
              Choose report:
            </label>
            <select
              id="reportSelect"
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 14,
              }}
            >
              <option>Facets</option>
              <option>Proclaim</option>
            </select>
          </div>

          <button
            onClick={triggerFileDialog}
            style={{
              backgroundColor: "#0071ce",
              color: "white",
              padding: "10px 18px",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Upload Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
        </div>

        {/* Progress Section */}
        {selectedFileName && (
          <div
            style={{
              marginTop: 12,
              marginInline: "auto",
              maxWidth: 1000,
              backgroundColor: "white",
              padding: 20,
              borderRadius: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ marginBottom: 8, fontWeight: 600 }}>{selectedFileName}</div>

            {/* Main bar */}
            <div
              style={{
                width: "100%",
                height: 12,
                backgroundColor: "#e0e0e0",
                borderRadius: 6,
                overflow: "hidden",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: "100%",
                  backgroundColor: "#003b70",
                  transition: "width 0.3s ease-in-out",
                }}
              />
            </div>

            {/* Sub-bars */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px 32px",
              }}
            >
              {subBarLabels.map((label, i) => (
                <div key={label}>
                  <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>{label}</div>
                  <div
                    style={{
                      width: "100%",
                      height: 10,
                      backgroundColor: "#e0e0e0",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${getSubBarWidth(i)}%`,
                        height: "100%",
                        backgroundColor: "#0071ce", // constant color
                        transition: "width 0.3s ease-in-out",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {uploadComplete && (
              <div
                style={{
                  marginTop: 24,
                  padding: "10px 14px",
                  backgroundColor: "#d4edda",
                  color: "#155724",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                Upload complete!
              </div>
            )}
          </div>
        )}

        <Outlet />
      </main>
    </>
  );
}

export default POCPage;
