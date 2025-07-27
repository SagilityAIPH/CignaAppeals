import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
} from 'recharts';
import { useLocation } from 'react-router-dom'; // ⬅️ Add this line at the top

function TeamLeadCasesPage() {
const location = useLocation();

const stateFromRoute = location.state;
const stateFromStorage = JSON.parse(sessionStorage.getItem('loginState') || '{}');

const managerNameRaw = stateFromRoute?.managerNameRaw || stateFromStorage.managerNameRaw;
const displayManagerName = location.state?.managerNameRaw ?? managerNameRaw;
console.log("Router state:", stateFromRoute);
console.log("Storage fallback:", stateFromStorage);

const managerName =
  (location.state?.managerName || stateFromStorage.managerName || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
    const [preserviceRows, setPreserviceRows] = useState([]);
    const [preserviceHeaders, setPreserviceHeaders] = useState([]);
    const [selectedRow, setSelectedRow] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [gnbSummary, setGnbSummary] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
const [showFollowToast, setShowFollowToast] = useState(false);
const [assignmentFilter, setAssignmentFilter] = useState('All');

// 👉 Pended-reason modal
const [showPendReasonModal, setShowPendReasonModal] = useState(false);
const [pendReasonText, setPendReasonText] = useState('');

const [showAssignModal, setShowAssignModal] = useState(false);
// multiple agents can be selected
const [assignTo, setAssignTo] = useState([]);   // array of OwnerName strings

const [caseStatusFilter, setCaseStatusFilter] = useState('All');

// --- Helper: is this row already ASSIGNED? ---
const isRowAssigned = (row) => getOwnerHelperValue(row) === 'ASSIGNED';

useEffect(() => {
  const autoLoadFlag = localStorage.getItem("autoLoadTeamLead");

  if (autoLoadFlag === "true") {
    localStorage.setItem("autoLoadTeamLead", "false");

    // Auto-fetch from public Excel path
    const fileUrl = process.env.PUBLIC_URL + '/template/Appeals_Sample.xlsx'; 
  fetch(fileUrl)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        const data = new Uint8Array(buffer);
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

            setPreserviceRows(fixedData);
            setPreserviceHeaders(normalizedHeaders);
            // ✅ Build Total Appeals Summary (filtered by current manager)
const departments = ['Sagility', 'Concentrix', 'Wipro'];
const grouped = {};
const bucketKey = 'AGE_BUCKET';
const deptKey = 'Director';
const managerKey = 'Manager';

fixedData.forEach(row => {
  const rawManager = (row[managerKey] || '').toLowerCase().trim();
  const matchManager = rawManager === managerNameRaw.toLowerCase().trim();
  if (!matchManager) return;

  const rawDept = (row[deptKey] || '').trim();
  const bucket = (row[bucketKey] || '').trim();
  const matchedDept = departments.find(dep => rawDept === dep);

  if (matchedDept && bucket) {
    if (!grouped[matchedDept]) grouped[matchedDept] = {};
    grouped[matchedDept][bucket] = (grouped[matchedDept][bucket] || 0) + 1;
  }
});

const allBuckets = [
  '0-14', '15-29', '30-44', '45-59',
  '60-89', '90-179', '180-364', '365+'
];

const summary = departments.map(dept => {
  const counts = grouped[dept] || {};
  const row = { Department: dept };
  let total = 0;

  allBuckets.forEach(bucket => {
    const count = counts[bucket] || 0;
    row[bucket] = count;
    total += count;
  });

  row.Total = total;
  return row;
});

const grandTotal = { Department: 'Total' };
allBuckets.forEach(bucket => {
  grandTotal[bucket] = summary.reduce((sum, row) => sum + (row[bucket] || 0), 0);
});
grandTotal.Total = summary.reduce((sum, row) => sum + row.Total, 0);
summary.push(grandTotal);

setGnbSummary(summary);

          }
        }
      })
      .catch((err) => console.error("Failed to auto-load Excel:", err));
  }
}, []);


const preserviceAllowedHeaders = [
  'AGE', 'SR.', 'Manager', 'PROMISE', 'Task Promise Date', 'Rec\'d',
  'System', 'LPI?', 'PG?', 'PG Name', 'OwnerID', 'Owner',
  'Case Status'              // 🔸 new display header
];

