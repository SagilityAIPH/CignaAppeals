import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LabelList, ComposedChart, Line, Legend,
} from "recharts";

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
const [latestProclaimCounts, setLatestProclaimCounts] = useState({});

    const marqueeMessages = useMemo(() => [
    `🚀 Welcome to the Proclaim Dashboard`,
    ` `,

      `As of ${new Date().toLocaleString('en-US', {month: 'numeric', day: 'numeric', year: 'numeric',})}  12:00`,
    ` `,

    `🔢 Assigned : XXX  Completed:XX   Untouched: XX`,
    `📊 Assigned: %  Completed: %   Untouched: %`,
    ` `,

    `🔢 SG: Assigned: XX 📊 Completed: XX - %`,
    `🔢 Wi: Assigned: XX 📊 Completed: XX - %`,
    `🔢 CNX: Assigned: XX 📊 Completed: XX - %`,

    `🔢 Gold: Proclaim: XX % 📊 FAcets: XX - %`,
    `🔢 BRZ: Proclaim: XX % 📊 FAcets: XX - %`,
    ` `,

    `📊 Total Pre-Service Appeals: ${filteredPreserviceRows.length}`,
    `✅ Impact Summary Ready: ${impactSummary.length - 1} departments`,
    `📅 Last Upload: ${new Date().toLocaleDateString()}`
    

    ], [filteredPreserviceRows, impactSummary]);

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
    const preserviceColumnMap = {
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



    const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true); // Start loading

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

     // ✅ Process Gold & Bronze (GnB) Sheet
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

  // Find all unique buckets and sort them
  const allBuckets = Array.from(new Set(
    gnbData.map(row => (row['Age Bucket'] || '').trim()).filter(Boolean)
  )).sort();

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

  // Grand Total row
  const grandTotal = { Department: 'Total' };
  allBuckets.forEach(bucket => {
    grandTotal[bucket] = summary.reduce((sum, row) => sum + (row[bucket] || 0), 0);
  });
  grandTotal.Total = summary.reduce((sum, row) => sum + row.Total, 0);
  summary.push(grandTotal);

  setGnbSummary(summary);
}


        const worksheet = workbook.Sheets['DATA'];
        if (!worksheet) {
        alert('Sheet named "DATA" not found in Excel file.');
        setIsLoading(false);
        return;
        }

        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        setExcelData(json);

// ✅ Proclaim Appeal Numbers
const proclaimDirectors = ['Sagility', 'Concentrix', 'Wipro'];
const proclaimAppeals = proclaimDirectors.map(director => {
  const count = json.filter(row =>
    (row['Claim System'] || '').trim().toLowerCase() === 'proclaim' &&
    (row['Department'] || '').toLowerCase().includes('appeal') &&
    (row['Director'] || '').trim() === director
  ).length;

  return { Department: director, Count: count };
});

// 👇 Breakdown Proclaim Appeals by date and GSP
const trendMap = {};
json.forEach(row => {
  const system = (row['Claim System'] || '').trim().toLowerCase();
  const department = (row['Department'] || '').toLowerCase();
  const director = (row['Director'] || '').trim();
  let rawDate = row['ReportDate'];

  if (system !== 'proclaim' || !department.includes('appeal') || !director) return;

  let date = null;
  if (typeof rawDate === 'number') {
    date = new Date(Math.round((rawDate - 25569) * 86400 * 1000)).toISOString().split('T')[0];
  } else if (rawDate instanceof Date) {
    date = rawDate.toISOString().split('T')[0];
  } else if (typeof rawDate === 'string' && rawDate.includes('/')) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed)) date = parsed.toISOString().split('T')[0];
  }

  if (!date) return;

  if (!trendMap[date]) trendMap[date] = { date };
  trendMap[date][director] = (trendMap[date][director] || 0) + 1;
});

const trendData = Object.values(trendMap).sort((a, b) => new Date(a.date) - new Date(b.date));
const proclaimLatestDate = trendData.length > 0 ? trendData[trendData.length - 1].date : null;

