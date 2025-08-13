import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LabelList, ComposedChart, Line, Legend,
} from "recharts";
import axios from "axios";
import { data, useLocation } from "react-router-dom";
import { dataApiUrl, testIP } from './config';
function ClientProclaimPage() {
    const [excelData, setExcelData] = useState([]);
    const [directorStats, setDirectorStats] = useState({});
    const [fullyInsuredStats, setFullyInsuredStats] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDirector, setSelectedDirector] = useState('All');
    const [directorOptions, setDirectorOptions] = useState([]);
    const [preserviceRows, setPreserviceRows] = useState([]);
    const [preserviceHeaders, setPreserviceHeaders] = useState([]);
    const [selectedRow, setSelectedRow] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedGsp, setSelectedGsp] = useState('All');
    const [impactSummary, setImpactSummary] = useState([]);
    const [marqueeIndex, setMarqueeIndex] = useState(0);
    const [showMarquee, setShowMarquee] = useState(false);
    const filteredPreserviceRows = useMemo(() => (
    selectedGsp === 'All'
        ? preserviceRows
        : preserviceRows.filter(row => (row['Director'] || '').trim() === selectedGsp)
    ), [selectedGsp, preserviceRows]);
    const [gnbSummary, setGnbSummary] = useState([]);
    const [ifpRows, setIfpRows] = useState([]);
    const [ifpSummary, setIfpSummary] = useState([]);
    const [selectedIfpGsp, setSelectedIfpGsp] = useState('All');
    const [proclaimSummary, setProclaimSummary] = useState([]);
    const [proclaimTrend, setProclaimTrend] = useState([]);
    const [impactStatusFilter, setImpactStatusFilter] = useState('All'); // 'All', 'Failed', 'Open'
    const [rawImpactData, setRawImpactData] = useState([]);
    const [latestProclaimDate, setLatestProclaimDate] = useState('');
    //const [latestProclaimCounts, setLatestProclaimCounts] = useState({});
    const [trendView, setTrendView] = useState('Daily');
    const [pgYesRows, setPgYesRows] = useState([]);
    const [selectedPgGsp, setSelectedPgGsp] = useState('All');
    const [complianceView, setComplianceView] = useState('Daily');
    const [pendedReasonSummary, setPendedReasonSummary] = useState([]);
    const [selectedPendedGsp, setSelectedPendedGsp] = useState('All');

    const [pendedSort, setPendedSort] = useState({ key: 'Total', direction: 'desc' });
    const [memberProviderSummary, setMemberProviderSummary] = useState([]);
    const [summaryData, setSummaryData] = useState([]);
    const [memberProvider, setMemberProvider] = useState([]);
    const [outOfComplianceView, setOutOfComplianceView] = useState("Daily");
    const [transformComplianceTrend, setTransformComplianceTrend] = useState({});
    const [latestProclaimCounts, setLatestProclaimCounts] = useState({
      Sagility: 0,
      Concentrix: 0,
      Wipro: 0,
    });
    const [trendData, setTrendData] = useState([]);
    const [viewMode, setViewMode] = useState('Daily');
    const [pendedReason, setPendedReason] = useState([]);
    const [transformTrend, setTransformTrend] = useState([]);
    const [pgName, setPgNames] = useState([]);
    const [list, setList] = useState([]);
    const [nonAsoStats,setNonAsoStats] = useState([]);
    const [complianceRawData, setComplianceRawData] = useState([]);

const [preservicePage, setPreservicePage] = useState(1);
const [preservicePageSize, setPreservicePageSize] = useState(20);
const [preserviceTotal, setPreserviceTotal] = useState(0);
const [isPreserviceLoading, setIsPreserviceLoading] = useState(false);
const [pgNameSummary, setPgNameSummary] = useState([]);
const [selectedPgSummaryGsp, setSelectedPgSummaryGsp] = useState('All');
const [selectedPendReasonGsp, setSelectedPendReasonGsp] = useState('All');
const [pgYesPage, setPgYesPage] = useState(1);
const [pgYesPageSize, setPgYesPageSize] = useState(20);
const [pgYesTotal, setPgYesTotal] = useState(0);
const [isPgYesLoading, setIsPgYesLoading] = useState(false);
const [selectedPgYesGsp, setSelectedPgYesGsp] = useState('All');
const [selectedPreSerGsp, setSelectedPreSerGsp] = useState('All');

    useEffect(() => {
      const shouldAutoLoad = localStorage.getItem("autoLoadProclaim");
      //fetchProclaimSummary();
      if (shouldAutoLoad === "true") {
        handleAutoUpload();                      // Trigger upload
        localStorage.removeItem("autoLoadProclaim"); // Clear the flag so it doesn't repeat
      }
      fetchProclaimSummary();
      fetchProclaimStatusGraph();
       //fetchNonCompliant();
       fetchProclaimPendReasonCt();
       fetchMbrPrv();
       //fetchComplianceData();
       fetchComplianceRawData()
       fetchPgNameSummary();
       fetchNonAsoSummary();
      
    }, []);

    const fetchNonCompliant = async () => {
      try {
        const response = await axios.get(`${dataApiUrl}get_out_of_compliance`);
        console.log(response.data || []);
         setComplianceView(response.data);
      } catch (error) {
        console.error("Failed to fetch get_out_of_compliance", error);
      }
    };


    useEffect(() => {
      fetchProclaimPendReasonCt();
      //fetchMbrPrv();
    }, [selectedPendedGsp]); // Re-fetch when selectedPendedGsp changes}

    useEffect(() => {
      groupTrendData();
    }, [trendView, trendData]);


    const groupTrendData = () => {
      if (trendView === 'Daily') {
        const formatted = trendData.map(row => ({
          ...row,
          date: row.date.split('T')[0] // removes time
        }));
        setTransformTrend(formatted);
        return;
      }
  
      const groupMap = {};
  
      trendData.forEach(row => {
        const date = new Date(row.date);
        let key = '';
  
        if (trendView === 'Weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Sunday start
          key = weekStart.toISOString().split('T')[0];
        } else if (trendView === 'Monthly') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
  
        if (!groupMap[key]) {
          groupMap[key] = {
            date: key,
            Assigned: 0,
            Open: 0,
            Pended: 0,
            Completed: 0,
            FFUp_Sent: 0
          };
        }
  
        groupMap[key].Assigned += row.Assigned || 0;
        groupMap[key].Open += row.Open || 0;
        groupMap[key].Pended += row.Pended || 0;
        groupMap[key].Completed += row.Completed || 0;
        groupMap[key].FFUp_Sent += row.FFUp_Sent || 0;
      });
  
      const groupedArray = Object.values(groupMap);
      setTransformTrend(groupedArray);
    };


const fetchPreserviceRows = async (gsp, page, size) => {
  setIsPreserviceLoading(true);
  try {
    const res = await axios.post(
      `${dataApiUrl}cases_tbl_all_pre_service`,
       {}, 
      {
        params: {
          account: gsp === "All" ? "" : gsp,
          pageNumber: page,
          pageSize: size,
        },
      }
    );
    setPreserviceRows(res.data.data || []);
    setPreserviceTotal(res.data.totalRecords || 0);
  } catch (err) {
    setPreserviceRows([]);
    setPreserviceTotal(0);
    console.error("Failed to fetch Pre-Service Appeals:", err);
  }
  setIsPreserviceLoading(false);
};


const fetchPgYesRows = async (gsp, page, size) => {
  setIsPgYesLoading(true);
  try {
    const res = await axios.post(
      `${dataApiUrl}cases_tbl_all_pg_yes`,
      {}, // POST body is empty, params go in config
      {
        params: {
          account: gsp === "All" ? "" : gsp,
          pageNumber: page,
          pageSize: size,
        },
      }
    );
    setPgYesRows(res.data.data || []);
    setPgYesTotal(res.data.totalRecords || 0);
  } catch (err) {
    setPgYesRows([]);
    setPgYesTotal(0);
    console.error("Failed to fetch PG YES Appeals:", err);
  }
  setIsPgYesLoading(false);
};


function fetchComplianceRawData(){
  // Fetch only once
  axios.get(`${dataApiUrl}get_proclaim_out_of_compliance_ct`, {
    params: { account: 'Onshore' }
  }).then(res => setComplianceRawData(res.data))
    .catch(err => console.error("Error fetching compliance data:", err));
}

  const fetchNonAsoStats2 = async () => {
    try {
      const res = await axios.get(`${dataApiUrl}get_proclaim_non_aso_ct`, {
        params: { director: selectedDirector === 'All' ? '' : selectedDirector }
      });
      setNonAsoStats(res.data || []);
      // Set director options dynamically
      const dirs = Array.from(new Set((res.data || []).map(row => row.director).filter(Boolean)));
      setDirectorOptions(['All', ...dirs]);
    } catch (err) {
      setNonAsoStats([]);
      setDirectorOptions(['All']);
      console.error('Error fetching Non-ASO stats:', err);
    }
  };
