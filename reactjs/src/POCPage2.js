// POCPage.js
import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
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
import axios from 'axios';
import { dataApiUrl, dataApiEmailUrl } from './config';

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

  const rowsPerPage = 10; // You can change this to 20, 50 etc.
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTo, setAssignTo] = useState([]);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showFollowToast, setShowFollowToast] = useState(false);
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

  
  const caseTblAllColumnMap = {
    id: "Id",
    age_Cal: "Age (Days)",
    sr: "SR",
    manager: "Manager",
    agE_PROMISE: "Promise",
    promise_Date: "Promise Date",
    recd_By_Cigna: 'Rec\'d',
    system: "System",
    lpi: "LPI",
    pg: "PG",
    pG_NAME: "PG Name",
    ownerID: "Owner ID",
    ownerName: "Owner Name",
    appealStatus: "Status",
    case_assignment_status: "Case Assignment",
    //id: "Case ID", // optional: hidden from UI if not needed
  };

  
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
    pend_reason: "Pending Reason"
  };

  const getOwnerHelperValue = (row) => {
    const key = Object.keys(row).find(k =>
      k.trim().replace(/\s+/g, "_").toUpperCase() === "OWNER_HELPER"
    );
    return (row[key] || "").trim().toUpperCase();
  }; 

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




const fetchAgents2 = async () => {
  try {
    const response = await axios.get(`${dataApiUrl}appeals_agents_list`);
    setAgentList(response.data || []);
  } catch (error) {
    console.error("Failed to fetch agents", error);
  }
};

const fetchAgents = async () => {
  try {
    const response = await axios.get(`${dataApiUrl}appeals_agents_list`);
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


const fetchCasesPage = async (page = currentPage, size = pageSize) => {
  setIsLoading(true);
  try {
    const res = await axios.post(`${dataApiUrl}cases_tbl_all_poc?pageNumber=${page}&pageSize=${size}`, {
      poc: 'M132305',
      caseStatus: caseStatusFilter === 'All' ? '' : caseStatusFilter,
      assignedStatus: assignmentFilter === 'All' ? '' : assignmentFilter
    });

    const { totalRecords, data } = res.data;
    setCaseTblAllPoc(data);                 // ✅ Use this instead
    setTotalAppealCases(totalRecords);     // for pagination controls
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
  setCurrentPage(1);
  fetchCasesPage(1, pageSize)
  fetchAgeBuckets();
}, [caseStatusFilter, assignmentFilter]);

useEffect(() => {
  fetchCasesPage(currentPage, pageSize);
}, [currentPage, pageSize]);



useEffect(() => {
  fetchAgents();
    fetchAgeBuckets()
    fetchCasesPage(1, pageSize)
    setUploadComplete(true); // Reset upload state on mount
}, []);


useEffect(() => {
  if (departmentList.length > 0) {
    fetchAgents();
  }
}, [departmentList]);
  
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



// useEffect(() => {
//     fetchAgents();
// }, [showAssignModal, showFollowUpModal]);
      
const handleRefresh = async () => {
  window.location.reload();
  fetchCasesPage(1, pageSize)
         fetchAgeBuckets();
         setAssignmentFilter("All");
         setCaseStatusFilter("All");
         setPageSize(10); 
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
  const poc_id = "M132305";

  try {
    const res = await axios.get(`${dataApiUrl}get_age_bucket_poc?poc=${poc_id}`);
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

  const hasAssigned = selectedRows.some(row => row.case_assignment_status === "Assigned");

    if (hasAssigned) {
      alert("One or more selected cases are already assigned. Reassignment is not allowed.");
      return;
    }

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
    } else {
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

        await axios.post(`${dataApiUrl}appeal_case_assignment_update`, {
          ids,
          status,
          CignaID: agent.agent,
          sessID: '',
          ownerID: agent.agent,
          ownerName: agent.agent_name
        });
      }
    }

    // ✅ After successful update
    await fetchAgeBuckets();       // Optional refresh
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
          ids: payload.id,
          cignaID: payload.agentID,
          sessID: ""
        });

        setShowFollowToast(true);
  
      } catch (err) {
        console.error(`Error for ownerID ${ownerId}`, err);
      }
    }
  
    // Step 3: Update status for all selected rows
    try {
      await handleUpdateAssignedStatus({ status: "FFup Sent" });
    } catch (err) {
      console.error("Error updating status", err);
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
      //console.log(`Email sent to ${agent.agent_name}:`, response.data);
    } catch (error) {
      //console.error(`Failed to send email to ${agent.agent_name}:`, error.response?.data || error.message);
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

  const caseStatusUpdate = async () => {
    const payload = {
      status: "string",
    };

    try {
      const response = await axios.post(serverAPI + '/api/AppealsIssue/appeal_case_status_update', payload);
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
  const agentRoster = async () => {
    const payload = "string"
    try {
      const response = await axios.get(serverAPI + '/api/AppealsIssue/appeals_agents_list' + payload);
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
            <select id="reportSelect" value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}>
              {/* <option>Facets</option> */}
              <option>Proclaim</option>
            </select>
            <button onClick={triggerFileDialog} style={{ backgroundColor: "#0071ce", color: "white", padding: "10px 18px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>Upload Excel</button>
            <a href="/template/Appeals_Pi_Tool_Upload_Template.csv" download style={{ textDecoration: "none" }}>
            <button style={{ backgroundColor: "#0071ce", color: "white", padding: "10px 18px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>Download Template</button>
            </a>
        
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
         
          <button onClick={handleRefresh} style={{ backgroundColor: "#00aaff", color: "white", padding: "10px 18px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>Refresh</button>
          <button style={{ backgroundColor: "#217346", color: "white", padding: "10px 18px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>Extract Excel</button>
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
    caseTblAllPoc.
    map((row, idx) => {
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
            <td key={excelKey} style={{ padding: '8px', border: '1px solid #eee' }}>
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

      <label style={{ fontWeight: "500", marginBottom: "6px", display: "block" }}>
          Select Agent:
        </label>
        <select
          value=""
          //disabled={assignTo.length >= selectedRows.length}
          onChange={(e) => {
            const selectedAgentName = e.target.value;
            const selectedAgent = agentList.find(a => a.agent_name === selectedAgentName);
          
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
            .map(agent => agent.agent_name)
            .filter(name => {
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
                {assignTo.map((a, idx) => (
                  <li
                    key={a.agent} // Or any unique ID
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <span>{a.agent_name}</span>
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
            //handleReassignAppeals();
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
