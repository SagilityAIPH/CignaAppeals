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
    "45-60": 0,
    // "60-89": 0,
    // "90-179": 0,
    "60-364": 0,
    "365+": 0,
    Total: 0,
  },
];

const AGE_BUCKETS = [
  "0-14",
  "15-29",
  "30-44",
  "45-60",
  // "60-89",
  // "90-179",
  "60-364",
  "365+",
];

const getColorForBucket = (index) => {
  const palette = [
    "#00C49F",
    "#66BB6A",
    "#42A5F5",
    "#FFA726",
    // "#FB8C00",
    // "#F4511E",
    // "#EF5350",
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
  const [managerFilter, setManagerFilter] = useState("All");
  const [managerList, setManagerList] = useState([]);
  const [selectedManagers, setSelectedManagers] = useState([]);
  const [selectedAppealTypes, setSelectedAppealTypes] = useState([]);
  const [tempSelectedAppealTypes, setTempSelectedAppealTypes] = useState([]);
  const [showAppealTypeDropdown, setShowAppealTypeDropdown] = useState(false);
  const [prioritizationFilter, setPrioritizationFilter] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const rowsPerPage = 10; // You can change this to 20, 50 etc.
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTo, setAssignTo] = useState([]);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showFollowToast, setShowFollowToast] = useState(false);
  const [agentSearchTerm, setAgentSearchTerm] = useState("");
  const [tableDataSearchTerm, setTableDataSearchTerm] = useState("");
  const [caseTblAllPoc, setCaseTblAllPoc] = useState([]);
  const [activeAppealCasesTab, setActiveAppealCasesTab] = useState("appealCases");

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
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [refreshing, setRefreshing] = useState(false);
  const { pocId, account } = useUser();

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
  ff_date: "FFup Date",
  pend_reason: "Pending Reason",
  age_Cal: "Age (Days)",
  manager: "Manager",
  agE_PROMISE: "Promise",
  promise_Date: "Promise Date",
  recd_By_Cigna: "Rec'd",
  system: "System",
  lpi: "LPI",
  pg: "PG",
  product: "Product",
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
    // Failed to fetch agents
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
    }
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
      setIsLoading(false);
      setCaseTblAllPoc([]);
      setTotalAppealCases(0);
      return; // Exit early - don't call API
    }
  }

  // Map selected appeal types to prioritization_Multiselect array
  const prioritization_Multiselect = selectedAppealTypes.map(type => {
    // Map internal values to backend expected values
    if (type === 'PG_Yes') return 'PG-YES';
    if (type === 'PG_No') return 'PG-NO';
    if (type === 'NonCompliant2_Yes') return 'NonCompliant2-Yes';
    if (type === 'NonCompliant2_No') return 'NonCompliant2-No';
    if (type === 'PreService') return 'Pre-Service';
    if (type === 'Fully Insured') return 'Fully Insured';
    return type; // Admin, Medical, Member, ASO, IFP, Provider remain same
  });

  // Determine endpoint based on active tab
    let endpoint = "cases_tbl_all_poc";
    if (activeAppealCasesTab === "assignedByCC") {
      endpoint = "cases_tbl_all_assigned_by_cc_poc";
    } else if (activeAppealCasesTab === "pended") {
      endpoint = "cases_tbl_all_pended_poc";
    } else if (activeAppealCasesTab === "completed") { 
      endpoint = "cases_tbl_all_poc_completed";
    } else if (activeAppealCasesTab === "followedUp") {
      endpoint = "cases_tbl_all_poc_followup";
    }

  try {
    const apiPayload = {
      caseStatus: caseStatusFilter === 'All' ? '' : caseStatusFilter,
      assignedStatus: assignmentFilter === 'All' ? '' : assignmentFilter,
      claim_system: claimSystemParam,
      account: accountParam,
      manager: selectedManagers.length > 0 ? selectedManagers : (managerFilter === 'All' ? [] : [managerFilter]),
      prioritization_Multiselect: prioritization_Multiselect
    };
    
    const res = await axios.post(
      `${dataApiUrl}${endpoint}?pageNumber=${page}&pageSize=${size}`,
      apiPayload
    );

    const { totalRecords, data } = res.data;
  
    setCaseTblAllPoc(data);
    setTotalAppealCases(totalRecords);
  } catch (err) {
    if (err.response?.status === 404) {
      setCaseTblAllPoc([]);
      setTotalAppealCases(0);
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
   
    setCurrentPage(1);
    fetchCasesPage(1, pageSize)
    fetchAgeBuckets();
    fetchCaseStatusCt();
    fetchManagers();

  } else {

  }
}, [account, caseStatusFilter, assignmentFilter, managerFilter, selectedManagers, selectedAppealTypes, claimSystemParam, accountParam, pageSize, activeAppealCasesTab]); // Include account

