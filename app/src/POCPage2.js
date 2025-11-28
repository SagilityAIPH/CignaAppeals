// POCPage.js
import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import * as XLSX from 'xlsx';
import { Outlet, useNavigate, useLocation } from "react-router-dom";
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
import axios from 'axios';
import { dataApiUrl, dataApiEmailUrl, exportAPI } from './config';

import { useUser } from './UserContext';
/* ----------------------------- SAMPLE DATA -------------------------------- */
// Hard-coded age-bucket numbers for the preview.
// Replace these with live data once the Excel parsing is wired up.
let SAMPLE_GNB_SUMMARY = [
  {
    Department: "Sagility",
    "0-14": 0,
    "15-29": 0,
    "30-44": 0,
    "45-59": 0,
    "60-89": 0,
    "90-179": 0,
    "180-364": 0,
    "365+": 0,
    Total: 0,
  },
  {
    Department: "Concentrix",
    "0-14": 0,
    "15-29": 0,
    "30-44": 0,
    "45-59": 0,
    "60-89": 0,
    "90-179": 0,
    "180-364": 0,
    "365+": 0,
    Total: 0
  },
  {
    Department: "Total",
    "0-14": 0,
    "15-29": 0,
    "30-44": 0,
    "45-59": 0,
    "60-89": 0,
    "90-179": 0,
    "180-364": 0,
    "365+": 0,
    Total: 0,
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
  const [selectedReport, setSelectedReport] = useState("All");
  const [selectedGsp, setSelectedGsp] = useState("All");
  // New state to track the claim_system parameter based on selectedReport
  const [claimSystemParam, setClaimSystemParam] = useState("");
  // New state to track the account parameter based on selectedGsp
  const [accountParam, setAccountParam] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileInputRef = useRef(null);

  const loginState = JSON.parse(sessionStorage.getItem("loginState"));
  const {user} = useUser();
  const managerName = user?.fullName || "User";
  const [preserviceRows, setPreserviceRows] = useState([]);
  const [preserviceHeaders, setPreserviceHeaders] = useState([]);
  const [caseStatusFilter, setCaseStatusFilter] = useState("All");
  const [assignmentFilter, setAssignmentFilter] = useState("All");
  const [prioritizationFilter, setPrioritizationFilter] = useState("All");
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const rowsPerPage = 10; // You can change this to 20, 50 etc.
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTo, setAssignTo] = useState([]);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showFollowToast, setShowFollowToast] = useState(false);
  const [agentSearchTerm, setAgentSearchTerm] = useState("");
  const [caseTblAllPoc, setCaseTblAllPoc] = useState([]);
const [casesData, setCasesData] = useState([]);
const [totalAppealCases, setTotalAppealCases] = useState([]);
const [pageNumber, setPageNumber] = useState(1);
const [pageSize, setPageSize] = useState(10);

const [currentPage, setCurrentPage] = useState(1);

const totalPages = pageSize === 0 ? 1 : Math.ceil(totalAppealCases / pageSize);

const [paginatedRows, setPaginatedRows] = useState([]);
const [agentList, setAgentList] = useState([]);
const isAllSelected = caseTblAllPoc.length > 0 && selectedRows.length === caseTblAllPoc.length;
  const [summaryData, setSummaryData] = useState(SAMPLE_GNB_SUMMARY);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  //const [showSuccessUpload, setShowSuccessUpload] = useState(false);
  const [startHideUploadPanelTimer, setStartHideUploadPanelTimer] = useState(false);
  const serverAPI = "https://uat-cg-lpi-portal.sagilityhealth.com:8081/";
  const [departmentList, setDepartmentList] = useState([]);
  const [ageSummary, setAgeSummary] = useState([]);
  const [caseStatusCt, setCaseStatusCt] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Debug: Track when important state variables change
  useEffect(() => {
    console.log('State Update - caseTblAllPoc changed:', {
      length: caseTblAllPoc?.length,
      first3: caseTblAllPoc?.slice(0, 3)
    });
  }, [caseTblAllPoc]);

  useEffect(() => {
    console.log('State Update - caseStatusCt changed:', caseStatusCt);
  }, [caseStatusCt]);

  useEffect(() => {
    console.log('State Update - ageSummary changed:', {
      length: ageSummary?.length,
      first3: ageSummary?.slice(0, 3)
    });
  }, [ageSummary]);
  const [refreshing, setRefreshing] = useState(false);
  const { pocId, account } = useUser();

  // Debug: Log the account value from UserContext and user data
  useEffect(() => {
    console.log('POCPage2 - Account from UserContext:', account);
    console.log('POCPage2 - User from UserContext:', user);
    
    // If we don't have an account but we have user data, try to derive or fetch account
    if (!account && user?.agentID) {
      console.log('No account found, but user exists. May need to fetch account from API or derive from user data');
      // TODO: Add logic to fetch account from API based on user.agentID or other user properties
    }
  }, [account, user]);

  // Helper functions for agent name formatting and sorting
  const formatAgentName = (agentName) => {
    if (!agentName) return '';
    
    // Extract ID and name from format like "FirstName LastName (ID)" or "(ID) FirstName LastName"
    const idMatch = agentName.match(/\(([^)]+)\)/);
    const id = idMatch ? idMatch[1] : '';
    
    // Remove ID from the string to get just the name
    const nameOnly = agentName.replace(/\s*\([^)]+\)\s*/g, '').trim();
    
    // Return in format "(ID) FirstName LastName"
    return id ? `(${id}) ${nameOnly}` : nameOnly;
  };

  const getFirstName = (agentName) => {
    if (!agentName) return '';
    
    // Remove ID from the string to get just the name
    const nameOnly = agentName.replace(/\s*\([^)]+\)\s*/g, '').trim();
    
    // Get first name (first word)
    const firstName = nameOnly.split(' ')[0];
    return firstName || '';
  };

  // Filter agents based on search term
  const filteredAgents = useMemo(() => {
    if (!agentSearchTerm) return [];
    
    return agentList
      .filter(agent => {
        if (!agent.agent_name_withId) return false;
        const lower = agent.agent_name_withId.toLowerCase();
        return (
          !lower.includes("proclaim_queu") &&
          !lower.includes("queue") &&
          !lower.startsWith("sagproc") &&
          lower.includes(agentSearchTerm.toLowerCase())
        );
      })
      .sort((a, b) => {
        const firstNameA = getFirstName(a.agent_name_withId);
        const firstNameB = getFirstName(b.agent_name_withId);
        return firstNameA.localeCompare(firstNameB, undefined, { sensitivity: 'base' });
      })
      .slice(0, 10); // Limit to 10 results for performance
  }, [agentList, agentSearchTerm]);

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
     'ff': 'FFup Days',
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

  
let caseTblAllColumnMap = {
  
  sr: "SR",
   ff: 'FFup (Days)',
  age_Cal: "Age (Days)",
  manager: "Manager",
  agE_PROMISE: "Promise",
  promise_Date: "Promise Date",
  recd_By_Cigna: "Rec'd",
  system: "System",
  lpi: "LPI",
  pg: "PG",
  nonCompliant2: "Non-Compliant 2", 
  appeal_Category: "Appeal Category",
  pG_NAME: "PG Name",
  ownerID: "Owner ID",
  ownerName: "Owner Name",
  appealStatus: "Status",
  case_assignment_status: "Case Assignment Status",
};

