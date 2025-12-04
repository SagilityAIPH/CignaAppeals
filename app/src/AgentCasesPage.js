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
import axios from "axios";
import { dataApiUrl } from './config';
import { useUser } from "./UserContext";
function AgentCasesPage() {
const location = useLocation();

    const { agentId } = useUser();
    const [preserviceRows, setPreserviceRows] = useState([]);
    const [preserviceHeaders, setPreserviceHeaders] = useState([]);
    const [selectedRow, setSelectedRow] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedGsp, setSelectedGsp] = useState('All');
    const [gnbSummary, setGnbSummary] = useState([]);
    const [filterColumn, setFilterColumn] = useState('');
    const [filterValue, setFilterValue] = useState('');
    const [selectedRows, setSelectedRows] = useState([]);
    const [statusFilter, setStatusFilter] = useState('All');
    const [newAssignmentFilter, setNewAssignmentFilter] = useState('All');
    // 'All' | 'Open' | 'Completed'
const [showPendingModal, setShowPendingModal] = useState(false);
const [showCompletedModal, setShowCompletedModal] = useState(false);
const [pendingReason, setPendingReason] = useState('');
const [caseTblAllAgent, setCaseTblAllAgent] = useState([]);
const [casesData, setCasesData] = useState([]);
const [totalAppealCases, setTotalAppealCases] = useState([]);

const [pageNumber, setPageNumber] = useState(1);
const [pageSize, setPageSize] = useState(10);
const [totalCount, setTotalCount] = useState(0);
const [currentPage, setCurrentPage] = useState(1);
const [totalRecords, setTotalRecords] = useState(0);

const [isFetchingAll, setIsFetchingAll] = useState(true);
const [isFetchAllMode, setIsFetchAllMode] = useState(false);
const [paginatedRows, setPaginatedRows] = useState([]);
const totalPages = pageSize === 0 ? 1 : Math.ceil(totalAppealCases / pageSize);
const [showTMinusModal, setShowTMinusModal] = useState(false);
const [criticalSRs, setCriticalSRs] = useState([]);
// ─── Auto-fetch Excel once ───────────────────────────────────────────────
// DISABLED - Now using API data instead of Excel auto-load
/*
useEffect(() => {
  const autoLoadFlag = localStorage.getItem('autoLoadAgent');
  if (autoLoadFlag === 'false') return;

  localStorage.setItem('autoLoadAgent', 'false');

  const fileUrl = `${process.env.PUBLIC_URL}/template/Appeals_Sample.xlsx`;

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

      if (json.length <= 1) return;

      const [rawHeaders, ...rows] = json;
      const headers = rawHeaders.map(h => String(h || '').replace(/\s+/g, ' ').trim());
      const fixedData = rows.map(r =>
        Object.fromEntries(headers.map((key, i) => [key, r[i] ?? '']))
      );

      setPreserviceRows(fixedData);
      setPreserviceHeaders(headers);

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

  // ✅ Always run this


}, []);
        // ← runs once on mount
*/
// const fetchCasesAll = async () => {
//   let allData = [];
//   let page = 1;
//   const tempPageSize = 100;
//   let totalPages = 1;

//   setIsFetchingAll(true); // ⬅️ Block other fetches

//   try {
//     while (page <= totalPages) {
//       const res = await axios.post(`${dataApiUrl}cases_tbl_all_agent?pageNumber=${page}&pageSize=${tempPageSize}`, {
//         agent: 'SG012166',
//         caseStatus: statusFilter === 'All' ? '' : statusFilter
//       });

//       const { totalRecords, data } = res.data;
//       allData = [...allData, ...data];

//       if (page === 1) {
//         totalPages = Math.ceil(totalRecords / tempPageSize);
//         setTotalAppealCases(totalRecords);
//       }

//       page++;
//     }

//     //setCasesData(allData);
//     setCaseTblAllAgent(allData);
//   } catch (err) {
//     if (err.response?.status === 404) {
//       setCaseTblAllAgent([]);
//       setTotalAppealCases(0);
//     } else {
//       console.error("Error fetching all pages:", err);
//     }
//     console.error("Error fetching all pages:", err);
//   } finally {
//     setIsFetchingAll(false); // ✅ Unblock other fetches
//   }
// };