useEffect(() => {
  // Only fetch data if we have an account (to ensure proper filtering)
  if (account) {
   
    fetchCasesPage(currentPage, pageSize);
  }
}, [account, currentPage, pageSize, claimSystemParam, accountParam, selectedAppealTypes]); // Include account

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

    fetchAgeBuckets()
    fetchCasesPage(1, pageSize)
    fetchCaseStatusCt()
    fetchManagers()
    setUploadComplete(true); // Reset upload state on mount
  } else {
   
  }
}, [account, claimSystemParam, accountParam, pageSize, selectedAppealTypes]); // Include account as dependency

// Set default dropdown values based on user account
useEffect(() => {

  if (account) {
    // Set defaults based on account type
    if (account.toLowerCase() === 'concentrix') {
     
      // Concentrix users: force to their only options
      setSelectedReport('Proclaim');
      setSelectedGsp('Concentrix');
      // Also immediately set the parameters to avoid initial blank API calls
      setClaimSystemParam('Proclaim');
      setAccountParam('Concentrix');
    } else if (account.toLowerCase() === 'wipro') {

      // Wipro users: force to their only options
      setSelectedReport('Facets');
      setSelectedGsp('Wipro');
      // Also immediately set the parameters to avoid initial blank API calls
      setClaimSystemParam('Facets');
      setAccountParam('Wipro');
    } else if (account.toLowerCase() === 'sagility') {
     
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
    
    setClaimSystemParam(newClaimSystemParam);
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
    
    setAccountParam(newAccountParam);
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
      setCaseStatusCt(null);
      return; // Exit early - don't call API
    }
  }

  // Map selected appeal types to prioritization array
  const prioritization_Multiselect = selectedAppealTypes.map(type => {
    if (type === 'PG_Yes') return 'PG-YES';
    if (type === 'PG_No') return 'PG-NO';
    if (type === 'NonCompliant2_Yes') return 'NonCompliant2-Yes';
    if (type === 'NonCompliant2_No') return 'NonCompliant2-No';
    if (type === 'PreService') return 'Pre-Service';
    if (type === 'Fully Insured') return 'Fully Insured';
    return type;
  });

  try {
    const params = { 
      claim_system: claimSystemParam, 
      account: accountParam,
      prioritization_Multiselect: prioritization_Multiselect
    };
    
    const res = await axios.post(`${dataApiUrl}get_cases_status_ct_poc`, params);

    if (res.data) {
      setCaseStatusCt(res.data);
    } else {
      setCaseStatusCt(null);
    }
  } catch (error) {
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
    setManagerFilter("All");
    setSelectedManagers([]);
    setSelectedAppealTypes([]);
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
      fetchCaseStatusCt(),
      fetchManagers()
    ]);
    
  } catch (error) {
    // Error refreshing data
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
    alert("❌ Failed to send appeals emails.");
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
    alert("❌ Failed to send appeals emails.");
  }
};


const handleExtractExcel = async () => {

 // Validate 5-day limit
 const start = new Date(fromDate);
 const end = new Date(toDate);

 // Calculate difference in days
 const diffTime = end - start;
 const diffDays = diffTime / (1000 * 60 * 60 * 24);

 if (diffDays > 5) {
   alert("You can only extract a maximum of 5 days at a time.");
   return; // Stop execution
 }

  try {
    const response = await axios.get(`${exportAPI}export_appeals`, {
       responseType: 'blob',
      params: {
      account: selectedGsp === "All" ?  "" : selectedGsp,// <-- your variable here
      dateFrom: fromDate || null,
      dateTo: toDate || null
  }
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
    return null;
  }
};

const fetchAgeBuckets = async () => {
  // 🛡️ GUARD: Prevent API calls with blank parameters for specific accounts
  if (!claimSystemParam && !accountParam) {
    if (account === 'Concentrix' || account === 'Wipro' || account === 'Onshore') {
      setAgeSummary([]);
      setDepartmentList([]);
      return; // Exit early - don't call API
    }
  }

  // Map selected appeal types to prioritization array
  const prioritization_Multiselect = selectedAppealTypes.map(type => {
    if (type === 'PG_Yes') return 'PG-YES';
    if (type === 'PG_No') return 'PG-NO';
    if (type === 'NonCompliant2_Yes') return 'NonCompliant2-Yes';
    if (type === 'NonCompliant2_No') return 'NonCompliant2-No';
    if (type === 'PreService') return 'Pre-Service';
    if (type === 'Fully Insured') return 'Fully Insured';
    return type;
  });

  try {
    const params = { 
      claim_system: claimSystemParam, 
      account: accountParam,
      prioritization_Multiselect: prioritization_Multiselect
    };
    
    const res = await axios.post(`${dataApiUrl}get_age_bucket_poc`, params);
    
    const data = res.data || [];

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
        "45-60": item.ab45_60,
        // "60-89": item.ab60_89,
        // "90-179": item.ab90_179,
        "60-364": item.ab60_364,
        "365+": item.ab365_Plus,
        Total: item.total
      }))
    );
  } catch (error) {
    setAgeSummary([]);
  }
};