useEffect(() => {

  fetchNonAsoStats();
}, [selectedDirector]);

// Dynamic regions and roles from API
const regions = useMemo(
  () => Array.from(new Set(nonAsoStats.map(row => row.region))).sort(),
  [nonAsoStats]
);
const roles = useMemo(
  () => Array.from(new Set(nonAsoStats.map(row => row.role))).sort(),
  [nonAsoStats]
);

// Group data for charting: [{date, Admin, Med, upload_date}]
const regionLabels = {
  FI: 'Fully Insured',
  NY: 'Fully Insured - New York',
  TX: 'Fully Insured - Texas',
  ASO: 'ASO',
};

const groupedNonAso = useMemo(() => {
  // Group by region, then by upload_date (or date if you have it)
  const grouped = {};
  nonAsoStats.forEach(row => {
    const { region, role, record_Count, upload_date } = row;
    if (!grouped[region]) grouped[region] = {};
    const dateKey = upload_date ? upload_date.split('T')[0] : 'Unknown';
    if (!grouped[region][dateKey]) grouped[region][dateKey] = { date: dateKey };
    grouped[region][dateKey][role] = record_Count;
  });
  // Convert to array for recharts
  const result = {};
  Object.keys(grouped).forEach(region => {
    result[region] = Object.values(grouped[region]);
  });
  return result;
}, [nonAsoStats]);



useEffect(() => {
  fetchPreserviceRows(selectedPreSerGsp, preservicePage, preservicePageSize);
}, [selectedPreSerGsp, preservicePage, preservicePageSize]);

useEffect(() => {
  fetchPgYesRows(selectedPgYesGsp, pgYesPage, pgYesPageSize);
}, [selectedPgYesGsp, pgYesPage, pgYesPageSize]);

function fetchGroupComplianceRawData(){
   // Only regroup when view changes
  const groupedData = {};
  complianceRawData.forEach(item => {
    const date = new Date(item.upload_date);
    let groupKey = "";

    if (outOfComplianceView === "Weekly") {
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      groupKey = weekStart.toISOString().split("T")[0];
    } else if (outOfComplianceView === "Monthly") {
      groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else {
      groupKey = date.toISOString().split("T")[0];
    }

    if (!groupedData[item.account]) groupedData[item.account] = {};
    if (!groupedData[item.account][groupKey]) {
      groupedData[item.account][groupKey] = { date: groupKey, YES: 0, NO: 0 };
    }

    groupedData[item.account][groupKey].YES += item.nonCompliant2_Yes || 0;
    groupedData[item.account][groupKey].NO += item.nonCompliant2_No || 0;
  });

  const transformed = {};
  for (const account in groupedData) {
    transformed[account] = Object.values(groupedData[account]);
  }
  setTransformComplianceTrend(transformed);
}
  
useEffect(() => {
 fetchGroupComplianceRawData();
}, [outOfComplianceView, complianceRawData]);

    useEffect(() => {

  fetchNonAsoStats();
  }, [selectedDirector]);

  const fetchNonAsoStats = async () => {
    try {
      const res = await axios.get(`${dataApiUrl}get_proclaim_non_aso_ct`, {
        params: { director: selectedDirector === 'All' ? 'Sagility' : selectedDirector }
      });
      setNonAsoStats(res.data || []);
    } catch (err) {
      setNonAsoStats([]);
      console.error('Error fetching Non-ASO stats:', err);
    }
  };
  
    

    const fetchProclaimStatusGraph = async () => {
        try {
          const res = await axios.get(`${dataApiUrl}get_proclaim_status_ct`);
          const filtered = res.data.filter(x => x.Account !== 'Total');
          const mapped = filtered.map(item => ({
            date: new Date(item.upload_Date).toLocaleDateString('en-CA'),
            Assigned: item.assigned_Count,
            Open: item.open_Count,
            Pended: item.pended_Count,
            Completed: item.completed_Count,
            FFup_Sent: item.ffUp_Sent || 0
          }));
          setTrendData(mapped);
        } catch (err) {
          console.error(err);
        }
      };
    
    
   useEffect(() => {
  
  fetchPgNameSummary();
}, [selectedPgSummaryGsp]);

const fetchPgNameSummary = async () => {
    try {
      // Use selectedPgSummaryGsp or default to 'All'
      const account = selectedPgSummaryGsp === 'All' ? '' : selectedPgSummaryGsp;
      const res = await axios.get(`${dataApiUrl}get_proclaim_pg_names_ct`, {
        params: { account }
      });
      setPgNameSummary(res.data || []);
    } catch (error) {
      setPgNameSummary([]);
      console.error("Error fetching PG name summary:", error);
    }
  };


      const fetchNonAsoSummary = async () => {
        try {
          const gsp = 'Onshore';
          const res = await axios.get(`${dataApiUrl}get_proclaim_non_aso_ct`, {
            params: { direcotr: gsp }
          });
         
        } catch (error) {
          console.error("Error fetching PG name summary:", error);
         
        } 
      };
      

    const fetchProclaimSummary = async () => {
      try {
        const response = await axios.get(`${dataApiUrl}get_proclaim_summary`);
        const data = response.data;
    
        setSummaryData(data);
    
        // Group by latest upload_date
        const latestDate = data.reduce((latest, row) => {
          const currentDate = new Date(row.upload_Date);
          return currentDate > latest ? currentDate : latest;
        }, new Date(0));
    
        // Filter rows that match the latest date
        const latestRows = data.filter(row =>
          new Date(row.upload_Date).toISOString().split('T')[0] === latestDate.toISOString().split('T')[0]
        );
    
        // Aggregate total_Proclaim_Records per account
        const counts = latestRows.reduce((acc, row) => {
          const account = row.account?.trim();
          if (account === "Sagility" || account === "Concentrix" || account === "Wipro") {
            acc[account] = (acc[account] || 0) + row.total_Proclaim_Records;
          }
          return acc;
        }, {});
    
        setLatestProclaimCounts({
          Sagility: counts.Sagility || 0,
          Concentrix: counts.Concentrix || 0,
          Wipro: counts.Wipro || 0,
        });
    
      } catch (err) {
        console.error("Error fetching summary:", err);
      }
    };
    


    
     const fetchProclaimPendReasonCt = async () => {

      const account = 'Sagility';

      try {
        const response = await axios.get(`${dataApiUrl}get_proclaim_pend_reason_ct`, {
          params: { selectedPendedGsp }
        });

        setPendedReason(response.data);
        
      } catch (error) {
        console.error('Error fetching pend reason data:', error);
        throw error;
      }
    };
    


    const fetchMbrPrv = async () => {
      try {
        const selectedPendedGsp = selectedGsp === "All" ? "" : selectedGsp;
      
        const response = await axios.get(`${dataApiUrl}get_proclaim_mbr_prov_ct`, {
          params:  { account: selectedPendedGsp }  
        });
      
        const data = response.data;
  
        // Format: rename properties to match BarChart keys
        const formatted = data.map(row => ({
          Department: row.account,
          Member: row.member_Count || 0,
          Provider: row.provider_Count || 0
        }));
  
        setMemberProvider(formatted);
      } catch (err) {
        console.error("Failed to fetch member/provider summary:", err);
        setMemberProvider([]); // fallback to empty
      }
    };
  


const handlePendedSort = (key) => {
  setPendedSort((prev) => ({
    key,
    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
  }));
};

const processWorkbook = (workbook) => {
  const worksheet = workbook.Sheets['DATA'];
  if (!worksheet) {
    alert('Sheet named "DATA" not found in Excel file.');
    setIsLoading(false);
    return;
  }

  const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  setExcelData(json);

  // ✅ Gold & Bronze (GnB)
  const gnbSheet = workbook.Sheets['GnB'];
  if (gnbSheet) {
    const gnbData = XLSX.utils.sheet_to_json(gnbSheet, { defval: '' });
    const departments = ['Sagility', 'Concentrix', 'Wipro'];
    const grouped = {};
    gnbData.forEach(row => {
      const rawDept = (row['Owner Expense Center'] || '').trim();
      const bucket = (row['Age Bucket'] || '').trim();
      const matchedDept = departments.find(dep => rawDept.startsWith(dep));
      if (matchedDept && bucket) {
        if (!grouped[matchedDept]) grouped[matchedDept] = {};
        grouped[matchedDept][bucket] = (grouped[matchedDept][bucket] || 0) + 1;
      }
    });
    const allBuckets = Array.from(new Set(gnbData.map(row => (row['Age Bucket'] || '').trim()).filter(Boolean))).sort();
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

  const pgYes = json.filter(row => (row['PG?'] || '').trim().toUpperCase() === 'YES');
setPgYesRows(pgYes);

  // ✅ Proclaim Appeals  +  Pended-reason breakdown
const proclaimDirectors = ['Sagility', 'Concentrix', 'Wipro'];
const proclaimAppeals   = proclaimDirectors.map(director => ({
  Department: director,
  Count: json.filter(row =>
    (row['Claim System'] || '').trim().toLowerCase() === 'proclaim' &&
    (row['Department']   || '').toLowerCase().includes('appeal') &&
    (row['Director']     || '').trim() === director
  ).length
}));

// ---- build date-trend as before ------------------------------------------------
const trendMap = {};
json.forEach(row => {
  const system     = (row['Claim System'] || '').trim().toLowerCase();
  const department = (row['Department']   || '').toLowerCase();
  const owner      = (row['OwnerName']    || '').trim();
  const status     = (row['Status']       || '').trim().toLowerCase();
  let   rawDate    = row['ReportDate'];

  if (system !== 'proclaim' || !department.includes('appeal')) return;

  let date = null;
  if (typeof rawDate === 'number') {
    date = new Date(Math.round((rawDate - 25569) * 86400 * 1000))
             .toISOString().split('T')[0];
  } else if (rawDate instanceof Date) {
    date = rawDate.toISOString().split('T')[0];
  } else if (typeof rawDate === 'string' && rawDate.includes('/')) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed)) date = parsed.toISOString().split('T')[0];
  }
  if (!date) return;

  // initialise bucket
  if (!trendMap[date])
    trendMap[date] = { date, Assigned: 0, Unassigned: 0, Open: 0, Pended: 0, Completed: 0 };

  // owner / status counters
  owner ? trendMap[date].Assigned++ : trendMap[date].Unassigned++;
  if (['open', 'pended', 'completed'].includes(status))
    trendMap[date][status.charAt(0).toUpperCase() + status.slice(1)]++;
});