const preserviceColumnMap = {
  'Age Cal': 'AGE',
  'SR': 'SR.', // ← ✅ FIXED: 'SR .' changed to 'SR'
  'Manager': 'Manager',
  'AGE_PROMISE_BUCKET': 'PROMISE',
  'Promise Date': 'Task Promise Date',
  'Recd By Cigna': 'Rec\'d',
  'System': 'System',
  'LPI?': 'LPI?',
  'PG?': 'PG?',
  'PG NAME2': 'PG Name',
  'OwnerID': 'OwnerID',
  'OwnerName': 'Owner',
  'Status': 'Case Status',          // 🔸 NEW: Excel column DN
};
  
const resolveExcelHeader = (friendlyHeader) => {
  // Try forward map
  const forward = Object.entries(preserviceColumnMap).find(
    ([excelKey, displayName]) =>
      displayName.trim().toLowerCase() === friendlyHeader.trim().toLowerCase()
  );
  if (forward) return forward[0];

  // Try reverse (user picked Excel field name directly)
  const reverse = Object.entries(preserviceColumnMap).find(
    ([excelKey, displayName]) =>
      excelKey.trim().toLowerCase() === friendlyHeader.trim().toLowerCase()
  );
  if (reverse) return reverse[0];

  return friendlyHeader;
};

  const getColorForBucket = (index) => {
  const colors = [
    '#00C49F', '#66BB6A', '#42A5F5', '#FFA726',
    '#FB8C00', '#F4511E', '#EF5350', '#E53935',
    '#B71C1C', '#A1887F', '#9FA8DA'
  ];
  return colors[index % colors.length];
};

  const preserviceDateFields = ['Promise Date', 'Recd By Cigna'];

  const formatExcelDate = (value) => {
    if (typeof value === 'number') {
      const jsDate = new Date(Math.round((value - 25569) * 86400 * 1000));
      return jsDate.toISOString().split('T')[0];
    } else if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    } else {
      return value || '';
    }
  };

const markPaginatedRowsAsPending = () => {
  const updated = preserviceRows.map(row => {
    const isVisible = paginatedRows.some(visible => visible['SR'] === row['SR']);
    if (isVisible) {
      return { ...row, OWNER_HELPER: 'PENDED' };
    }
    return row;
  });

  setPreserviceRows(updated);
};


const getOwnerHelperValue = (row) => {
  const key = Object.keys(row).find(k =>
    k.trim().replace(/\s+/g, '_').toUpperCase() === 'OWNER_HELPER'
  );
  return (row[key] || '').trim().toUpperCase();
};



// === Filter rows by manager + Case Status ===
const filteredPreserviceRows = useMemo(() => {
  return preserviceRows.filter((row) => {
    // Manager filter (always on)
    const managerKey = Object.keys(row).find(
      (k) => k.trim().toLowerCase() === 'manager'
    );
    if (!managerKey) return false;

    const rawManager = String(row[managerKey] || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const managerMatch = rawManager === managerName?.toLowerCase();
    if (!managerMatch) return false;

    // === Independent Filters ===
    const matchesCaseStatus =
      caseStatusFilter === 'All' ||
      String(row['Status'] || '').trim() === caseStatusFilter;

    const rawHelper = String(row['OWNER_HELPER'] || '').trim().toUpperCase();
    const matchesAssignment =
      assignmentFilter === 'All' ||
      (assignmentFilter === 'Assigned' && rawHelper === 'ASSIGNED') ||
      (assignmentFilter === 'Unassigned' && (rawHelper === '' || rawHelper === 'UNASSIGNED'));

    return matchesCaseStatus && matchesAssignment;
  });
}, [preserviceRows, managerName, caseStatusFilter, assignmentFilter]);







const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 25;
const totalPages = Math.ceil(filteredPreserviceRows.length / rowsPerPage);
const paginatedRows = filteredPreserviceRows.slice(
  (currentPage - 1) * rowsPerPage,
  currentPage * rowsPerPage
);

// --- Are ALL selectable rows on this page already checked? ---
const selectableRows = paginatedRows.filter(
  (row) => getOwnerHelperValue(row) !== 'COMPLETED'
);

const isAllSelected =
  selectableRows.length > 0 &&
  selectableRows.every((row) =>
    selectedRows.some((sel) => sel['SR'] === row['SR'])
  );



// === Case-summary stats (Open / Pended / Completed + Assigned / Unassigned) ===
const caseSummaryStats = useMemo(() => {
  const rows = preserviceRows.filter(
    (r) => (r['Manager'] || '').trim().toLowerCase() === managerNameRaw.trim().toLowerCase()
  );

  let open = 0,
    pended = 0,
    completed = 0,
    assigned = 0,
    unassigned = 0;

  rows.forEach((r) => {
    /* ---- Case Status counts ---- */
    const cs = String(r['Status'] || '').trim().toUpperCase();
    if (cs === 'OPEN') open++;
    else if (cs === 'PENDED') pended++;
    else if (cs === 'COMPLETED') completed++;

    /* ---- Assignment counts ---- */
    const helper = getOwnerHelperValue(r); // ASSIGNED / '' / PENDED / COMPLETED etc.
    if (helper === 'ASSIGNED') assigned++;
    else if (helper === '' || helper === 'UNASSIGNED') unassigned++;
  });

  const total = rows.length;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, open, pended, completed, assigned, unassigned, completionRate };
}, [preserviceRows, managerNameRaw]);


