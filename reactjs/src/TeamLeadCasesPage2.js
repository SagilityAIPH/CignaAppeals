import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
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
import { useLocation } from "react-router-dom"; // ⬅️ Add this line at the top
import axios from "axios";
import { dataApiUrl } from "./config";

function TeamLeadCasesPage() {
  const location = useLocation();

  const stateFromRoute = location.state;
  const stateFromStorage = JSON.parse(
    sessionStorage.getItem("loginState") || "{}"
  );

  const managerNameRaw =
    stateFromRoute?.managerNameRaw || stateFromStorage.managerNameRaw;
  const displayManagerName = location.state?.managerNameRaw ?? managerNameRaw;
  //console.log("Router state:", stateFromRoute);
  //console.log("Storage fallback:", stateFromStorage);

  const managerName = (
    location.state?.managerName ||
    stateFromStorage.managerName ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const [preserviceRows, setPreserviceRows] = useState([]);
  const [preserviceHeaders, setPreserviceHeaders] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedGsp, setSelectedGsp] = useState("All");
  const [gnbSummary, setGnbSummary] = useState([]);
  const [filterColumn, setFilterColumn] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All"); // 'All' | 'Open' | 'Completed'
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTo, setAssignTo] = useState("");

  const [ageBucketData, setAgeBucketData] = useState([]);
  const [caseStatusCt, setCaseStatusCt] = useState([]);
  let totalStatusCt = 0;
  const [caseTblAll, setCaseTblAll] = useState([]);

  const [paginatedRows2, setPaginatedRows2] = useState([]);
  const [currentPage2, setCurrentPage2] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [filterOptions, setFilterOptions] = useState([]);
  const [filterValues, setFilterValues] = useState([]);
  const [filter, setFilter] = useState({
    SR: "",
    Director: "",
    Manager: "",
    Age_Cal: null,
    AppealStatus: "",
    Promise_Date: null,
    System: "",
    LPI: "",
    PG: "",
    PG_NAME: "",
    OwnerID: "",
    OwnerName: "",
  });

  const [caseStatusFilter, setCaseStatusFilter] = useState("All"); 
  const [assignmentFilter, setAssignmentFilter] = useState("All"); 
  const [totalAppealCases, setTotalAppealCases] = useState(0); 
  const totalPages2 = pageSize === 0 ? 1 : Math.ceil(totalAppealCases / pageSize);
  const fetchAgeBucketSummary = async () => {
    const teamLeadId = 'M124100';
  
    try {
      const res = await axios.get(`${dataApiUrl}get_age_bucket_teamlead`, {
        params: { teamLeadId }
      });
  
      const data = res.data;
      setAgeBucketData(data);
      console.log(data);
    } catch (error) {
      console.error('Error fetching age bucket summary:', error);
    }
  };

 
  const fetchCaseStatusCt = async () => {
    const teamLeadId = 'M124100';
  
    try {
      const res = await axios.get(`${dataApiUrl}get_cases_status_ct_teamlead`, {
        params: { teamlead: teamLeadId }
      });
  
      if (res.data) {
        setCaseStatusCt(res.data);  // ✅ set as an object, not [res.data]
      } else {
        setCaseStatusCt(null);
      }
    } catch (error) {
      console.error("Failed to fetch case status:", error);
      setCaseStatusCt(null);
    }
  };


  