const fetchCasesPage = async (page = currentPage, size = pageSize) => {

  try {
    const res = await axios.post(`${dataApiUrl}cases_tbl_all_agent?pageNumber=${page}&pageSize=${size}`, {
      //agent: 'SG012166',
      agent: agentId,
      caseStatus: statusFilter === 'All' ? '' : statusFilter,
      new_assignment: newAssignmentFilter === 'All' ? '' : newAssignmentFilter
      //assignedStatus: assignmentFilter === 'All' ? '' : assignmentFilter
    });

    const { totalRecords, data } = res.data;
    setCaseTblAllAgent(data);                 // ✅ Use this instead
    setTotalAppealCases(totalRecords);     // for pagination controls
  } catch (err) {
  
    if (err.response?.status === 404) {
      setCaseTblAllAgent([]);
      setTotalAppealCases(0);
    } else {
      console.error("Error fetching all pages:", err);
    }
  } 
};




// Runs on page or pageSize change to fetch paginated data


// Runs when statusFilter changes to reset page and fetch new data & counts

useEffect(() => {
  setCurrentPage(1);
  fetchCasesPage(1, pageSize)
  fetchStatusCounts();
}, [statusFilter, newAssignmentFilter]);

useEffect(() => {
  fetchCasesPage(currentPage, pageSize);
  fetchStatusCounts();
}, [currentPage, pageSize]);



useEffect(() => {
  setCurrentPage(1);
    fetchCasesPage(1, pageSize);
    fetchStatusCounts();
}, []);


useEffect(() => {
  if (!agentId) return;
  fetchCasesPage(1, pageSize);
  fetchStatusCounts();
}, [agentId]);
  

// useEffect(() => {
//     fetchAgents();
// }, [showAssignModal, showFollowUpModal]);
      
const handleRefresh = async () => {
  fetchCasesPage(1, pageSize)
         setStatusFilter("All");
         setPageSize(10); 
};

useEffect(() => {

  console.log(caseTblAllAgent.length + " cases loaded");
  if (statusFilter === "Pended" && caseTblAllAgent.length > 0) {
    const critical = caseTblAllAgent.filter(row => {
      const minutes = getMinutesFromTMinus(row.t_Minus);
      return minutes <= 2000;
    });

    if (critical.length > 0 && critical.length === caseTblAllAgent.length) {
      setCriticalSRs(critical.map(row => row.sr || row.SR || row.SR_Number)); // adjust based on your column name
      setShowTMinusModal(true);
    } else {
      setCriticalSRs([]);
      setShowTMinusModal(false);
    }
  } else {
    setCriticalSRs([]);
    setShowTMinusModal(false);
  }
}, [caseTblAllAgent, statusFilter]);

const getMinutesFromTMinus = (tMinusStr) => {
  if (!tMinusStr || typeof tMinusStr !== 'string') return Infinity;
  const [hours, minutes] = tMinusStr.split(':').map(Number);
  return (hours * 60) + minutes;
};
// useEffect(() => {
//   if (!Array.isArray(caseTblAllAgent) || caseTblAllAgent.length === 0 || !pageSize) return;

//   const start = (currentPage - 1) * pageSize;
//   const end = start + pageSize;
//   setPaginatedRows(caseTblAllAgent.slice(start, end));
// }, [caseTblAllAgent, currentPage, pageSize]);



const handleStatusFilterChange = (newFilter) => {
  setStatusFilter(newFilter);
  setCurrentPage(1);

  if (newFilter === 'All') {
    setIsFetchAllMode(true);       // 👈 Switch to full fetch
    //fetchCasesAll();
  } else {
    setIsFetchAllMode(false);      // 👈 Stay paginated
    //fetchCasesAll();
  }

  fetchStatusCounts(); // optional if you need to refresh counts
};