// --- Header checkbox toggle ---
const toggleSelectAll = () => {
  if (isAllSelected) {
    // Remove all selectable rows on current page
    setSelectedRows((prev) =>
      prev.filter(
        (sel) =>
          !selectableRows.some((row) => row['SR'] === sel['SR'])
      )
    );
  } else {
    // Add missing selectable rows on current page
    const newRows = selectableRows.filter(
      (row) => !selectedRows.some((sel) => sel['SR'] === row['SR'])
    );
    setSelectedRows((prev) => [...prev, ...newRows]);
  }
};

// --- Row checkbox toggle ---
const toggleRowSelection = (row) => {
  const status = getOwnerHelperValue(row);
  if (status === 'COMPLETED') return; // ✅ Prevent selecting completed rows

  setSelectedRows((prev) => {
    const exists = prev.some((sel) => sel['SR'] === row['SR']);
    return exists
      ? prev.filter((sel) => sel['SR'] !== row['SR'])
      : [...prev, row];
  });
};





const handleFileUpload = (event) => {

  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });

    const dataSheet = workbook.Sheets['DATA'];
    if (dataSheet) {
      const json = XLSX.utils.sheet_to_json(dataSheet, {
        defval: '',
        raw: false,
        header: 1
      });

      if (json.length > 1) {
        const [rawHeaders, ...rows] = json;

        const normalizedHeaders = rawHeaders.map(h =>
          String(h || '').replace(/\s+/g, ' ').trim()
        );

        const fixedData = rows.map(row =>
          Object.fromEntries(normalizedHeaders.map((key, i) => [key, row[i] ?? '']))
        );

          console.log("Sample Row:", fixedData[0]);
console.log("Available Keys:", Object.keys(fixedData[0]));

        // ✅ Set Pre-Service data
        setPreserviceRows(fixedData);
        console.log("👀 Sample OwnerNames:", fixedData.map(r => r["OwnerName"]));
        setPreserviceHeaders(normalizedHeaders);

        // ✅ Build Total Appeals Summary (filtered by current manager)
        const departments = ['Sagility', 'Concentrix', 'Wipro'];
        const grouped = {};
        const bucketKey = 'AGE_BUCKET';
        const deptKey = 'Director';
        const managerKey = 'Manager';

        fixedData.forEach(row => {
          const rawManager = (row[managerKey] || '').toLowerCase().trim();
          const matchManager = rawManager === managerNameRaw.toLowerCase().trim();
          if (!matchManager) return;

          const rawDept = (row[deptKey] || '').trim();
          const bucket = (row[bucketKey] || '').trim();
          const matchedDept = departments.find(dep => rawDept === dep);

          if (matchedDept && bucket) {
            if (!grouped[matchedDept]) grouped[matchedDept] = {};
            grouped[matchedDept][bucket] = (grouped[matchedDept][bucket] || 0) + 1;
          }
        });

        const allBuckets = [
            '0-14',
            '15-29',
            '30-44',
            '45-59',
            '60-89',
            '90-179',
            '180-364',
            '365+'
            ];

        const summary = departments.map(dept => {
          const counts = grouped[dept] || {};
          const row = { Department: dept };
          let total = 0;

          allBuckets.forEach(bucket => {
            const count = counts[bucket] || 0;
            row[bucket] = count;
            total += count;
          });

          row.Total = total;
          return row;
        });

        const grandTotal = { Department: 'Total' };
        allBuckets.forEach(bucket => {
          grandTotal[bucket] = summary.reduce((sum, row) => sum + (row[bucket] || 0), 0);
        });
        grandTotal.Total = summary.reduce((sum, row) => sum + row.Total, 0);
        summary.push(grandTotal);

        setGnbSummary(summary);
      }
    }
  };

  reader.readAsArrayBuffer(file);
};



  return (
    <div style={{ padding: '0px', fontFamily: 'Lexend, sans-serif' }}>
      {/* <label
        htmlFor="excel-upload"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#0071ce',
          color: 'white',
          borderRadius: '8px',
          marginTop: '-10px',
          marginBottom: '10px',
          marginLeft: '-30px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '14px',
          letterSpacing: '0.5px',
        }}
      >
        Upload Excel
      </label>
      <input
        id="excel-upload"
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      /> */}
{/* <div style={{ marginTop: '10px', marginLeft: '-30px', fontWeight: '600', color: '#003b70' }}>
  Logged in as: {displayManagerName}
</div> */}



{/* Total Appeals Summary Section */}{/* Total Appeals Summary Section */}
{gnbSummary.length > 0 && (
  <div
    style={{
      marginTop: '0px',
      marginLeft: '-30px',
      backgroundColor: '#F5F6FA',
      borderRadius: '10px',
      padding: '20px',
      fontFamily: 'Lexend, sans-serif',
    }}
  >
    <h3
      style={{
        fontSize: '19px',
        fontWeight: '500',
        color: '#003b70',
        marginBottom: '16px',
        marginTop: '0px',
      }}
    >
      Total Appeals Summary & Age Breakdown
    </h3>

    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      {/* Left Section: Table + Card */}
      <div style={{ flex: 1, minWidth: '450px', maxWidth: '650px' }}>
        {/* Scrollable Table */}
        <div style={{ border: '1px solid #ddd', maxHeight: '300px', overflow: 'auto' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}
          >
            <thead style={{ backgroundColor: '#00bcd4', color: 'white' }}>
              <tr>
                <th
                  style={{
                    padding: '10px',
                    border: '1px solid #ccc',
                    textAlign: 'left',
                  }}
                >
                  Department
                </th>
                {Object.keys(gnbSummary[0])
                  .filter((key) => key !== 'Department')
                  .map((bucket) => (
                    <th
                      key={bucket}
                      style={{
                        padding: '10px',
                        border: '1px solid #ccc',
                        textAlign: 'left',
                      }}
                    >
                      {bucket}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {gnbSummary.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f3f6fb',
                  }}
                >
                  <td
                    style={{
                      padding: '8px',
                      border: '1px solid #eee',
                      fontWeight: row.Department === 'Total' ? '600' : '400',
                    }}
                  >
                    {row.Department}
                  </td>
                  {Object.keys(row)
                    .filter((key) => key !== 'Department')
                    .map((bucket) => (
                      <td
                        key={bucket}
                        style={{
                          padding: '8px',
                          border: '1px solid #eee',
                          textAlign: 'left',
                        }}
                      >
                        {row[bucket] > 0 ? row[bucket] : '-'}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* === Case Summary Card (updated) === */}
<div
  style={{
    marginTop: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    width: '93.3%',
    fontSize: '14px'
  }}
>
  <h4
    style={{
      marginTop: '0px',
      marginBottom: '16px',
      color: '#003b70',
      fontWeight: '600'
    }}
  >
    Case Summary
  </h4>

  {/* --- Totals --- */}
  <div style={{ marginBottom: '8px' }}>
    <span role="img" aria-label="folder">📁</span> Total Cases:{' '}
    <strong>{caseSummaryStats.total}</strong>
  </div>

  {/* --- Case Status counts --- */}
  <div style={{ marginBottom: '8px' }}>
    <span role="img" aria-label="loop">🔄</span> Open:{' '}
    <strong>{caseSummaryStats.open}</strong>
  </div>
  <div style={{ marginBottom: '8px' }}>
    <span role="img" aria-label="pending">🟡</span> Pended:{' '}
    <strong>{caseSummaryStats.pended}</strong>
  </div>
  <div style={{ marginBottom: '8px' }}>
    <span role="img" aria-label="check">✅</span> Completed:{' '}
    <strong>{caseSummaryStats.completed}</strong>
  </div>

  {/* --- Assignment counts --- */}
  <div style={{ marginBottom: '8px' }}>
    <span role="img" aria-label="rocket">🚀</span> Assigned:{' '}
    <strong>{caseSummaryStats.assigned}</strong>
  </div>
  <div style={{ marginBottom: '12px' }}>
    <span role="img" aria-label="question">❔</span> Unassigned:{' '}
    <strong>{caseSummaryStats.unassigned}</strong>
  </div>

  {/* --- Completion-rate bar --- */}
  <div
    style={{
      fontSize: '12px',
      marginBottom: '4px',
      color: '#003b70',
      fontWeight: '500'
    }}
  >
    Completion Rate
  </div>
  <div
    style={{
      backgroundColor: '#e0e0e0',
      borderRadius: '20px',
      height: '10px',
      overflow: 'hidden'
    }}
  >
    <div
      style={{
        height: '100%',
        width: `${caseSummaryStats.completionRate}%`,
        backgroundColor: '#28a745',
        transition: 'width 0.3s ease-in-out'
      }}
    />
  </div>
  <div
    style={{
      fontSize: '12px',
      marginTop: '4px',
      textAlign: 'right'
    }}
  >
    {caseSummaryStats.completionRate}%
  </div>
</div>




      </div>


      {/* Chart - Right */}
      <div
        style={{
          flex: 1,
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
          minWidth: 0, // helps Flex grow/shrink properly
        }}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: '500',
            color: '#003b70',
            marginBottom: '24px',
            borderBottom: '1px solid #ddd',
            paddingBottom: '8px',
            marginTop: '0px',
          }}
        >
          Appeal Age Bucket Breakdown per GSP
        </h3>

        <ResponsiveContainer width="100%" height={295}>
          <BarChart
            data={gnbSummary.filter((row) => row.Department !== 'Total')}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="Department" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '12px' }} />

            {Object.keys(gnbSummary[0])
              .filter((key) => key !== 'Department' && key !== 'Total')
              .map((bucket, index) => (
                <Bar key={bucket} dataKey={bucket} fill={getColorForBucket(index)}>
                  <LabelList
                    dataKey={bucket}
                    position="top"
                    style={{ fontSize: 10, fontWeight: 'bold' }}
                  />
                </Bar>
              ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
)}





{/* Pre-Service Section */}
{preserviceRows.length > 0 && (
  <div style={{
    marginTop: '20px',
    marginLeft: '-30px',
    backgroundColor: '#F5F6FA',
    borderRadius: '10px',
    padding: '20px',
    fontFamily: 'Lexend, sans-serif',
  }}>
    <h3 style={{
      fontSize: '19px',
      fontWeight: '500',
      color: '#003b70',
      marginBottom: '10px',
      marginTop: '0px'
    }}>
      Appeal Cases
    </h3>











<div style={{ marginBottom: '16px', display: 'flex', gap: '20px' }}>
  {/* Case Status Filter */}
  <div style={{ width: '200px' }}>
    <label
      style={{
        fontWeight: '500',
        color: '#003b70',
        display: 'block',
        marginBottom: '4px'
      }}
    >
      Filter by Case Status:
    </label>

    <select
      value={caseStatusFilter}
      onChange={(e) => setCaseStatusFilter(e.target.value)}
      style={{
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        width: '100%',
        fontFamily: 'inherit'
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
  <div style={{ width: '200px' }}>
    <label
      style={{
        fontWeight: '500',
        color: '#003b70',
        display: 'block',
        marginBottom: '4px'
      }}
    >
      Filter by Assignment:
    </label>

    <select
      value={assignmentFilter}
      onChange={(e) => setAssignmentFilter(e.target.value)}
      style={{
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        width: '100%',
        fontFamily: 'inherit'
      }}
    >
      <option value="All">All</option>
      <option value="Assigned">Assigned</option>
      <option value="Unassigned">Unassigned</option>
    </select>
  </div>
</div>





<div style={{
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#e8f0fe',
  border: '1px solid #c4d4ec',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
  marginTop: '0px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
  gap: '20px'
}}>
  <div style={{
    fontSize: '16px',
    fontWeight: '600',
    color: '#003b70'
  }}>
    Total Appeal Cases: {filteredPreserviceRows.length}
  </div>

  <div style={{ display: 'flex', gap: '12px' }}>

<button
  onClick={() => setShowAssignModal(true)}
  disabled={
    selectedRows.filter((r) => getOwnerHelperValue(r) !== 'ASSIGNED').length ===
    0
  }
  style={{
    backgroundColor:
      selectedRows.filter((r) => getOwnerHelperValue(r) !== 'ASSIGNED')
        .length > 0
        ? '#0071ce'
        : '#aaa',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor:
      selectedRows.filter((r) => getOwnerHelperValue(r) !== 'ASSIGNED')
        .length > 0
        ? 'pointer'
        : 'not-allowed',
    fontWeight: '600'
  }}
>
  Assign
</button>


    <button
      onClick={() => setShowFollowUpModal(true)}
      disabled={selectedRows.length === 0}
      style={{
        backgroundColor: selectedRows.length > 0 ? '#ff9800' : '#aaa',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: selectedRows.length > 0 ? 'pointer' : 'not-allowed',
        fontWeight: '600'
      }}
    >
      Send for FollowUp
    </button>

    <button
      onClick={() => {
        const updated = preserviceRows.map(row => {
          const match = selectedRows.some(sel => sel['SR'] === row['SR']);
          if (match) {
            return { ...row, OWNER_HELPER: 'COMPLETED' };
          }
          return row;
        });

        setPreserviceRows(updated);
        setSelectedRows([]);
        setCurrentPage(1);
      }}
      disabled={selectedRows.length === 0}
      style={{
        backgroundColor: selectedRows.length > 0 ? '#28a745' : '#aaa',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: selectedRows.length > 0 ? 'pointer' : 'not-allowed',
        fontWeight: '600'
      }}
    >
      Mark as Completed
    </button>


  </div>
</div>








{/* Table Appeal Cases */}
<div style={{
  border: '1px solid #ddd',
  marginTop: '-10px',
  borderRadius: '6px',
  overflow: 'hidden'
}}>
  {/* Scrollable table container */}
  <div style={{
    maxHeight: '400px',
    overflowY: 'auto',
    overflowX: 'auto'
  }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
<thead style={{ backgroundColor: '#e0eafc', position: 'sticky', top: 0, zIndex: 1 }}>
  <tr>
    <th style={{ padding: '8px', border: '1px solid #ccc' }}>
      <input
  type="checkbox"
  checked={isAllSelected}
  onChange={toggleSelectAll}
/>
    </th>
    {Object.values(preserviceColumnMap).map((header) => (
      <th key={header} style={{ padding: '8px', border: '1px solid #ccc', fontWeight: '600', textAlign: 'left' }}>
        {header}
      </th>
    ))}
<th
  style={{
    padding: '8px',
    border: '1px solid #ccc',
    fontWeight: '600',
    textAlign: 'left',
    backgroundColor: '#e0eafc',
  }}
>
  Case Assignment
</th>


<th style={{ padding: '8px', border: '1px solid #ccc', fontWeight: '600', textAlign: 'left' }}>
  Actions
</th>
  </tr>
</thead>

<tbody>
  {paginatedRows.map((row, idx) => {
    const isChecked = selectedRows.some(selected => selected['SR'] === row['SR']);
    return (
      <tr key={idx}>
        <td style={{ padding: '8px', border: '1px solid #eee' }}>
<input
  type="checkbox"
  checked={isChecked}
  onChange={() => toggleRowSelection(row)}
/>

</td>

{Object.keys(preserviceColumnMap).map((excelKey) => (
  <td key={excelKey} style={{ padding: '8px', border: '1px solid #eee' }}>
    {/* Special handling for Case Status */}
    {excelKey === 'Status' && String(row['Status']).trim() === 'Pended' ? (
      <button
        style={{
          background: 'none',
          border: 'none',
          color: '#0071ce',
          textDecoration: 'underline',
          cursor: 'pointer',
          padding: 0,
          fontSize: 'inherit',
          fontFamily: 'inherit'
        }}
        onClick={() => {
          setPendReasonText(row['Pend_Reason'] || 'No reason provided.');
          setShowPendReasonModal(true);
        }}
      >
        Pended
      </button>
    ) : preserviceDateFields.includes(excelKey) ? (
      formatExcelDate(row[excelKey])
    ) : (
      row[excelKey] ?? ''
    )}
  </td>
))}


{/* ✅ Status Column */}
<td style={{ padding: '8px', border: '1px solid #eee', fontWeight: '500' }}>
  {(() => {
    const raw = (row['OWNER_HELPER'] || '').trim().toUpperCase();
    const owner = (row['Owner'] || '').toUpperCase();
    const status = raw || (owner.includes('SHARANAPPA') || owner.includes('VEERESHA') ? 'PENDING' : 'OPEN');
    return status;
  })()}
</td>


{/* ✅ Actions Column */}
<td style={{ padding: '8px', border: '1px solid #eee' }}>
  <button
    onClick={() => {
      setSelectedRow(row);
      setShowModal(true);
    }}
    style={{
      backgroundColor: '#0071ce',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      cursor: 'pointer'
    }}
  >
    View
  </button>
</td>

      </tr>
    );
  })}
</tbody>



    </table>
  </div>

  {/* Pagination Controls */}
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '12px',
    gap: '12px',
    backgroundColor: '#f9fbff',
    borderTop: '1px solid #ddd'
  }}>
    <button
      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
      style={{
        padding: '6px 12px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        backgroundColor: '#fff',
        color: '#0071ce',
        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
      }}
    >
      Previous
    </button>
    <span style={{ fontWeight: '500', color: '#003b70' }}>
      Page {currentPage} of {totalPages}
    </span>
    <button
      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
      disabled={currentPage === totalPages}
      style={{
        padding: '6px 12px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        backgroundColor: '#fff',
        color: '#0071ce',
        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
      }}
    >
      Next
    </button>
  </div>
</div>



  </div>
)}





{/* Modal for viewing full row */}
{showModal && selectedRow && (
  <div
    onClick={() => setShowModal(false)}
    onKeyDown={(e) => e.key === 'Escape' && setShowModal(false)}
    tabIndex={0}
    style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '20px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80%',
        overflowY: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        position: 'relative'
      }}
    >
      <h3 style={{ marginBottom: '16px', color: '#003b70' }}>Row Details</h3>



      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <tbody>
          {Object.entries(selectedRow)
  .filter(([key]) => key !== 'Pend_Reason') // ✅ Hides this key only
  .map(([key, value]) => {
    const displayValue = preserviceDateFields.includes(key)
      ? formatExcelDate(value)
      : value;

    if (
      displayValue === null ||
      displayValue === undefined ||
      (typeof displayValue === 'string' && displayValue.trim() === '')
    ) return null;

    return (
      <tr key={key}>
        <td style={{ fontWeight: '600', padding: '6px', borderBottom: '1px solid #eee', width: '40%' }}>
          {key}
        </td>
        <td style={{ padding: '6px', borderBottom: '1px solid #eee' }}>
          {displayValue}
        </td>
      </tr>
    );
  })}
        </tbody>
      </table>

      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <button
          onClick={() => setShowModal(false)}
          style={{
            backgroundColor: '#003b70',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}





{showFollowUpModal && (
  <div
    onClick={() => setShowFollowUpModal(false)}
    onKeyDown={(e) => e.key === 'Escape' && setShowFollowUpModal(false)}
    tabIndex={0}
    style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}
    >
      <h3 style={{ marginBottom: '16px', color: '#003b70' }}>
        Confirm Follow Up
      </h3>
      <p style={{ marginBottom: '20px', fontSize: '14px' }}>
        Are you sure you want to send the selected case(s) for follow-up?
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
<button
  onClick={() => {
    const updated = preserviceRows.map(row => {
      const match = selectedRows.some(sel => sel['SR'] === row['SR']);
      if (match) {
        // ⬅️ NEW: flag as “FFup Sent” instead of “PENDED”
        return { ...row, Status: 'FFup Sent' };
      }
      return row;
    });

    setPreserviceRows(updated);   // refresh grid
    setSelectedRows([]);          // clear selection
    setShowFollowUpModal(false);  // close modal
    setCurrentPage(1);            // reset pagination

    // 🔔 toast
    setShowFollowToast(true);
    setTimeout(() => setShowFollowToast(false), 3000);
  }}
  style={{
    backgroundColor: '#ff9800',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer'
  }}
>
  Yes, Send
</button>

        <button
          onClick={() => setShowFollowUpModal(false)}
          style={{
            backgroundColor: '#ccc',
            color: '#333',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}


{showPendReasonModal && (
  <div
    onClick={() => setShowPendReasonModal(false)}
    onKeyDown={(e) => e.key === 'Escape' && setShowPendReasonModal(false)}
    tabIndex={0}
    style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '24px',
        maxWidth: '450px',
        width: '90%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}
    >
      <h3 style={{ marginBottom: '16px', color: '#003b70' }}>
        Reason for Pended
      </h3>
<div
  style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '24px'
  }}
>
  <span style={{ fontSize: '14px', fontWeight: '500' }}>{pendReasonText}</span>
  <span style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
    {new Date().toLocaleString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })}
  </span>
</div>

      <button
        onClick={() => setShowPendReasonModal(false)}
        style={{
          backgroundColor: '#003b70',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          fontWeight: '500',
          cursor: 'pointer'
        }}
      >
        Close
      </button>
    </div>
  </div>
)}



{/* --- Notif for Follow Up --- */}
{showFollowToast && (
<div
  style={{
    position: 'fixed',
    top: '70px',
    right: '20px',
    backgroundColor: '#28a745',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
    zIndex: 1200,
    fontWeight: 600,
    animation: 'slideInRight 0.4s ease-out'
  }}
>
  Email follow-up has been sent for confirmation
</div>
)}


{showAssignModal && (
  <div
    onClick={() => setShowAssignModal(false)}
    onKeyDown={(e) => e.key === 'Escape' && setShowAssignModal(false)}
    tabIndex={0}
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '420px',
        boxShadow: '0 8px 16px rgba(0,0,0,0.25)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}
    >
      <h3 style={{ marginBottom: '16px', color: '#003b70' }}>
        Assign {selectedRows.length} {selectedRows.length === 1 ? 'Case' : 'Cases'}
      </h3>

      {/* --- Agent Dropdown and Add Button --- */}
      <label style={{ fontWeight: '500', marginBottom: '6px', display: 'block' }}>
        Select Agent:
      </label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
       <select
  value=""
  disabled={assignTo.length >= selectedRows.length}  // 🚫 lock when limit reached
  onChange={(e) => {
    const newAgent = e.target.value;
    if (!newAgent) return;

    // 🔒 Max-agent rule
    if (assignTo.length >= selectedRows.length) {
      alert(`You can assign at most ${selectedRows.length} agent${selectedRows.length === 1 ? '' : 's'} for ${selectedRows.length} case${selectedRows.length === 1 ? '' : 's'}.`);
      return;
    }

    if (!assignTo.includes(newAgent)) {
      setAssignTo([...assignTo, newAgent]);
    }
  }}
  style={{
    flex: 1,
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontFamily: 'inherit',
    backgroundColor: assignTo.length >= selectedRows.length ? '#eee' : 'white'
  }}
>
  <option value="">-- Select Agent --</option>
  {[...new Set(
    preserviceRows
      .map((r) => r['OwnerName'])
      .filter((name) => {
        if (!name) return false;
        const lower = name.toLowerCase();
        return (
          !lower.includes('proclaim_queu') &&
          !lower.includes('queue') &&
          !lower.startsWith('sagproc')
        );
      })
  )]
    .sort()
    .map((name) => (
      <option key={name} value={name}>
        {name}
      </option>
    ))}
</select>

      </div>

      {/* --- Selected Agent List --- */}
      {assignTo.length > 0 && (
        <div
          style={{
            marginBottom: '20px',
            padding: '10px',
            backgroundColor: '#f9f9f9',
            borderRadius: '6px',
            border: '1px solid #ddd'
          }}
        >
          <strong style={{ display: 'block', marginBottom: '6px' }}>
            Selected Agent(s):
          </strong>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {assignTo.map((name) => (
              <li
                key={name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}
              >
                <span>{name}</span>
                <button
                  onClick={() =>
                    setAssignTo(assignTo.filter((agent) => agent !== name))
                  }
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#c00',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  ❌
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* --- Confirm / Cancel buttons --- */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
        <button
          disabled={assignTo.length === 0}
          onClick={() => {
            if (assignTo.length === 0) return;

            // map agent to OwnerID
            const idMap = {};
            preserviceRows.forEach((r) => {
              if (r['OwnerName']) idMap[r['OwnerName']] = r['OwnerID'];
            });

            const updated = preserviceRows.map((row) => {
              const match = selectedRows.some((sel) => sel['SR'] === row['SR']);
              if (!match) return row;

              const i = selectedRows.findIndex((sel) => sel['SR'] === row['SR']);
              const agent = assignTo[i % assignTo.length];

              return {
                ...row,
                OwnerName: agent,
                OwnerID: idMap[agent] || '',
                OWNER_HELPER: 'ASSIGNED'
              };
            });

            setPreserviceRows(updated);
            setSelectedRows([]);
            setAssignTo([]);
            setShowAssignModal(false);
          }}
          style={{
            backgroundColor: assignTo.length ? '#0071ce' : '#aaa',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: assignTo.length ? 'pointer' : 'not-allowed'
          }}
        >
          Confirm
        </button>
        <button
          onClick={() => setShowAssignModal(false)}
          style={{
            backgroundColor: '#ccc',
            color: '#333',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}





    </div>
  );
}

export default TeamLeadCasesPage;