const fetchCasesPage = async (page = currentPage, size = pageSize) => {

  try {
    const res = await axios.post(`${dataApiUrl}cases_tbl_all_teamlead?pageNumber=${page}&pageSize=${size}`, {
      teamlead: 'M124100',
      caseStatus: caseStatusFilter === 'All' ? '' : caseStatusFilter,
      assignedStatus: assignmentFilter === 'All' ? '' : assignmentFilter
    });

    const { totalRecords, data } = res.data;
    setCaseTblAll(data);  
 
    setTotalAppealCases(totalRecords);
    
    console.log(data)// ✅ Use this instead
    console.log(caseTblAll.length + "total length of caseTblAll");
    console.log(totalRecords + "total length of totalRecords");
     // for pagination controls
  } catch (err) {
  
    if (err.response?.status === 404) {
      setCaseTblAll([]);
      setTotalAppealCases(0);
   
    } else {
      console.error("Error fetching all pages:", err);
    }
  } 
};
  
  const fetchAllCaseTblAllPages = async () => {
    let allData = [];
    let page = 1;
    const pageSize = 500;
    let totalCount = null;

    try {
      while (true) {
        const response = await axios.post(
          `${dataApiUrl}cases_tbl_all?pageNumber=${page}&pageSize=${pageSize}`,
          { manager: managerName }
        );

        const pageData = response.data;
        const totalFromHeader = response.headers["x-total-count"]
          ? parseInt(response.headers["x-total-count"])
          : null;

        console.log(totalFromHeader + " Total count");
        if (!totalCount) totalCount = totalFromHeader;

        allData = [...allData, ...pageData];

        if (allData.length >= totalCount) break;

        page++;
      }

      setCaseTblAll(allData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchAllFilteredCases = async (filterObj) => {
    const status = filterObj.AppealStatus?.toString().trim().toUpperCase();
    const validStatuses = ["ASSIGNED", "UNASSIGNED", "PENDED", "COMPLETED"];

    // Handle invalid filter
    if (status && !validStatuses.includes(status)) {
      console.warn("Invalid status — returning empty result.");
      //setCaseTblAll([]);
      return;
    }

    let page = 1;
    const pageSize = 500;
    let allData = [];
    let totalCount = null;

    while (true) {
      try {
        const response = await axios.post(
          `${dataApiUrl}cases_tbl_all/filter?pageNumber=${page}&pageSize=${pageSize}`,
          {
            filter: filterObj, // filter.AppealStatus will be null if "All" is selected
            manager: { manager: managerName },
          }
        );

        const pageData = response.data;
        const totalFromHeader = response.headers["x-total-count"]
          ? parseInt(response.headers["x-total-count"])
          : null;

        if (!totalCount) totalCount = totalFromHeader;

        allData = [...allData, ...pageData];

        if (allData.length >= totalCount) break;

        page++;
      } catch (error) {
        console.error("Error fetching data:", error);
        break;
      }
    }

    //setCaseTblAll(allData);
  };

  // useEffect(() => {
  //   if (!filterColumn) {
  //     setFilterValues([]); // clear values if no column selected
  //     setFilterValue(""); // clear selected value
  //     return;
  //   }

  //   const fetchDistinctValues = async () => {
  //     try {
  //       const response = await axios.get(
  //         `${dataApiUrl}cases_tbl_all_filter/distinct/${filterColumn}?manager=${managerName}`
  //       );
  //       setFilterValues(response.data);
  //       setFilterValue(""); // reset selected filter value
  //     } catch (error) {
  //       console.error("Error fetching distinct values:", error);
  //       setFilterValues([]);
  //     }
  //   };

  //   fetchDistinctValues();
  // }, [filterColumn, managerName]);

 

  // useEffect(() => {
  //   const start = (currentPage2 - 1) * pageSize;
  //   const end = start + pageSize;
  //   setPaginatedRows2(caseTblAll.slice(start, end));
  // }, [caseTblAll, currentPage2, pageSize]);


  useEffect(() => {
    setCurrentPage(1);
    fetchCasesPage(1, pageSize)
    fetchAgeBucketSummary()
      fetchCaseStatusCt()
  }, [caseStatusFilter, assignmentFilter]);

  useEffect(() => {
    setCurrentPage2(1); // Reset page
  }, [pageSize]);
  
  useEffect(() => {
    fetchCasesPage(currentPage2, pageSize);
  }, [currentPage2]);
  
  
  
  useEffect(() => {
    
      fetchAgeBucketSummary()
      fetchCaseStatusCt()
      fetchCasesPage(1, pageSize)
// Reset upload state on mount
  }, []);
    
  // useEffect(() => {
  //     fetchAgents();
  // }, [showAssignModal, showFollowUpModal]);
        
  const handleRefresh = async () => {
    fetchCasesPage(1, pageSize)
           setAssignmentFilter("All");
           setCaseStatusFilter("All");
           setPageSize(10); 
  };

  useEffect(() => {
    const autoLoadFlag = localStorage.getItem("autoLoadTeamLead");

    if (autoLoadFlag === "true") {
      localStorage.setItem("autoLoadTeamLead", "false");
    
    
      // Auto-fetch from public Excel path
      const fileUrl = process.env.PUBLIC_URL + "/template/Appeals_Sample.xlsx";
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
                String(h || "")
                  .replace(/\s+/g, " ")
                  .trim()
              );
              const fixedData = rows.map((row) =>
                Object.fromEntries(
                  normalizedHeaders.map((key, i) => [key, row[i] ?? ""])
                )
              );

              setPreserviceRows(fixedData);
              setPreserviceHeaders(normalizedHeaders);
              // ✅ Build Total Appeals Summary (filtered by current manager)
              const departments = ["Sagility", "Concentrix", "Wipro"];
              const grouped = {};
              const bucketKey = "AGE_BUCKET";
              const deptKey = "Director";
              const managerKey = "Manager";

              fixedData.forEach((row) => {
                const rawManager = (row[managerKey] || "").toLowerCase().trim();
                const matchManager =
                  rawManager === managerNameRaw.toLowerCase().trim();
                if (!matchManager) return;

                const rawDept = (row[deptKey] || "").trim();
                const bucket = (row[bucketKey] || "").trim();
                const matchedDept = departments.find((dep) => rawDept === dep);

                if (matchedDept && bucket) {
                  if (!grouped[matchedDept]) grouped[matchedDept] = {};
                  grouped[matchedDept][bucket] =
                    (grouped[matchedDept][bucket] || 0) + 1;
                }
              });

              const allBuckets = [
                "0-14",
                "15-29",
                "30-44",
                "45-59",
                "60-89",
                "90-179",
                "180-364",
                "365+",
              ];

              const summary = departments.map((dept) => {
                const counts = grouped[dept] || {};
                const row = { Department: dept };
                let total = 0;

                allBuckets.forEach((bucket) => {
                  const count = counts[bucket] || 0;
                  row[bucket] = count;
                  total += count;
                });

                row.Total = total;
                return row;
              });

              const grandTotal = { Department: "Total" };
              allBuckets.forEach((bucket) => {
                grandTotal[bucket] = summary.reduce(
                  (sum, row) => sum + (row[bucket] || 0),
                  0
                );
              });
              grandTotal.Total = summary.reduce(
                (sum, row) => sum + row.Total,
                0
              );
              summary.push(grandTotal);

              setGnbSummary(summary);
            }
          }
        })
        .catch((err) => console.error("Failed to auto-load Excel:", err));
    }
  }, []);

  useEffect(() => {
    const fetchDistinctValues = async () => {
      if (!filterColumn) return;

      try {
        const response = await axios.get(
          `${dataApiUrl}cases_tbl_all_filter/distinct/${filterColumn}`,
          {
            params: {
              manager: managerName, // optional
            },
          }
        );

        setFilterOptions(response.data);
      } catch (error) {
        console.error("Failed to fetch filter values:", error);
        setFilterOptions([]);
      }
    };

    fetchDistinctValues();
  }, [filterColumn, managerName]);

  // ✅ Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterColumn, filterValue, selectedGsp]);

  const preserviceAllowedHeaders = [
    "AGE",
    "SR.",
    "Manager",
    "PROMISE",
    "Task Promise Date",
    "Rec'd",
    "System",
    "LPI?",
    "PG?",
    "PG Name",
    "OwnerID",
    "Owner",
  ];

  const preserviceColumnMap = {
    "Age Cal": "AGE",
    SR: "SR.", // ← ✅ FIXED: 'SR .' changed to 'SR'
    Manager: "Manager",
    AGE_PROMISE_BUCKET: "PROMISE",
    "Promise Date": "Task Promise Date",
    "Recd By Cigna": "Rec'd",
    System: "System",
    "LPI?": "LPI?",
    "PG?": "PG?",
    "PG NAME2": "PG Name",
    OwnerID: "OwnerID",
    OwnerName: "Owner",
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
    case_Assignment_Status: "Case Assignment",
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

  const resolveExcelHeader = (friendlyHeader) => {
    const found = Object.entries(preserviceColumnMap).find(
      ([excelKey, displayName]) =>
        displayName.trim().toLowerCase() === friendlyHeader.trim().toLowerCase()
    );
    return found?.[0] || friendlyHeader;
  };

  const getColorForBucket = (index) => {
    const colors = [
      "#00C49F",
      "#66BB6A",
      "#42A5F5",
      "#FFA726",
      "#FB8C00",
      "#F4511E",
      "#EF5350",
      "#E53935",
      "#B71C1C",
      "#A1887F",
      "#9FA8DA",
    ];
    return colors[index % colors.length];
  };

  const preserviceDateFields = ["recd_by_Appeals", "promise_Date"];

  const formatExcelDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return isNaN(date.getTime()) ? "" : date.toLocaleDateString();
  };

  const markPaginatedRowsAsPending = () => {
    const updated = preserviceRows.map((row) => {
      const isVisible = paginatedRows2.some(
        (visible) => visible["sr"] === row["sr"]
      );
      if (isVisible) {
        return { ...row, OWNER_HELPER: "PENDED" };
      }
      return row;
    });

    setPreserviceRows(updated);
  };

  const getOwnerHelperValue = (row) => {
    const key = Object.keys(row).find(
      (k) => k.trim().replace(/\s+/g, "_").toUpperCase() === "OWNER_HELPER"
    );
    return (row[key] || "").trim().toUpperCase();
  };

  const filteredPreserviceRows = useMemo(() => {
    let result = preserviceRows.filter((row) => {
      const status = getOwnerHelperValue(row);

      switch (statusFilter) {
        case "All":
          return true;
        case "ASSIGNED":
          return status === "ASSIGNED";
        case "UNASSIGNED":
          return status === "UNASSIGNED" || status === "";
        case "PENDED":
          return status === "PENDED";
        case "COMPLETED":
          return status === "COMPLETED";
        default:
          return true;
      }
    });

    // Filter by Manager
    result = result.filter((row) => {
      const managerKey = Object.keys(row).find(
        (k) => k.trim().toLowerCase() === "manager"
      );
      if (!managerKey) return false;

      const rawManager = String(row[managerKey] || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      return rawManager === managerName?.toLowerCase();
    });

    // Filter by selectedGsp (Director)
    if (selectedGsp !== "All") {
      result = result.filter(
        (row) => (row["Director"] || "").trim() === selectedGsp
      );
    }

    // Filter by column + value
    if (filterColumn && filterValue) {
      const actualKey = resolveExcelHeader(filterColumn);
      const selectedValues = filterValue
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      result = result.filter((row) => {
        const raw = row[actualKey];
        if (!raw) return false;

        const rowValue = String(raw).toUpperCase();
        return selectedValues.some((val) => rowValue.includes(val));
      });
    }

    return result;
  }, [
    preserviceRows,
    managerName,
    selectedGsp,
    filterColumn,
    filterValue,
    statusFilter,
  ]);

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
      .filter(
        (r) =>
          (r["Manager"] || "").trim().toLowerCase() ===
          managerNameRaw.trim().toLowerCase()
      )
      .map((r) => ({
        ...r,
        _STATUS: getOwnerHelperValue(r),
      }));
  }, [preserviceRows, managerNameRaw]);

  const isAllSelected =
    paginatedRows.length > 0 &&
    paginatedRows.every((row) =>
      selectedRows.some((selected) => selected["SR"] === row["SR"])
    );

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedRows);
    }
  };

  const toggleRowSelection = (row) => {
    const exists = selectedRows.some(
      (selected) => selected["SR"] === row["SR"]
    );
    if (exists) {
      setSelectedRows((prev) =>
        prev.filter((selected) => selected["SR"] !== row["SR"])
      );
    } else {
      setSelectedRows((prev) => [...prev, row]);
    }
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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
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
            String(h || "")
              .replace(/\s+/g, " ")
              .trim()
          );

          const fixedData = rows.map((row) =>
            Object.fromEntries(
              normalizedHeaders.map((key, i) => [key, row[i] ?? ""])
            )
          );

          console.log("Sample Row:", fixedData[0]);
          console.log("Available Keys:", Object.keys(fixedData[0]));

          // ✅ Set Pre-Service data
          setPreserviceRows(fixedData);
          console.log(
            "👀 Sample OwnerNames:",
            fixedData.map((r) => r["OwnerName"])
          );
          setPreserviceHeaders(normalizedHeaders);

          // ✅ Build Total Appeals Summary (filtered by current manager)
          const departments = ["Sagility", "Concentrix", "Wipro"];
          const grouped = {};
          const bucketKey = "AGE_BUCKET";
          const deptKey = "Director";
          const managerKey = "Manager";

          fixedData.forEach((row) => {
            const rawManager = (row[managerKey] || "").toLowerCase().trim();
            const matchManager =
              rawManager === managerNameRaw.toLowerCase().trim();
            if (!matchManager) return;

            const rawDept = (row[deptKey] || "").trim();
            const bucket = (row[bucketKey] || "").trim();
            const matchedDept = departments.find((dep) => rawDept === dep);

            if (matchedDept && bucket) {
              if (!grouped[matchedDept]) grouped[matchedDept] = {};
              grouped[matchedDept][bucket] =
                (grouped[matchedDept][bucket] || 0) + 1;
            }
          });

          const allBuckets = [
            "0-14",
            "15-29",
            "30-44",
            "45-59",
            "60-89",
            "90-179",
            "180-364",
            "365+",
          ];

          const summary = departments.map((dept) => {
            const counts = grouped[dept] || {};
            const row = { Department: dept };
            let total = 0;

            allBuckets.forEach((bucket) => {
              const count = counts[bucket] || 0;
              row[bucket] = count;
              total += count;
            });

            row.Total = total;
            return row;
          });

          const grandTotal = { Department: "Total" };
          allBuckets.forEach((bucket) => {
            grandTotal[bucket] = summary.reduce(
              (sum, row) => sum + (row[bucket] || 0),
              0
            );
          });
          grandTotal.Total = summary.reduce((sum, row) => sum + row.Total, 0);
          summary.push(grandTotal);

          setGnbSummary(summary);
        }
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const customHeaders = [
    { key: "department", label: "Department" },
    { key: "ab0_14", label: "0-14" },
    { key: "ab15_29", label: "15-29" },
    { key: "ab30_44", label: "30-44" },
    { key: "ab45_59", label: "45-59" },
    { key: "ab60_89", label: "60-89" },
    { key: "ab90_179", label: "90-179" },
    { key: "ab180_364", label: "180-364" },
    { key: "ab365_Plus", label: "365+" },
    { key: "total", label: "Total" },
  ];


  const filterColumnOptions = {
    SR: "SR",
    Director: "Director",
    Manager: "Manager",
    Age_Cal: "Age (Days)",
    AppealStatus: "Appeal Status",
    Promise_Date: "Promise Date",
    System: "System",
    LPI: "LPI",
    PG: "PG",
    PG_NAME: "PG Name",
    OwnerID: "Owner ID",
    OwnerName: "Owner Name",
  };

  return (
    <div style={{ padding: "0px", fontFamily: "Lexend, sans-serif" }}>
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

      {/* Total Appeals Summary Section */}
      {/* Total Appeals Summary Section */}
      {gnbSummary.length > 0 && (
        <div
          style={{
            marginTop: "0px",
            marginLeft: "-30px",
            backgroundColor: "#F5F6FA",
            borderRadius: "10px",
            padding: "20px",
            fontFamily: "Lexend, sans-serif",
          }}
        >
          <h3
            style={{
              fontSize: "19px",
              fontWeight: "500",
              color: "#003b70",
              marginBottom: "16px",
              marginTop: "0px",
            }}
          >
            Total Appeals Summary & Age Breakdown
          </h3>

          <div
            style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}
          >
            {/* Left Section: Table + Card */}
            <div style={{ flex: 1, minWidth: "450px", maxWidth: "650px" }}>
              {/* Scrollable Table */}
              <div
                style={{
                  border: "1px solid #ddd",
                  maxHeight: "300px",
                  overflow: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead style={{ backgroundColor: "#00bcd4", color: "white" }}>
                    <tr>
                      {customHeaders.map(({ label }) => (
                        <th
                          key={label}
                          style={{
                            padding: "10px",
                            border: "1px solid #ccc",
                            textAlign: "left",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {ageBucketData.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          backgroundColor:
                            idx % 2 === 0 ? "#ffffff" : "#f3f6fb",
                        }}
                      >
                        {customHeaders.map(({ key }) => (
                          <td
                            key={key}
                            style={{
                              padding: "8px",
                              border: "1px solid #eee",
                              textAlign: "left",
                              whiteSpace: "nowrap",
                              fontWeight:
                                row.department?.toLowerCase() === "total" &&
                                key === "department"
                                  ? "600"
                                  : "400",
                            }}
                          >
                            {key === "department" ? row[key] : row[key] ?? "0"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Case Summary Card */}
              <div
                style={{
                  marginTop: "20px",
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  width: "93.3%",
                  fontSize: "14px",
                }}
              >
                <h4
                  style={{
                    marginTop: "0px",
                    marginBottom: "16px",
                    color: "#003b70",
                    fontWeight: "600",
                  }}
                >
                  Case Summary
                </h4>

                {caseStatusCt && (() => {
                    const {
                      teamLead,
                      teamlead_id,
                      total_Count: total,
                      completed,
                      pended,
                      fFup_Sent,
                      assigned,
                      unassigned,
                      open,
                    } = caseStatusCt;

                    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

                    return (
                      <>
                        {/* <div><strong>Team Lead:</strong> {teamLead} ({teamlead_id})</div> */}
                        <div><span role="img" aria-label="folder">📁</span> Total Cases: <strong>{total}</strong></div>
                        <div><span role="img" aria-label="rocket">🚀</span> Assigned: <strong>{assigned}</strong></div>
                        <div><span role="img" aria-label="question">❔</span> Unassigned: <strong>{unassigned}</strong></div>
                        <div><span role="img" aria-label="pending">🟡</span> Pended: <strong>{pended}</strong></div>
                        <div><span role="img" aria-label="ffup_sent">🔔</span> FFup Sent: <strong>{fFup_Sent}</strong></div>
                        <div><span role="img" aria-label="open">📂</span> Open: <strong>{open}</strong></div>
                        <div><span role="img" aria-label="check">✅</span> Completed: <strong>{completed}</strong></div>

                        <div style={{ fontSize: "12px", marginBottom: "4px", color: "#003b70", fontWeight: "500" }}>
                          Completion Rate
                        </div>
                        <div style={{ backgroundColor: "#e0e0e0", borderRadius: "20px", height: "10px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${percent}%`,
                            backgroundColor: "#28a745",
                            transition: "width 0.3s ease-in-out"
                          }} />
                        </div>
                        <div style={{ fontSize: "12px", marginTop: "4px", textAlign: "right" }}>{percent}%</div>
                      </>
                    );
                  })()}
                    

              </div>
            </div>

            {/* Chart - Right */}
            <div
              style={{
                flex: 1,
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.05)",
                minWidth: 0, // helps Flex grow/shrink properly
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "500",
                  color: "#003b70",
                  marginBottom: "24px",
                  borderBottom: "1px solid #ddd",
                  paddingBottom: "8px",
                  marginTop: "0px",
                }}
              >
                Appeal Age Bucket Breakdown per GSP
              </h3>

              <ResponsiveContainer width="100%" height={295}>
                <BarChart
                  data={ageBucketData.filter(
                    (row) => row.Department !== "total"
                  )}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />

                  {customHeaders
                    .filter(
                      ({ key }) => key !== "department" && key !== "Total"
                    )
                    .map(({ key, label }, index) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        fill={getColorForBucket(index)}
                        name={label}
                      >
                        <LabelList
                          dataKey={key}
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

      {/* Pre-Service Section */}
      {preserviceRows.length > 0 && (
        <div
          style={{
            marginTop: "20px",
            marginLeft: "-30px",
            backgroundColor: "#F5F6FA",
            borderRadius: "10px",
            padding: "20px",
            fontFamily: "Lexend, sans-serif",
          }}
        >
          <h3
            style={{
              fontSize: "19px",
              fontWeight: "500",
              color: "#003b70",
              marginBottom: "10px",
              marginTop: "0px",
            }}
          >
            Appeal Cases
          </h3>

          <div style={{ display: "flex", gap: "16px", marginBottom: "25px" }}>
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

            {/* Page Size Selector */}
            <div style={{ width: "150px" }}>
                <label
                  style={{
                    fontWeight: "500",
                    color: "#003b70",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Rows per page:
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    width: "100%",
                    fontFamily: "inherit",
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#e8f0fe",
              border: "1px solid #c4d4ec",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "16px",
              marginTop: "0px",
              boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
              gap: "20px",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#003b70",
              }}
            >
              {/* Total Appeal Cases: {caseStatusCt[0].total_Count} */}
              Total Appeal Cases: {totalAppealCases}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowAssignModal(true)}
                // disabled={selectedRows.length === 0}
                disabled={true}
                style={{
                  backgroundColor: selectedRows.length > 0 ? "#0071ce" : "#aaa",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: selectedRows.length > 0 ? "pointer" : "not-allowed",
                  fontWeight: "600",
                }}
              >
                Assign
              </button>

              <button
                onClick={() => setShowFollowUpModal(true)}
                // disabled={selectedRows.length === 0}
                disabled={true}
                style={{
                  backgroundColor: selectedRows.length > 0 ? "#ff9800" : "#aaa",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: selectedRows.length > 0 ? "pointer" : "not-allowed",
                  fontWeight: "600",
                }}
              >
                Send for FollowUp
              </button>

              {/* <button
                onClick={() => {
                  const updated = preserviceRows.map((row) => {
                    const match = selectedRows.some(
                      (sel) => sel["SR"] === row["SR"]
                    );
                    if (match) {
                      return { ...row, OWNER_HELPER: "COMPLETED" };
                    }
                    return row;
                  });

                  setPreserviceRows(updated);
                  setSelectedRows([]);
                  setCurrentPage(1);
                }}
                disabled={selectedRows.length === 0}
                style={{
                  backgroundColor: selectedRows.length > 0 ? "#28a745" : "#aaa",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: selectedRows.length > 0 ? "pointer" : "not-allowed",
                  fontWeight: "600",
                }}
              >
                Mark as Completed
              </button> */}
            </div>
          </div>

          <div style={{ marginBottom: "16px", width: "100%" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "16px", // space between selects
                flexWrap: "wrap", // allows wrapping on smaller screens
              }}
            >
              {/* Status Filter */}
              

            
            </div>
          </div>

          {/* Table Appeal Cases */}
          <div
            style={{
              border: "1px solid #ddd",
              marginTop: "-10px",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            {/* Scrollable table container */}
            <div
              style={{
                maxHeight: "400px",
                overflowY: "auto",
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead
                  style={{
                    backgroundColor: "#e0eafc",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th style={{ padding: "8px", border: "1px solid #ccc" }}>
                      <input
                        type="checkbox"
                        // checked={isAllSelected}
                        // onChange={toggleSelectAll}
                      />
                    </th>
                    {Object.entries(caseTblAllColumnMap).map(([key, label]) => (
                      <th
                        key={key}
                        style={{
                          padding: "8px",
                          border: "1px solid #ccc",
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      >
                        {label}
                      </th>
                    ))}

                    <th
                      style={{
                        padding: "8px",
                        border: "1px solid #ccc",
                        fontWeight: "600",
                        textAlign: "left",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
  {caseTblAll.length === 0 ? (
    <tr>
      <td
        colSpan={Object.keys(caseTblAllColumnMap).length + 2}
        style={{
          padding: "16px",
          textAlign: "center",
          fontStyle: "italic",
          color: "#666",
          border: "1px solid #eee",
        }}
      >
        No results found.
      </td>
    </tr>
  ) : (
    caseTblAll.map((row, idx) => {
      const isChecked = selectedRows.some(
        (selected) => selected["id"] === row["id"]
      );

      return (
        <tr key={idx}>
          {/* ✅ Checkbox column */}
          <td style={{ padding: "8px", border: "1px solid #eee" }}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => toggleRowSelection(row)}
            />
          </td>

          {/* ✅ Dynamic data columns */}
          {Object.entries(caseTblAllColumnMap).map(([key]) => (
            <td key={key} style={{ padding: "8px", border: "1px solid #eee" }}>
              {preserviceDateFields.includes(key)
                ? formatExcelDate(row[key])
                : typeof row[key] === "object" && row[key] !== null
                ? JSON.stringify(row[key])
                : row[key] ?? ""}
            </td>
          ))}

          {/* ✅ Actions column */}
          <td style={{ padding: "8px", border: "1px solid #eee" }}>
            <button
              onClick={async () => {
                const details = await fetchCaseDetailsById(row.id);
                if (details) {
                  setSelectedRow(details);
                  setShowModal(true);
                } else {
                  alert("Failed to load case details.");
                }
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
      );
    })
  )}
</tbody>

              </table>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "12px",
                gap: "12px",
                backgroundColor: "#f9fbff",
                borderTop: "1px solid #ddd",
              }}
            >
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage2((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage2 === 1}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  backgroundColor: "#fff",
                  color: "#0071ce",
                  cursor: currentPage2 === 1 ? "not-allowed" : "pointer",
                  opacity: currentPage2 === 1 ? 0.6 : 1,
                }}
              >
                Previous
              </button>

              {/* Page Indicator */}
              <span style={{ fontWeight: "500", color: "#003b70" }}>
                Page {currentPage2} of {totalPages2}
              </span>

              {/* Next Button */}
              <button
                onClick={() =>
                  setCurrentPage2((prev) =>
                    prev < totalPages2 ? prev + 1 : prev
                  )
                }
                disabled={currentPage2 >= totalPages2}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  backgroundColor: "#fff",
                  color: "#0071ce",
                  cursor:
                    currentPage2 >= totalPages2 ? "not-allowed" : "pointer",
                  opacity: currentPage2 >= totalPages2 ? 0.6 : 1,
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
            zIndex: 1000,
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
            <h3 style={{ marginBottom: "16px", color: "#003b70" }}>
              Row Details
            </h3>

            {/* ✅ Show 'Reason for Pending' button only if status is PENDING */}
            {(() => {
              const raw = (selectedRow["OWNER_HELPER"] || "")
                .trim()
                .toUpperCase();
              const owner = (selectedRow["Owner"] || "").toUpperCase();
              const status =
                raw ||
                (owner.includes("SHARANAPPA") || owner.includes("VEERESHA")
                  ? "PENDED"
                  : "OPEN");

              return status === "PENDED" ? (
                <button
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    backgroundColor: "#ff9800",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                  onClick={() => setShowReasonModal(true)}
                >
                  Reason for Pended
                </button>
              ) : null;
            })()}

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
        <tbody>
        {Object.entries(selectedRow).map(([key, value]) => {
            const displayKey = viewAllDisplayMap[key.trim()] || key.replace(/_/g, ' ');
            const displayValue = preserviceDateFields.includes(key)
              ? formatExcelDate(value)
              : value ?? '-';

            if (
              displayValue === null ||
              displayValue === undefined ||
              (typeof displayValue === 'string' && displayValue.trim() === '')
            ) {
              return null;
            }

            return (
              <tr key={key}>
                <td
                  style={{
                    fontWeight: '600',
                    padding: '6px',
                    borderBottom: '1px solid #eee',
                    width: '40%',
                    verticalAlign: 'top',
                  }}
                >
                  {displayKey}
                </td>
                <td
                  style={{
                    padding: '6px',
                    borderBottom: '1px solid #eee',
                    wordBreak: 'break-word',
                  }}
                >
                  {displayValue}
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

      {showFollowUpModal && (
        <div
          onClick={() => setShowFollowUpModal(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowFollowUpModal(false)}
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
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "24px",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: "16px", color: "#003b70" }}>
              Confirm Follow Up
            </h3>
            <p style={{ marginBottom: "20px", fontSize: "14px" }}>
              Are you sure you want to send the selected case(s) for follow-up?
            </p>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "16px" }}
            >
              <button
                onClick={() => {
                  const updated = preserviceRows.map((row) => {
                    const match = selectedRows.some(
                      (sel) => sel["SR"] === row["SR"]
                    );
                    if (match) {
                      return { ...row, OWNER_HELPER: "PENDED" };
                    }
                    return row;
                  });

                  setPreserviceRows(updated);
                  setSelectedRows([]);
                  setShowFollowUpModal(false);
                  setCurrentPage(1);
                }}
                style={{
                  backgroundColor: "#ff9800",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: "pointer",
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
                  cursor: "pointer",
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
          onKeyDown={(e) => e.key === "Escape" && setShowReasonModal(false)}
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
            zIndex: 1100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "24px",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: "16px", color: "#003b70" }}>
              Reason for Pended
            </h3>
            <p style={{ fontSize: "14px", marginBottom: "24px" }}>
              Missing provider documentation.
            </p>
            <button
              onClick={() => setShowReasonModal(false)}
              style={{
                backgroundColor: "#003b70",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontWeight: "500",
                cursor: "pointer",
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
          onKeyDown={(e) => e.key === "Escape" && setShowAssignModal(false)}
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
            zIndex: 1100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "24px",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: "16px", color: "#003b70" }}>
              Assign Selected Cases
            </h3>

            <select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "14px",
                marginBottom: "20px",
              }}
            >
              <option value="">-- Select OwnerName --</option>
              {[
                ...new Set(
                  preserviceRows.map((row) => row["OwnerName"]).filter(Boolean)
                ),
              ]
                .sort()
                .map((name, i) => (
                  <option key={i} value={name}>
                    {name}
                  </option>
                ))}
            </select>

            <div
              style={{ display: "flex", justifyContent: "center", gap: "16px" }}
            >
              <button
                onClick={() => {
                  const selectedOwner = preserviceRows.find(
                    (r) => r["OwnerName"] === assignTo
                  );
                  if (!selectedOwner) return;

                  const updated = preserviceRows.map((row) => {
                    if (selectedRows.some((sel) => sel["SR"] === row["SR"])) {
                      return {
                        ...row,
                        OwnerName: selectedOwner["OwnerName"],
                        OwnerID: selectedOwner["OwnerID"],
                        OWNER_HELPER: "ASSIGNED",
                      };
                    }
                    return row;
                  });

                  setPreserviceRows(updated);
                  setSelectedRows([]);
                  setAssignTo("");
                  setShowAssignModal(false);
                }}
                disabled={!assignTo}
                style={{
                  backgroundColor: "#0071ce",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: assignTo ? "pointer" : "not-allowed",
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
                  cursor: "pointer",
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