const fetchManagers = async () => {
  // 🛡️ GUARD: Prevent API calls with blank parameters for specific accounts
  if (!accountParam) {
    if (account === 'Concentrix' || account === 'Wipro' || account === 'Onshore') {
      setManagerList([]);
      return; // Exit early - don't call API
    }
  }

  try {
    const params = { account: selectedGsp === 'All' ? '' : selectedGsp };
    
    const res = await axios.get(`${dataApiUrl}get_managers`, {
      params: params
    });
    
    const data = res.data || [];

    setManagerList(data);
  } catch (error) {
    setManagerList([]);
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
      // Clear all data states to force fresh fetch for the new account
      setCaseTblAllPoc([]);
      setCaseStatusCt([]);
      setAgeSummary([]);
      setSelectedRows([]);
      setManagerList([]);
      // Reset pagination
      setCurrentPage(1);
    }
  }, [account]); // Only depend on account

  // Cleanup function when component unmounts to clear any remaining state
  useEffect(() => {
    return () => {
      // This will run when the component is unmounted (e.g., when user logs out)
      setCaseTblAllPoc([]);
      setCaseStatusCt([]);
      setAgeSummary([]);
      setSelectedRows([]);
      setManagerList([]);
      setCurrentPage(1);
      setClaimSystemParam(''); // Reset claimSystemParam on cleanup
      setAccountParam(''); // Reset accountParam on cleanup
      setManagerFilter('All'); // Reset managerFilter on cleanup
    };
  }, []);

  const handleFileSelect = async (e) => {

    setShowSuccessMessage(false);  // ✅ hide message
   
    setStartHideUploadPanelTimer(false); // ✅ reset trigger

    setUploadProgress(0);
    setUploadComplete(false);

    const file = e.target.files[0];
    if (!file) return;
  
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
        // Success
    })
    .catch(err => {
        // Error
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
    } catch (err) {
      // Error uploading file
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
        } catch (emailError) {
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
    alert(`Failed to update case status to ${status}.`);
  }
};




  const handleSendFollowUpEmails = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      return;
    }

    const hasUnassigned = selectedRows.some(row => row.case_assignment_status === "Unassigned");

    if (hasUnassigned) {
      return;
    }

   
  
    const ownerIdGroups = {};
  
    // Group selected row IDs by ownerID
    selectedRows.forEach(row => {
      const ownerId = row.ownerID;
      if (!ownerId) {
        return;
      }
  
      if (!ownerIdGroups[ownerId]) {
        ownerIdGroups[ownerId] = [];
      }
      ownerIdGroups[ownerId].push(row.id);
    });

    const ownerCount = Object.keys(ownerIdGroups).length;
    if (ownerCount === 0) {
      return;
    }
    
    let emailsSentSuccessfully = false;
    
    try {
      // Process each owner group
      for (const ownerId in ownerIdGroups) {
        const ids = ownerIdGroups[ownerId];
    
        // Find the matching agent data
        console.log(agentList);
        const agentData = agentList.find(agent => agent.agent?.toUpperCase() === ownerId.toUpperCase());
        if (!agentData) {
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

          const emailResponse = await axios.post(`${dataApiEmailUrl}FollowUpAppeals2`, payload);

    
          // Step 2: Update DB
          const dbResponse = await axios.post(`${dataApiUrl}appeals_main_followup`, {
            ids:  ids,
            cignaID: ownerId,
            sessID: pocId
          });
   

          emailsSentSuccessfully = true;
          setShowFollowToast(true);
    
        } catch (err) {
          // Show detailed error information
          const errorDetails = {
            message: err.message,
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data,
            url: err.config?.url
          };
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
       console.log(err.message);
        }
      } else {
        console.log(`⚠️ No emails were sent successfully.`);
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
      await axios.post(serverAPI + 'api/AppealsEmail/FollowUpAppeals2', payload);
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
      await axios.post(serverAPI + 'api/AppealsEmail/ReassignAppeals2', payload);
    } catch (error) {
      // Error
    }
  };

  const mainFollowUp = async () => {
    const payload = {
      cignaID: "string",
      sessID: "string"
    };

    try {
      await axios.post(serverAPI + 'api/AppealsEmail/appeals_main_followup', payload);
    } catch (error) {
      // Error
    }
  };

  const asssignStatusUpdate = async () => {
    const payload = {
      status: "string",
      cignaID: "string",
      sessID: "string"
    };

    try {
      await axios.post(serverAPI + '/api/AppealsIssue/appeal_case_assignment_update', payload);
    } catch (error) {
      // Error
    }
  };
