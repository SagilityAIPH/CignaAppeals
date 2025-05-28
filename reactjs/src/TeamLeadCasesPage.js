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
    const [selectedGsp, setSelectedGsp] = useState('All');
    const [gnbSummary, setGnbSummary] = useState([]);
    const [filterColumn, setFilterColumn] = useState('');
    const [filterValue, setFilterValue] = useState('');
    const [selectedRows, setSelectedRows] = useState([]);
    const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Open' | 'Completed'
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
const [showReasonModal, setShowReasonModal] = useState(false);
const [showAssignModal, setShowAssignModal] = useState(false);
const [assignTo, setAssignTo] = useState('');


useEffect(() => {
  const autoLoadFlag = localStorage.getItem("autoLoadTeamLead");

  if (autoLoadFlag === "true") {
    localStorage.setItem("autoLoadTeamLead", "false");

    // Auto-fetch from public Excel path
    const fileUrl = process.env.PUBLIC_URL + '/Appeals_Sample.xlsx'; 
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



    // ✅ Reset to page 1 when filters change
    useEffect(() => {
    setCurrentPage(1);
    }, [filterColumn, filterValue, selectedGsp]);

  const preserviceAllowedHeaders = [
    'AGE', 'SR.', 'Manager', 'PROMISE', 'Task Promise Date', 'Rec\'d',
    'System', 'LPI?', 'PG?', 'PG Name', 'OwnerID', 'Owner'
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
  'OwnerName': 'Owner'
};
  
const resolveExcelHeader = (friendlyHeader) => {
  const found = Object.entries(preserviceColumnMap).find(
    ([excelKey, displayName]) =>
      displayName.trim().toLowerCase() === friendlyHeader.trim().toLowerCase()
  );
  return found?.[0] || friendlyHeader;
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


const filteredPreserviceRows = useMemo(() => {


  let result = preserviceRows.filter(row => {
    const status = getOwnerHelperValue(row);

switch (statusFilter) {
  case 'All':
    return true;
  case 'ASSIGNED':
    return status === 'ASSIGNED';
  case 'UNASSIGNED':
    return status === 'UNASSIGNED' || status === '';
  case 'PENDED':
    return status === 'PENDED';
  case 'COMPLETED':
    return status === 'COMPLETED';
  default:
    return true;
}

  });

  // Filter by Manager
  result = result.filter(row => {
    const managerKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'manager');
    if (!managerKey) return false;

    const rawManager = String(row[managerKey] || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    return rawManager === managerName?.toLowerCase();
  });

  // Filter by selectedGsp (Director)
  if (selectedGsp !== 'All') {
    result = result.filter(row => (row['Director'] || '').trim() === selectedGsp);
  }

  // Filter by column + value
  if (filterColumn && filterValue) {
    const actualKey = resolveExcelHeader(filterColumn);
    const selectedValues = filterValue
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    result = result.filter(row => {
      const raw = row[actualKey];
      if (!raw) return false;

      const rowValue = String(raw).toUpperCase();
      return selectedValues.some(val => rowValue.includes(val));
    });
  }

  return result;
}, [preserviceRows, managerName, selectedGsp, filterColumn, filterValue, statusFilter]);



const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 25;
const totalPages = Math.ceil(filteredPreserviceRows.length / rowsPerPage);
const paginatedRows = filteredPreserviceRows.slice(
  (currentPage - 1) * rowsPerPage,
  currentPage * rowsPerPage
);

// ⬇️ INSERT THIS HERE
const managerCasesWithStatus = useMemo(() => {
  return preserviceRows
    .filter(r => (r['Manager'] || '').trim().toLowerCase() === managerNameRaw.trim().toLowerCase())
    .map(r => ({
      ...r,
      _STATUS: getOwnerHelperValue(r)
    }));
}, [preserviceRows, managerNameRaw]);

const isAllSelected = paginatedRows.length > 0 && paginatedRows.every(row =>
  selectedRows.some(selected => selected['SR'] === row['SR'])
);

const toggleSelectAll = () => {
  if (isAllSelected) {
    setSelectedRows([]);
  } else {
    setSelectedRows(paginatedRows);
  }
};

const toggleRowSelection = (row) => {
  const exists = selectedRows.some(selected => selected['SR'] === row['SR']);
  if (exists) {
    setSelectedRows(prev => prev.filter(selected => selected['SR'] !== row['SR']));
  } else {
    setSelectedRows(prev => [...prev, row]);
  }
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

        {/* Case Summary Card */}
        <div style={{ marginTop: '20px', backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', width: '93.3%', fontSize: '14px' }}>
  <h4 style={{ marginTop: '0px', marginBottom: '16px', color: '#003b70', fontWeight: '600' }}>
    Case Summary
  </h4>

  {(() => {
const total = managerCasesWithStatus.length;
const completed = managerCasesWithStatus.filter(r => r._STATUS === 'COMPLETED').length;
const pended = managerCasesWithStatus.filter(r => r._STATUS === 'PENDED').length;
const assigned = managerCasesWithStatus.filter(r => r._STATUS === 'ASSIGNED').length;
const unassigned = total - completed - pended - assigned;


    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return (
      <>
        <div style={{ marginBottom: '8px' }}>
  <span role="img" aria-label="folder">📁</span> Total Cases: <strong>{total}</strong>
</div>
<div style={{ marginBottom: '8px' }}>
  <span role="img" aria-label="rocket">🚀</span> Assigned: <strong>{assigned}</strong>
</div>
<div style={{ marginBottom: '8px' }}>
  <span role="img" aria-label="question">❔</span> Unassigned: <strong>{unassigned}</strong>
</div>
<div style={{ marginBottom: '8px' }}>
  <span role="img" aria-label="pending">🟡</span> Pended: <strong>{pended}</strong>
</div>
<div style={{ marginBottom: '12px' }}>
  <span role="img" aria-label="check">✅</span> Completed: <strong>{completed}</strong>
</div>


        <div style={{ fontSize: '12px', marginBottom: '4px', color: '#003b70', fontWeight: '500' }}>
          Completion Rate
        </div>
        <div style={{ backgroundColor: '#e0e0e0', borderRadius: '20px', height: '10px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${percent}%`,
              backgroundColor: '#28a745',
              transition: 'width 0.3s ease-in-out',
            }}
          />
        </div>
        <div style={{ fontSize: '12px', marginTop: '4px', textAlign: 'right' }}>{percent}%</div>
      </>
    );
  })()}
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


<div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
  <div>
    <label style={{ fontWeight: '500', color: '#003b70', display: 'block', marginBottom: '4px' }}>
      Filter By Column:
    </label>
    <select
      value={filterColumn}
      onChange={(e) => {
        setFilterColumn(e.target.value);
        setFilterValue('');
      }}
      style={{
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        width: '180px',
        fontFamily: 'inherit'
      }}
    >
      <option value="">-- Select Column --</option>
{Object.values(preserviceColumnMap)
  .filter(header => {
    const trimmed = header.trim().toLowerCase();
    return trimmed !== 'manager' && !trimmed.startsWith('__empty') && trimmed !== '';
  })
  .map((label) => (
    <option key={label} value={label}>{label}</option>
))}
    </select>
  </div>

  <div>
    <label style={{ fontWeight: '500', color: '#003b70', display: 'block', marginBottom: '4px' }}>
      Where Value is:
    </label>
    <select
      value={filterValue}
      onChange={(e) => setFilterValue(e.target.value)}
      style={{
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        width: '180px',
        fontFamily: 'inherit'
      }}
      disabled={!filterColumn}
    >
      <option value="">-- Select Value --</option>
      {(() => {
  const actualKey = resolveExcelHeader(filterColumn);
  return [...new Set(preserviceRows.map(row => row[actualKey]).filter(Boolean))]
    .sort()
    .map((val, idx) => (
      <option key={idx} value={val}>{val}</option>
    ));
})()}
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
  disabled={selectedRows.length === 0}
  style={{
    backgroundColor: selectedRows.length > 0 ? '#0071ce' : '#aaa',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: selectedRows.length > 0 ? 'pointer' : 'not-allowed',
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





<div style={{ marginBottom: '16px', width: '200px' }}>
  <label
    style={{
      fontWeight: '500',
      color: '#003b70',
      display: 'block',
      marginBottom: '4px'
    }}
  >
    Filter by Status:
  </label>
  <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
    style={{
      padding: '8px',
      borderRadius: '6px',
      border: '1px solid #ccc',
      width: '100%',
      fontFamily: 'inherit'
    }}
  >
    <option value="All">All</option>
<option value="ASSIGNED">Assigned</option>
<option value="UNASSIGNED">Unassigned</option>
<option value="PENDED">Pended</option>
<option value="COMPLETED">Completed</option>

  </select>
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
  onClick={markPaginatedRowsAsPending}
  style={{
    padding: '8px',
    border: '1px solid #ccc',
    fontWeight: '600',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#0071ce',
    textDecoration: 'underline'
  }}
  title="Click to set status as PENDING for visible rows only"
>
  Status
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
    {preserviceDateFields.includes(excelKey)
      ? formatExcelDate(row[excelKey])
      : (row[excelKey] ?? '')}
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

      {/* ✅ Show 'Reason for Pending' button only if status is PENDING */}
{(() => {
  const raw = (selectedRow['OWNER_HELPER'] || '').trim().toUpperCase();
  const owner = (selectedRow['Owner'] || '').toUpperCase();
  const status = raw || (owner.includes('SHARANAPPA') || owner.includes('VEERESHA') ? 'PENDED' : 'OPEN');

  return status === 'PENDED' ? (
    <button
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        backgroundColor: '#ff9800',
        color: 'white',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer'
      }}
      onClick={() => setShowReasonModal(true)}
    >
      Reason for Pended
    </button>
  ) : null;
})()}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <tbody>
          {Object.entries(selectedRow).map(([key, value]) => {
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
                return { ...row, OWNER_HELPER: 'PENDED' };
              }
              return row;
            });

            setPreserviceRows(updated);
            setSelectedRows([]);
            setShowFollowUpModal(false);
            setCurrentPage(1);
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


{showReasonModal && (
  <div
    onClick={() => setShowReasonModal(false)}
    onKeyDown={(e) => e.key === 'Escape' && setShowReasonModal(false)}
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
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}
    >
      <h3 style={{ marginBottom: '16px', color: '#003b70' }}>Reason for Pended</h3>
      <p style={{ fontSize: '14px', marginBottom: '24px' }}>
        Missing provider documentation.
      </p>
      <button
        onClick={() => setShowReasonModal(false)}
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


{showAssignModal && (
  <div
    onClick={() => setShowAssignModal(false)}
    onKeyDown={(e) => e.key === 'Escape' && setShowAssignModal(false)}
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
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}
    >
      <h3 style={{ marginBottom: '16px', color: '#003b70' }}>Assign Selected Cases</h3>

      <select
        value={assignTo}
        onChange={(e) => setAssignTo(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '6px',
          border: '1px solid #ccc',
          fontSize: '14px',
          marginBottom: '20px'
        }}
      >
        <option value="">-- Select OwnerName --</option>
        {[...new Set(preserviceRows.map(row => row['OwnerName']).filter(Boolean))]
          .sort()
          .map((name, i) => (
            <option key={i} value={name}>{name}</option>
          ))}
      </select>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
        <button
          onClick={() => {
            const selectedOwner = preserviceRows.find(r => r['OwnerName'] === assignTo);
            if (!selectedOwner) return;

            const updated = preserviceRows.map(row => {
              if (selectedRows.some(sel => sel['SR'] === row['SR'])) {
                return {
                  ...row,
                  OwnerName: selectedOwner['OwnerName'],
                  OwnerID: selectedOwner['OwnerID'],
                  OWNER_HELPER: 'ASSIGNED'
                };
              }
              return row;
            });

            setPreserviceRows(updated);
            setSelectedRows([]);
            setAssignTo('');
            setShowAssignModal(false);
          }}
          disabled={!assignTo}
          style={{
            backgroundColor: '#0071ce',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: assignTo ? 'pointer' : 'not-allowed'
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
