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

function AgentCasesPage() {
const location = useLocation();


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
  const [showPendingModal, setShowPendingModal] = useState(false);
const [showCompletedModal, setShowCompletedModal] = useState(false);
const [pendingReason, setPendingReason] = useState('');

// ─── Auto-fetch Excel once ───────────────────────────────────────────────
useEffect(() => {
  // use a flag so we only load once, even if the component remounts
  const autoLoadFlag = localStorage.getItem('autoLoadAgent');
  if (autoLoadFlag === 'false') return;        // already fetched in this tab

  localStorage.setItem('autoLoadAgent', 'false');   // mark as done

  const fileUrl = `${process.env.PUBLIC_URL}/Appeals_Sample.xlsx`;

  fetch(fileUrl)
    .then(res => res.arrayBuffer())
    .then(buffer => {
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: 'array' });

      const sheet = workbook.Sheets['DATA'];
      if (!sheet) return;

      const json = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
        raw: false,
        header: 1,
      });

      if (json.length <= 1) return;            // nothing but headers

      // ── Normalise + map rows ───────────────────────────────────────────
      const [rawHeaders, ...rows] = json;
      const headers = rawHeaders.map(h => String(h || '').replace(/\s+/g, ' ').trim());
      const fixedData = rows.map(r =>
        Object.fromEntries(headers.map((key, i) => [key, r[i] ?? '']))
      );

      setPreserviceRows(fixedData);
      setPreserviceHeaders(headers);

      // ── Build G&B summary (same logic as before) ──────────────────────
      const departments = ['Sagility', 'Concentrix', 'Wipro'];
      const grouped = {};
      const bucketKey = 'AGE_BUCKET';
      const deptKey = 'Director';
      const validOwners = ['SHARANAPPA', 'VEERESHA'];

      fixedData.forEach(row => {
        const owner = (row['OwnerName'] || '').trim().toUpperCase();
        if (!validOwners.includes(owner)) return;

        const dept = (row[deptKey] || '').trim();
        const bucket = (row[bucketKey] || '').trim();
        if (!departments.includes(dept) || !bucket) return;

        grouped[dept] = grouped[dept] || {};
        grouped[dept][bucket] = (grouped[dept][bucket] || 0) + 1;
      });

      const allBuckets = ['0-14','15-29','30-44','45-59','60-89','90-179','180-364','365+'];
      const summary = departments.map(d => {
        const counts = grouped[d] || {};
        const row = { Department: d };
        row.Total = allBuckets.reduce((t, b) => {
          const c = counts[b] || 0;
          row[b] = c;
          return t + c;
        }, 0);
        return row;
      });
      const grandTotal = { Department: 'Total' };
      allBuckets.forEach(b => grandTotal[b] = summary.reduce((s,r)=>s+(r[b]||0),0));
      grandTotal.Total = summary.reduce((s,r)=>s+r.Total,0);
      summary.push(grandTotal);

      setGnbSummary(summary);
    })
    .catch(err => console.error('❌ Failed to auto-load Excel:', err));
}, []);           // ← runs once on mount


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
  'SR': 'SR.',
  'Manager': 'Manager',
  'AGE_PROMISE_BUCKET': 'PROMISE',
  'Promise Date': 'Task Promise Date',
  'Recd By Cigna': 'Rec\'d',
  'System': 'System',
  'LPI?': 'LPI?',
  'PG?': 'PG?',
  'PG NAME2': 'PG Name',
  'OwnerID': 'OwnerID',
  'OwnerName': 'Owner' // ← most likely this is the correct field
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

const filteredPreserviceRows = useMemo(() => {


const getOwnerHelperValue = (row) => {
  const key = Object.keys(row).find(k =>
    k.trim().replace(/\s+/g, '_').toUpperCase() === 'OWNER_HELPER'
  );
  return (row[key] || '').trim().toUpperCase();
};

let result = preserviceRows.filter(row => {
  const status = getOwnerHelperValue(row);
  const ownerKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'owner');
const ownerName = (row['OwnerName'] || '').trim().toUpperCase();

  const isValidOwner = ownerName.includes('SHARANAPPA') || ownerName.includes('VEERESHA');
  if (!isValidOwner) return false;

if (statusFilter === 'All') return true;
if (statusFilter === 'Open') return status !== 'COMPLETED' && status !== 'PENDING';
if (statusFilter === 'Completed') return status === 'COMPLETED';
if (statusFilter === 'Pending') return status === 'PENDING';
  return false;
});

  if (selectedGsp !== 'All') {
    result = result.filter(row => (row['Director'] || '').trim() === selectedGsp);
  }

if (filterColumn && filterValue) {
  const actualKey = resolveExcelHeader(filterColumn);
  console.log("🔎 Filter Column (UI):", filterColumn);
  console.log("🧠 Resolved Key:", actualKey);
  console.log("🎯 Filter Value:", filterValue);

  result = result.filter(row => {
    const keyMatch = Object.keys(row).find(k =>
      k.trim().toLowerCase() === actualKey.trim().toLowerCase()
    );

    if (!keyMatch) {
      console.log("❌ Key not found in row:", row);
      return false;
    }

    const rowValue = String(row[keyMatch] ?? '').trim();
    const selected = String(filterValue).trim();

    const isMatch = rowValue === selected;
    if (isMatch) {
      console.log("✅ MATCH:", { rowValue, selected, keyMatch });
    }

    return isMatch;
  });
}

  return result;
}, [preserviceRows, selectedGsp, filterColumn, filterValue, statusFilter]);