const caseStatusUpdate = async (status) => {
  try {
    await axios.post(
      `${serverAPI}/api/AppealsIssue/appeal_case_status_update`,
      { status }  // <-- JSON body
    );
  } catch (error) {
    // Error
  }
};

  const caseStatusCount = async () => {
    const payload = {
      manager: "string",
    };

    try {
      await axios.post(serverAPI + '/api/AppealsIssue/get_cases_status_ct', payload);
    } catch (error) {
      // Error
    }
  };

  const ageBucketTbChart = async () => {
    const payload = {
      poc: "string",
    };

    try {
      await axios.post(serverAPI + '/api/AppealsIssue/get_age_bucket_poc', payload);
    } catch (error) {
      // Error
    }
  };

  const View = async () => {
    try {
      await axios.get(serverAPI + '/api/AppealsIssue/cases_view_per_sr/');
    } catch (error) {
      // Error
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
            <label htmlFor="reportSelect" style={{ fontWeight: 600 }}>Choose Platform:</label>
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
        
        {/* Date Pickers */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontWeight: 600, color: "#003b70" }}>From:</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: 14,
              fontFamily: "inherit"
            }}
          />
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontWeight: 600, color: "#003b70" }}>To:</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: 14,
              fontFamily: "inherit"
            }}
          />
        </div>
        
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

        {/* Appeal Type Filter Section */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 12, 
          flexWrap: "wrap", 
          backgroundColor: "white", 
          padding: "16px 24px", 
          borderRadius: 10, 
          marginBottom: 20, 
          maxWidth: 1500, 
          marginInline: "auto", 
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)" 
        }}>
          <label style={{ fontWeight: 600 }}>Choose Appeal Type:</label>
          
          <div style={{ position: "relative" }}>
            <button
              onClick={() => {
                setShowAppealTypeDropdown(!showAppealTypeDropdown);
                if (!showAppealTypeDropdown) {
                  setTempSelectedAppealTypes([...selectedAppealTypes]);
                }
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 14,
                backgroundColor: "white",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span>{selectedAppealTypes.length > 0 ? `${selectedAppealTypes.length} selected` : "All"}</span>
              <span style={{ marginLeft: 8 }}>▼</span>
            </button>
            
            {showAppealTypeDropdown && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 4,
                backgroundColor: "white",
                border: "1px solid #ccc",
                borderRadius: 6,
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                zIndex: 1000,
                minWidth: 200,
                padding: "8px 0"
              }}>
                {["All", "Admin", "ASO", "Fully Insured", "IFP", "Medical", "Member", "NonCompliant2-No", "NonCompliant2-Yes", "PG-No", "PG-Yes", "PreService", "Provider"].map((type) => (
                  <label
                    key={type}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: 14,
                      backgroundColor: type === "All" ? (tempSelectedAppealTypes.length === 0 ? "#f0f8ff" : "transparent") : (tempSelectedAppealTypes.includes(type) ? "#f0f8ff" : "transparent")
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = type === "All" ? (tempSelectedAppealTypes.length === 0 ? "#f0f8ff" : "transparent") : (tempSelectedAppealTypes.includes(type) ? "#f0f8ff" : "transparent")}
                  >
                    <input
                      type="checkbox"
                      checked={type === "All" ? tempSelectedAppealTypes.length === 0 : tempSelectedAppealTypes.includes(type)}
                      onChange={(e) => {
                        if (type === "All") {
                          setTempSelectedAppealTypes([]);
                        } else {
                          if (e.target.checked) {
                            setTempSelectedAppealTypes([...tempSelectedAppealTypes, type]);
                          } else {
                            setTempSelectedAppealTypes(tempSelectedAppealTypes.filter(t => t !== type));
                          }
                        }
                      }}
                      style={{ marginRight: 8, cursor: "pointer" }}
                    />
                    {type === "PG_Yes" ? "PG-YES" : 
                     type === "PG_No" ? "PG-NO" : 
                     type === "PreService" ? "Pre-Service" : 
                     type === "NonCompliant2_Yes" ? "NonCompliant2-Yes" : 
                     type === "NonCompliant2_No" ? "NonCompliant2-No" : 
                     type === "Fully Insured" ? "Fully Insured" : 
                     type}
                  </label>
                ))}
                
                <div style={{
                  borderTop: "1px solid #eee",
                  marginTop: 8,
                  paddingTop: 8,
                  display: "flex",
                  justifyContent: "center",
                  gap: 8,
                  padding: "8px 12px"
                }}>
                  <button
                    onClick={() => {
                      setSelectedAppealTypes([...tempSelectedAppealTypes]);
                      setShowAppealTypeDropdown(false);
                    }}
                    style={{
                      backgroundColor: "#0071ce",
                      color: "white",
                      border: "none",
                      padding: "6px 16px",
                      borderRadius: 4,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Select
                  </button>
                  <button
                    onClick={() => {
                      setTempSelectedAppealTypes([]);
                      setSelectedAppealTypes([]);
                      setShowAppealTypeDropdown(false);
                    }}
                    style={{
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "6px 16px",
                      borderRadius: 4,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {selectedAppealTypes.length > 0 && (
            <div style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              alignItems: "center"
            }}>
              <span style={{ fontSize: 13, color: "#666", marginRight: 4 }}>Selected:</span>
              {selectedAppealTypes.map((type, idx) => (
                <span
                  key={idx}
                  style={{
                    backgroundColor: "#e8f0fe",
                    color: "#003b70",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  {type === "PG_Yes" ? "PG-YES" : 
                   type === "PG_No" ? "PG-NO" : 
                   type === "PreService" ? "Pre-Service" : 
                   type === "NonCompliant2_Yes" ? "NonCompliant2-Yes" : 
                   type === "NonCompliant2_No" ? "NonCompliant2-No" : 
                   type === "Fully Insured" ? "Fully Insured" : 
                   type}
                  <button
                    onClick={() => setSelectedAppealTypes(selectedAppealTypes.filter((_, i) => i !== idx))}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ff4d4f",
                      cursor: "pointer",
                      fontSize: 16,
                      fontWeight: "bold",
                      padding: 0,
                      lineHeight: 1
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={() => {
                  setSelectedAppealTypes([]);
                  setTempSelectedAppealTypes([]);
                }}
                style={{
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginLeft: 8
                }}
              >
                Clear All
              </button>
            </div>
          )}
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
                        {caseStatusCt && (() => {
                          const {
                            total_Count: total,
                            assigned,
                            unassigned,
                            open,
                            pended,
                            fFup_Sent,
                            completed,
                            newAssigned,

                            open_NonCompliant,
                            pended_NonCompliant,
                            completed_NonCompliant,
                            fFup_Sent_NonCompliant,
                            assigned_NonCompliant,
                            unassigned_NonCompliant,
                            newAssigned_NonCompliant,

                            open_PreService,
                            pended_PreService,
                            completed_PreService,
                            fFup_Sent_PreService,
                            assigned_PreService,
                            unassigned_PreService,
                            newAssigned_PreService,

                            open_PG,
                            pended_PG,
                            completed_PG,
                            fFup_Sent_PG,
                            assigned_PG,
                            unassigned_PG,
                            newAssigned_PG,

                            total_NonCompliant_Yes,
                            total_PreService,
                            total_PG_Yes,
                            pG_NonCompliant_Ct,
                            preService_NonCompliant_Ct
                          } = caseStatusCt;

                          const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

                          return (
                            <>
                              {/* Two-column layout */}
                              <div style={{ display: "flex", flexWrap: "wrap", columnGap: "5%", rowGap: "12px" }}>
                                {/* Left column */}
                                <div style={{ flex: "1 1 45%" }}>
                                  <div style={{ fontWeight: "600", color: "#003b70", marginBottom: "6px" }}>📋 Appeals Summary</div>
                                  <div>📁 Total Cases: <strong>{total}</strong></div>
                                  <div>🚀 Assigned: <strong>{assigned}</strong></div>
                                   <div>🆕 New Assigned: <strong>{newAssigned}</strong></div>
                                  <div>❔ Unassigned: <strong>{unassigned}</strong></div>
                                  <div>🟡 Pended: <strong>{pended}</strong></div>
                                
                                  {/* <div>📂 Pend: <strong>{open}</strong></div> */}
                                  <div>✅ Completed: <strong>{completed}</strong></div>
                                    <div>🔔 FFup Sent: <strong>{fFup_Sent}</strong></div>
                                  <div>📊 Total Non-Compliant: <strong>{total_NonCompliant_Yes}</strong></div>
                            
                                </div>

                                {/* Right column */}
                                <div style={{ flex: "1 1 45%" }}>
                                  <div style={{ fontWeight: "600", color: "#003b70", marginBottom: "6px" }}>🔴 Non-Compliant(Yes) Appeals</div>
                                   <div>📊 Total Non-Compliant: <strong>{total_NonCompliant_Yes}</strong></div>
                                  {/* <div>📂 Pend: <strong>{open_NonCompliant}</strong></div> */}
                                    <div>🚀 Assigned: <strong>{assigned_NonCompliant}</strong></div>
                                   <div>🆕 New Assigned: <strong>{newAssigned_NonCompliant}</strong></div>
                                  <div>❔ Unassigned: <strong>{unassigned_NonCompliant}</strong></div>
                                  <div>🟡 Pended: <strong>{pended_NonCompliant}</strong></div>
                                  <div>✅ Completed: <strong>{completed_NonCompliant}</strong></div>
                                  <div>🔔 FFup Sent: <strong>{fFup_Sent_NonCompliant}</strong></div>
                                
                                 
                                </div>

                                <div style={{ flex: "1 1 45%", marginTop: "12px" }}>
                                  <div style={{ fontWeight: "600", color: "#003b70", marginBottom: "6px" }}>🟦 Pre-Service Appeals</div>
                                   <div>📊 Total Pre-Service: <strong>{total_PreService}</strong></div>
                                     <div>🚀 Assigned: <strong>{assigned_PreService}</strong></div>
                                  <div>🆕 New Assigned: <strong>{newAssigned_PreService}</strong></div>
                                  <div>❔ Unassigned: <strong>{unassigned_PreService}</strong></div>
                                  {/* <div>📂 Pend: <strong>{open_PreService}</strong></div> */}
                                  <div>🟡 Pended: <strong>{pended_PreService}</strong></div>
                                  <div>✅ Completed: <strong>{completed_PreService}</strong></div>
                                 <div>🔔 FFup Sent: <strong>{fFup_Sent_PreService}</strong></div>
                                 <div>📊 Total Pre-Service Non-Compliant: <strong>{preService_NonCompliant_Ct}</strong></div>
                                </div>

                                <div style={{ flex: "1 1 45%", marginTop: "12px" }}>
                                  <div style={{ fontWeight: "600", color: "#003b70", marginBottom: "6px" }}>🟩 PG(Yes) Appeals</div>
                                  <div>📊 Total PG: <strong>{total_PG_Yes}</strong></div>
                                     <div>🚀 Assigned: <strong>{assigned_PG}</strong></div>
                                  <div>❔ Unassigned: <strong>{unassigned_PG}</strong></div>
                                  <div>🆕 New Assigned: <strong>{newAssigned_PG}</strong></div>
                                  {/* <div>📂 Pend: <strong>{open_PG}</strong></div> */}
                                  <div>🟡 Pended: <strong>{pended_PG}</strong></div>
                                  <div>✅ Completed: <strong>{completed_PG}</strong></div>
                                  <div>🔔 FFup Sent: <strong>{fFup_Sent_PG}</strong></div>
                                  <div>📊 Total PG Non-Compliant: <strong>{pG_NonCompliant_Ct}</strong></div>
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

{caseStatusCt &&(
  <div
    style={{
      marginTop: 40,
      maxWidth: 1500,
      marginInline: "auto",
      backgroundColor: "rgb(245, 246, 250)",
      padding: 24,
      borderRadius: 12,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}
  >
    <div style={{ display: "flex", borderBottom: "2px solid #ddd", marginBottom: "16px" }}>
            <button
              onClick={() => { setActiveAppealCasesTab("appealCases"); setCaseStatusFilter("All"); }}  // Reset filter on tab change
              style={{
                padding: "12px 24px",
                fontSize: "15px",
                fontWeight: "600",
                border: "none",
                backgroundColor: "transparent",
                borderBottom: activeAppealCasesTab === "appealCases" ? "3px solid #0071ce" : "none",
                color: activeAppealCasesTab === "appealCases" ? "#0071ce" : "#666",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Overall
              {/* Overall - {totalAppealCases} */}
            </button>
            <button
              onClick={() => { setActiveAppealCasesTab("assignedByCC"); setCaseStatusFilter("All"); }} // Reset filter on tab change
              style={{
                padding: "12px 24px",
                fontSize: "15px",
                fontWeight: "600",
                border: "none",
                backgroundColor: "transparent",
                borderBottom: activeAppealCasesTab === "assignedByCC" ? "3px solid #0071ce" : "none",
                color: activeAppealCasesTab === "assignedByCC" ? "#0071ce" : "#666",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Assigned by CC
            </button>
            <button
              // set filter to Pended on tab change since T-Minus column depends on it
              onClick={() => { setActiveAppealCasesTab("pended"); setCaseStatusFilter("Pended"); }}
              style={{
                padding: "12px 24px",
                fontSize: "15px",
                fontWeight: "600",
                border: "none",
                backgroundColor: "transparent",
                borderBottom: activeAppealCasesTab === "pended" ? "3px solid #0071ce" : "none",
                color: activeAppealCasesTab === "pended" ? "#0071ce" : "#666",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Pended
            </button>
            <button
              onClick={() => { setActiveAppealCasesTab("completed"); setCaseStatusFilter("All"); }} // Reset filter on tab change
              style={{
                padding: "12px 24px",
                fontSize: "15px",
                fontWeight: "600",
                border: "none",
                backgroundColor: "transparent",
                borderBottom: activeAppealCasesTab === "completed" ? "3px solid #0071ce" : "none",
                color: activeAppealCasesTab === "completed" ? "#0071ce" : "#666",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Completed
            </button>
            <button
              onClick={() => { setActiveAppealCasesTab("followedUp"); setCaseStatusFilter("All"); }} // Reset filter on tab change
              style={{
                padding: "12px 24px",
                fontSize: "15px",
                fontWeight: "600",
                border: "none",
                backgroundColor: "transparent",
                borderBottom: activeAppealCasesTab === "followedUp" ? "3px solid #0071ce" : "none",
                color: activeAppealCasesTab === "followedUp" ? "#0071ce" : "#666",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Followed Up
            </button>
          </div>

          {/* Content wrapper - show for all three tabs */}
          {(activeAppealCasesTab === "appealCases" || activeAppealCasesTab === "assignedByCC" || activeAppealCasesTab === "pended" || activeAppealCasesTab === "completed" || activeAppealCasesTab === "followedUp") && (
            <>

    {/* Filters */}
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
      {/* Case Status Filter */}
      <div style={{ width: 200 }}>
        <label style={{ fontWeight: "500", color: "#003b70", display: "block", marginBottom: 4 }}>
          Filter by Case Status:
        </label>
        <select
          value={
            activeAppealCasesTab === "pended"
              ? "Pended"
              : activeAppealCasesTab === "completed"
              ? "Completed"
              : activeAppealCasesTab === "followedUp"
              ? "FFup Sent"
              : activeAppealCasesTab === "assignedByCC"
              ? "New Assigned"
              : caseStatusFilter
          }
          onChange={(e) => setCaseStatusFilter(e.target.value)}
          disabled={activeAppealCasesTab === "pended" || activeAppealCasesTab === "completed" || activeAppealCasesTab === "followedUp" || activeAppealCasesTab === "assignedByCC"}
          style={{
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
            width: "100%",
            fontFamily: "inherit",
            backgroundColor: activeAppealCasesTab === "pended" || activeAppealCasesTab === "completed" || activeAppealCasesTab === "followedUp" || activeAppealCasesTab === "assignedByCC" ? "#f0f0f0" : "white",
            cursor: activeAppealCasesTab === "pended" || activeAppealCasesTab === "completed" || activeAppealCasesTab === "followedUp" || activeAppealCasesTab === "assignedByCC" ? "not-allowed" : "pointer"
          }}
        >
          <option value="">All</option>
          <option value="Pend">Pend</option>  
          <option value="Pended">Pended</option>
          <option value="Open">Open</option>
          <option value="Completed">Completed</option>
          <option value="FFup Sent">FFup Sent</option>
          <option value="New Assigned">New Assigned</option>
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

       {/* Manager Filter */}
       <div style={{ width: 200 }}>
        <label style={{ fontWeight: "500", color: "#003b70", display: "block", marginBottom: 4 }}>
          Filter by Manager:
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
          <select
            value=""
            onChange={(e) => {
              const manager = e.target.value;
              if (manager && !selectedManagers.includes(manager)) {
                setSelectedManagers([...selectedManagers, manager]);
              }
            }}
            style={{
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc",
              flex: 1,
              fontFamily: "inherit",
            }}
          >
            <option value="">-- Select Manager --</option>
            {managerList && managerList.length > 0 ? (
              managerList.map((manager, index) => (
                <option 
                  key={index} 
                  value={manager}
                  disabled={selectedManagers.includes(manager)}
                >
                  {manager}
                </option>
              ))
            ) : (
              <option disabled>No managers available</option>
            )}
          </select>
        </div>
        {selectedManagers.length > 0 && (
          <div style={{
            marginTop: 8,
            padding: 8,
            backgroundColor: "#f5f5f5",
            borderRadius: 4,
            border: "1px solid #ddd",
            fontSize: 12,
            maxHeight: 100,
            overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 600, marginBottom: 6, color: "#003b70" }}>
              <span>Selected Manager(s):</span>
              <button
                onClick={() => setSelectedManagers([])}
                style={{
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                Clear
              </button>
            </div>
            {selectedManagers.map((manager, idx) => (
              <div key={idx} style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                padding: "4px 0",
                borderBottom: idx < selectedManagers.length - 1 ? "1px solid #e0e0e0" : "none"
              }}>
                <span>{manager}</span>
                <button
                  onClick={() => setSelectedManagers(selectedManagers.filter((_, i) => i !== idx))}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ff4d4f",
                    cursor: "pointer",
                    fontSize: 16,
                    fontWeight: "bold"
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  
    {/* SR Number & Manager Search Input */}
    <div style={{
      backgroundColor: "white",
      padding: "16px 20px",
      borderRadius: "8px",
      marginBottom: "12px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      width: "40%"
    }}>
      <label style={{
        fontWeight: "600",
        color: "#003b70",
        display: "block",
        marginBottom: "8px"
      }}>
        Search by SR Number or Owner ID:
      </label>
      <input
        type="text"
        placeholder="Enter SR number or Owner ID to filter table..."
        value={tableDataSearchTerm}
        onChange={(e) => setTableDataSearchTerm(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          fontSize: "14px",
          fontFamily: "inherit",
          boxSizing: "border-box"
        }}
      />
      {tableDataSearchTerm && (
        <div style={{
          marginTop: "8px",
          fontSize: "13px",
          color: "#666"
        }}>
          Found {caseTblAllPoc.filter(row => {
            const term = tableDataSearchTerm.toUpperCase();
            const srMatch = String(row["sr"] || row["SR"] || row["SR."] || "").toUpperCase().includes(term);
            const ownerIDMatch = String(row["ownerID"] || row["OwnerID"] || "").toUpperCase().includes(term);
            return srMatch || ownerIDMatch;
          }).length} matching records
        </div>
      )}
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
        {activeAppealCasesTab === "assignedByCC"
        ? `Total Assigned: ${totalAppealCases}`
        : activeAppealCasesTab === "pended"
        ? `Total Pended: ${totalAppealCases}`
        : activeAppealCasesTab === "completed"
        ? `Total Completed: ${totalAppealCases}`
        : activeAppealCasesTab === "followedUp"
        ? `Total Followed Up: ${totalAppealCases}`
        : `Total Appeal Cases: ${totalAppealCases}`}
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
  onClick={() => {
    fetchAgents()
    setShowFollowUpModal(true)}}
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
    sortedCases
    .filter(row => {
      if (tableDataSearchTerm.trim() === '') return true;
      const term = tableDataSearchTerm.toUpperCase();
      const srMatch = String(row["sr"] || row["SR"] || row["SR."] || "").toUpperCase().includes(term);
      const managerMatch = String(row["manager"] || row["Manager"] || "").toUpperCase().includes(term);
      const ownerIDMatch = String(row["ownerID"] || row["OwnerID"] || "").toUpperCase().includes(term);
      return srMatch || managerMatch || ownerIDMatch;
    })
    .map((row, idx) => {
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
                    (excelKey === 'appealStatus' && row.appealStatus.includes("Completed"))
                      ? "green"
                      : (excelKey === 't_Minus' || excelKey === 't_Minus') &&
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

    {/*Filter rows*/}
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ fontSize: '13px', fontWeight: '500', color: '#003b70' }}>
        Rows:
      </span>
      <div style={{ 
        display: 'flex', 
        gap: '4px',
        backgroundColor: '#f0f0f0',
        padding: '4px',
        borderRadius: '6px'
      }}>
        {[10, 20, 50, 100].map(size => (
          <button
            key={size}
            onClick={() => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: pageSize === size ? '600' : '400',
              backgroundColor: pageSize === size ? '#0071ce' : 'transparent',
              color: pageSize === size ? 'white' : '#333',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {size}
          </button>
        ))}
      </div>
    </div>

  </div>
</>
)}
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
          onClick={async () => {
            setShowFollowUpModal(false);
            await handleSendFollowUpEmails();
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