// ---- collect pended reasons  (row-based %) ---------------------------------------
{
  const reasonsList = [
    'Routed to CASA Diary-Clinical review',
    'Routed to HD Review- Non IFP',
    'Sent for Adjustment',
    'Routed to Coder review',
    'Mail sent to TPV ( Pricing Review)',
    'Mail sent to Prepay',
    'Mail sent to SIU Review',
    'Routed to Correspondence',
    'Mail sent to Vendor Pricing',
    'Routed to Auth Load',
    'Routed to Committee',
    'Routed to Pharmacy',
    'Routed to Behavioral',
    'Routed to Transplant',
    'Routed to Dialysis',
    'Mail sent to Evicore',
    'Mail sent to Pathwell',
    'Mail sent to RRG ( Revenue recovery group )',
    'Mail sent to Oral notification',
    'Mail sent to Expedited Appeals',
    'Routed to File Request',
    'Mail sent to EMR ( Escalated mail review )',
    'Routed to Customer VS Provider',
    'DPL Intake',
    'Mail sent for AOR verification',
    'Misroutes'
  ];

  const directors = ['Sagility', 'Concentrix', 'Wipro'];

  // Empty counters
  const countsByReason = {};
  reasonsList.forEach(r => {
    countsByReason[r] = { Sagility: 0, Concentrix: 0, Wipro: 0 };
  });

  // Filter valid rows
  const pendedRows = json.filter(row =>
    (row['Claim System'] || '').trim().toLowerCase() === 'proclaim' &&
    (row['Department']   || '').toLowerCase().includes('appeal') &&
    (row['Status']       || '').trim().toLowerCase() === 'pended' &&
    directors.includes((row['Director'] || '').trim())
  );

  // Random distribution: pick a random reason for each row
  pendedRows.forEach(row => {
    const randomReason = reasonsList[Math.floor(Math.random() * reasonsList.length)];
    const director = (row['Director'] || '').trim();
    countsByReason[randomReason][director]++;
  });

  const pct = (n, d) => d ? ((n / d) * 100).toFixed(1) : '0.0';

  const summary = reasonsList.map(reason => {
    const g = countsByReason[reason];
    const total = g.Sagility + g.Concentrix + g.Wipro;
    return {
      Reason:        reason,
      Sagility:      g.Sagility,      SagilityPct:      pct(g.Sagility,      total),
      Concentrix:    g.Concentrix,    ConcentrixPct:    pct(g.Concentrix,    total),
      Wipro:         g.Wipro,         WiproPct:         pct(g.Wipro,         total),
      Total:         total
    };
  });

  setPendedReasonSummary(summary);
}
// -------------------------------------------------------------------------------


const fetchPgNameSummary = async () => {
  const gsp = "Sagility";

  try {
    const { data } = await axios.get(`${dataApiUrl}get_proclaim_pg_names_ct`, {
      params: { account: gsp },
    });

    // You can handle `data` here
    console.log("PG name summary:", data);

    return data; // returning makes it reusable
  } catch (error) {
    console.error("Error fetching PG name summary:", error.message || error);
    return null; // handle gracefully for caller
  }
};



// ---- final state setters -------------------------------------------------------

const trendData         = Object.values(trendMap).sort((a, b) => new Date(a.date) - new Date(b.date));
const proclaimLatestDate = trendData.length ? trendData[trendData.length - 1].date : null;

const latestDateCounts2 = proclaimLatestDate
  ? json.filter(row =>
      (row['Claim System'] || '').trim().toLowerCase() === 'proclaim' &&
      (row['Department']   || '').toLowerCase().includes('appeal') &&
      (row['Director']     || '').trim() &&
      new Date(formatExcelDate(row['ReportDate'])).toISOString().split('T')[0] === proclaimLatestDate
    ).reduce((acc, row) => {
      const d = (row['Director'] || '').trim();
      if (proclaimDirectors.includes(d)) acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {})
  : {};



  const latestProclaimCounts = summaryData.reduce((acc, row) => {
    if (row.account === "Sagility") acc.Sagility = row.total_Proclaim_Records;
    else if (row.account === "Concentrix") acc.Concentrix = row.total_Proclaim_Records;
    return acc;
  }, { Sagility: 0, Concentrix: 0 });
  


setProclaimSummary(proclaimAppeals);
setProclaimTrend(trendData);
setLatestProclaimDate(proclaimLatestDate);
setLatestProclaimCounts(latestProclaimCounts);


  // ✅ IMPACT
  const impactSheet = workbook.Sheets['IMPACT'];
  if (impactSheet) {
    const impactData = XLSX.utils.sheet_to_json(impactSheet, { defval: '' });
    setImpactSummary(generateImpactSummary(impactData, impactStatusFilter));
    setRawImpactData(impactData);
  }

  // ✅ Preservice
  const preservice = json.filter(row => (row['Appeal_Category'] || '').trim() === 'Pre-Service');
  setPreserviceRows(preservice);
  if (preservice.length > 0) setPreserviceHeaders(Object.keys(preservice[0]));

  // ✅ IFP
  const ifpData = json.filter(row => (row['Account Name'] || '').trim() !== '');
  setIfpRows(ifpData);

  const ifpDepts = ['Sagility', 'Concentrix', 'Wipro'];
  const ageBucketCol = 'AGE_BUCKET';
  const groupCol = 'Director';
  const groupedIFP = {};

  ifpData.forEach(row => {
    const director = (row[groupCol] || '').trim();
    const bucket = (row[ageBucketCol] || '').trim();
    if (ifpDepts.includes(director) && bucket) {
      if (!groupedIFP[director]) groupedIFP[director] = {};
      groupedIFP[director][bucket] = (groupedIFP[director][bucket] || 0) + 1;
    }
  });

  const allIfpBuckets = Array.from(new Set(ifpData.map(row => (row[ageBucketCol] || '').trim())))
    .filter(Boolean).sort();

  const ifpSummaryData = ifpDepts.map(dept => {
    const counts = groupedIFP[dept] || {};
    const row = { Department: dept };
    let total = 0;
    allIfpBuckets.forEach(bucket => {
      const count = counts[bucket] || 0;
      row[bucket] = count;
      total += count;
    });
    row.Total = total;
    return row;
  });

  const ifpGrandTotal = { Department: 'Total' };
  allIfpBuckets.forEach(bucket => {
    ifpGrandTotal[bucket] = ifpSummaryData.reduce((sum, row) => sum + (row[bucket] || 0), 0);
  });
  ifpGrandTotal.Total = ifpSummaryData.reduce((sum, row) => sum + row.Total, 0);
  ifpSummaryData.push(ifpGrandTotal);

  setIfpSummary(ifpSummaryData);



  /* ── Member vs Provider (based on "Product" column) ─────────────── */
{
  const mpDirectors = ['Sagility', 'Concentrix', 'Wipro'];
  const counts = mpDirectors.reduce(
    (acc, d) => ({ ...acc, [d]: { Member: 0, Provider: 0 } }),
    {}
  );

  json.forEach(row => {
    const dir = (row['Director'] || '').trim();
    const product = (row['Product'] || '').toLowerCase();

    if (!mpDirectors.includes(dir)) return;

    if (product.includes('mbr'))  counts[dir].Member   += 1;
    if (product.includes('prov')) counts[dir].Provider += 1;
  });

  const summary = mpDirectors.map(d => ({
    Department: d,
    Member:     counts[d].Member,
    Provider:   counts[d].Provider,
    Total:      counts[d].Member + counts[d].Provider
  }));

  // Optional total row
  const grand = {
    Department: 'Total',
    Member:   summary.reduce((s, r) => s + r.Member, 0),
    Provider: summary.reduce((s, r) => s + r.Provider, 0),
    Total:    summary.reduce((s, r) => s + r.Total, 0)
  };
  summary.push(grand);

  setMemberProviderSummary(summary);
}
/* ──────────────────────────────────────────────────────────────── */



  // ✅ Director dropdown
  const allowedDirectors = ['Sagility', 'Concentrix', 'Wipro'];
  const directors = json
    .map(row => (row['Director'] || '').trim())
    .filter(name => allowedDirectors.includes(name));
  const uniqueDirectors = Array.from(new Set(directors));
  setDirectorOptions(['All', ...uniqueDirectors]);

  setTimeout(() => {
    calculateDirectorStats(json);
    calculateFullyInsuredStats(json);
    setIsLoading(false);
    setShowMarquee(true);
  }, 0);
};