const latestDateCounts = proclaimLatestDate
  ? json.filter(row =>
      (row['Claim System'] || '').trim().toLowerCase() === 'proclaim' &&
      (row['Department'] || '').toLowerCase().includes('appeal') &&
      (row['Director'] || '').trim() &&
      new Date(formatExcelDate(row['ReportDate']))?.toISOString().split('T')[0] === proclaimLatestDate
    ).reduce((acc, row) => {
      const dir = (row['Director'] || '').trim();
      if (proclaimDirectors.includes(dir)) {
        acc[dir] = (acc[dir] || 0) + 1;
      }
      return acc;
    }, {})
  : {};

setProclaimSummary(proclaimAppeals);
setProclaimTrend(trendData);
setLatestProclaimDate(proclaimLatestDate);
setLatestProclaimCounts(latestDateCounts);



        // ✅ Add this right here — after reading "DATA"
        const impactSheet = workbook.Sheets['IMPACT'];
        if (impactSheet) {
            const impactData = XLSX.utils.sheet_to_json(impactSheet, { defval: '' });

            const departments = ['Concentrix', 'Sagility', 'Stateside', 'Wipro'];
            const ageBuckets = ['0-15 days', '16-30 days', '31-60 days', '61+ days'];

            const grouped = {};
            departments.forEach(dept => {
            grouped[dept] = Object.fromEntries(ageBuckets.map(bucket => [bucket, 0]));
            });

            impactData.forEach(row => {
            const status = (row['Case status'] || '').trim().toLowerCase();
            if (
              impactStatusFilter !== 'All' &&
              status !== impactStatusFilter.toLowerCase()
            ) return;

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
            setImpactSummary(generateImpactSummary(impactData, impactStatusFilter));
            setRawImpactData(impactData);
        }

        // Get Preservice rows and headers
        const preservice = json.filter(row => (row['Appeal_Category'] || '').trim() === 'Pre-Service');
        setPreserviceRows(preservice);


        // ✅ IFP Rows and Summary
const ifpData = json.filter(row => (row['Account Name'] || '').trim() !== '');
setIfpRows(ifpData);

const ifpDepts = ['Sagility', 'Concentrix', 'Wipro'];
const ageBucketCol = 'AGE_BUCKET';
const groupCol = 'Director';
const countCol = 'Account Name';

const groupedIFP = {};

ifpData.forEach(row => {
  const director = (row[groupCol] || '').trim();
  const bucket = (row[ageBucketCol] || '').trim();

  if (ifpDepts.includes(director) && bucket) {
    if (!groupedIFP[director]) groupedIFP[director] = {};
    groupedIFP[director][bucket] = (groupedIFP[director][bucket] || 0) + 1;
  }
});

// Collect unique sorted buckets
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


        if (preservice.length > 0) {
        const headers = Object.keys(preservice[0]);
        setPreserviceHeaders(headers);
        }

          // 👇 Add this here
const allowedDirectors = ['Sagility', 'Concentrix', 'Wipro'];

const directors = json
  .map(row => (row['Director'] || '').trim())
  .filter(name => allowedDirectors.includes(name));

const uniqueDirectors = Array.from(new Set(directors));

setDirectorOptions(['All', ...uniqueDirectors]);

        // Avoid blocking UI
        setTimeout(() => {
        calculateDirectorStats(json);
        calculateFullyInsuredStats(json);
        setIsLoading(false); // Done loading
        setShowMarquee(true); // 👈 Add here
        }, 0);
    };

    reader.readAsArrayBuffer(file);
    };

    const regionLabels = {
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

  return (
    <div style={{ padding: '0px', fontFamily: 'Lexend, sans-serif' }}>
      <label
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
      />
      
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
    marginTop: '20px',
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
      marginBottom: '10px'
    }}>
      Proclaim Appeals Summary
    </h3>

<div style={{
  backgroundColor: '#e8f0fe',
  border: '1px solid #c4d4ec',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
}}>
  <div style={{ fontSize: '16px', fontWeight: '600', color: '#003b70', marginBottom: '6px' }}>
    Total Proclaim Appeals as of {`${new Date().toLocaleString('en-US', {month: 'numeric', day: 'numeric', year: 'numeric',})}`}
  </div>
