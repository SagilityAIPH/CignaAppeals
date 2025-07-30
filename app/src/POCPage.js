// POCPage.js
import React, { useState, useRef, useMemo } from "react";
import * as XLSX from 'xlsx';
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


const dataApiUrl =
"https://uat-cg-lpi-portal.sagilityhealth.com:8081/api/AppealsIssue/";

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
const [preserviceRows, setPreserviceRows] = useState([]);
const [preserviceHeaders, setPreserviceHeaders] = useState([]);
const [caseStatusFilter, setCaseStatusFilter] = useState("All");
const [assignmentFilter, setAssignmentFilter] = useState("All");
const [selectedRows, setSelectedRows] = useState([]);
const [selectedRow, setSelectedRow] = useState(null);
const [showModal, setShowModal] = useState(false);
const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 10; // You can change this to 20, 50 etc.
const [showAssignModal, setShowAssignModal] = useState(false);
const [assignTo, setAssignTo] = useState([]);
const [showFollowUpModal, setShowFollowUpModal] = useState(false);
const [showFollowToast, setShowFollowToast] = useState(false);

const bulkUpdateCases = (actionType) => {
  const updatedRows = preserviceRows.map((row) => {
    if (selectedRows.includes(row)) {
      let updatedRow = { ...row };

      if (actionType === "assign") {
        updatedRow.OWNER_HELPER = "ASSIGNED";
      } else if (actionType === "followup") {
        updatedRow.Status = "FFup Sent";
        updatedRow.OWNER_HELPER = "";
      } else if (actionType === "complete") {
        updatedRow.Status = "Completed";
        updatedRow.OWNER_HELPER = "COMPLETED";
      }

      return updatedRow;
    }
    return row;
  });

  setPreserviceRows(updatedRows);
  setSelectedRows([]); // Clear selected checkboxes after update
};



const preserviceColumnMap = {
  'Age Cal': 'AGE',
  'SR': 'SR.',
  'Manager': 'Manager',
  'AGE_PROMISE_BUCKET': 'PROMISE',
  'Promise Date': 'Task Promise Date',
  'Recd By Cigna': "Rec’d",
  'System': 'System',
  'LPI?': 'LPI?',
  'PG?': 'PG?',
  'PG NAME2': 'PG Name',
  'OwnerID': 'OwnerID',
  'OwnerName': 'Owner',
  'Status': 'Case Status'
};

const getOwnerHelperValue = (row) => {
  const key = Object.keys(row).find(k =>
    k.trim().replace(/\s+/g, "_").toUpperCase() === "OWNER_HELPER"
  );
  return (row[key] || "").trim().toUpperCase();
}; 