const handleAutoUpload = () => {
  setIsLoading(true);
  const fileUrl = process.env.PUBLIC_URL + "/template/Appeals_Sample.xlsx"; 
  fetch(fileUrl)
    .then(response => {
      if (!response.ok) throw new Error("File not found");
      return response.arrayBuffer();
    })
    .then(arrayBuffer => {
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      processWorkbook(workbook);
    })
    .catch(error => {
      alert("Failed to load file from /public/Appeals_Sample.xlsx");
      console.error(error);
      setIsLoading(false);
    });
};



  const filteredPgYesRows = useMemo(() => (
    selectedPgGsp === 'All'
      ? pgYesRows
      : pgYesRows.filter(row => (row['Director'] || '').trim() === selectedPgGsp)
  ), [selectedPgGsp, pgYesRows]);

  const marqueeMessages = useMemo(() => {
  // Helper to get counts for each account
  const getAccount = (name) =>
    summaryData.find(row => (row.account || '').toLowerCase() === name.toLowerCase()) || {};

  const sg = getAccount('Sagility');
  const wi = getAccount('Wipro');
  const cnx = getAccount('Concentrix');
  const onshore = getAccount('Onshore');

  // Totals
  const assignedTotal =
    (sg.assigned_Count || 0) +
    (wi.assigned_Count || 0) +
    (cnx.assigned_Count || 0) +
    (onshore.assigned_Count || 0);

  const completedTotal =
    (sg.completed_Count || 0) +
    (wi.completed_Count || 0) +
    (cnx.completed_Count || 0) +
    (onshore.completed_Count || 0);

  const untouchedTotal =
    (sg.unassigned_Count || 0) +
    (wi.unassigned_Count || 0) +
    (cnx.unassigned_Count || 0) +
    (onshore.unassigned_Count || 0);

  // Percentages (avoid division by zero)
  const percent = (num, denom) => denom ? ((num / denom) * 100).toFixed(1) : '0.0';

  return [
    `🚀 Welcome to the Proclaim Dashboard`,
    ` `,

    `As of ${new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    })}  12:00`,
    ` `,

    `🔢 Assigned : ${assignedTotal}  Completed: ${completedTotal}   Untouched: ${untouchedTotal}`,
    `📊 Assigned: ${percent(assignedTotal, assignedTotal + untouchedTotal)}%  Completed: ${percent(completedTotal, assignedTotal + untouchedTotal)}%   Untouched: ${percent(untouchedTotal, assignedTotal + untouchedTotal)}%`,

    `🔢 SG: Assigned: ${sg.assigned_Count || 0} 📊 Completed: ${sg.completed_Count || 0} - ${percent(sg.completed_Count || 0, (sg.assigned_Count || 0) + (sg.unassigned_Count || 0))}%`,
    ` `,

    `🔢 Wi: Assigned: ${wi.assigned_Count || 0} 📊 Completed: ${wi.completed_Count || 0} - ${percent(wi.completed_Count || 0, (wi.assigned_Count || 0) + (wi.unassigned_Count || 0))}%`,
    ` `,

    `🔢 CNX: Assigned: ${cnx.assigned_Count || 0} 📊 Completed: ${cnx.completed_Count || 0} - ${percent(cnx.completed_Count || 0, (cnx.assigned_Count || 0) + (cnx.unassigned_Count || 0))}%`,
    ` `,

    `🔢 Onshore: Assigned: ${onshore.assigned_Count || 0} 📊 Completed: ${onshore.completed_Count || 0} - ${percent(onshore.completed_Count || 0, (onshore.assigned_Count || 0) + (onshore.unassigned_Count || 0))}%`,
    ` `,

    `📊 Total Pre-Service Appeals: ${preserviceTotal}`,
    `📊 Total PG Appeals: ${pgYesTotal}`,

    `✅ Impact Summary Ready: ${impactSummary.length - 1} departments`,
    `📅 Last Upload: ${new Date().toLocaleDateString()}`
  ];
}, [summaryData, preserviceTotal, pgYesTotal, impactSummary]);


  const messagesPerSlide = 2; // 👈 Put this just above useEffect

  useEffect(() => {
    const interval = setInterval(() => {
      setMarqueeIndex(prev =>
        (prev + messagesPerSlide) % marqueeMessages.length
      );
    }, 4000);
    return () => clearInterval(interval);
  }, [marqueeMessages.length]);


    const preserviceAllowedHeaders = [
      "AGE", "SR.", "Manager", "PROMISE", "Task Promise Date", "Rec'd",
      "System", "LPI?", "PG?", "PG Name", "OwnerID", "Owner"
    ];
    const preserviceColumnMap2 = {
    "Age Cal": "AGE",
    "SR .": "SR.",
    "Manager": "Manager",
    "AGE_PROMISE_BUCKET": "PROMISE",
    "Promise Date": "Task Promise Date",
    "Recd By Cigna": "Rec'd",
    "System": "System",
    "LPI?": "LPI?",
    "PG?": "PG?",
    "PG NAME2": "PG Name",
    "OwnerID": "OwnerID",
    "OwnerName": "Owner"
    };



let preserviceColumnMap = {
  
  sr: "SR",
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
  //ownerName: "Owner Name",
  //appealStatus: "Status",
  //case_assignment_status: "Case Assignment Status",
};


    const preserviceDateFields = ["Promise Date", "Recd By Cigna"];
    const formatExcelDate = (value) => {
      if (typeof value === 'number') {
          const jsDate = new Date(Math.round((value - 25569) * 86400 * 1000));
          return jsDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      } else if (value instanceof Date) {
          return value.toISOString().split('T')[0];
      } else {
          return value || '';
      }
    };



  const generateImpactSummary = (data, statusFilter) => {
    const departments = ['Concentrix', 'Sagility', 'Stateside', 'Wipro'];
    const ageBuckets = ['0-15 days', '16-30 days', '31-60 days', '61+ days'];

    const grouped = {};
    departments.forEach(dept => {
      grouped[dept] = Object.fromEntries(ageBuckets.map(bucket => [bucket, 0]));
    });

    data.forEach(row => {
      const status = (row['Case status'] || '').trim().toLowerCase();
      if (statusFilter !== 'All' && status !== statusFilter.toLowerCase()) return;

      const dept = row['helper_location2'];
      const bucket = row['helper_AGE_bucket2'];
      if (departments.includes(dept) && ageBuckets.includes(bucket)) {
        grouped[dept][bucket]++;
      }
    });

    const summary = departments.map(dept => {
      const counts = grouped[dept];
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { Department: dept, ...counts, Total: total };
    });

    const grandTotal = { Department: 'Total' };
    ageBuckets.forEach(bucket => {
      grandTotal[bucket] = summary.reduce((sum, row) => sum + row[bucket], 0);
    });
    grandTotal.Total = summary.reduce((sum, row) => sum + row.Total, 0);
    summary.push(grandTotal);

    return summary;
  };