// 🟦 Append `T-Minus` column if filter is "Pended"
if (caseStatusFilter === "Pended") {
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

  const getOwnerHelperValue = (row) => {
    const key = Object.keys(row).find(k =>
      k.trim().replace(/\s+/g, "_").toUpperCase() === "OWNER_HELPER"
    );
    return (row[key] || "").trim().toUpperCase();
  }; 

  // Helper functions to filter dropdown options based on user account
  const getAvailableReportOptions = useCallback(() => {
  
    if (!account) return ['All', 'Proclaim', 'Facets', 'Others']; // Default if no account
    
    switch (account.toLowerCase()) {
      case 'concentrix':
       
        return ['Facets', 'Proclaim']; // Concentrix users can choose between Facets and Proclaim
      case 'wipro':
        return ['Facets'];
      case 'sagility':
     
        return ['All', 'Facets', 'Proclaim', 'Others']; // Sagility users see all options
      default:
       
        return ['All', 'Facets','Proclaim', 'Others']; // Default all options
    }
  }, [account]);

  const getAvailableGspOptions = useCallback(() => {

    if (!account) return ['All', 'Concentrix', 'Sagility', 'Wipro']; // Default if no account
    
    switch (account.toLowerCase()) {
      case 'concentrix':
      
        return ['Concentrix']; // Concentrix users only see Concentrix
      case 'wipro':
        return ['Wipro'];

      case 'sagility':
        return ['All', 'Concentrix', 'Sagility', 'Wipro', 'Onshore']; // Sagility users see all options
      default:
        return ['All', 'Concentrix', 'Sagility',  'Wipro', 'Onshore']; // Default all options
    }
  }, [account]);

  // Helper function to determine if dropdowns should be disabled
  const isDropdownDisabled = useCallback(() => {
    // Only Wipro has both dropdowns disabled
    // Concentrix can now use Choose Report dropdown
    return account && account.toLowerCase() === 'wipro';
  }, [account]);

  // Helper function to determine if GSP dropdown should be disabled
  const isGspDropdownDisabled = useCallback(() => {
    // GSP dropdown is disabled for Concentrix and Wipro (they can only see their own GSP)
    return account && ['concentrix', 'wipro'].includes(account.toLowerCase());
  }, [account]);

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

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRows([]);
    } else {
      setSelectedRows(caseTblAllPoc);
    }
  };

  const preserviceDateFields = ['Promise Date', 'Recd By Cigna'];
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



// const fetchCases = async () => {
//   const effectivePageSize = !pageSize ? 9999999 : pageSize; // default big number if "fetch all"
//   const effectivePageNumber = !pageSize ? 1 : currentPage;

//   try {
//     const res = await axios.post(
//       `${dataApiUrl}cases_tbl_all_poc?pageNumber=${effectivePageNumber}&pageSize=${effectivePageSize}`,
//       {
//         poc: '',
//         caseStatus: caseStatusFilter === 'All' ? '' : caseStatusFilter,
//         assignedStatus: assignmentFilter === 'All' ? '' : assignmentFilter
//       }
//     );

//     const { totalRecords, data } = res.data;
//     setCaseTblAllPoc(data);
//     setTotalAppealCases(totalRecords);
//   } catch (err) {
//     if (err.response?.status === 404) {
//       setCaseTblAllPoc([]);
//       setTotalAppealCases(0);
//     } else {
//       console.error("Error fetching data:", err);
//     }
//   }
// };


const fetchAgents = async () => {
  try {
    const response = await axios.get(`${dataApiUrl}appeals_agents_list?account=${account}`);
    const agents = response.data || [];

    // Filter agents whose account matches any of the values in departmentList
    const matchedAgents = agents.filter(agent =>
      departmentList.includes(agent.account)
    );

    setAgentList(matchedAgents);
  } catch (error) {
    console.error("Failed to fetch or filter agents by account", error);
  }
};


const fetchCasesAll = async () => {
  let allData = [];
  let page = 1;
  const tempPageSize = 500;
  let totalPages = 1;


  try {
    while (page <= totalPages) {
      const res = await axios.post(`${dataApiUrl}cases_tbl_all_poc?pageNumber=${page}&pageSize=${tempPageSize}`, {
        poc: 'M132305',
        caseStatus: caseStatusFilter === 'All' ? '' : caseStatusFilter,
        assignedStatus: assignmentFilter === 'All' ? '' : assignmentFilter
      });

      const { totalRecords, data } = res.data;
      allData = [...allData, ...data];

      if (page === 1) {
        totalPages = Math.ceil(totalRecords / tempPageSize);
        setTotalAppealCases(totalRecords);
      }

      page++;
    }

    //setCasesData(allData);
    setCaseTblAllPoc(allData);
  } catch (err) {
    if (err.response?.status === 404) {
      setCaseTblAllPoc([]);
      setTotalAppealCases(0);
    } else {
      console.error("Error fetching all pages:", err);
    }
    console.error("Error fetching all pages:", err);
  } 
};


// const fetchCasesPage = async (page = currentPage, size = pageSize) => {
//   setIsLoading(true);

  
     

    
//   try {
//     const res = await axios.post(`${dataApiUrl}cases_tbl_all_poc?pageNumber=${page}&pageSize=${size}`, {
//       poc: 'M132305',
//       caseStatus: caseStatusFilter === 'All' ? '' : caseStatusFilter,
//       assignedStatus: assignmentFilter === 'All' ? '' : assignmentFilter

    
//     });




//     const { totalRecords, data } = res.data;
//     setCaseTblAllPoc(data);                 // ✅ Use this instead
//     setTotalAppealCases(totalRecords);     // for pagination controls
//   } catch (err) {
  
//     if (err.response?.status === 404) {
//       setCaseTblAllPoc([]);
//       setTotalAppealCases(0);
//     } else {
//       console.error("Error fetching all pages:", err);
//     }
//   } finally {
//     setIsLoading(false);
//   }
// };