const filteredPreserviceRows = useMemo(() => {
  return preserviceRows.filter((row) => {
    const managerMatch = true; // no manager filtering in POCPage
    if (!managerMatch) return false;

    const matchesCaseStatus =
      caseStatusFilter === "All" ||
      String(row["Status"] || "").trim() === caseStatusFilter;

    const rawHelper = String(row["OWNER_HELPER"] || "").trim().toUpperCase();
    const matchesAssignment =
      assignmentFilter === "All" ||
      (assignmentFilter === "Assigned" && rawHelper === "ASSIGNED") ||
      (assignmentFilter === "Unassigned" &&
        (rawHelper === "" || rawHelper === "UNASSIGNED"));

    return matchesCaseStatus && matchesAssignment;
  });
}, [preserviceRows, caseStatusFilter, assignmentFilter]);


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

  const reader = new FileReader();
  reader.onload = (ev) => {
    const data = new Uint8Array(ev.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const dataSheet = workbook.Sheets["DATA"];
    if (dataSheet) {
      const json = XLSX.utils.sheet_to_json(dataSheet, {
        defval: "",
        raw: false,
        header: 1,
      });

      if (json.length > 1) {
        const [rawHeaders, ...rows] = json;

        const normalizedHeaders = rawHeaders.map((h) =>
          String(h || "").replace(/\s+/g, " ").trim()
        );

        const fixedData = rows.map((row) =>
          Object.fromEntries(
            normalizedHeaders.map((key, i) => [key, row[i] ?? ""])
          )
        );

        // ✅ Save to state for table display
        setPreserviceRows(fixedData);
        setPreserviceHeaders(normalizedHeaders);

        // Optional: Still save to sessionStorage if needed elsewhere
        sessionStorage.setItem("teamLeadExcelData", JSON.stringify(fixedData));
        sessionStorage.setItem("teamLeadHeaders", JSON.stringify(normalizedHeaders));
      }
    }
  };


  

  reader.readAsArrayBuffer(file);

  // 🔄 Progress Bar Animation (keep this)
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



// Remove the 6th label from here
const subBarLabels = [
  "Prioritizing Appeals for assignment",
  "Check Appeal Status",
  "Sending appeals through email",
  "Checking Backlogs",
  "Updating Dashboard",
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




{uploadComplete && preserviceRows.length > 0 && (
  <div
    style={{
      marginTop: 40,
      maxWidth: 1500,
      marginInline: "auto",
      backgroundColor: "white",
      padding: 24,
      borderRadius: 12,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}
  >
    <h3 style={{ marginTop: 0, color: "#003b70" }}>Appeal Cases</h3>

    {/* Filters */}
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
      {/* Case Status Filter */}
      <div style={{ width: 200 }}>
        <label style={{ fontWeight: "500", color: "#003b70", display: "block", marginBottom: 4 }}>
          Filter by Case Status:
        </label>
        <select
          value={caseStatusFilter}
          onChange={(e) => setCaseStatusFilter(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
            width: "100%",
            fontFamily: "inherit",
          }}
        >
          <option value="All">All</option>
          <option value="Open">Open</option>
          <option value="Pended">Pended</option>
          <option value="Completed">Completed</option>
          <option value="FFup Sent">FFup Sent</option>
        </select>
      </div>

      {/* Assignment Filter */}
      <div style={{ width: 200 }}>
        <label style={{ fontWeight: "500", color: "#003b70", display: "block", marginBottom: 4 }}>
          Filter by Assignment:
        </label>
        <select
          value={assignmentFilter}
          onChange={(e) => setAssignmentFilter(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
            width: "100%",
            fontFamily: "inherit",
          }}
        >
          <option value="All">All</option>
          <option value="Assigned">Assigned</option>
          <option value="Unassigned">Unassigned</option>
        </select>
      </div>
    </div>

    {/* Case Summary & Actions */}
    <div
      style={{
        backgroundColor: "#e8f0fe",
        padding: "12px 20px",
        borderRadius: 8,
        marginBottom: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontWeight: 600, color: "#003b70" }}>
        Total Appeal Cases: {filteredPreserviceRows.length}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
<button
  onClick={() => setShowAssignModal(true)}
  disabled={
    selectedRows.filter((r) => String(r["OWNER_HELPER"] || "").trim().toUpperCase() !== "ASSIGNED").length === 0
  }
  style={{
    backgroundColor:
      selectedRows.filter((r) => String(r["OWNER_HELPER"] || "").trim().toUpperCase() !== "ASSIGNED").length > 0
        ? "#0071ce"
        : "#aaa",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor:
      selectedRows.filter((r) => String(r["OWNER_HELPER"] || "").trim().toUpperCase() !== "ASSIGNED").length > 0
        ? "pointer"
        : "not-allowed",
    fontWeight: "600"
  }}
>
  Assign
</button>


<button
  onClick={() => setShowFollowUpModal(true)}
  disabled={selectedRows.length === 0}
  style={{
    backgroundColor: selectedRows.length > 0 ? "#ff9800" : "#aaa",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: selectedRows.length > 0 ? "pointer" : "not-allowed",
    fontWeight: "600"
  }}
>
  Send for FollowUp
</button>



      </div>
    </div>

   
    {/* Table with Checkboxes */}
<div style={{ border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" }}>
  <div style={{ maxHeight: 400, overflowY: "auto", overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead style={{ backgroundColor: "#e0eafc", position: "sticky", top: 0, zIndex: 1 }}>
        <tr>
          <th style={{ padding: 8, border: "1px solid #ccc" }}>
            <input
              type="checkbox"
              checked={
                filteredPreserviceRows.length > 0 &&
                filteredPreserviceRows
                  .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
                  .every(r => selectedRows.includes(r))
              }
              onChange={(e) => {
                const currentPageRows = filteredPreserviceRows.slice(
                  (currentPage - 1) * rowsPerPage,
                  currentPage * rowsPerPage
                );
                if (e.target.checked) {
                  const newSelection = [
                    ...selectedRows,
                    ...currentPageRows.filter(r => !selectedRows.includes(r))
                  ];
                  setSelectedRows(newSelection);
                } else {
                  const newSelection = selectedRows.filter(r => !currentPageRows.includes(r));
                  setSelectedRows(newSelection);
                }
              }}
            />
          </th>
          <th style={{ padding: 8, border: "1px solid #ccc" }}>#</th>
          {Object.values(preserviceColumnMap).map((header) => (
            <th key={header} style={{ padding: 8, border: "1px solid #ccc", fontWeight: "600", textAlign: "left" }}>
              {header}
            </th>
          ))}
          <th style={{ padding: 8, border: "1px solid #ccc", fontWeight: "600", textAlign: "left" }}>
            Case Assignment
          </th>
          <th style={{ padding: 8, border: "1px solid #ccc", fontWeight: "600", textAlign: "left" }}>
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {filteredPreserviceRows
          .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
          .map((row, idx) => (
            <tr key={idx}>
              <td style={{ padding: 8, border: "1px solid #eee" }}>
                <input
                  type="checkbox"
                  checked={selectedRows.includes(row)}
                  onChange={() => {
                    if (selectedRows.includes(row)) {
                      setSelectedRows(selectedRows.filter(r => r !== row));
                    } else {
                      setSelectedRows([...selectedRows, row]);
                    }
                  }}
                />
              </td>
              <td style={{ padding: 8, border: "1px solid #eee" }}>
                {(currentPage - 1) * rowsPerPage + idx + 1}
              </td>
              {Object.keys(preserviceColumnMap).map((excelKey) => (
                <td key={excelKey} style={{ padding: 8, border: "1px solid #eee" }}>
                  {row[excelKey] || ""}
                </td>
              ))}
              <td style={{ padding: 8, border: "1px solid #eee" }}>
                {(() => {
                  const raw = (row["OWNER_HELPER"] || "").trim().toUpperCase();
                  const owner = (row["OwnerName"] || "").toUpperCase();
                  const status = raw || (owner.includes("SHARANAPPA") || owner.includes("VEERESHA") ? "PENDING" : "OPEN");
                  return status;
                })()}
              </td>
              <td style={{ padding: 8, border: "1px solid #eee" }}>
                <button
                  onClick={() => {
                    setSelectedRow(row);
                    setShowModal(true);
                  }}
                  style={{
                    backgroundColor: "#0071ce",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  </div>
</div>



    <div style={{ marginTop: 12, display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
  <button
    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
    disabled={currentPage === 1}
    style={{
      backgroundColor: "#0071ce",
      color: "white",
      padding: "6px 12px",
      borderRadius: 4,
      border: "none",
      cursor: currentPage === 1 ? "not-allowed" : "pointer",
      opacity: currentPage === 1 ? 0.5 : 1,
    }}
  >
    Previous
  </button>

  <span style={{ fontWeight: 500 }}>
    Page {currentPage} of {Math.ceil(filteredPreserviceRows.length / rowsPerPage)}
  </span>

  <button
    onClick={() =>
      setCurrentPage((prev) =>
        prev < Math.ceil(filteredPreserviceRows.length / rowsPerPage) ? prev + 1 : prev
      )
    }
    disabled={currentPage === Math.ceil(filteredPreserviceRows.length / rowsPerPage)}
    style={{
      backgroundColor: "#0071ce",
      color: "white",
      padding: "6px 12px",
      borderRadius: 4,
      border: "none",
      cursor:
        currentPage === Math.ceil(filteredPreserviceRows.length / rowsPerPage)
          ? "not-allowed"
          : "pointer",
      opacity:
        currentPage === Math.ceil(filteredPreserviceRows.length / rowsPerPage)
          ? 0.5
          : 1,
    }}
  >
    Next
  </button>
</div>

  </div>
)}



{showModal && selectedRow && (
  <div
    onClick={() => setShowModal(false)}
    onKeyDown={(e) => e.key === "Escape" && setShowModal(false)}
    tabIndex={0}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1200,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: "white",
        borderRadius: "10px",
        padding: "20px",
        maxWidth: "600px",
        width: "90%",
        maxHeight: "80%",
        overflowY: "auto",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        position: "relative",
      }}
    >
      <h3 style={{ marginBottom: "16px", color: "#003b70" }}>Row Details</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <tbody>
          {Object.entries(selectedRow).map(([key, value]) => {
            if (
              value === null ||
              value === undefined ||
              (typeof value === "string" && value.trim() === "")
            )
              return null;
            return (
              <tr key={key}>
                <td
                  style={{
                    fontWeight: "600",
                    padding: "6px",
                    borderBottom: "1px solid #eee",
                    width: "40%",
                  }}
                >
                  {key}
                </td>
                <td style={{ padding: "6px", borderBottom: "1px solid #eee" }}>
                  {value}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: "20px", textAlign: "right" }}>
        <button
          onClick={() => setShowModal(false)}
          style={{
            backgroundColor: "#003b70",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}



 {/* Assign */}
{showAssignModal && (
  <div
    onClick={() => setShowAssignModal(false)}
    style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1200
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "24px",
        width: "90%",
        maxWidth: "420px",
        boxShadow: "0 8px 16px rgba(0,0,0,0.25)"
      }}
    >
      <h3 style={{ marginBottom: "16px", color: "#003b70" }}>
        Assign {selectedRows.length} {selectedRows.length === 1 ? "Case" : "Cases"}
      </h3>

      <label style={{ fontWeight: "500", marginBottom: "6px", display: "block" }}>
        Select Agent:
      </label>
      <select
        value=""
        disabled={assignTo.length >= selectedRows.length}
        onChange={(e) => {
          const agent = e.target.value;
          if (!agent) return;
          if (!assignTo.includes(agent)) {
            setAssignTo([...assignTo, agent]);
          }
        }}
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          marginBottom: "12px"
        }}
      >
        <option value="">-- Select Agent --</option>
        {[...new Set(
          preserviceRows
            .map((r) => r["OwnerName"])
            .filter((name) => {
              if (!name) return false;
              const lower = name.toLowerCase();
              return (
                !lower.includes("proclaim_queu") &&
                !lower.includes("queue") &&
                !lower.startsWith("sagproc")
              );
            })
        )].sort().map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      {assignTo.length > 0 && (
        <div style={{
          marginBottom: "16px",
          padding: "10px",
          backgroundColor: "#f9f9f9",
          borderRadius: "6px",
          border: "1px solid #ddd"
        }}>
          <strong style={{ display: "block", marginBottom: "6px" }}>Selected Agent(s):</strong>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {assignTo.map((name) => (
              <li key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{name}</span>
                <button
                  onClick={() => setAssignTo(assignTo.filter((agent) => agent !== name))}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#c00",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold"
                  }}
                >
                  ❌
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
        <button
          disabled={assignTo.length === 0}
          onClick={() => {
            const idMap = {};
            preserviceRows.forEach((r) => {
              if (r["OwnerName"]) idMap[r["OwnerName"]] = r["OwnerID"];
            });

            const updated = preserviceRows.map((row) => {
              const match = selectedRows.some((sel) => sel["SR"] === row["SR"]);
              if (!match) return row;

              const i = selectedRows.findIndex((sel) => sel["SR"] === row["SR"]);
              const agent = assignTo[i % assignTo.length];

              return {
                ...row,
                OwnerName: agent,
                OwnerID: idMap[agent] || "",
                OWNER_HELPER: "ASSIGNED"
              };
            });

            setPreserviceRows(updated);
            setSelectedRows([]);
            setAssignTo([]);
            setShowAssignModal(false);
          }}
          style={{
            backgroundColor: assignTo.length ? "#0071ce" : "#aaa",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: assignTo.length ? "pointer" : "not-allowed"
          }}
        >
          Confirm
        </button>
        <button
          onClick={() => setShowAssignModal(false)}
          style={{
            backgroundColor: "#ccc",
            color: "#333",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: "500",
            cursor: "pointer"
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}


 {/* Follow Up */}
{showFollowUpModal && (
  <div
    onClick={() => setShowFollowUpModal(false)}
    style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1200
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "24px",
        width: "90%",
        maxWidth: "400px",
        boxShadow: "0 8px 16px rgba(0,0,0,0.25)",
        textAlign: "center"
      }}
    >
      <h3 style={{ marginBottom: "16px", color: "#003b70" }}>
        Confirm Follow Up
      </h3>
      <p style={{ marginBottom: "20px", fontSize: "14px" }}>
        Are you sure you want to send the selected case(s) for follow-up?
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
        <button
          onClick={() => {
            const updated = preserviceRows.map(row => {
              const match = selectedRows.some(sel => sel["SR"] === row["SR"]);
              if (match) {
                return { ...row, Status: "FFup Sent" };
              }
              return row;
            });

            setPreserviceRows(updated);
            setSelectedRows([]);
            setShowFollowUpModal(false);
            setCurrentPage(1);

            setShowFollowToast(true);
            setTimeout(() => setShowFollowToast(false), 3000);
          }}
          style={{
            backgroundColor: "#ff9800",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          Yes, Send
        </button>

        <button
          onClick={() => setShowFollowUpModal(false)}
          style={{
            backgroundColor: "#ccc",
            color: "#333",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: "500",
            cursor: "pointer"
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
{showFollowToast && (
  <div
    style={{
      position: "fixed",
      top: "70px",
      right: "20px",
      backgroundColor: "#28a745",
      color: "white",
      padding: "12px 20px",
      borderRadius: "8px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
      zIndex: 1300,
      fontWeight: 600
    }}
  >
    Follow-up request sent!
  </div>
)}







        <Outlet />
      </main>
    </>
  );
}

export default POCPage;
