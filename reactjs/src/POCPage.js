// POCPage.js
import React, { useState, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { MdDashboard, MdBarChart, MdPeople } from "react-icons/md"; // reserved icons
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";

/* ----------------------------- SAMPLE DATA -------------------------------- */
// Hard-coded age-bucket numbers for the preview.
// Replace these with live data once the Excel parsing is wired up.
const SAMPLE_GNB_SUMMARY = [
  {
    Department: "Sagility",
    "0-14": 0,
    "15-29": 0,
    "30-44": 275,
    "45-59": 25,
    "60-89": 2,
    "90-179": 0,
    "180-364": 0,
    "365+": 0,
    Total: 302,
  },
  {
    Department: "Concentrix",
    "0-14": 0,
    "15-29": 0,
    "30-44": 145,
    "45-59": 11,
    "60-89": 0,
    "90-179": 0,
    "180-364": 0,
    "365+": 0,
    Total: 156,
  },
  {
    Department: "Wipro",
    "0-14": 0,
    "15-29": 0,
    "30-44": 117,
    "45-59": 3,
    "60-89": 1,
    "90-179": 0,
    "180-364": 0,
    "365+": 0,
    Total: 121,
  },
  {
    Department: "Total",
    "0-14": 0,
    "15-29": 0,
    "30-44": 537,
    "45-59": 39,
    "60-89": 3,
    "90-179": 0,
    "180-364": 0,
    "365+": 0,
    Total: 579,
  },
];

const AGE_BUCKETS = [
  "0-14",
  "15-29",
  "30-44",
  "45-59",
  "60-89",
  "90-179",
  "180-364",
  "365+",
];

const getColorForBucket = (index) => {
  const palette = [
    "#00C49F",
    "#66BB6A",
    "#42A5F5",
    "#FFA726",
    "#FB8C00",
    "#F4511E",
    "#EF5350",
    "#E53935",
    "#B71C1C",
  ];
  return palette[index % palette.length];
};

/* -------------------------------------------------------------------------- */

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
  const triggerFileDialog = () =>
    fileInputRef.current && fileInputRef.current.click();

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
      prog += 1 + Math.random() * 2;
      if (prog >= 100) {
        prog = 100;
        clearInterval(timer);
        setUploadComplete(true);
      }
      setUploadProgress(prog);
    }, 400);
  };

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

  return (
    <>
      <header style={{ height: 60, background: "linear-gradient(to right, #003b70, #0071ce)", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "fixed", inset: 0, width: "100%", zIndex: 1100, boxSizing: "border-box" }}>
        <img src={`${process.env.PUBLIC_URL}/Cigna logo.png`} alt="Cigna Logo" style={{ height: 50 }} />
        <div style={{ fontSize: 16, fontWeight: "bold", fontFamily: "'Lexend', sans-serif" }}>Welcome, {managerName}</div>
      </header>

      <div style={{ position: "fixed", top: 60, left: 0, width: 220, height: "calc(100% - 60px)", backgroundColor: "#131B30", color: "white", paddingTop: 20, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <ul style={{ listStyle: "none", paddingLeft: 0 }}></ul>
        <div style={{ padding: "0 20px 40px" }}>
          <button onClick={() => { localStorage.clear(); navigate("/"); }} style={{ backgroundColor: "#ff4d4f", border: "none", padding: "10px 16px", borderRadius: 6, color: "white", fontWeight: "bold", cursor: "pointer", width: "100%" }}>Logout</button>
        </div>
      </div>

      <main style={{ marginTop: 60, marginLeft: 220, padding: 24, minHeight: "calc(100vh - 60px)", backgroundColor: "#f9f9fb", fontFamily: "'Lexend', sans-serif" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", padding: 24, borderRadius: 10, marginBottom: 30, maxWidth: 1500, marginInline: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label htmlFor="reportSelect" style={{ fontWeight: 600 }}>Choose report:</label>
            <select id="reportSelect" value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}>
              <option>Facets</option>
              <option>Proclaim</option>
            </select>
          </div>
          <button onClick={triggerFileDialog} style={{ backgroundColor: "#0071ce", color: "white", padding: "10px 18px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>Upload Excel</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFileSelect} />
        </div>

        {selectedFileName && (
          <div style={{ marginTop: 12, marginInline: "auto", maxWidth: 1500, backgroundColor: "white", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>{selectedFileName}</div>
            <div style={{ width: "100%", height: 12, backgroundColor: "#e0e0e0", borderRadius: 6, overflow: "hidden", marginBottom: 24 }}>
              <div style={{ width: `${uploadProgress}%`, height: "100%", backgroundColor: "#003b70", transition: "width 0.3s ease-in-out" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 32px" }}>
              {subBarLabels.map((label, i) => (
                <div key={label}>
                  <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600 }}>{label}</div>
                  <div style={{ width: "100%", height: 10, backgroundColor: "#e0e0e0", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ width: `${getSubBarWidth(i)}%`, height: "100%", backgroundColor: "#0071ce", transition: "width 0.3s ease-in-out" }} />
                  </div>
                </div>
              ))}
            </div>
            {uploadComplete && (
              <div style={{ marginTop: 24, padding: "10px 14px", backgroundColor: "#d4edda", color: "#155724", borderRadius: 6, fontWeight: 600 }}>Upload complete!</div>
            )}
          </div>
        )}

       {uploadComplete && (
  <div
    style={{
      marginTop: 40,
      maxWidth: 1500,
      marginInline: "auto",
    }}
  >
    {/* ─────────────────────  side-by-side cards  ───────────────────── */}
    <div
      style={{
        display: "flex",
        gap: 20,
        alignItems: "stretch", // ★ both children take tallest height
        flexWrap: "wrap",
      }}
    >
      {/* ───────────── Left card: Summary table ───────────── */}
      <div
        style={{
          flex: 1,
          minWidth: 450,
          maxWidth: 650,
          backgroundColor: "white",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column", // ★ header + body in a column
          minHeight: 0,            // ★ allow flex:item to shrink/grow
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "#003b70",
            marginBottom: 24,
            borderBottom: "1px solid #ddd",
            paddingBottom: 8,
            marginTop: 0,
          }}
        >
          Total Appeals Summary &amp; Age Breakdown
        </h3>

        {/* scrollable table body that fills remaining space */}
        <div
          style={{
            border: "1px solid #ddd",
            flex: 1,            // ★ fills all remaining vertical space
            overflow: "auto",
            backgroundColor: "#F5F6FA",
            borderRadius: 10,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead style={{ backgroundColor: "#00bcd4", color: "white" }}>
              <tr>
                <th
                  style={{
                    padding: 10,
                    border: "1px solid #ccc",
                    textAlign: "left",
                  }}
                >
                  Department
                </th>
                {AGE_BUCKETS.concat(["Total"]).map((bucket) => (
                  <th
                    key={bucket}
                    style={{
                      padding: 10,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    {bucket}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_GNB_SUMMARY.map((row, idx) => (
                <tr
                  key={row.Department}
                  style={{
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f3f6fb",
                  }}
                >
                  <td
                    style={{
                      padding: 8,
                      border: "1px solid #eee",
                      fontWeight: row.Department === "Total" ? 600 : 400,
                    }}
                  >
                    {row.Department}
                  </td>
                  {AGE_BUCKETS.concat(["Total"]).map((bucket) => (
                    <td
                      key={bucket}
                      style={{
                        padding: 8,
                        border: "1px solid #eee",
                        textAlign: "left",
                      }}
                    >
                      {row[bucket] > 0 ? row[bucket] : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────── Right card: Bar chart ───────────── */}
      <div
        style={{
          flex: 1,
          backgroundColor: "white",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.05)",
          minWidth: 0,
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "#003b70",
            marginBottom: 24,
            borderBottom: "1px solid #ddd",
            paddingBottom: 8,
            marginTop: 0,
          }}
        >
          Appeal Age Bucket Breakdown per GSP
        </h3>
        <ResponsiveContainer width="100%" height={255}>
          <BarChart
            data={SAMPLE_GNB_SUMMARY.filter(
              (row) => row.Department !== "Total"
            )}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="Department" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            {AGE_BUCKETS.map((bucket, index) => (
              <Bar
                key={bucket}
                dataKey={bucket}
                fill={getColorForBucket(index)}
              >
                <LabelList
                  dataKey={bucket}
                  position="top"
                  style={{ fontSize: 10, fontWeight: "bold" }}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
)}


        <Outlet />
      </main>
    </>
  );
}

export default POCPage;