let transformedTrend = useMemo(() => {
  if (viewMode === 'Daily') {
    return trendData.map(item => ({
      ...item,
      date: new Date(item.date).toISOString().split('T')[0],
    }));
  }

  const groupMap = {};

  trendData.forEach(item => {
    const date = new Date(item.date);
    let key = '';

    if (viewMode === 'Weekly') {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay()); // Sunday
      key = startOfWeek.toISOString().split('T')[0];
    } else if (viewMode === 'Monthly') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!groupMap[key]) {
      groupMap[key] = {
        date: key,
        Assigned: 0,
        Open: 0,
        Pended: 0,
        Completed: 0,
        FFup_Sent: 0
      };
    }

    groupMap[key].Assigned += item.Assigned || 0;
    groupMap[key].Open += item.Open || 0;
    groupMap[key].Pended += item.Pended || 0;
    groupMap[key].Completed += item.Completed || 0;
    groupMap[key].FFup_Sent += item.FFup_Sent || 0;
  });

  return Object.values(groupMap);
},  [trendData, viewMode]);


  const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  setIsLoading(true);

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    processWorkbook(workbook);
  };

  reader.readAsArrayBuffer(file);
};


    const regionLabels2 = {
    FI: 'Fully Insured',
    NY: 'Fully Insured - New York',
    TX: 'Fully Insured - Texas',
    ASO: 'ASO',
    };

    const calculateFullyInsuredStats = (data) => {
    const grouped = {
        FI: {},
        NY: {},
        TX: {},
        ASO: {},
    };

    const validOwnerIDs = {
        SagProcMbrFIAdmin: ['FI', 'Admin'],
        SagProcMbrFIMed: ['FI', 'Med'],
        SagProcMbrFINYAdmin: ['NY', 'Admin'],
        SagProcMbrFINYMed: ['NY', 'Med'],
        SagProcMbrFITXAdmin: ['TX', 'Admin'],
        SagProcMbrFITXMed: ['TX', 'Med'],
        SagProcMbrASOAdmin: ['ASO', 'Admin'],
        SagProcMbrASOMed: ['ASO', 'Med'],
    };

    data.forEach((row) => {
        const claimSystem = row['Claim System']?.trim().toLowerCase();
        const ownerID = row['OwnerID']?.trim();
        const director = row['Director']?.trim();
        let rawDate = row['ReportDate'];

        if (claimSystem !== 'proclaim' || !ownerID || !rawDate) return;
        if (selectedDirector !== 'All' && director !== selectedDirector) return;

        let reportDate = null;
        if (rawDate instanceof Date) {
        reportDate = rawDate.toISOString().split('T')[0];
        } else if (typeof rawDate === 'number') {
        const jsDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        reportDate = jsDate.toISOString().split('T')[0];
        }

        const [region, type] = validOwnerIDs[ownerID] || [];
        if (!region || !type || !reportDate) return;

        if (!grouped[region][reportDate]) {
        grouped[region][reportDate] = { Admin: 0, Med: 0 };
        }

        grouped[region][reportDate][type]++;
    });

    const formatted = {};
    Object.entries(grouped).forEach(([region, dateMap]) => {
        formatted[region] = Object.entries(dateMap).map(([date, counts]) => ({
        date,
        Admin: counts.Admin,
        Med: counts.Med,
        }));
    });

    setFullyInsuredStats(formatted);
    };


    const calculateDirectorStats = (data) => {
    const trendCounts = {
        Sagility: {},
        Concentrix: {},
        Wipro: {},
    };


    data.forEach((row) => {
        if (row['Claim System']?.trim().toLowerCase() !== 'proclaim') return;

        const director = row['Director']?.trim();
        const compliance = row['NonCompliant2']?.toUpperCase();
        let rawDate = row['ReportDate'];
        let reportDate = null;

        if (rawDate instanceof Date) {
        reportDate = rawDate.toISOString().split('T')[0];
        } else if (typeof rawDate === 'number') {
        const jsDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        reportDate = jsDate.toISOString().split('T')[0];
        }

        if (!director || !reportDate || !trendCounts[director]) return;

        if (!trendCounts[director][reportDate]) {
        trendCounts[director][reportDate] = { YES: 0, NO: 0 };
        }

        if (compliance === 'YES') trendCounts[director][reportDate].YES++;
        else if (compliance === 'NO') trendCounts[director][reportDate].NO++;
    });

    // Transform into array format for charting
    const formatted = {};
    Object.entries(trendCounts).forEach(([director, dateMap]) => {
        formatted[director] = Object.entries(dateMap).map(([date, counts]) => ({
        date,
        ...counts
        }));
    });

    setDirectorStats(formatted);
    };

    const transformedComplianceTrend = useMemo(() => {
  if (complianceView === 'Daily') return directorStats;

  const groupByPeriod = (data, type) => {
    const grouped = {};
    data.forEach(({ date, YES, NO }) => {
      const d = new Date(date);
      let key = '';

      if (type === 'Weekly') {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay()); // Sunday
        key = startOfWeek.toISOString().split('T')[0];
      } else if (type === 'Monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) grouped[key] = { date: key, YES: 0, NO: 0 };
      grouped[key].YES += YES || 0;
      grouped[key].NO += NO || 0;
    });
    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const result = {};
  Object.entries(directorStats).forEach(([director, values]) => {
    result[director] = groupByPeriod(values, complianceView);
  });

  return result;
}, [complianceView, directorStats]);


/* ---------- helper + reactive Pended-reason summary (row-based %) ---------- */
useEffect(() => {
  if (!excelData.length) {
    setPendedReasonSummary([]);
    return;
  }

  /* full master reason list – keep order */
}, [excelData, trendView]);
/* --------------------------------------------------------------------------- */


  const sortedPendedSummary = useMemo(() => {
   
  const { key, direction } = pendedSort;
  const sorted = [...pendedReason].sort((a, b) => {
    const valA = isNaN(a[key]) ? a[key] : Number(a[key]);
    const valB = isNaN(b[key]) ? b[key] : Number(b[key]);
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ?  1 : -1;
    return 0;
  });
  return sorted;
}, [pendedReason, pendedSort]);

/* --------------------------------------------------------------------- */




  const barColors = { YES: '#F4817F', NO: '#3991D9' };
  const bgColors = {
    Sagility: '#E7FEF4',
    Concentrix: '#E7ECFE',
    Wipro: '#F4EAFB',
  };

 


// Helper to assign a unique color per bucket
const getColorForBucket = (index) => {
  const colors = [
    '#00C49F', '#66BB6A', '#42A5F5', '#FFA726',
    '#FB8C00', '#F4511E', '#EF5350', '#E53935',
    '#B71C1C', '#A1887F', '#9FA8DA'
  ];
  return colors[index % colors.length];
};

const orderedBucketColors = [
  { bucket: '0-3', color: '#00C49F' },
  { bucket: '4-7', color: '#66BB6A' },
  { bucket: '8-14', color: '#42A5F5' },
  { bucket: '15-29', color: '#FFA726' },
  { bucket: '30-44', color: '#FB8C00' },
  { bucket: '45-59', color: '#F4511E' },
  { bucket: '60-89', color: '#EF5350' },
  { bucket: '90-179', color: '#E53935' },
  { bucket: '180-364', color: '#D32F2F' },
  { bucket: '365+', color: '#B71C1C' }
];

const getStackedBarData = (summary, directors = ['Sagility', 'Concentrix', 'Wipro']) => {
  const chartData = [];

  directors.forEach(dir => {
    const row = { name: dir };
    let total = 0;

    summary.forEach(reason => {
      const count = reason[dir] || 0;
      total += count;
    });

    summary.forEach(reason => {
      const label = reason.Reason;
      const count = reason[dir] || 0;
      const percent = total ? (count / total) * 100 : 0;
      row[label] = parseFloat(percent.toFixed(2));
    });

    chartData.push(row);
  });

  return chartData;
};

const sortIcon = (col) => {
  if (pendedSort.key !== col) return '';
  return pendedSort.direction === 'asc' ? '▲' : '▼';
};

  return (
    <div style={{ padding: '0px', fontFamily: 'Lexend, sans-serif' }}>
      {/* <button
  onClick={handleAutoUpload}
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
  Load Proclaim File
</button> */}
      
{/* Marquee section */}
{showMarquee && (
  <div style={{
    position: 'fixed',
    top: '3px',
    right: '30px',
    width: '330px',
    height: '52px', // Enough space for 3 lines
    overflow: 'hidden',
    backgroundColor: '#e6f2ff',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    zIndex: 9999,
    fontSize: '13px',
    fontWeight: 500,
    color: '#003b70',
    fontFamily: 'Lexend, sans-serif',
  }}>
    <div
      key={marqueeIndex}
      style={{
        display: 'flex',
        flexDirection: 'column',
        marginTop: '7px',
        marginLeft: '10px',
        gap: '4px',
        animation: 'slideUp 4s ease-in-out',
        position: 'relative',
      }}
    >
      {Array(messagesPerSlide).fill(0).map((_, i) => {
        const index = (marqueeIndex + i) % marqueeMessages.length;
        return <div key={index}>{marqueeMessages[index]}</div>;
      })}
    </div>

    <style>
      {`
        @keyframes slideUp {
          0% { transform: translateY(100%); opacity: 0; }
          10% { transform: translateY(0); opacity: 1; }
          90% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-100%); opacity: 0; }
        }
      `}
    </style>
  </div>
)}


{/* Proclaim Appeals */}

{proclaimSummary.length > 0 && (
  <div style={{
    marginTop: '0px',
    marginBottom: '20px',
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
      Proclaim Appeals Summary
    </h3>

    {/* === top totals badge =================================================== */}
    <div style={{
      backgroundColor: '#e8f0fe',
      border: '1px solid #c4d4ec',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
    }}>
      <div style={{ fontSize: '16px', fontWeight: '600', color: '#003b70', marginBottom: '6px' }}>
        Total Proclaim Appeals as of {new Date().toLocaleDateString()}
      </div>
      <div style={{ fontSize: '14px', fontWeight: '500', color: '#003b70' }}>
      Total Appeals:&nbsp;
      {(latestProclaimCounts.Sagility || 0) + (latestProclaimCounts.Concentrix || 0)}
      &nbsp;|&nbsp; Sagility: {latestProclaimCounts.Sagility}
      &nbsp;|&nbsp; Concentrix: {latestProclaimCounts.Concentrix}
   
      </div>
    </div>

    {/* === view switch ======================================================== */}
    {/* <div style={{ marginBottom: '12px' }}>
      <label style={{ fontWeight: '500', color: '#003b70', marginRight: '8px' }}>View:</label>
      <select
        value={trendView}
        onChange={e => setViewMode(e.target.value)}
        style={{
          padding: '8px 12px', borderRadius: '6px',
          border: '1px solid #ccc', fontSize: '14px',
          width: '150px', fontFamily: 'inherit',
          color: '#003b70', backgroundColor: '#fff',
        }}
      >
        {['Daily', 'Weekly', 'Monthly'].map(opt =>
          <option key={opt} value={opt}>{opt}</option>
        )}
      </select>
    </div> */}


    <div style={{
      marginTop: '0px',
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontWeight: '500', color: '#003b70', marginRight: '8px' }}>View:</label>
        <select
          value={trendView}
          onChange={e => setTrendView(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: '6px',
            border: '1px solid #ccc', fontSize: '14px',
            width: '150px', fontFamily: 'inherit',
            color: '#003b70', backgroundColor: '#fff',
          }}
        >
          {['Daily', 'Weekly', 'Monthly'].map(opt =>
            <option key={opt} value={opt}>{opt}</option>
          )}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={transformTrend}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="Assigned" fill="#1E88E5">
            <LabelList dataKey="Assigned" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
          </Bar>
          <Bar dataKey="Open" fill="#00ACC1">
            <LabelList dataKey="Open" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
          </Bar>
          <Bar dataKey="Pended" fill="#FFB300">
            <LabelList dataKey="Pended" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
          </Bar>
          <Bar dataKey="Completed" fill="#66BB6A">
            <LabelList dataKey="Completed" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
          </Bar>
          <Bar dataKey="FFup_Sent" fill="#AB47BC">
            <LabelList dataKey="FFup Sent" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>

    {/* === main bar chart ===================================================== */}
    {/* <div style={{
      marginTop: '10px',
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
    }}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={transformedTrend}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11, dy: 19 }} angle={-35} height={50} />
          <YAxis allowDecimals={false} tick={{ fontSize: 13 }} />
          <Tooltip />
          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="Assigned"  fill="#42A5F5"><LabelList dataKey="Assigned"  position="top" style={{ fontSize: 10, fontWeight: 'bold' }}/></Bar>
          <Bar dataKey="Open"      fill="#00C49F"><LabelList dataKey="Open"      position="top" style={{ fontSize: 10, fontWeight: 'bold' }}/></Bar>
          <Bar dataKey="Pended"    fill="#FFB300"><LabelList dataKey="Pended"    position="top" style={{ fontSize: 10, fontWeight: 'bold' }}/></Bar>
          <Bar dataKey="Completed" fill="#66BB6A"><LabelList dataKey="Completed" position="top" style={{ fontSize: 10, fontWeight: 'bold' }}/></Bar>
        </BarChart>
      </ResponsiveContainer>
    </div> */}

{/* === NEW ▸ pended reason table ========================================== */}
{pendedReasonSummary.length > 0 && (
  <div style={{
    marginTop: '24px',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
  }}>
    <h4 style={{
      fontSize: '17px',
      fontWeight: '500',
      color: '#003b70',
      marginBottom: '16px'
    }}>
      Pended/Routed Appeals Breakdown by Reason&nbsp;—&nbsp;{trendView}
    </h4>




{/* GSP filter */}
<div style={{ marginBottom: '12px' }}>
  <label style={{ fontWeight: '500', color: '#003b70', marginRight: '8px' }}>
    Filter by GSP:
  </label>
  <select
    value={selectedPendedGsp}
    onChange={e => setSelectedPendedGsp(e.target.value)}
    style={{
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid #ccc',
      fontSize: '14px',
      width: '180px',
      fontFamily: 'inherit',
      color: '#003b70',
      backgroundColor: '#fff'
    }}
  >
    {['All', 'Sagility', 'Concentrix', 'Wipro'].map(g => (
      <option key={g} value={g}>{g}</option>
    ))}
  </select>
</div>



   {/* ▪▪▪ SCROLLABLE WRAPPER ▪▪▪ */}
<div style={{
  overflowX: 'auto',
  overflowY: 'auto',
  border: '1px solid #ddd',
  maxHeight: '260px',
  borderRadius: '6px'
}}>

  
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
<thead style={{ backgroundColor: '#f1f8ff', position: 'sticky', top: 0, zIndex: 1 }}>
  <tr>
    {/* fixed column list for clickable headers */}
    {(() => {
      const base = [
        { label: 'Reason',           key: 'Reason' },
        { label: 'Sagility #',       key: 'Sagility' },
        { label: 'Sagility %',       key: 'SagilityPct' },
        { label: 'Concentrix #',     key: 'Concentrix' },
        { label: 'Concentrix %',     key: 'ConcentrixPct' },
        { label: 'Wipro #',          key: 'Wipro' },
        { label: 'Wipro %',          key: 'WiproPct' },
        { label: 'Total #',          key: 'Total' }
      ];

      // hide non-selected GSP columns if filter ≠ All
      const cols = selectedPendedGsp === 'All'
        ? base
        : base.filter(
            c => ['Reason', 'Total', `${selectedPendedGsp}`, `${selectedPendedGsp}Pct`]
                    .some(h => c.key.startsWith(h.replace(' #','').replace(' %','')))
          );

      return cols.map(col => (
        <th
          key={col.key}
          onClick={() => handlePendedSort(col.key)}
          style={{ padding: '10px', border: '1px solid #ccc', cursor: 'pointer', userSelect: 'none' }}
        >
          {col.label}&nbsp;{sortIcon(col.key)}
        </th>
      ));
    })()}
  </tr>
</thead>

<tbody>
{(() => {
    let rowRendered = false;

    const rows = [...new Set(pendedReason.map(row => row.pend_reason))].map((reason, idx) => {
      const rowsForReason = pendedReason.filter(row => row.pend_reason === reason);

      const selectedAccounts = selectedPendedGsp === 'All'
        ? ['Sagility', 'Concentrix', 'Wipro']
        : [selectedPendedGsp];

      const filteredRows = rowsForReason.filter(row => selectedAccounts.includes(row.account));
      const allZero = filteredRows.every(row => !row.reason_Count);

      if (allZero) return null; // Skip this row

      rowRendered = true; // ✅ Mark that a row is rendered

      const totalCount = filteredRows.reduce((sum, row) => sum + (row.reason_Count || 0), 0);

      return (
        <tr key={reason} style={{ backgroundColor: idx % 2 ? '#f3f6fb' : '#ffffff' }}>
          <td style={{ padding: '8px', border: '1px solid #eee', fontWeight: '600', textAlign: 'center' }}>
            {reason}
          </td>

          {selectedAccounts.map(gsp => {
            const row = rowsForReason.find(r => r.account === gsp);
            return (
              <React.Fragment key={gsp}>
                <td style={{ padding: '8px', border: '1px solid #eee', textAlign: 'center' }}>
                  {row?.reason_Count ?? 0}
                </td>
                <td style={{ padding: '8px', border: '1px solid #eee', textAlign: 'center' }}>
                  {row?.percentage?.toFixed(2) ?? '0.00'}%
                </td>
              </React.Fragment>
            );
          })}

          <td style={{ padding: '8px', border: '1px solid #eee', fontWeight: '600', textAlign: 'center' }}>
            {totalCount}
          </td>
        </tr>
      );
    });

    return rowRendered ? rows : (
      <tr>
        <td colSpan={1 + selectedPendedGsp === 'All' ? 6 : 3} style={{ textAlign: 'center', padding: '16px', fontStyle: 'italic' }}>
          No result found.
        </td>
      </tr>
    );
  })()}

</tbody>

  </table>
</div>




  </div>
)}

  </div>
)}




        {/* Out of Compliance */}
    {proclaimSummary.length > 0 && (
  <div style={{ paddingTop: '1px', marginLeft: '-30px', backgroundColor: '#F5F6FA', borderRadius: '10px' }}>
    <h3 style={{
      fontSize: '19px',
      fontWeight: '500',
      color: '#003b70',
      marginLeft: '20px',
      marginBottom: '10px',
      marginTop: '10px',
      fontFamily: 'Lexend, sans-serif'
    }}>
      Out of Compliance
    </h3>

    <div style={{ marginBottom: '12px', marginLeft: '20px' }}>
      <label style={{ fontWeight: '500', color: '#003b70', marginRight: '8px' }}>View:</label>
      <select
        value={outOfComplianceView}
        onChange={e => setOutOfComplianceView(e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #ccc',
          fontSize: '14px',
          width: '150px',
          fontFamily: 'inherit',
          color: '#003b70',
          backgroundColor: '#fff',
        }}
      >
        {['Daily', 'Weekly', 'Monthly'].map(opt =>
          <option key={opt} value={opt}>{opt}</option>
        )}
      </select>
    </div>

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
      {Object.entries(transformComplianceTrend).map(([account, values]) => (
        <div
          key={account}
          style={{
            background: `linear-gradient(to right, ${bgColors[account] || '#ffffff'} 0%, #ffffff 100%)`,
            borderRadius: '10px',
            padding: '24px',
            width: '450px',
            height: '180px',
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#003b70',
            marginBottom: '10px',
            borderBottom: '1px solid #ddd',
            paddingBottom: '5px'
          }}>
            {account}
          </div>

          <ResponsiveContainer width="100%" height={130}>
            <ComposedChart data={values}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ angle: -35, fontSize: 10, textAnchor: 'end' }} height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="YES" fill="#EF5350" barSize={20} name="YES" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="YES" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
              </Bar>
              <Bar dataKey="NO" fill="#66BB6A" barSize={20} name="NO" radius={[4, 4, 0, 0]} stackId="a">
                <LabelList dataKey="NO" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  </div>
)}




{/* Member vs Provider – Product Field */}
{memberProviderSummary.length > 0 && (
  <div style={{
    marginTop: '20px',
    marginLeft: '-30px',
    backgroundColor: '#F5F6FA',
    borderRadius: '10px',
    padding: '20px',
    fontFamily: 'Lexend, sans-serif'
  }}>
    <h3 style={{
      fontSize: '19px',
      fontWeight: '500',
      color: '#003b70',
      marginBottom: '10px',
      marginTop: '0px'
    }}>
      Member vs Provider Inventory
    </h3>

    <div style={{
  marginTop: '0px',
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
}}>
  <ResponsiveContainer width="100%" height={240}>
    <BarChart
      data={memberProvider.filter(r => r.Department !== 'Total')}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="Department" tick={{ fontSize: 12 }} />
      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend wrapperStyle={{ fontSize: '12px' }} />
      <Bar dataKey="Member" fill="#1E88E5">
        <LabelList dataKey="Member" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
      </Bar>
      <Bar dataKey="Provider" fill="#7E57C2">
        <LabelList dataKey="Provider" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>
  </div>
)}



{/* IFP Inventory and Aging Percentage */}
{ifpSummary.length > 0 && (
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
      marginBottom: '10px'
    }}>
      IFP Inventory and Aging Percentage
    </h3>

    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontWeight: '500', color: '#003b70', marginRight: '8px' }}>
        Filter by GSP:
      </label>
      <select
        value={selectedIfpGsp}
        onChange={(e) => setSelectedIfpGsp(e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #ccc',
          fontSize: '14px',
          width: '150px',
          fontFamily: 'inherit',
          color: '#003b70',
          backgroundColor: '#fff',
        }}
      >
        {['All', 'Sagility', 'Concentrix', 'Wipro'].map((gsp) => (
          <option key={gsp} value={gsp}>{gsp}</option>
        ))}
      </select>
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
      boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
    }}>
<div style={{ fontSize: '16px', fontWeight: '600', color: '#003b70' }}>
  Total IFP Appeals:
<ul style={{
  marginTop: '8px',
  paddingLeft: '16px',
  fontSize: '14px',
  fontWeight: '500',
  columnCount: 2,
  columnGap: '40px',
  maxHeight: '200px',
  overflowY: 'auto',
  listStyleType: 'disc'
}}>
  {Object.entries(
    ifpRows
      .filter(row => selectedIfpGsp === 'All' || (row['Director'] || '').trim() === selectedIfpGsp)
      .reduce((acc, row) => {
        const name = (row['Account Name'] || '').trim();
        if (name) acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {})
  ).map(([name, count]) => (
    <li key={name}>{name}: {count}</li>
  ))}
</ul>

</div>
    </div>

    <div style={{
      marginTop: '20px',
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
    }}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={ifpSummary.filter(row =>
            row.Department !== 'Total' &&
            (selectedIfpGsp === 'All' || row.Department === selectedIfpGsp)
          )}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="Department" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => `${value} days`}
          />

          {orderedBucketColors
            .filter(({ bucket }) =>
              Object.keys(ifpSummary[0]).includes(bucket)
            )
            .map(({ bucket, color }) => (
              <Bar key={bucket} dataKey={bucket} fill={color}>
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
)}



{proclaimSummary.length > 0 && (
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
      PG Name Summary
    </h3>

    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontWeight: '500', color: '#003b70', marginRight: '8px' }}>
        Filter by GSP:
      </label>
      <select
        value={selectedPgSummaryGsp}
        onChange={e => setSelectedPgSummaryGsp(e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #ccc',
          fontSize: '14px',
          width: '150px',
          fontFamily: 'inherit',
          color: '#003b70',
          backgroundColor: '#fff',
        }}
      >
        <option value="All">All</option>
        {[...new Set(pgNameSummary.map(row => row.account))].map(gsp => (
          <option key={gsp} value={gsp}>{gsp}</option>
        ))}
      </select>
    </div>

    <div style={{
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
        color: '#003b70',
        marginBottom: '8px'
      }}>
        Total PG Names:
      </div>

      <ul style={{
        marginTop: '4px',
        paddingLeft: '16px',
        fontSize: '14px',
        fontWeight: '500',
        columnCount: 2,
        columnGap: '40px',
        maxHeight: '260px',
        overflowY: 'auto',
        overflowX: 'hidden',
        wordWrap: 'break-word',
        listStyleType: 'disc',
        whiteSpace: 'normal',
      }}>
        {pgNameSummary
          .filter(row => selectedPgSummaryGsp === 'All' || row.account === selectedPgSummaryGsp)
          .sort((a, b) => b.pG_Count - a.pG_Count)
          .map(row => (
            <li key={row.account + row.pG_NAME3}>{row.pG_NAME3}: {row.pG_Count}</li>
          ))}
      </ul>
    </div>
  </div>
)}


       {/* Fully Insured Summary */}
{proclaimSummary.length > 0 && (
  <div style={{ 
    paddingTop: '1px',
    marginTop: '20px', 
    marginLeft: '-30px',
    backgroundColor:'#F5F6FA',
    borderRadius: '10px',
    height: '530px',
  }}>
    <h3 style={{
      fontSize: '19px',
      fontWeight: '500',
      color: '#003b70',
      marginBottom: '10px',
      marginTop: '10px',
      fontFamily: 'Lexend, sans-serif',
      marginLeft: '20px',
    }}>
      Non-ASO
    </h3>
    <div style={{ marginBottom: '16px', marginLeft: '20px',}}>
      <label style={{ fontWeight: '500', color: '#003b70', marginRight: '8px' }}>
        Filter by GSP:
      </label>
      <select
        value={selectedDirector}
        onChange={(e) => setSelectedDirector(e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #ccc',
          fontSize: '14px',
          width: '150px',
          fontFamily: 'inherit',
          color: '#003b70',
          backgroundColor: '#fff',
        }}
      >
        {directorOptions.map((dir, index) => (
          <option key={index} value={dir}>
            {dir}
          </option>
        ))}
      </select>
    </div>

    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '24px',
      marginLeft: '20px',
    }}>
      {['FI', 'NY', 'TX', 'ASO'].map(region => {
        const regionData = groupedNonAso[region];
        if (!regionData || regionData.length === 0) return null;

        return (
          <div
            key={region}
            style={{
              background: 'linear-gradient(to right, #f4f7fc 0%, #ffffff 100%)',
              borderRadius: '10px',
              padding: '24px',                                   
              marginRight: '-10px',
              marginBottom: '-10px',
              width: '780px',
              height: '150px',
              maxWidth: '707px',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#003b70',
              marginBottom: '10px',
              marginTop: '-10px',
              borderBottom: '1px solid #ddd',
              paddingBottom: '6px',
            }}>
              {regionLabels[region] || region}

            </div>

            <ResponsiveContainer width="80%" height={150}>
            <ComposedChart data={regionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} height={30} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }}/>
              <Tooltip />
             <Bar dataKey="Admin" name="Admin" fill="#753AFC" barSize={20} radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="Admin"
                position="top"
                content={({ x, y, width, value, viewBox }) => {
                  // y is the top of the bar; viewBox.y is the top of the chart area
                  const minY = viewBox.y + 16; // 16px padding from the top of the chart
                  const labelY = y < minY ? minY : y - 6;
                  return (
                    <text
                      x={x + width / 2}
                      y={labelY}
                      fill="#753AFC"
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight="bold"
                    >
                      {value}
                    </text>
                  );
                }}
              />
            </Bar>
              <Line
                dataKey="Med"
                name="Med"
                type="monotone"
                stroke="#f44336"
                strokeWidth={2}
                dot={{ r: 4 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  </div>
)}
{/* Pre-Service Section */}
{proclaimSummary.length > 0 && (
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
      Pre-Service Appeals
    </h3>
    <div style={{ marginBottom: '12px' }}>
  <label style={{ fontWeight: '500', color: '#003b70', marginRight: '8px' }}>
    Filter by GSP:
  </label>
  <select
    value={selectedPreSerGsp}
    onChange={(e) => setSelectedPreSerGsp(e.target.value)}
    style={{
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid #ccc',
      fontSize: '14px',
      width: '150px',
      fontFamily: 'inherit',
      color: '#003b70',
      backgroundColor: '#fff',
    }}
  >
    {['All',  'Onshore', 'Sagility', 'Concentrix'].map((gsp) => (
      <option key={gsp} value={gsp}>
        {gsp}
      </option>
    ))}
  </select>
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
  boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
}}>
  <div style={{
    fontSize: '16px',
    fontWeight: '600',
    color: '#003b70'
  }}>
    Total Pre-Service Appeals: {preserviceTotal}
  </div>
</div>



    <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #ddd',marginTop: '-10px', }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead style={{ backgroundColor: '#e0eafc', position: 'sticky', top: 0 }}>
          <tr>
            {Object.values(preserviceColumnMap).map((header) => (
              <th key={header} style={{ padding: '8px', border: '1px solid #ccc', fontWeight: '600', textAlign: 'left' }}>
                {header}
              </th>
            ))}
            <th style={{ padding: '8px', border: '1px solid #ccc', fontWeight: '600', textAlign: 'left' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
  {isPreserviceLoading ? (
    <tr>
      <td colSpan={Object.keys(preserviceColumnMap).length + 1} style={{ textAlign: 'center', padding: '16px' }}>
        Loading...
      </td>
    </tr>
  ) : preserviceRows.length === 0 ? (
    <tr>
      <td colSpan={Object.keys(preserviceColumnMap).length + 1} style={{ textAlign: 'center', padding: '16px' }}>
        No result found.
      </td>
    </tr>
  ) : (
    preserviceRows.map((row, idx) => (
      <tr key={idx}>
        {Object.keys(preserviceColumnMap).map((excelKey) => (
          <td key={excelKey} style={{ padding: '8px', border: '1px solid #eee' }}>
            {preserviceDateFields.includes(excelKey)
              ? formatExcelDate(row[excelKey])
              : (row[excelKey] ?? '')}
          </td>
        ))}
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
    ))
  )}
</tbody>
      </table>

      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
  <button
    onClick={() => setPreservicePage(p => Math.max(1, p - 1))}
    disabled={preservicePage === 1}
  >Prev</button>
  <span>Page {preservicePage}</span>
  <button
    onClick={() => setPreservicePage(p => p * preservicePageSize < preserviceTotal ? p + 1 : p)}
    disabled={preservicePage * preservicePageSize >= preserviceTotal}
  >Next</button>
</div>
    </div>
  </div>
)}


{proclaimSummary.length > 0 && (
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
      PG Appeals
    </h3>

    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontWeight: '500', color: '#003b70', marginRight: '8px' }}>
        Filter by GSP:
      </label>
      <select
        value={selectedPgYesGsp}
        onChange={(e) => {
          setSelectedPgYesGsp(e.target.value);
          setPgYesPage(1); // Reset to first page on filter change
        }}
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #ccc',
          fontSize: '14px',
          width: '150px',
          fontFamily: 'inherit',
          color: '#003b70',
          backgroundColor: '#fff',
        }}
      >
        {['All', 'Onshore','Sagility', 'Concentrix'].map((gsp) => (
          <option key={gsp} value={gsp}>
            {gsp}
          </option>
        ))}
      </select>
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
      boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        fontSize: '16px',
        fontWeight: '600',
        color: '#003b70'
      }}>
        Total PG Appeals: {pgYesTotal}
      </div>
    </div>

    <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #ddd', marginTop: '-10px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead style={{ backgroundColor: '#e0eafc', position: 'sticky', top: 0 }}>
          <tr>
            {Object.values(preserviceColumnMap).map((header) => (
              <th key={header} style={{ padding: '8px', border: '1px solid #ccc', fontWeight: '600', textAlign: 'left' }}>
                {header}
              </th>
            ))}
            <th style={{ padding: '8px', border: '1px solid #ccc', fontWeight: '600', textAlign: 'left' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {isPgYesLoading ? (
            <tr>
              <td colSpan={Object.keys(preserviceColumnMap).length + 1} style={{ textAlign: 'center', padding: '16px' }}>
                Loading...
              </td>
            </tr>
          ) : pgYesRows.length === 0 ? (
            <tr>
              <td colSpan={Object.keys(preserviceColumnMap).length + 1} style={{ textAlign: 'center', padding: '16px' }}>
                No result found.
              </td>
            </tr>
          ) : (
            pgYesRows.map((row, idx) => (
              <tr key={idx}>
                {Object.keys(preserviceColumnMap).map((excelKey) => (
                  <td key={excelKey} style={{ padding: '8px', border: '1px solid #eee' }}>
                    {preserviceDateFields.includes(excelKey)
                      ? formatExcelDate(row[excelKey])
                      : (row[excelKey] ?? '')}
                  </td>
                ))}
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
            ))
          )}
        </tbody>
      </table>
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <button
          onClick={() => setPgYesPage(p => Math.max(1, p - 1))}
          disabled={pgYesPage === 1}
        >Prev</button>
        <span>Page {pgYesPage}</span>
        <button
          onClick={() => setPgYesPage(p => p * pgYesPageSize < pgYesTotal ? p + 1 : p)}
          disabled={pgYesPage * pgYesPageSize >= pgYesTotal}
        >Next</button>
      </div>
    </div>
  </div>
)}