const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 25;
const totalPages = Math.ceil(filteredPreserviceRows.length / rowsPerPage);
const paginatedRows = filteredPreserviceRows.slice(
  (currentPage - 1) * rowsPerPage,
  currentPage * rowsPerPage
);

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

        // ✅ Set Pre-Service data
        setPreserviceRows(fixedData);
console.log("🔑 Sample Row Keys:", Object.keys(fixedData[0] || {}));
console.log("🧾 Unique Owner Names:", [...new Set(fixedData.map(row => (row['OwnerName'] || '').trim().toUpperCase()))]);


        setPreserviceHeaders(normalizedHeaders);

        // ✅ Build Total Appeals Summary (filtered by current manager)
        const departments = ['Sagility', 'Concentrix', 'Wipro'];
        const grouped = {};
        const bucketKey = 'AGE_BUCKET';
        const deptKey = 'Director';
        const managerKey = 'Manager';

        fixedData.forEach(row => {
          const validOwners = ['SHARANAPPA', 'VEERESHA'];
const owner = (row['OwnerName'] || '').trim().toUpperCase();
if (!validOwners.includes(owner)) return;

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
      Case Summary
    </h3>

    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      {/* Left Section: Table + Card */}
      <div style={{ flex: 1, minWidth: '450px', maxWidth: '650px' }}>
        {/* Scrollable Table */}
        

        {/* Case Summary Card */}
{/* Case Summary Card */}
<div
  style={{
    marginTop: '0px',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    width: '93.3%',
    fontSize: '14px',
  }}
>
  <h4 style={{ marginTop: '0px', marginBottom: '16px', color: '#003b70', fontWeight: '600' }}>
    
  </h4>

  {(() => {
    const normalize = (val) => (val || '').trim().toUpperCase();

    const getOwnerHelperValue = (row) => {
      const key = Object.keys(row).find(k =>
        k.trim().replace(/\s+/g, '_').toUpperCase() === 'OWNER_HELPER'
      );
      return normalize(row[key]);
    };

    const validOwners = ['SHARANAPPA', 'VEERESHA'];
const ownedRows = preserviceRows.filter(
  r => validOwners.some(name => normalize(r['OwnerName']).includes(name))
);

    const completed = ownedRows.filter(r => getOwnerHelperValue(r) === 'COMPLETED').length;
    const pending = ownedRows.filter(r => getOwnerHelperValue(r) === 'PENDING').length;
    const open = ownedRows.filter(r => {
      const status = getOwnerHelperValue(r);
      return status !== 'COMPLETED' && status !== 'PENDING';
    }).length;

    const total = ownedRows.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      <>
        <div style={{ marginBottom: '8px' }}>
          <span role="img" aria-label="folder">📁</span> Total Cases:{' '}
          <strong>{total}</strong>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <span role="img" aria-label="hourglass">⏳</span> Open / Untouched:{' '}
          <strong>{open}</strong>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <span role="img" aria-label="check">✅</span> Completed:{' '}
          <strong>{completed}</strong>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <span role="img" aria-label="pause">📦</span> Pending:{' '}
          <strong>{pending}</strong>
        </div>

        {/* Progress Bar */}
        <div style={{ fontSize: '12px', marginBottom: '4px', color: '#003b70', fontWeight: '500' }}>
          Completion Rate
        </div>
        <div style={{
          backgroundColor: '#e0e0e0',
          borderRadius: '20px',
          height: '10px',
          overflow: 'hidden',
        }}>
          <div
            style={{
              height: '100%',
              width: `${percent}%`,
              backgroundColor: '#28a745',
              transition: 'width 0.3s ease-in-out',
            }}
          />
        </div>
        <div style={{ fontSize: '12px', marginTop: '4px', textAlign: 'right' }}>
          {percent}%
        </div>
      </>
    );
  })()}
</div>








      </div>


      {/* Chart - Right */}
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


{/* <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
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
</div> */}


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
  boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
}}>
  <div style={{
    fontSize: '16px',
    fontWeight: '600',
    color: '#003b70'
  }}>
    Total Appeal Cases: {filteredPreserviceRows.length}
  </div>

  <div style={{ display: 'flex', gap: '10px' }}>



    {/* Mark as Pending Button */}