<div style={{ fontSize: '14px', fontWeight: '500', color: '#003b70' }}>
  Total Appeals: {(
    (latestProclaimCounts.Sagility || 0) +
    (latestProclaimCounts.Concentrix || 0) +
    (latestProclaimCounts.Wipro || 0)
  )} &nbsp;&nbsp;|&nbsp;&nbsp;
  Sagility: {latestProclaimCounts.Sagility || 0} &nbsp;&nbsp;|&nbsp;&nbsp;
  Concentrix: {latestProclaimCounts.Concentrix || 0} &nbsp;&nbsp;|&nbsp;&nbsp;
  Wipro: {latestProclaimCounts.Wipro || 0}
</div>
</div>


    <div style={{
      marginTop: '10px',
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
    }}>
      <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={proclaimTrend}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-35} height={50} />
        <YAxis allowDecimals={false} tick={{ fontSize: 13}}/>
        <Tooltip />
        <Legend />
        <Line dataKey="Sagility" stroke="#42A5F5" strokeWidth={2} />
        <Line dataKey="Concentrix" stroke="#FFA726" strokeWidth={2} />
        <Line dataKey="Wipro" stroke="#66BB6A" strokeWidth={2} />
      </ComposedChart>
    </ResponsiveContainer>
    </div>
  </div>
)}



        {/* Out of Compliance */}
        {Object.entries(directorStats).length > 0 && (
        <div style={{ 
            paddingTop: '1px', 
            marginLeft: '-30px',
            backgroundColor:'#F5F6FA', 
            borderRadius: '10px' 
            }}>
            <h3 style={{fontSize: '19px', fontWeight: '500', color: '#003b70', marginLeft: '20px', marginBottom: '10px', marginTop: '10px', fontFamily: 'Lexend, sans-serif' }}>
            Out of Compliance
            </h3>

            <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            }}>
            {Object.entries(directorStats).map(([director, values]) => {
                const chartData = [
                { label: 'YES', value: values.YES },
                { label: 'NO', value: values.NO },
                ];

                return (
                <div
                    key={director}
                    style={{
                    background: `linear-gradient(to right, ${bgColors[director]} 0%, #ffffff 100%)`,
                    borderRadius: '10px',
                    marginBottom: '20px',
                    marginRight: '-30px',
                    marginLeft: '20px',
                    padding: '24px',
                    width: '450px',
                    height: '150px',
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.2s ease',
                    }}
                >
                    <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#003b70',
                    marginBottom: '10px',
                    marginTop: '-10px',
                    borderBottom: '1px solid #ddd',
                    paddingBottom: '5px',
                    }}>
                    {director}
                    </div>

                    {/* <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '5px',
                    marginTop: '10px',
                    fontSize: '14px',
                    fontWeight: '500'
                    }}>
                    <span style={{
                        backgroundColor: '#ffebee',
                        color: '#F4817F',
                        padding: '4px 10px',
                        borderRadius: '20px'
                    }}>
                        YES: {values.YES}
                    </span>
                    <span style={{
                        backgroundColor: '#e3f2fd',
                        color: '#3991D9',
                        padding: '4px 10px',
                        borderRadius: '20px'
                    }}>
                        NO: {values.NO}
                    </span>
                    </div> */}

                    <ResponsiveContainer width="80%" height={150}>
                    <ComposedChart data={values}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ angle: -35, fontSize: 10, textAnchor: 'end' }} height={50} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#333' }}/>
                        <Tooltip />

                        <Bar dataKey="YES" fill={barColors.YES} barSize={20} name="YES" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="YES" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
                        </Bar>

                        <Bar dataKey="NO" fill={barColors.NO} barSize={20} name="NO" radius={[4, 4, 0, 0]} stackId="a">
                        <LabelList dataKey="NO" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
                        </Bar>
                    </ComposedChart>
                    </ResponsiveContainer>



                </div>
                );
            })}
            </div>
        </div>
        )}



       {/* Fully Insured Summary */}
                {Object.keys(fullyInsuredStats).length > 0 && (
                <div style={{ 
                    paddingTop: '1px',
                    marginTop: '20px', 
                    marginLeft: '-30px',
                    backgroundColor:'#F5F6FA',
                    borderRadius: '10px',
                    height: '530px',
                    
                    }}>
                    <h3 style={{fontSize: '19px', fontWeight: '500', color: '#003b70', marginBottom: '10px', marginTop: '10px', fontFamily: 'Lexend, sans-serif', marginLeft: '20px', }}>
                    Non-ASO
                    </h3>
                    <div style={{ marginBottom: '16px', marginLeft: '20px',}}>
                    <label style={{ fontWeight: '500', color: '#003b70', marginRight: '8px' }}>
                        Filter by GSP:
                    </label>
                    <select
                        value={selectedDirector}
                        onChange={(e) => {
                        const selected = e.target.value;
                        setSelectedDirector(selected);
                        calculateFullyInsuredStats(excelData);
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
                            const regionData = fullyInsuredStats[region];
                            if (!regionData) return null;

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
                                    <XAxis dataKey="date" tick={{ angle: -35, fontSize: 10, textAnchor: 'end' }} height={50} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }}/>
                                    <Tooltip />

                                    <Bar dataKey="Admin" name="Admin" fill="#753AFC" barSize={20} radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="Admin" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
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
      Pre-Service Appeals
    </h3>
    <div style={{ marginBottom: '12px' }}>
  <label style={{ fontWeight: '500', color: '#003b70', marginRight: '8px' }}>
    Filter by GSP:
  </label>
  <select
    value={selectedGsp}
    onChange={(e) => setSelectedGsp(e.target.value)}
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
    Total Pre-Service Appeals: {filteredPreserviceRows.length}
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
          {filteredPreserviceRows.map((row, idx) => (
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
          ))}
        </tbody>
      </table>
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




{/* Impact section */}
{impactSummary.length > 0 && (
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
      Impact Summary
    </h3>


<div style={{ marginBottom: '12px' }}>
  <label style={{ fontWeight: '500', color: '#003b70', marginRight: '8px' }}>
    Filter by Case Status:
  </label>
  <select
    value={impactStatusFilter}
    onChange={(e) => {
      const status = e.target.value;
      setImpactStatusFilter(status);
      setImpactSummary(generateImpactSummary(rawImpactData, status));
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
    {['All', 'Open', 'Failed'].map((opt) => (
      <option key={opt} value={opt}>{opt}</option>
    ))}
  </select>
</div>


    <div style={{ overflowX: 'auto', border: '1px solid #ddd' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead style={{ backgroundColor: '#009fe3', color: 'white' }}>
          <tr>
            {['Department', '0-15 days', '16-30 days', '31-60 days', '61+ days', 'Total'].map(header => (
              <th key={header} style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'left' }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {impactSummary.map((row, idx) => (
            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f3f6fb' }}>
              <td style={{ padding: '8px', border: '1px solid #eee', fontWeight: row.Department === 'Total' ? '600' : '400' }}>
                {row.Department}
              </td>
              {['0-15 days', '16-30 days', '31-60 days', '61+ days', 'Total'].map(bucket => (
                <td key={bucket} style={{ padding: '8px', border: '1px solid #eee', textAlign: 'left' }}>
                  {row[bucket] > 0 ? row[bucket] : '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {impactSummary.length > 0 && (
  <div style={{
    marginTop: '20px',
    marginLeft: '00px',
    backgroundColor: 'White',
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
      Appeal Age Bucket Breakdown per GSP
    </h3>

    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={impactSummary.filter(row => row.Department !== 'Total')}
        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="Department" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        
        <Bar dataKey="0-15 days" fill="#00C49F">
          <LabelList dataKey="0-15 days" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
        </Bar>
        <Bar dataKey="16-30 days" fill="#0071CE">
          <LabelList dataKey="16-30 days" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
        </Bar>
        <Bar dataKey="31-60 days" fill="#FFA726">
          <LabelList dataKey="31-60 days" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
        </Bar>
        <Bar dataKey="61+ days" fill="#EF5350">
          <LabelList dataKey="61+ days" position="top" style={{ fontSize: 10, fontWeight: 'bold' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
)}

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





    </div>
  );
}

export default ClientProclaimPage;