const fetchCasesPage = async (page = currentPage, size = pageSize) => {
  setIsLoading(true);

  // 🛡️ GUARD: Prevent API calls with blank parameters for specific accounts
  if (!claimSystemParam && !accountParam) {
    if (account === 'Concentrix' || account === 'Wipro' || account === 'Onshore') {
      console.error('❌ BLOCKED: API call prevented - account parameter required for', account);
      setIsLoading(false);
      setCaseTblAllPoc([]);
      setTotalAppealCases(0);
      return; // Exit early - don't call API
    }
    console.warn('⚠️ fetchCasesPage called with BLANK parameters for Sagility account');
  }

  // Map selected prioritization value to backend params
  let prioritizationPayload = {
    NonCompliant2: '',
    PG: '',
    prioritization: ''
  };

  switch (prioritizationFilter) {
    case 'NonCompliant2_Yes':
      prioritizationPayload.NonCompliant2 = 'YES';
      break;
    case 'PG_Yes':
      prioritizationPayload.PG = 'YES';
      break;
    case 'PreService':
      prioritizationPayload.prioritization = 'Pre-Service';
      break;
    default:
      break;
  }

  try {
    const apiPayload = {
      caseStatus: caseStatusFilter === 'All' ? '' : caseStatusFilter,
      assignedStatus: assignmentFilter === 'All' ? '' : assignmentFilter,
      claim_system: claimSystemParam,
      account: accountParam,
      ...prioritizationPayload
    };
    
    console.log('✅ fetchCasesPage called with parameters:', apiPayload, 'for account:', account);
    
    console.log('API Request to cases_tbl_all_poc with payload:', apiPayload);
    
    const res = await axios.post(
      `${dataApiUrl}cases_tbl_all_poc?pageNumber=${page}&pageSize=${size}`,
      apiPayload
    );

    const { totalRecords, data } = res.data;
    console.log('API Response from cases_tbl_all_poc:', {
      totalRecords,
      dataLength: data?.length,
      firstFewRecords: data?.slice(0, 3), // Log first 3 records to see what data we're getting
      accountsInData: [...new Set(data?.map(item => item.account))] // Show unique accounts in the response data
    });
    
    console.log('Setting state - setCaseTblAllPoc with', data?.length, 'records');
    console.log('Setting state - setTotalAppealCases to', totalRecords);
    
    setCaseTblAllPoc(data);
    setTotalAppealCases(totalRecords);
  } catch (err) {
    if (err.response?.status === 404) {
      setCaseTblAllPoc([]);
      setTotalAppealCases(0);
    } else {
      console.error("Error fetching all pages:", err);
    }
  } finally {
    setIsLoading(false);
  }
};




const didMountRef = useRef(false);
// 2. Filter change watcher
useEffect(() => {
  // Only fetch data if we have an account (to ensure proper filtering)
  if (account) {
    console.log('🔄 Filter change detected with account:', account, 'parameters:', { claimSystemParam, accountParam });
    setCurrentPage(1);
    fetchCasesPage(1, pageSize)
    fetchAgeBuckets();
    fetchCaseStatusCt();
  } else {
    console.log('⏳ Waiting for account to be available before applying filters...');
  }
}, [account, caseStatusFilter, assignmentFilter, prioritizationFilter, claimSystemParam, accountParam, pageSize]); // Include account

useEffect(() => {
  // Only fetch data if we have an account (to ensure proper filtering)
  if (account) {
    console.log('📄 Page change detected with account:', account, 'page:', currentPage);
    fetchCasesPage(currentPage, pageSize);
  }
}, [account, currentPage, pageSize, claimSystemParam, accountParam]); // Include account

const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jwt = params.get("jwt");
    if (jwt) {
      localStorage.setItem("authToken", jwt);
      // optionally decode & set user info
    }
  }, [location]);

useEffect(() => {
  // Only fetch data if we have an account (to ensure proper filtering)
  if (account) {
    console.log('🚀 Initial data fetch triggered with account:', account, 'claimSystemParam:', claimSystemParam, 'accountParam:', accountParam);
    fetchAgeBuckets()
    fetchCasesPage(1, pageSize)
    fetchCaseStatusCt()
    setUploadComplete(true); // Reset upload state on mount
  } else {
    console.log('⏳ Waiting for account to be available before fetching data...');
  }
}, [account, claimSystemParam, accountParam, pageSize]); // Include account as dependency

// Set default dropdown values based on user account
useEffect(() => {
  console.log('useEffect for account defaults triggered. Account:', account);
  if (account) {
    // Set defaults based on account type
    if (account.toLowerCase() === 'concentrix') {
      console.log('Setting Concentrix defaults: Proclaim, Concentrix');
      // Concentrix users: force to their only options
      setSelectedReport('Proclaim');
      setSelectedGsp('Concentrix');
      // Also immediately set the parameters to avoid initial blank API calls
      setClaimSystemParam('Proclaim');
      setAccountParam('Concentrix');
    } else if (account.toLowerCase() === 'wipro') {
      console.log('Setting Wipro defaults: Facets, Wipro');
      // Wipro users: force to their only options
      setSelectedReport('Facets');
      setSelectedGsp('Wipro');
      // Also immediately set the parameters to avoid initial blank API calls
      setClaimSystemParam('Facets');
      setAccountParam('Wipro');
    } else if (account.toLowerCase() === 'sagility') {
      console.log('Setting Sagility defaults: All, All');
      // Sagility users: set to All to give them full access
      setSelectedReport('All');
      setSelectedGsp('All');
      // Also immediately set the parameters to avoid initial blank API calls
      setClaimSystemParam(''); // 'All' maps to empty string
      setAccountParam(''); // 'All' maps to empty string
    }
  }
}, [account]); // Only run when account changes

// Update claimSystemParam whenever selectedReport changes
useEffect(() => {
  // Only update parameters if we have an account (to avoid blank parameter calls)
  if (account) {
    const newClaimSystemParam = (() => {
      switch (selectedReport) {
        case 'All': return '';
        case 'Facets': return 'Facets';
        case 'Proclaim': return 'Proclaim';
        case 'Others': return 'Others';
        default: return '';
      }
    })();
    
    console.log('🔧 Updating claimSystemParam (with account):', selectedReport, '->', newClaimSystemParam, 'account:', account);
    setClaimSystemParam(newClaimSystemParam);
  } else {
    console.log('⏸️ Skipping claimSystemParam update (no account):', selectedReport);
  }
}, [selectedReport, account]); // Include account as dependency

// Update accountParam whenever selectedGsp changes
useEffect(() => {
  // Only update parameters if we have an account (to avoid blank parameter calls)
  if (account) {
    const newAccountParam = (() => {
      switch (selectedGsp) {
        case 'All': return '';
        case 'Sagility': return 'Sagility';
        case 'Concentrix': return 'Concentrix';
        case 'Wipro': return 'Wipro';
        case 'Onshore': return 'Onshore';
        default: return '';
      }
    })();
    
    console.log('🔧 Updating accountParam (with account):', selectedGsp, '->', newAccountParam, 'account:', account);
    setAccountParam(newAccountParam);
  } else {
    console.log('⏸️ Skipping accountParam update (no account):', selectedGsp);
  }
}, [selectedGsp, account]); // Include account as dependency


// useEffect(() => {
//   if (departmentList.length > 0) {
//     fetchAgents();
//   }
// }, [departmentList]);
  