<button
  onClick={() => setShowPendingModal(true)}
  disabled={selectedRows.length === 0}
  style={{
    backgroundColor: selectedRows.length > 0 ? '#ffc107' : '#aaa',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: selectedRows.length > 0 ? 'pointer' : 'not-allowed',
    fontWeight: '600'
  }}
>
  Mark as Pended
</button>

{/* Mark as Completed Button */}
<button
  onClick={() => setShowCompletedModal(true)}
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
    <option value="Open">Open</option>
    <option value="Completed">Completed</option>
    <option value="Pending">Pending</option>
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
<th style={{ padding: '8px', border: '1px solid #ccc', fontWeight: '600', textAlign: 'left' }}>
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
    const status = (row['OWNER_HELPER'] || '').trim().toUpperCase();
    if (status === 'COMPLETED') return 'COMPLETED';
    if (status === 'PENDING') return 'PENDING';
    return 'OPEN';
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
      }}
    >
      <h3 style={{ marginBottom: '16px', color: '#003b70' }}>Row Details</h3>
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



{showPendingModal && (
  <div
    onClick={() => setShowPendingModal(false)}
    style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        maxWidth: '500px',
        width: '90%'
      }}
    >
      <h3 style={{ marginTop: 0, color: '#003b70' }}>Confirm Pended Status</h3>
      <p>Please provide a reason for marking the selected {selectedRows.length} case(s) as <strong>Pended</strong>:</p>
        {/* Reason dropdown */}
        <select
          value={pendingReason}
          onChange={(e) => setPendingReason(e.target.value)}
          style={{
            width: '100%',
            marginTop: '10px',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #ccc'
          }}
        >
          <option value="">-- Select Reason --</option>
          <option value="AOR verification">AOR verification</option>
          <option value="Auth Load">Auth Load</option>
          <option value="CASA Diary-Clinical review">CASA Diary-Clinical review</option>
          <option value="Coder review">Coder review</option>
          <option value="Committee">Committee</option>
          <option value="Correspondence">Correspondence</option>
          <option value="Customer VS Provider">Customer VS Provider</option>
          <option value="DPL Intake">DPL Intake</option>
          <option value="EMR ( Escalated mail review )">EMR ( Escalated mail review )</option>
          <option value="Evicore">Evicore</option>
          <option value="Expedited Appeals">Expedited Appeals</option>
          <option value="File Request">File Request</option>
          <option value="HD Review- Non IFP">HD Review- Non IFP</option>
          <option value="Mail sent to Vendor Pricing">Mail sent to Vendor Pricing</option>
          <option value="Mails to Prepay">Mails to Prepay</option>
          <option value="Mails to TPV">Mails to TPV</option>
          <option value="Misroutes">Misroutes</option>
          <option value="Pathwell">Pathwell</option>
          <option value="Oral notification">Oral notification</option>
          <option value="Pharmacy, Behavioral, Transplant & Dialysis">Pharmacy, Behavioral, Transplant & Dialysis</option>
          <option value="RRG ( Revenue recovery group )">RRG ( Revenue recovery group )</option>
          <option value="Sent for Adjustment">Sent for Adjustment</option>
          <option value="SIU Review">SIU Review</option>
          
        </select>
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button
          onClick={() => setShowPendingModal(false)}
          style={{
            backgroundColor: '#ccc',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            const updated = preserviceRows.map(row => {
              const match = selectedRows.some(sel => sel['SR'] === row['SR']);
              if (match) {
                return { ...row, OWNER_HELPER: 'PENDING', PENDING_REASON: pendingReason };
              }
              return row;
            });

            setPreserviceRows(updated);
            setSelectedRows([]);
            setCurrentPage(1);
            setPendingReason('');
            setShowPendingModal(false);
          }}
          disabled={pendingReason.trim() === ''}
          style={{
            backgroundColor: '#ffc107',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: pendingReason.trim() === '' ? 'not-allowed' : 'pointer'
          }}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}


{showCompletedModal && (
  <div
    onClick={() => setShowCompletedModal(false)}
    style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        maxWidth: '400px',
        width: '90%'
      }}
    >
      <h3 style={{ marginTop: 0, color: '#003b70' }}>Confirm Completed Status</h3>
      <p>Are you sure you want to mark {selectedRows.length} case(s) as <strong>Completed</strong>?</p>
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button
          onClick={() => setShowCompletedModal(false)}
          style={{
            backgroundColor: '#ccc',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Cancel
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
            setShowCompletedModal(false);
          }}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}


    </div>
  );
}


export default AgentCasesPage;