{/* Gold & Bronze Section */}
{gnbSummary.length > 0 && (
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
      marginBottom: '16px',
      marginTop: '0px'
    }}>
      Gold & Bronze Summary
    </h3>

    <div style={{ overflowX: 'auto', border: '1px solid #ddd' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead style={{ backgroundColor: '#00bcd4', color: 'white' }}>
          <tr>
            <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'left' }}>
              Department
            </th>
            {Object.keys(gnbSummary[0])
              .filter(key => key !== 'Department')
              .map(bucket => (
                <th key={bucket} style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'left' }}>
                  {bucket}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {gnbSummary.map((row, idx) => (
            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f3f6fb' }}>
              <td style={{ padding: '8px', border: '1px solid #eee', fontWeight: row.Department === 'Total' ? '600' : '400' }}>
                {row.Department}
              </td>
              {Object.keys(row)
                .filter(key => key !== 'Department')
                .map(bucket => (
                  <td key={bucket} style={{ padding: '8px', border: '1px solid #eee', textAlign: 'left' }}>
                    {row[bucket] > 0 ? row[bucket] : '-'}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

{gnbSummary.length > 0 && (
  <div style={{
    marginTop: '20px',
    marginLeft: '0px',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
    fontFamily: 'Lexend, sans-serif',
  }}>
    <h3 style={{
      fontSize: '18px',
      fontWeight: '500',
      color: '#003b70',
      marginBottom: '24px',
      borderBottom: '1px solid #ddd',
      paddingBottom: '8px',
      marginTop: '0px'
    }}>
      Gold & Bronze Appeal Age Bucket Breakdown per GSP
    </h3>

    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={gnbSummary.filter(row => row.Department !== 'Total')}
        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="Department" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: '12px' }} />

        {Object.keys(gnbSummary[0])
          .filter(key => key !== 'Department' && key !== 'Total')
          .map((bucket, index) => (
            <Bar
              key={bucket}
              dataKey={bucket}
              fill={getColorForBucket(index)} // 🔄 NO stackId
            >
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
)}



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


    </div>
  );
}

export default ClientProclaimPage;