const fetchCaseDetailsById = async (id) => {
  try {
    const response = await axios.get(`${dataApiUrl}cases_view_per_id/${id}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch case details:", error);
    return null;
  }
};



const [statusCounts, setStatusCounts] = useState({
  completed: 0,
  new_assigned:0,
  pended: 0,
  ff_sent: 0,
  open: 0,
  assigned: 0,
  unassigned: 0,
  total_Count: 0,
});

const fetchStatusCounts = async () => {
  const agent = agentId;

  try {
    const res = await axios.get(`${dataApiUrl}get_cases_status_agent_ct`, {
      params: { agent }
    });

    const data = res.data;

    if (data) {
      setStatusCounts({
        completed: data.completed || 0,
        new_assigned: data.new_Assigned || 0,
        pended: data.pended || 0,
        ff_sent: data.fFup_Sent || 0,
        open: data.open || 0,
        assigned: data.assigned || 0,
        unassigned: data.unassigned || 0,
        total_Count: data.total_Count || 0,
      });
    }
  } catch (error) {
    console.error('Error fetching case status counts:', error);
    setStatusCounts({
      completed: 0,
      new_assigned: 0,
      pended: 0,
      ff_sent: 0,
      open: 0,
      assigned: 0,
      unassigned: 0,
      total_Count: 0,
    });
  }
};






    // ✅ Reset to page 1 when filters change
    useEffect(() => {
    setCurrentPage(1);
    }, [filterColumn, filterValue, selectedGsp]);

  const preserviceAllowedHeaders = [
    'AGE', 'SR.', 'Manager', 'PROMISE', 'Task Promise Date', 'Rec\'d',
    'System', 'LPI?', 'PG?', 'PG Name', 'OwnerID', 'Owner'
  ];

const preserviceColumnMap = {
  'Age_Cal': 'AGE',
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
    
let caseTblAllColumnMap = {
  id: "Id",
  age_Cal: "Age (Days)",
  sr: "SR",
  ff: "FFUp (Days)",
  manager: "Manager",
  agE_PROMISE: "Promise",
  promise_Date: "Promise Date",
  recd_By_Cigna: "Rec'd",
  system: "System",
  lpi: "LPI",
  pg: "PG",
  pG_NAME: "PG Name",
  ownerID: "Owner ID",
  ownerName: "Owner Name",
  appealStatus: "Status",
  case_assignment_status: "Case Assignment Status",
};

// 🟦 Append `T-Minus` column if filter is "Pended"
if (statusFilter === "Pended" || statusFilter === "Open" ) {
  caseTblAllColumnMap.t_Minus = "T-Minus(HH:MM)";
}


  const viewAllDisplayMap = {
      id: "Case ID",
      sr: "SR",
      partName: "Part Name",
      promise_Date: "Promise Date",
      manager: "Manager",
      ownerName: "Owner Name",
      participant_Id: "Participant ID",
      funding_Type: "Funding Type",
      product: "Product",
      root_Cause: "Root Cause",
      account_Name: "Account Name",
      state: "State",
      recd_By_Cigna: "Received by Cigna",
      appealType: "Appeal Type",
      appeal_Category: "Appeal Category",
      age_Cal: "Age (Calendar)",
      age_Bus: "Age (Business)",
      system: "System",
      department: "Department",
      director: "Director",
      ownerID: "Owner ID",
      appeal_Service: "Appeal Service",
      reportDate: "Report Date",
      recd_by_Appeals: "Received by Appeals",
      location: "Location",
      hmo: "HMO",
      claim_System: "Claim System",
      total: "Total",
      age0_5: "Age 0-5",
      age6_10: "Age 6-10",
      age11_15: "Age 11-15",
      age16_21: "Age 16-21",
      age22_26: "Age 22-26",
      age27_30: "Age 27-30",
      age_Over30: "Age Over 30",
      lateReceipts2: "Late Receipts 2",
      nonCompliant2: "Non-Compliant 2",
      nonCompliant: "Non-Compliant",
      lateReceipts: "Late Receipts",
      na: "N/A",
      iTrackDescription: "iTrack Description",
      svC_REQ_OUTSTDG_CNT: "Service Request Outstanding Count",
      svC_REQ_RETND_CNT: "Service Request Returned Count",
      role: "Role",
      role2: "Role 2",
      function: "Function",
      role_NM: "Role Name",
      wrK_GRP_DESC: "Work Group Description",
      fU_FREE_FORM_TXT: "Follow-Up Free Text",
      providerID: "Provider ID",
      account: "Account",
      maxOfClaim: "Max of Claim",
      upload_date: "Upload Date",
      appealStatus: "Case Status",
      update_date: "Update Date",
      was_item_on_previous_report: "Previously Reported",
      agE_HELPER: "Age Helper",
      agE_HELPER2: "Age Helper 2",
      agE_BUCKET: "Age Bucket",
      rootcausE_HELPER: "Root Cause Helper",
      lpi: "LPI",
      pg: "PG",
      pG_NAME: "PG Name",
      pingPong: "Ping Pong",
      reassignedTo: "Reassigned To",
      rolE_FILTER1: "Role Filter 1",
      rolE_FILTER2: "Role Filter 2",
      rolE_FILTER3: "Role Filter 3",
      rolE_FILTER4: "Role Filter 4",
      rolE_FILTER5: "Role Filter 5",
      owneR_HELPER: "Owner Helper",
      fundinG_HELPER: "Funding Helper",
      agE_PROMISE: "Age Promise",
      agE_PROMISE_BUCKET: "Age Promise Bucket",
      membR_STE: "Member State",
      appeL_STE: "Appeal State",
      cusT_PG: "Customer PG",
      proV_PG: "Provider PG",
      pG_NAME2: "PG Name 2",
      pG_ASSIGN: "PG Assign",
      ytD_percent: "YTD %",
      pG_YTD_RESULT: "PG YTD Result",
      recd_date_flag: "Received Date Flag",
      case_assignment_status: "Case Assignment Status",
      pend_reason: "Pending Reason",
      reassign: "Reassign",
      reassign_by: "Reassign By",
      reassign_date: "Reassign Date",
      ff: "FFup (Days)",
      ff_by: "FFup By",
      ff_to: "FFup To",
      ff_date: "FFup Date"
    };
    
  


const resolveExcelHeader = (friendlyHeader) => {
  const found = Object.entries(caseTblAllColumnMap).find(
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
if (statusFilter === 'Pended') return status === 'PENDED';
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




//const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 25;
const totalPages2 = Math.ceil(filteredPreserviceRows.length / rowsPerPage);
// const paginatedRows = filteredPreserviceRows.slice(
//   (currentPage - 1) * rowsPerPage,
//   currentPage * rowsPerPage
// );

const isAllSelected = caseTblAllAgent.length > 0 && selectedRows.length === caseTblAllAgent.length;

const toggleSelectAll = () => {
  if (isAllSelected) {
    setSelectedRows([]);
  } else {
    setSelectedRows(caseTblAllAgent);
  }
};

const toggleRowSelection2 = (row) => {
  const exists = selectedRows.some(selected => selected['SR'] === row['SR']);
  if (exists) {
    setSelectedRows(prev => prev.filter(selected => selected['SR'] !== row['SR']));
  } else {
    setSelectedRows(prev => [...prev, row]);
  }
};

const toggleRowSelection = (row) => {
  setSelectedRows(prevSelected => {
    const exists = prevSelected.some(r => r.id === row.id);
    if (exists) {
      // Remove from selected
      return prevSelected.filter(r => r.id !== row.id);
    } else {
      // Add to selected
      return [...prevSelected, row];
    }
  });
};

const handleUpdateCaseStatus = async ({ status, pendingReason = "" }) => {
  if (selectedRows.length === 0) {
    alert("Please select at least one case.");
    return;
  }

  const idsToUpdate = selectedRows.map(row => Number(row.id)).filter(id => id > 0);

  if (idsToUpdate.length === 0) {
    alert("Selected cases have invalid IDs.");
    return;
  }

  try {
    await axios.post(`${dataApiUrl}appeal_cases_status_update`, {
      ids: idsToUpdate,
      status,
      pend_reason: pendingReason
    });

    await fetchCasesPage(currentPage, pageSize);         // Refresh case data
    await fetchStatusCounts();  // Refresh counts
    setSelectedRows([]);
    alert(`Status updated to ${status} successfully.`);
  } catch (error) {
    console.error(`Failed to update case status to ${status}:`, error);
    alert(`Failed to update case status to ${status}.`);
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
 



{/* Total Appeals Summary Section - Now using API statusCounts instead of Excel gnbSummary */}
{true && (
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

    // const completed = ownedRows.filter(r => getOwnerHelperValue(r) === 'COMPLETED').length;
    // const pending = ownedRows.filter(r => getOwnerHelperValue(r) === 'PENDING').length;
    // const open = ownedRows.filter(r => {
    //   const status = getOwnerHelperValue(r);
    //   return status !== 'COMPLETED' && status !== 'PENDING';
    // }).length;

    // const total = ownedRows.length;

    const completed = statusCounts.completed
    const new_assigned = statusCounts.new_assigned
    const pended = statusCounts.pended
    const ff_sent = statusCounts.ff_sent
    const open = statusCounts.open
    const total = statusCounts.total_Count
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      <>
      
        <div style={{ marginBottom: '8px' }}>
          <span role="img" aria-label="folder">📁</span> Total Cases:{' '}
          <strong>{total}</strong>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <span role="img" aria-label="hourglass">⏳</span> Open / Pend:{' '}
          <strong>{open}</strong>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <span role="img" aria-label="check">✅</span> Completed:{' '}
          <strong>{completed}</strong>
        </div>

          <div style={{ marginBottom: '8px' }}>
          <span role="img" aria-label="check">🆕</span> New Assigned:{' '}
          <strong>{new_assigned}</strong>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <span role="img" aria-label="pause">📦</span> Pended:{' '}
          <strong>{pended}</strong>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <span role="img" aria-label="pause">📧</span> FFUp Sent:{' '}
          <strong>{ff_sent}</strong>
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

{/* Pre-Service Section - Now using API data (caseTblAllAgent) instead of Excel */}
{true && (
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
    Total Appeal Cases: {totalAppealCases}
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



<div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', marginBottom: '16px' }}>
  {/* Filter by Status */}
  <div style={{ width: '200px' }}>
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
      <option value="Pend">Pend</option>
      <option value="Completed">Completed</option>
      <option value="Pended">Pended</option>
      <option value="New Assigned">New Assigned</option>
      <option value="FFup Sent">FFup Sent</option>
    </select>
  </div>
{/* 
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
      value={newAssignmentFilter}
      onChange={(e) => setNewAssignmentFilter(e.target.value)}
      style={{
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        width: '100%',
        fontFamily: 'inherit'
      }}
    >
       <option value="All">All</option>
      <option value="Y">New Assignment</option>
      <option value="N">Pended</option>
    </select>
  </div> */}

  {/* Rows Per Page */}
  <div style={{ display: 'flex', flexDirection: 'column', width: '150px' }}>
    <label
      htmlFor="pageSize"
      style={{
        fontWeight: '500',
        color: '#003b70',
        marginBottom: '4px'
      }}
    >
      Rows per page:
    </label>
    <select
      id="pageSize"
      value={pageSize === 0 ? '' : pageSize}  // show '' if 0 means all
      onChange={(e) => {
        const val = e.target.value;

          setPageSize(parseInt(val, 10));
          setCurrentPage(1);
      
      }}
      style={{
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        fontFamily: 'inherit',
        width: '100%'
      }}
    >
      {[10, 30, 50].map(size => (
        <option key={size} value={size}>{size}</option>
      ))}
</select>

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
    {Object.values(caseTblAllColumnMap).map((header) => (
      <th key={header} style={{ padding: '8px', border: '1px solid #ccc', fontWeight: '600', textAlign: 'center' }}>
        {header}
      </th>
    ))}

<th style={{ padding: '8px', border: '1px solid #ccc', fontWeight: '600', textAlign: 'center' }}>
  Actions
</th>
  </tr>
</thead>
<tbody>
  {caseTblAllAgent.length === 0 ? (
    <tr>
      <td
        colSpan={Object.keys(caseTblAllColumnMap).length + 2} // +1 for checkbox, +1 for actions
        style={{
          padding: '16px',
          textAlign: 'center',
          fontStyle: 'italic',
          color: '#666',
          border: '1px solid #eee',
        }}
      >
        No results found.
      </td>
    </tr>
  ) : (
    caseTblAllAgent.map((row, idx) => {
      const isChecked = selectedRows.some(selected => selected['id'] === row['id']);

      return (
        <tr key={row.id}
        style={{
          padding: '8px',
          border: '1px solid #eee',
          width: '40px',            // same fixed width
          textAlign: 'center',      // center horizontally
          verticalAlign: 'middle'   // center vertically
        }}
        >
          {/* Checkbox */}
          <td >
        <input
          type="checkbox"
         checked={selectedRows.some(selected => selected.id === row.id)}
          onChange={() => toggleRowSelection(row)}
        />
          </td>

          {/* Data columns */}
          {Object.keys(caseTblAllColumnMap).map((excelKey) => (
          <td
            key={excelKey}
            style={{
              padding: '8px',
              border: '1px solid #eee',
              color:
                (excelKey === 't_Minus' &&
                  (row[excelKey] === '04:00' || (!row[excelKey] && row.appealStatus === 'Open'))) ||
                ((excelKey === 'appealStatus' || excelKey === 't_Minus') &&
                  row.appealStatus === 'Pended')
                  ? 'red'
                  : 'inherit',
              fontWeight:
                (excelKey === 't_Minus' &&
                  (row[excelKey] === '04:00' || (!row[excelKey] && row.appealStatus === 'Open'))) ||
                ((excelKey === 'appealStatus' || excelKey === 't_Minus') &&
                  row.appealStatus === 'Pended')
                  ? 'bold'
                  : 'normal',
            }}
          >
            {excelKey === 't_Minus'
              ? row[excelKey] || (row.appealStatus === 'Open' ? '04:00' : '')
              : preserviceDateFields.includes(excelKey)
              ? formatExcelDate(row[excelKey])
              : row[excelKey] ?? ''}
          </td>
        ))}





          {/* Actions */}
          <td style={{ padding: '8px', border: '1px solid #eee' }}>
            <button
              onClick={async () => {
                const details = await fetchCaseDetailsById(row.id);
                if (details) {
                  setSelectedRow(details);   // updates your modal content
                  setShowModal(true);
                } else {
                  alert("Failed to load case details.");
                }
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
    })
  )}
</tbody>





    </table>
  </div>

  {/* Pagination Controls */}
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px', gap: '12px', backgroundColor: '#f9fbff', borderTop: '1px solid #ddd' }}>
    <button
      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
      style={{
        backgroundColor: "#0071ce",
        color: "white",
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
      Page {currentPage} of {totalPages || 1}
    </span>

    <button
      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
      disabled={currentPage === totalPages}
      style={{
        backgroundColor: "#0071ce",
        color: "white",
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
            const displayKey = viewAllDisplayMap[key] || key;
            const displayValue = preserviceDateFields.includes(key)
              ? formatExcelDate(value)
              : (value === null || value === undefined || value === '' ? '-' : value);

            if (
              displayValue === null ||
              displayValue === undefined ||
              (typeof displayValue === 'string' && displayValue.trim() === '')
            ) return null;

            return (
              <tr key={key}>
                <td style={{ fontWeight: '600', padding: '6px', borderBottom: '1px solid #eee', width: '40%' }}>
                  {displayKey}
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
<option value="Routed to CASA Diary-Clinical review">Routed to CASA Diary-Clinical review</option>
<option value="Routed to HD Review- Non IFP">Routed to HD Review- Non IFP</option>
<option value="Sent for Adjustment">Sent for Adjustment</option>
<option value="Routed to Coder review">Routed to Coder review</option>
<option value="Mail sent to TPV ( Pricing Review)">Mail sent to TPV ( Pricing Review)</option>
<option value="Mail sent to Prepay">Mail sent to Prepay</option>
<option value="Mail sent to SIU Review">Mail sent to SIU Review</option>
<option value="Routed to Correspondence">Routed to Correspondence</option>
<option value="Mail sent to Vendor Pricing">Mail sent to Vendor Pricing</option>
<option value="Routed to Auth Load">Routed to Auth Load</option>
<option value="Routed to Committee">Routed to Committee</option>
<option value="Routed to Pharmacy">Routed to Pharmacy</option>
<option value="Routed to Behavioral">Routed to Behavioral</option>
<option value="Routed to Transplant">Routed to Transplant</option>
<option value="Routed to Dialysis">Routed to Dialysis</option>
<option value="Mail sent to Evicore">Mail sent to Evicore</option>
<option value="Mail sent to Pathwell">Mail sent to Pathwell</option>
<option value="Mail sent to RRG ( Revenue recovery group )">Mail sent to RRG ( Revenue recovery group )</option>
<option value="Mail sent to Oral notification">Mail sent to Oral notification</option>
<option value="Mail sent to Expedited Appeals">Mail sent to Expedited Appeals</option>
<option value="Routed to File Request">Routed to File Request</option>
<option value="Mail sent to EMR ( Escalated mail review )">Mail sent to EMR ( Escalated mail review )</option>
<option value="Routed to Customer VS Provider">Routed to Customer VS Provider</option>
<option value="DPL Intake">DPL Intake</option>
<option value="Mail sent for AOR verification">Mail sent for AOR verification</option>
<option value="Misroutes">Misroutes</option>
<option value="Sent for 2nd Touch Escalation">Sent for 2nd Touch Escalation</option>
<option value="Raised Non-DPL">Raised Non-DPL</option>
<option value="Sent for CSE Review">Sent for CSE Review</option>
<option value="Sent for CSE BCC Review">Sent for CSE BCC Review</option>
<option value="Sent Email for SPD Request">Sent Email for SPD Request</option>
<option value="Sent Email for NSA">Sent Email for SCO</option>
<option value="Sent Email for SCO">Sent Email for SCO</option>
<option value="Sent Email for Evicore Escalation">Sent Email for Evicore Escalation</option>
<option value="Sent Email FOR QC- QS">Sent Email FOR QC- QS</option>
<option value="Routed to Alliance">Routed to Alliance</option>
<option value="Raised MRC Intake">Raised MRC Intake</option>
<option value="Pended for 2nd Level Appeal">Pended for 2nd Level Appeal</option>
<option value="Holding for Original SR still not closed">Holding for Original SR still not closed</option>
<option value="Routed to American Specialty Health Network (ASHN)">Routed to American Specialty Health Network (ASHN)</option>
<option value="DPL raised for same scenario">DPL raised for same scenario</option>

          
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
              const match = selectedRows.some(sel => sel['id'] === row['id']);
              if (match) {
                return { ...row, OWNER_HELPER: 'Pended', PENDING_REASON: pendingReason };
              }
              return row;
            });
            handleUpdateCaseStatus({ status: "Pended", pendingReason });
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
{showTMinusModal && (
  <div
    className="modal-overlay"
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    }}
  >
    <div
      className="modal"
      style={{
        background: "#fff",
        borderRadius: "8px",
        padding: "20px",
        maxWidth: "500px",
        width: "90%",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        position: "relative",
      }}
    >
      <button
        onClick={() => setShowTMinusModal(false)}
        style={{
          position: "absolute",
          top: "10px",
          right: "15px",
          background: "none",
          border: "none",
          fontSize: "18px",
          color: "red",
          fontWeight: "bold",
          cursor: "pointer",
        }}
        aria-label="Close Modal"
      >
        ×
      </button>
      <h2 style={{ color: "#d9534f", marginBottom: "10px" }}>
        ⚠️ All cases are within 4 hours of T-Minus!
      </h2>
      <p style={{ marginBottom: "10px" }}>
        The following SRs are critically close to their 48-hour threshold:
      </p>
      <ul style={{ maxHeight: "200px", overflowY: "auto", paddingLeft: "20px" }}>
        {criticalSRs.map((sr, idx) => (
          <li key={idx} style={{ marginBottom: "4px" }}>{sr}</li>
        ))}
      </ul>
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
            handleUpdateCaseStatus({ status: "Completed" });
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