useEffect(() => {
  if (startHideUploadPanelTimer) {
    const timer = setTimeout(() => {
       // ✅ hide panel
      setShowSuccessMessage(false);  // ✅ hide message
      //setUploadComplete(false);      // optional
      setSelectedFileName("");       // clear file name
      setStartHideUploadPanelTimer(false); // ✅ reset trigger
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [startHideUploadPanelTimer]);

const sortedCases = useMemo(() => {
  if (!caseTblAllPoc || !sortConfig.key) return caseTblAllPoc;

  const sorted = [...caseTblAllPoc].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];

    // If sorting by date
    if (sortConfig.key === "promise_Date") {
      const dateA = new Date(aVal);
      const dateB = new Date(bVal);
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    }

    // Default string/number sort
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}, [caseTblAllPoc, sortConfig]);

const handleSort = (columnKey) => {
  setSortConfig((prev) => {
    if (prev.key === columnKey) {
      return { key: columnKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    } else {
      return { key: columnKey, direction: 'asc' };
    }
  });
};


const fetchCaseStatusCt = async () => {
  // 🛡️ GUARD: Prevent API calls with blank parameters for specific accounts
  if (!claimSystemParam && !accountParam) {
    if (account === 'Concentrix' || account === 'Wipro' || account === 'Onshore') {
      console.error('❌ BLOCKED: fetchCaseStatusCt prevented - account parameter required for', account);
      setCaseStatusCt(null);
      return; // Exit early - don't call API
    }
    console.warn('⚠️ fetchCaseStatusCt called with BLANK parameters for Sagility account');
  }

  try {
    const params = { claim_system: claimSystemParam, account: accountParam };
    
    console.log('✅ fetchCaseStatusCt called with parameters:', params, 'for account:', account);
    
    const res = await axios.get(`${dataApiUrl}get_cases_status_ct_poc`, {
      params: params
    });

    console.log('API Response from get_cases_status_ct_poc:', res.data);

    if (res.data) {
      setCaseStatusCt(res.data);
    } else {
      setCaseStatusCt(null);
    }
  } catch (error) {
    console.error("Failed to fetch case status:", error);
    setCaseStatusCt(null);
  }
};

// useEffect(() => {
//     fetchAgents();
// }, [showAssignModal, showFollowUpModal]);
      
const handleRefresh = async () => {

    setRefreshing(true);
  try {
    // Reset all state to initial values
    setAssignmentFilter("All");
    setCaseStatusFilter("All");
    setPrioritizationFilter("");
    setCurrentPage(1);
    setPageSize(10);
    setSelectedRows([]);
    setAssignTo([]);
    setAgentSearchTerm("");
    setSortConfig({ key: null, direction: 'asc' });
    
    // Fetch all fresh data in parallel
    await Promise.all([
      fetchCasesPage(1, 10),
      fetchAgeBuckets(),
      fetchCaseStatusCt()
    ]);
    
    console.log("Data refreshed successfully");
    
  } catch (error) {
    console.error("Error refreshing data:", error);
    // Optional: Add user notification
  } finally {

     setRefreshing(false);
  }
};

const handleAutoEmail = async () => {
  try {
    const response = await axios.post(`${dataApiEmailUrl}AutoSendAppealsEmail`);

    if (response.status === 200) {
      alert("✅ Appeals emails were sent successfully.");
    } else {
      alert("⚠️ Something went wrong. Please try again.");
    }
  } catch (error) {
    console.error("Error sending auto emails:", error);
    alert("❌ Failed to send appeals emails. Check the console for details.");
  }
};

const handleSendSummaryCountEmail = async () => {
  try {
    const response = await axios.post(
      `${dataApiEmailUrl}SendUnassignedAppealsSummaryEmail`,
      null, // no body
      {
        params: { pocId } // Use pocId from UserContext that's already destructured
      }
    );

    if (response.status === 200) {
      alert("✅ Appeals emails were sent successfully.");
    } else {
      alert("⚠️ Something went wrong. Please try again.");
    }
  } catch (error) {
    console.error("Error sending auto emails:", error);
    alert("❌ Failed to send appeals emails. Check the console for details.");
  }
};


const handleExtractExcel = async () => {
  try {
    const response = await axios.get(`${exportAPI}export_appeals`, {
      responseType: 'blob', // Important for file download
    });

    // Try to extract filename from Content-Disposition header
    let filename;
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.indexOf('filename=') !== -1) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    // If not present, use the fallback format
    if (!filename) {
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      filename = `appeals_raw_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;
    }

    // Create a link to download the file
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert('Failed to export Excel file.');
    console.error(error);
  }
};

// useEffect(() => {
//   const start = (currentPage - 1) * pageSize;
//   const end = start + pageSize;
//   setPaginatedRows(caseTblAllPoc.slice(start, end));
// }, [caseTblAllPoc, currentPage, pageSize]);   


const fetchCaseDetailsById = async (id) => {
  try {
    const response = await axios.get(`${dataApiUrl}cases_view_per_id/${id}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch case details:", error);
    return null;
  }
};

const fetchAgeBuckets = async () => {
  // 🛡️ GUARD: Prevent API calls with blank parameters for specific accounts
  if (!claimSystemParam && !accountParam) {
    if (account === 'Concentrix' || account === 'Wipro' || account === 'Onshore') {
      console.error('❌ BLOCKED: fetchAgeBuckets prevented - account parameter required for', account);
      setAgeSummary([]);
      setDepartmentList([]);
      return; // Exit early - don't call API
    }
    console.warn('⚠️ fetchAgeBuckets called with BLANK parameters for Sagility account');
  }

  try {
    const params = { claim_system: claimSystemParam, account: accountParam };
    
    console.log('✅ fetchAgeBuckets called with parameters:', params, 'for account:', account);
    
    const res = await axios.get(`${dataApiUrl}get_age_bucket_poc`, {
      params: params
    });
    
    const data = res.data || [];
    console.log('API Response from get_age_bucket_poc:', {
      dataLength: data.length,
      firstFewRecords: data.slice(0, 3),
      accountsInData: [...new Set(data.map(item => item.account))]
    });

    // For filtering
    const departments = [
      ...new Set(
        data
          .map(item => item.department)
          .filter(dep => dep && dep.toLowerCase() !== "total")
      )
    ];
    setDepartmentList(departments);

    // For summary display (includes Total)
    setAgeSummary(
      data.map(item => ({
        Department: item.department,
        "0-14": item.ab0_14,
        "15-29": item.ab15_29,
        "30-44": item.ab30_44,
        "45-59": item.ab45_59,
        "60-89": item.ab60_89,
        "90-179": item.ab90_179,
        "180-364": item.ab180_364,
        "365+": item.ab365_Plus,
        Total: item.total
      }))
    );
  } catch (error) {
    console.error("Error fetching age bucket summary:", error);
    setAgeSummary([]);
  }
};



  // const filteredPreserviceRows = useMemo(() => {
  //   return preserviceRows.filter((row) => {
  //     const managerMatch = true; // no manager filtering in POCPage
  //     if (!managerMatch) return false;

  //     const matchesCaseStatus =
  //       caseStatusFilter === "All" ||
  //       String(row["Status"] || "").trim() === caseStatusFilter;

  //     const rawHelper = String(row["OWNER_HELPER"] || "").trim().toUpperCase();
  //     const matchesAssignment =
  //       assignmentFilter === "All" ||
  //       (assignmentFilter === "Assigned" && rawHelper === "ASSIGNED") ||
  //       (assignmentFilter === "Unassigned" &&
  //         (rawHelper === "" || rawHelper === "UNASSIGNED"));

  //     return matchesCaseStatus && matchesAssignment;
  //   });
  // }, [preserviceRows, caseStatusFilter, assignmentFilter]);


  /* -------- Helpers -------- */
  const triggerFileDialog = () =>
    fileInputRef.current && fileInputRef.current.click();

  const handleNavClick = (path, key) => {
    setSelectedItem(key);
    navigate(path);
  };

  // Clear all data when account changes to prevent showing cached data from previous account
  useEffect(() => {
    if (account) {
      console.log('🔄 Account changed to:', account, '- Clearing cached data');
      // Clear all data states to force fresh fetch for the new account
      setCaseTblAllPoc([]);
      setCaseStatusCt([]);
      setAgeSummary([]);
      setSelectedRows([]);
      // Reset pagination
      setCurrentPage(1);
      
      console.log('✅ Account change cleanup complete. Fresh data will be fetched by other useEffects.');
    }
  }, [account]); // Only depend on account

  // Cleanup function when component unmounts to clear any remaining state
  useEffect(() => {
    return () => {
      console.log('🧹 POCPage2 component unmounting - clearing all state');
      // This will run when the component is unmounted (e.g., when user logs out)
      setCaseTblAllPoc([]);
      setCaseStatusCt([]);
      setAgeSummary([]);
      setSelectedRows([]);
      setCurrentPage(1);
      setClaimSystemParam(''); // Reset claimSystemParam on cleanup
      setAccountParam(''); // Reset accountParam on cleanup
    };
  }, []);

  const handleFileSelect = async (e) => {

    setShowSuccessMessage(false);  // ✅ hide message
   
    setStartHideUploadPanelTimer(false); // ✅ reset trigger

    setUploadProgress(0);
    setUploadComplete(false);

    const file = e.target.files[0];
    if (!file) return;
  
    console.log("Selected file:", file.name);
    setSelectedFileName(file.name);
  
  
    // 🔄 Progress Bar Animation (optional but keeps UI active)
    let prog = 0;
    const timer = setInterval(() => {
      prog += 1 + Math.random() * 2;
      if (prog >= 100) {
        prog = 100;
        clearInterval(timer);
        setUploadComplete(true);
        setShowSuccessMessage(true);
        setStartHideUploadPanelTimer(true);
      }
      setUploadProgress(prog);
    }, 400);
   
    // ✅ Upload and wait for data refresh
    await uploadCsv(file); 
    handleAutoEmail();
    handleSendSummaryCountEmail();
  // This should include fetchCases() + fetchSummary()
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

   const issueAppeals = async () => {
    axios.get(serverAPI + 'api/AppealsIssue/')
    .then(res => {
        console.log("Project data loaded successfully:", res.data);
    })
    .catch(err => {
        console.error("Error loading project data:", err);
    });
  };

  const uploadCsv = async (file) => {
    const formData = new FormData();
    formData.append('file', file); // This key name 'file' must match your C# API's parameter
  
    try {
      const res = await axios.post(
        serverAPI + 'api/Uploader/UploadAppeals/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          },
        }
      );
      await axios.get(`${serverAPI}api/Issue/sp_appeals`);
      didMountRef.current = true;
      setCurrentPage(1); // optional: if you want to jump to first page
      //await fetchCasesAll();
      await fetchCasesPage(1, pageSize);
      await fetchAgeBuckets();
      console.log("Upload successful:", res.data);
    } catch (err) {
      console.error("Error uploading file:", err);
    }
  };
  
  const handleUpdateAssignedStatus = async ({ status }) => {
  const validRows = selectedRows.filter(row => Number(row.id) > 0);
  const idsToUpdate = validRows.map(row => Number(row.id));

  // const hasAssigned = selectedRows.some(row => row.case_assignment_status === "Assigned");

  //   if (hasAssigned) {
  //     alert("One or more selected cases are already assigned. Reassignment is not allowed.");
  //     return;
  //   }

  if (idsToUpdate.length === 0) {
    alert("Selected cases have invalid IDs.");
    return;
  }

  try {
    if (status === 'FFup Sent') {
      // ✅ Just update the status (no assignment)
      try {
        await axios.post(`${dataApiUrl}appeal_cases_status_update`, {
          ids: idsToUpdate,
          status: 'FFup Sent',
          pend_reason: null
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error("❌ Failed to update status:");
        
        if (error.response) {
          // Server responded with a status outside 2xx
          console.error("Response status:", error.response.status);
          console.error("Response data:", error.response.data);
          console.error("Response headers:", error.response.headers);
        } else if (error.request) {
          // Request made but no response received
          console.error("No response received:", error.request);
        } else {
          // Other errors
          console.error("Error message:", error.message);
        }
      
        alert(`Failed to update case status to ${status}.`);
      }
    } 
    else {
      // ✅ Assign to agents in chunks
      if (!assignTo || assignTo.length === 0) {
        alert("No agents selected to assign cases.");
        return;
      }

      const chunkSize = Math.ceil(idsToUpdate.length / assignTo.length);
      const chunkedAssignments = [];

      for (let i = 0; i < assignTo.length; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        chunkedAssignments.push({
          agent: assignTo[i],
          ids: idsToUpdate.slice(start, end)
        });
      }

      for (const assignment of chunkedAssignments) {
        const { agent, ids } = assignment;

        if (!ids.length) continue;

        console.log("Sending assignment update:", {
          ids,
          status,
          CignaID: agent.agent,
          ownerID: agent.agent,
          ownerName: agent.agent_name
        });

        // ✅ Step 1: Update assignment in database
        await axios.post(`${dataApiUrl}appeal_case_assignment_update`, {
          ids,
          status,
          CignaID: agent.agent,
          sessID: pocId,
          ownerID: agent.agent,
          ownerName: agent.agent_name
        });

        // ✅ Step 2: Update case status to "New Assigned"
        await axios.post(
            `${dataApiUrl}appeal_cases_status_update`,
            {
              ids: ids,
              status: 'New Assigned',
              pend_reason: null
            }
        );

        // ✅ Step 3: Send reassignment email to agent, lead, and manager
        const emailPayload = {
          id: ids,
          agentEmail: agent.agentCIGNA_Email_Address || '',
          leadEmail: agent.team_Lead_CIGNA_Email_Address || '',
          managerEmail: agent.manager_CIGNA_Email_Address || ''
        };

        try {
          await axios.post(`${dataApiEmailUrl}ReassignAppeals`, emailPayload);
          console.log(`✅ Reassignment email sent to ${agent.agent_name_withId}`);
        } catch (emailError) {
          console.error(`❌ Failed to send reassignment email to ${agent.agent_name_withId}:`, emailError.response?.data || emailError.message);
          // Continue even if email fails - assignment already succeeded
        }
         

      }
    }

    // ✅ After successful update
    await fetchAgeBuckets();
    await fetchCasesPage(currentPage, pageSize);
    await fetchCaseStatusCt();       // Optional refresh
    setSelectedRows([]);
    setAssignTo([]);

    if (status !== 'FFup Sent') {
      alert(`Status updated to ${status} successfully.`);
    }

  } catch (error) {
    console.error(`Failed to update case status to ${status}:`, error);
    alert(`Failed to update case status to ${status}.`);
  }
};




  const handleSendFollowUpEmails = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      alert("Please select at least one case.");
      return;
    }

    const hasUnassigned = selectedRows.some(row => row.case_assignment_status === "Unassigned");

    if (hasUnassigned) {
      alert("One or more selected cases are unassigned. Please assign them before sending follow-up.");
      return;
    }
  
    const ownerIdGroups = {};
  
    // Group selected row IDs by ownerID
    selectedRows.forEach(row => {
      const ownerId = row.ownerID;
      if (!ownerId) {
        console.warn("Missing ownerID in row:", row);
        return;
      }
  
      if (!ownerIdGroups[ownerId]) {
        ownerIdGroups[ownerId] = [];
      }
      ownerIdGroups[ownerId].push(row.id);
    });
    console.log("Checking against agentList:", agentList);
    
    let emailsSentSuccessfully = false;
    
    try {
      // Process each owner group
      for (const ownerId in ownerIdGroups) {
        const ids = ownerIdGroups[ownerId];
    
        // Find the matching agent data
        const agentData = agentList.find(agent => agent.agent?.toUpperCase() === ownerId.toUpperCase());
        if (!agentData) {
          console.warn(`No agent data found for ownerID: ${ownerId}`);
          continue;
        }
    
        const payload = {
          id: ids,
          agentEmail: agentData.agentCIGNA_Email_Address?.trim() || '',
          leadEmail: agentData.team_Lead_CIGNA_Email_Address?.trim() || '',
          managerEmail: agentData.manager_CIGNA_Email_Address?.trim() || '',
          agentID: ownerId
        };
    
        try {
          // Step 1: Send follow-up email
      
          await axios.post(`${dataApiEmailUrl}FollowUpAppeals`, payload);
    
          // Step 2: Update DB
        
          await axios.post(`${dataApiUrl}appeals_main_followup`, {
            ids:  ids,
            cignaID: ownerId,
            sessID: pocId
          });

          emailsSentSuccessfully = true;
          setShowFollowToast(true);
    
        } catch (err) {
          console.error(`Error for ownerID ${ownerId}`, err);
          // Continue processing other owners even if one fails
        }
      }
    } finally {
      // Step 3: Always update status for all selected rows, even if some emails failed
      if (emailsSentSuccessfully) {
        try {
          await handleUpdateAssignedStatus({ status: "FFup Sent" });
          await fetchAgeBuckets();
          await fetchCasesPage(currentPage, pageSize);
          await fetchCaseStatusCt();
        } catch (err) {
          console.error("Error updating status", err);
        }
      }
    }
  };
  
  
  

  
  
  


const handleReassignAppeals = async () => {
  if (selectedRows.length === 0 || assignTo.length === 0) {
    alert("Please select cases and at least one agent.");
    return;
  }

  // Step 1: Divide case IDs equally
  const ids = selectedRows.map(row => row.id);
  const chunkSize = Math.ceil(ids.length / assignTo.length);
  const chunkedIds = [];

  for (let i = 0; i < assignTo.length; i++) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    chunkedIds.push(ids.slice(start, end));
  }

  // Step 2: Loop through each agent and send API request
  for (let i = 0; i < assignTo.length; i++) {
    const agent = assignTo[i];

    // Ensure the agent object has email, leadEmail, managerEmail
    const payload = {
      id: chunkedIds[i],                    // assigned case IDs
      agentEmail: agent.agentCIGNA_Email_Address,    // required
      leadEmail: agent.team_Lead_CIGNA_Email_Address || "",
      managerEmail: agent.manager_CIGNA_Email_Address || ""          // optional: if you have this
    };

    try {
      const response = await axios.post(`${dataApiEmailUrl}ReassignAppeals`, payload);
      //console.log(`Email sent to ${agent.agent_name_withId}:`, response.data);
    } catch (error) {
      //console.error(`Failed to send email to ${agent.agent_name_withId}:`, error.response?.data || error.message);
    }
  }

};




   const followUp = async () => {
    const payload = {
      director: "string",
      email: ["string"],
      agentName: "string",
      leadEmail: "string"
    };

    try {
      const response = await axios.post(serverAPI + 'api/AppealsEmail/FollowUpAppeals2', payload);
      console.log('Server Response:', response.data);
    } catch (error) {
      console.error('API Error:', error);
    }
  };

  const reAssign = async () => {
    const payload = {
      director: "string",
      email: ["string"],
      agentName: "string",
      leadEmail: "string"
    };

    try {
      const response = await axios.post(serverAPI + 'api/AppealsEmail/ReassignAppeals2', payload);
      console.log('Server Response:', response.data);
    } catch (error) {
      console.error('API Error:', error);
    }
  };

  const mainFollowUp = async () => {
    const payload = {
      cignaID: "string",
      sessID: "string"
    };

    try {
      const response = await axios.post(serverAPI + 'api/AppealsEmail/appeals_main_followup', payload);
      console.log('Server Response:', response.data);
    } catch (error) {
      console.error('API Error:', error);
    }
  };

  const asssignStatusUpdate = async () => {
    const payload = {
      status: "string",
      cignaID: "string",
      sessID: "string"
    };

    try {
      const response = await axios.post(serverAPI + '/api/AppealsIssue/appeal_case_assignment_update', payload);
      console.log('Server Response:', response.data);
    } catch (error) {
      console.error('API Error:', error);
    }
  };
const caseStatusUpdate = async (status) => {
  try {
    const response = await axios.post(
      `${serverAPI}/api/AppealsIssue/appeal_case_status_update`,
      { status }  // <-- JSON body
    );
    console.log('Server Response:', response.data);
  } catch (error) {
    console.error('API Error:', error);
  }
};

  const caseStatusCount = async () => {
    const payload = {
      manager: "string",
    };

    try {
      const response = await axios.post(serverAPI + '/api/AppealsIssue/get_cases_status_ct', payload);
      console.log('Server Response:', response.data);
    } catch (error) {
      console.error('API Error:', error);
    }
  };

  const ageBucketTbChart = async () => {
    const payload = {
      poc: "string",
    };

    try {
      const response = await axios.post(serverAPI + '/api/AppealsIssue/get_age_bucket_poc', payload);
      console.log('Server Response:', response.data);
    } catch (error) {
      console.error('API Error:', error);
    }
  };

  const View = async () => {
    try {
      const response = await axios.get(serverAPI + '/api/AppealsIssue/cases_view_per_sr/');
      console.log('Server Response:', response.data);
    } catch (error) {
      console.error('API Error:', error);
    }
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
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",  backgroundColor: "white", padding: 24, borderRadius: 10, marginBottom: 30, maxWidth: 1500, marginInline: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label htmlFor="reportSelect" style={{ fontWeight: 600 }}>Choose report:</label>
            <select 
              id="reportSelect" 
              value={selectedReport} 
              onChange={(e) => setSelectedReport(e.target.value)} 
              disabled={isDropdownDisabled()}
              style={{ 
                padding: "8px 12px", 
                borderRadius: 6, 
                border: "1px solid #ccc", 
                fontSize: 14,
                backgroundColor: isDropdownDisabled() ? "#f5f5f5" : "white",
                cursor: isDropdownDisabled() ? "not-allowed" : "pointer"
              }}
            >
              {getAvailableReportOptions().map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <label htmlFor="gspSelect" style={{ fontWeight: 600, marginLeft: 16 }}>Choose GSP:</label>
            <select 
              id="gspSelect" 
              value={selectedGsp} 
              onChange={(e) => setSelectedGsp(e.target.value)} 
              disabled={isDropdownDisabled()}
              style={{ 
                padding: "8px 12px", 
                borderRadius: 6, 
                border: "1px solid #ccc", 
                fontSize: 14,
                backgroundColor: isDropdownDisabled() ? "#f5f5f5" : "white",
                cursor: isDropdownDisabled() ? "not-allowed" : "pointer"
              }}
            >
              {getAvailableGspOptions().map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button onClick={triggerFileDialog} style={{ backgroundColor: "#0071ce", color: "white", padding: "10px 18px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>Upload Excel</button>
           <a href="https://uat-cg-lpi-portal.sagilityhealth.com:8081/api/ExportControllers/appeals_template_download" style={{ textDecoration: "none" }}>
            <button style={{ backgroundColor: "#0071ce", color: "white", padding: "10px 18px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>Download Template</button>
            </a>
        
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* <button onClick={handleAutoEmail} style={{ backgroundColor: "#00aaff", color: "white", padding: "10px 18px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>Auto email</button> */}
        <button 
          onClick={handleRefresh} 
          disabled={refreshing}
          style={{ 
            backgroundColor: refreshing ? "#aaa" : "#00aaff", 
            color: "white", 
            padding: "10px 18px", 
            border: "none", 
            borderRadius: 6, 
            fontWeight: 600, 
            cursor: refreshing ? "not-allowed" : "pointer" 
          }}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
          <button   onClick={handleExtractExcel} style={{ backgroundColor: "#217346", color: "white", padding: "10px 18px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>Extract Excel</button>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFileSelect} />
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
            {showSuccessMessage && (
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
              {ageSummary.map((row, idx) => (
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
            data={ageSummary.filter(
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
              {/* Wrapper to center the panel */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: "40px" }}>
                      {/* Case Summary Card */}
                      <div
                        style={{
                          backgroundColor: "white",
                          borderRadius: "12px",
                          padding: "20px 30px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          width: "65%",
                          fontSize: "14px",
                        }}
                      >
                        <h4
                          style={{
                            marginTop: "0px",
                            marginBottom: "16px",
                            color: "#003b70",
                            fontWeight: "600",
                            textAlign: "left",
                          }}
                        >
                          Case Summary
                        </h4>

                        {caseStatusCt && (() => {
                          const {
                            total_Count: total,
                            assigned,
                            unassigned,
                            open,
                            pended,
                            fFup_Sent,
                            completed,

                            open_NonCompliant,
                            pended_NonCompliant,
                            completed_NonCompliant,
                            fFup_Sent_NonCompliant,
                            assigned_NonCompliant,
                            unassigned_NonCompliant,

                            open_PreService,
                            pended_PreService,
                            completed_PreService,
                            fFup_Sent_PreService,
                            assigned_PreService,
                            unassigned_PreService,

                            open_PG,
                            pended_PG,
                            completed_PG,
                            fFup_Sent_PG,
                            assigned_PG,
                            unassigned_PG,

                            total_NonCompliant_Yes,
                            total_PreService,
                            total_PG_Yes
                          } = caseStatusCt;

                          const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

                          return (
                            <>
                              {/* Two-column layout */}
                              <div style={{ display: "flex", flexWrap: "wrap", columnGap: "5%", rowGap: "12px" }}>
                                {/* Left column */}
                                <div style={{ flex: "1 1 45%" }}>
                                  <div>📁 Total Cases: <strong>{total}</strong></div>
                                  <div>🚀 Assigned: <strong>{assigned}</strong></div>
                                  <div>❔ Unassigned: <strong>{unassigned}</strong></div>
                                  <div>🟡 Pended: <strong>{pended}</strong></div>
                                  <div>🔔 FFup Sent: <strong>{fFup_Sent}</strong></div>
                                  <div>📂 Pend: <strong>{open}</strong></div>
                                  <div>✅ Completed: <strong>{completed}</strong></div>
                                </div>

                                {/* Right column */}
                                <div style={{ flex: "1 1 45%" }}>
                                  <div style={{ fontWeight: "600", color: "#003b70", marginBottom: "6px" }}>🔴 Non-Compliant(Yes) Cases</div>
                                  <div>📂 Pend: <strong>{open_NonCompliant}</strong></div>
                                  <div>🟡 Pended: <strong>{pended_NonCompliant}</strong></div>
                                  <div>✅ Completed: <strong>{completed_NonCompliant}</strong></div>
                                  <div>🔔 FFup Sent: <strong>{fFup_Sent_NonCompliant}</strong></div>
                                  <div>🚀 Assigned: <strong>{assigned_NonCompliant}</strong></div>
                                  <div>❔ Unassigned: <strong>{unassigned_NonCompliant}</strong></div>
                                  <div>📊 Total Non-Compliant: <strong>{total_NonCompliant_Yes}</strong></div>
                                </div>

                                <div style={{ flex: "1 1 45%", marginTop: "12px" }}>
                                  <div style={{ fontWeight: "600", color: "#003b70", marginBottom: "6px" }}>🟦 Pre-Service Cases</div>
                                  <div>📂 Pend: <strong>{open_PreService}</strong></div>
                                  <div>🟡 Pended: <strong>{pended_PreService}</strong></div>
                                  <div>✅ Completed: <strong>{completed_PreService}</strong></div>
                                  <div>🔔 FFup Sent: <strong>{fFup_Sent_PreService}</strong></div>
                                  <div>🚀 Assigned: <strong>{assigned_PreService}</strong></div>
                                  <div>❔ Unassigned: <strong>{unassigned_PreService}</strong></div>
                                  <div>📊 Total Pre-Service: <strong>{total_PreService}</strong></div>
                                </div>

                                <div style={{ flex: "1 1 45%", marginTop: "12px" }}>
                                  <div style={{ fontWeight: "600", color: "#003b70", marginBottom: "6px" }}>🟩 PG(Yes) Cases</div>
                                  <div>📂 Pend: <strong>{open_PG}</strong></div>
                                  <div>🟡 Pended: <strong>{pended_PG}</strong></div>
                                  <div>✅ Completed: <strong>{completed_PG}</strong></div>
                                  <div>🔔 FFup Sent: <strong>{fFup_Sent_PG}</strong></div>
                                  <div>🚀 Assigned: <strong>{assigned_PG}</strong></div>
                                  <div>❔ Unassigned: <strong>{unassigned_PG}</strong></div>
                                  <div>📊 Total PG: <strong>{total_PG_Yes}</strong></div>
                                </div>
                              </div>

                              {/* Completion Rate Progress Bar */}
                              {/* <div style={{ fontSize: "12px", marginTop: "20px", color: "#003b70", fontWeight: "500", textAlign: "center" }}>
                                Completion Rate
                              </div>
                              <div style={{ backgroundColor: "#e0e0e0", borderRadius: "20px", height: "10px", overflow: "hidden", marginTop: "4px" }}>
                                <div style={{
                                  height: "100%",
                                  width: `${percent}%`,
                                  backgroundColor: "#28a745",
                                  transition: "width 0.3s ease-in-out"
                                }} />
                              </div>
                              <div style={{ fontSize: "12px", marginTop: "4px", textAlign: "right" }}>{percent}%</div> */}
                            </>
                          );
                        })()}
                      </div>
                    </div>

{/*uploadComplete &&*/}

{uploadComplete &&(
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
          <option value="">All</option>
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
          <option value="">All</option>
          <option value="Assigned">Assigned</option>
          <option value="Unassigned">Unassigned</option>
        </select>
      </div>

       {/* Prioritization Filter */}
       <div style={{ width: 200 }}>
        <label style={{ fontWeight: "500", color: "#003b70", display: "block", marginBottom: 4 }}>
          Filter by Prioritization:
        </label>
        <select
          value={prioritizationFilter}
          onChange={(e) => setPrioritizationFilter(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
            width: "100%",
            fontFamily: "inherit",
          }}
        >
          <option value="">-Select Prioritization-</option>
          <option value="NonCompliant2_Yes">OOC (NonCompliant - YES)</option>
          <option value="PreService">Pre-Service</option>
          <option value="PG_Yes">PG - YES</option>
        </select>
      </div>

              {/*Filter rows*/}
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
        if (val === '') {
          setPageSize(10);    // 0 means fetch all
          setCurrentPage(1);
        } else {
          setPageSize(parseInt(val, 10));
          setCurrentPage(1);
        }
      }}
      style={{
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        fontFamily: 'inherit',
        width: '100%'
      }}
    >
      {[10, 20, 50, 100].map(size => (
        <option key={size} value={size}>{size}</option>
      ))}
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
        Total Appeal Cases: {totalAppealCases}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
<button
  onClick={() => {setShowAssignModal(true)
    setAssignTo([]);
    fetchAgents();
  }}
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
    <th style={{ padding: '8px', border: '1px solid #ccc', backgroundColor:'#f0f8ff' }}>
      <input
        type="checkbox"
        checked={isAllSelected}
        onChange={toggleSelectAll}
      />
    </th>
    {Object.entries(caseTblAllColumnMap).map(([key, label]) => (
        <th
          key={key}
          onClick={() => handleSort(key)} // click to sort
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            fontWeight: '600',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor:'#f0f8ff',
          }}
        >
          {label}
          {sortConfig.key === key && (
            <span style={{ marginLeft: 6 }}>
              {sortConfig.direction === 'asc' ? '🔼' : '🔽'}
            </span>
          )}
        </th>
))}


<th style={{ padding: '8px', border: '1px solid #ccc', fontWeight: '600', textAlign: 'center', backgroundColor:'#f0f8ff' }}>
  Actions
</th>
  </tr>
</thead>
<tbody>
  {!caseTblAllPoc || caseTblAllPoc.length === 0 ? (
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
    sortedCases.
    map((row, idx) => {
      //const isChecked = selectedRows.some(selected => selected['id'] === row['id']);

      return (
        <tr key={`${row.id}-${idx}`}
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
                    (excelKey === 'appealStatus' || excelKey === 't_Minus') &&
                    row.appealStatus === 'Pended'
                      ? 'red'
                      : 'inherit',
                  fontWeight:
                    (excelKey === 'appealStatus' || excelKey === 't_Minus') &&
                    row.appealStatus === 'Pended'
                      ? 'bold'
                      : 'normal',
                }}
              >
                {preserviceDateFields.includes(excelKey)
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
</div>


   
    {/* Table with Checkboxes */}
{/* <div style={{ border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" }}>
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
          {Object.values(caseTblAllColumnMap).map((header) => (
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
              {Object.keys(caseTblAllColumnMap).map((excelKey) => (
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
</div> */}





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

        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
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

      {/* Search Input */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontWeight: "500", marginBottom: "6px", display: "block" }}>
          Search Agent:
        </label>
        <input
          type="text"
          placeholder="Type agent name to search..."
          value={agentSearchTerm}
          onChange={(e) => setAgentSearchTerm(e.target.value)}
          style={{
            width: "96%",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            fontSize: "14px",
            marginBottom: "8px"
          }}
        />
        
        {/* Search Results */}
        {agentSearchTerm && (
          <div style={{
            maxHeight: "120px",
            overflowY: "auto",
            border: "1px solid #ddd",
            borderRadius: "6px",
            backgroundColor: "#fff"
          }}>
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent) => (
                <div
                  key={agent.agent}
                  onClick={() => {
                    if (!assignTo.some(a => a.agent === agent.agent)) {
                      setAssignTo(prev => [...prev, agent]);
                      setAgentSearchTerm(""); // Clear search after selection
                    }
                  }}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                    backgroundColor: assignTo.some(a => a.agent === agent.agent) ? "#f0f0f0" : "#fff",
                    color: assignTo.some(a => a.agent === agent.agent) ? "#999" : "#333"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = assignTo.some(a => a.agent === agent.agent) ? "#f0f0f0" : "#fff"}
                >
                  {formatAgentName(agent.agent_name_withId)}
                  {assignTo.some(a => a.agent === agent.agent) && <span style={{ marginLeft: "8px", fontSize: "12px" }}>(Selected)</span>}
                </div>
              ))
            ) : (
              <div style={{
                padding: "12px",
                textAlign: "center",
                color: "#999",
                fontStyle: "italic"
              }}>
                No agents found matching "{agentSearchTerm}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Original Dropdown */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontWeight: "500", marginBottom: "6px", display: "block" }}>
          Or Select from Dropdown:
        </label>
        <select
          value=""
          onChange={(e) => {
            const selectedFormattedName = e.target.value;
            // Find the agent by comparing the formatted name
            const selectedAgent = agentList.find(a => formatAgentName(a.agent_name_withId) === selectedFormattedName);
          
            if (selectedAgent && !assignTo.some(a => a.agent === selectedAgent.agent)) {
              setAssignTo(prev => [...prev, selectedAgent]); // ✅ Store object
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
          {[...new Set(agentList
            .filter(agent => {
              if (!agent.agent_name_withId) return false;
              const lower = agent.agent_name_withId.toLowerCase();
              return (
                !lower.includes("proclaim_queu") &&
                !lower.includes("queue") &&
                !lower.startsWith("sagproc")
              );
            })
            .sort((a, b) => {
              const firstNameA = getFirstName(a.agent_name_withId);
              const firstNameB = getFirstName(b.agent_name_withId);
              return firstNameA.localeCompare(firstNameB, undefined, { sensitivity: 'base' });
            })
            .map(agent => formatAgentName(agent.agent_name_withId))
          )].map((formattedName) => (
            <option key={formattedName} value={formattedName}>{formattedName}</option>
          ))}
        </select>
      </div>


      {assignTo.length > 0 && (
        <div style={{
          marginBottom: "16px",
          padding: "10px",
          backgroundColor: "#f9f9f9",
          borderRadius: "6px",
          border: "1px solid #ddd"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <strong>Selected Agent(s):</strong>
            <button
              onClick={() => setAssignTo([])}
              style={{
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              Clear All
            </button>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {assignTo.map((a, idx) => (
                  <li
                    key={a.agent} // Or any unique ID
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "4px 0"
                    }}
                  >
                    <span>{formatAgentName(a.agent_name_withId)}</span>
                    <button
                      onClick={() => setAssignTo(assignTo.filter((agent) => agent.agent !== a.agent))}
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
              const match = selectedRows.some((sel) => sel["id"] === row["id"]);
              if (!match) return row;

              const i = selectedRows.findIndex((sel) => sel["id"] === row["id"]);
              const agent = assignTo[i % assignTo.length];

              return {
                ...row,
                OwnerName: agent,
                OwnerID: idMap[agent] || "",
                OWNER_HELPER: "ASSIGNED"
              };
            });
            handleUpdateAssignedStatus({ status: "Assigned" });
            setPreserviceRows(updated);
            setSelectedRows([]);
            setAssignTo([]);
            setShowAssignModal(false);
             handleReassignAppeals();
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
            handleSendFollowUpEmails();
            setPreserviceRows(updated);
            setSelectedRows([]);
            setShowFollowUpModal(false);
            setCurrentPage(1);

            
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
{/* 
{showSuccessUpload && (
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
    Upload Complete!
  </div>
)} */}







        <Outlet />
      </main>
    </>
  );
}

export default POCPage;
