// AppealStatusOverview.js
import HomePage from "./HomePage";
import React, { useState, useRef, useEffect } from "react";
import { Form, Button, ProgressBar } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";
import "react-toastify/dist/ReactToastify.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,       // ✅ added
  Pie,            // ✅ added
  Legend,
  LabelList,
  Cell            // ✅ already here
} from "recharts";

function AppealStatusOverview() {
  const [active, setActive] = useState("appealStatus");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [cardMetrics, setCardMetrics] = useState(null);
  const [directorCounts, setDirectorCounts] = useState(null);
  const [multiLineData, setMultiLineData] = useState([]);
  const [filteredDirector, setFilteredDirector] = useState(null);
  const [enterpriseSummary, setEnterpriseSummary] = useState([]);
  const [selectedCardDate, setSelectedCardDate] = useState(null);
  const [excelRawData, setExcelRawData] = useState([]); // Full raw data from Excel
  const [filterColumn, setFilterColumn] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [availableColumns, setAvailableColumns] = useState([]);
  const [availableValues, setAvailableValues] = useState([]);
  const [modalData, setModalData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pieColumn, setPieColumn] = useState("");
  const fixedHeaders = [
  { label: "AGE", key: "AGE_HELPER", fallback: "AY" },
  { label: "SR.", key: "SR .", fallback: "A" },
  { label: "Manager", key: "Manager", fallback: "D" },
  { label: "PROMISE", key: "AGE_PROMISE_BUCKET", fallback: "BP" },
  { label: "Task Promise Date", key: "Promise Date", fallback: "C" },
  { label: "Rec'd", key: "Recd By Cigna", fallback: "L" },
  { label: "System", key: "System", fallback: "Q" },
  { label: "LPI?", key: "LPI?", fallback: "BC" },
  { label: "PG?", key: "PG?", fallback: "BD" },
  { label: "PG Name", key: "PG NAME", fallback: "BE" },
  { label: "OwnerID", key: "OwnerID", fallback: "T" },
  { label: "Owner", key: "OwnerName", fallback: "E" },
  { label: "Status", key: "Status" },
  { label: "View", key: "View" }
];

useEffect(() => {
  if (!filterColumn || excelRawData.length === 0) {
    setAvailableValues([]);
    return;
  }

  try {
    const seen = new Set();
    const values = [];

    for (const row of excelRawData) {
      let val = row[filterColumn];
      if (val === null || val === undefined) continue;

      if (typeof val === "number" && filterColumn.toLowerCase().includes("date")) {
        try {
          const d = XLSX.SSF.parse_date_code(val);
          val = new Date(d.y, d.m - 1, d.d).toISOString().split("T")[0];
        } catch {
          val = val.toString();
        }
      } else {
        val = val.toString().trim();
      }

      // Strict filter: exclude any __EMPTY or similar placeholders
      if (!seen.has(val) && !/^__EMPTY.*/i.test(val)) {
        seen.add(val);
        values.push(val);
      }
    }

    setAvailableValues(values);
  } catch (error) {
    console.error("Error building availableValues:", error);
    setAvailableValues([]);
  }
}, [filterColumn, excelRawData]);



  useEffect(() => {
    if (selectedDate) calculateCardMetrics(selectedDate);
  }, [selectedDate]);
  
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const calculateCardMetrics = (selectedDate, data = multiLineData) => {
    const currentIndex = data.findIndex((d) => d.date === selectedDate);
    if (currentIndex < 0) return;

    const current = data[currentIndex];
    const previous = data[currentIndex - 1];
    if (!previous) return;

    const freshRate = Math.round(
      ((current.fresh - current.untouched) / current.fresh) * 100
    );
    const untouchedRate = Math.round((current.untouched / current.fresh) * 100);
    const closedRate = Math.round((previous.closed / previous.fresh) * 100);

    setCardMetrics({
      fresh: isFinite(freshRate) ? freshRate : 0,
      untouched: isFinite(untouchedRate) ? untouchedRate : 0,
      closed: isFinite(closedRate) ? closedRate : 0,
    });
  };

  const trendColorMap = {
    fresh: "#0288d1",      // Deep Sky Blue
    untouched: "#f9a825",  // Amber
    closed: "#2e7d32",     // Dark Green
  };

  const barCategoryColors = {
  "Total": "#0288d1",         // Blue
  "Open/Assigned": "#f9a825", // Amber
  "Closed": "#2e7d32",        // Green
};

const handleExportFilteredCSV = () => {
  const filteredRows = excelRawData.filter((row) => {
    const reportDateRaw = row["ReportDate"];
    let parsedDate = typeof reportDateRaw === "number"
      ? new Date(XLSX.SSF.parse_date_code(reportDateRaw).y, XLSX.SSF.parse_date_code(reportDateRaw).m - 1, XLSX.SSF.parse_date_code(reportDateRaw).d)
      : new Date(reportDateRaw);
    const reportDate = !isNaN(parsedDate) ? parsedDate.toISOString().split("T")[0] : null;

    const matchesDate = !selectedDate || reportDate === selectedDate;

    let cellValue = row[filterColumn];
    if (typeof cellValue === "number" && filterColumn.toLowerCase().includes("date")) {
      const d = XLSX.SSF.parse_date_code(cellValue);
      cellValue = new Date(d.y, d.m - 1, d.d).toISOString().split("T")[0];
    } else {
      cellValue = cellValue?.toString().trim();
    }

    const matchesFilter = !filterColumn || !filterValue || (cellValue === filterValue);

    return matchesDate && matchesFilter;
  });

  if (filteredRows.length === 0) {
    toast.warning("No matching data to export.");
    return;
  }

  // Collect all keys in the filtered rows
  const allKeys = Array.from(new Set(filteredRows.flatMap(row => Object.keys(row))));

  const rows = [allKeys]; // Header row

  filteredRows.forEach(row => {
    const rowData = allKeys.map(key => {
      let value = row[key];
      return typeof value === "string" ? value.replace(/,/g, " ") : (value ?? "");
    });
    rows.push(rowData);
  });

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `filtered_full_data_${selectedDate || "all"}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};






const handleExportCSV = () => {
  const rows = [["Enterprise", "Fresh Claims", "Untouched", "Closed", "Total"]];
  ["Sagility", "Concentrix", "Wipro"].forEach((enterprise) => {
    const summary = multiLineData
      .filter((d) => !selectedDate || d.date === selectedDate)
      .map((d) => d.details?.[enterprise] || { fresh: 0, untouched: 0, closed: 0 });

    const fresh = summary.reduce((acc, cur) => acc + cur.fresh, 0);
    const untouched = summary.reduce((acc, cur) => acc + cur.untouched, 0);
    const closed = summary.reduce((acc, cur) => acc + cur.closed, 0);
    const total = fresh + untouched + closed;

    rows.push([enterprise, fresh, untouched, closed, total]);
  });

  const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `enterprise_summary_${selectedDate || "all"}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setUploadProgress(0);
  };

  const handleUpload = () => {
    if (!file) {
      toast.error("Please select a file first!");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        toast.success("Upload complete!");

        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

          setExcelRawData(json);

          // Extract column names
          const columnNames = Object.keys(json[0] || {}).filter(
            (name) => !/^__EMPTY.*/i.test(name.trim())
          );
          setAvailableColumns(columnNames);
          
            if (columnNames.includes("Status")) {
                setPieColumn("Status");
              } else if (columnNames.length > 0) {
                setPieColumn(columnNames[0]);
              }

          const counts = {
            Sagility: 0,
            Concentrix: 0,
            Wipro: 0,
          };

          const summary = {
            Sagility: { fresh: 0, untouched: 0, closed: 0 },
            Concentrix: { fresh: 0, untouched: 0, closed: 0 },
            Wipro: { fresh: 0, untouched: 0, closed: 0 },
          };

          const groupedByDate = {};

          json.forEach((row) => {
            const director = row["Director"]?.toString().trim();
            const status = row["STATUS"]?.toString().trim();
            const reportDateRaw = row["ReportDate"];

            if (director === "Sagility") counts.Sagility++;
            else if (director === "Concentrix") counts.Concentrix++;
            else if (director === "Wipro") counts.Wipro++;

            if (!summary[director]) return;
            summary[director].fresh += 1;
            if (status === "Open" || status === "Assigned") {
              summary[director].untouched += 1;
            } else if (status === "Completed") {
              summary[director].closed += 1;
            }

            let parsedDate;
            if (typeof reportDateRaw === "number") {
              const d = XLSX.SSF.parse_date_code(reportDateRaw);
              parsedDate = new Date(d.y, d.m - 1, d.d);
            } else {
              parsedDate = new Date(reportDateRaw);
            }

            if (isNaN(parsedDate)) return;
            const reportDate = parsedDate.toISOString().split("T")[0];

            if (!groupedByDate[reportDate]) {
              groupedByDate[reportDate] = {
                date: reportDate,
                fresh: 0,
                untouched: 0,
                closed: 0,
                details: {},
              };
            }

            const record = groupedByDate[reportDate];
            record.fresh += 1;

            if (status === "Open" || status === "Assigned") {
              record.untouched += 1;
            } else if (status === "Completed") {
              record.closed += 1;
            }

            if (!record.details[director]) {
              record.details[director] = { fresh: 0, untouched: 0, closed: 0 };
            }
            record.details[director].fresh += 1;
            if (status === "Open" || status === "Assigned") {
              record.details[director].untouched += 1;
            } else if (status === "Completed") {
              record.details[director].closed += 1;
            }
          });

          const resultArray = Object.values(groupedByDate).sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          );

          setDirectorCounts(counts);
          setMultiLineData(resultArray);

          const barData = Object.keys(summary).map((key) => ({
            enterprise: key,
            fresh: summary[key].fresh,
            untouched: summary[key].untouched,
            closed: summary[key].closed,
          }));

          setEnterpriseSummary(barData);

          const latestDate = resultArray[resultArray.length - 1]?.date;
          setSelectedDate(latestDate);
          setSelectedCardDate(latestDate);
          if (!latestDate) {
              const fallback = resultArray[resultArray.length - 1]?.date;
              setSelectedCardDate(fallback);
            }
          calculateCardMetrics(latestDate, resultArray);
        };
        reader.readAsArrayBuffer(file);
      } 
    }, 300);
  };

  const displayedData = filteredDirector
    ? multiLineData.map((d) => ({
        date: d.date,
        ...d.details[filteredDirector],
      }))
    : multiLineData;

  const validDate = selectedCardDate || multiLineData[multiLineData.length - 1]?.date;
  const dateData = multiLineData.find(d => d.date === validDate);
  const fresh = dateData?.fresh || 0;
  const untouched = dateData?.untouched || 0;
  const closed = dateData?.closed || 0;
  const total = fresh;
  const closedPercent = total ? Math.round((closed / total) * 100) : 0;
  const openPercent = 100 - closedPercent;

  const summaryMetrics = [
    { label: "Total Appeals", value: total.toLocaleString(), bg: "#D9F1E5" },
    { label: "% Closed", value: `${closedPercent}%`, bg: "#D9F1E5" },
    { label: "% Still Open", value: `${openPercent}%`, bg: "#D9F1E5" },
    { label: "Report Date", value: validDate || "N/A", bg: "#D9F1E5" }
  ];

// const categoryColumn = pieColumn || "Appeal Category"; // dynamic binding
  const categoryColumn = "Appeal Category"; // 👈 Replace if needed

const filteredRows = excelRawData.filter((row) => {
  const reportDateRaw = row["ReportDate"];
  let parsedDate = typeof reportDateRaw === "number"
    ? new Date(XLSX.SSF.parse_date_code(reportDateRaw).y, XLSX.SSF.parse_date_code(reportDateRaw).m - 1, XLSX.SSF.parse_date_code(reportDateRaw).d)
    : new Date(reportDateRaw);
  const reportDate = !isNaN(parsedDate) ? parsedDate.toISOString().split("T")[0] : null;

  const matchesDate = !selectedDate || reportDate === selectedDate;

  let cellValue = row[filterColumn];
  if (typeof cellValue === "number" && filterColumn.toLowerCase().includes("date")) {
    const d = XLSX.SSF.parse_date_code(cellValue);
    cellValue = new Date(d.y, d.m - 1, d.d).toISOString().split("T")[0];
  } else {
    cellValue = cellValue?.toString().trim();
  }

  const matchesFilter = !filterColumn || !filterValue || (cellValue === filterValue);

  return matchesDate && matchesFilter;
});

// Count categories
const categoryCountMap = {};
filteredRows.forEach(row => {
  const category = row[categoryColumn]?.toString().trim() || "Unspecified";
  if (!categoryCountMap[category]) categoryCountMap[category] = 0;
  categoryCountMap[category]++;
});

// Format data for PieChart
const categoryData = Object.entries(categoryCountMap).map(([name, count]) => ({
  name,
  value: count
}));

const categoryColors = [
  "#0288d1", "#f9a825", "#2e7d32", "#ab47bc", "#ff7043", "#26a69a", "#8d6e63", "#5c6bc0"
];

  return (
    <HomePage active={"appealStatus"} setActive={() => {}}>
      <div style={{ padding: "20px", marginTop: "30px", marginLeft: "-280px" }}>
        <div className="uploader" style={{ paddingTop: "20px", paddingLeft: "20px", paddingBottom: '20px', marginTop: '0px' }}>
          {/* <Form.Select
            aria-label="Select Report Type"
            style={{ width: "300px", marginBottom: "10px", fontSize: "15px" }}
            value={active}
            onChange={(e) => setActive(e.target.value)}
          >
            <option value="">-- Select Report --</option>
            <option value="appeals">Appeals Open Inventory Report</option>
            <option value="impact">Impact</option>
          </Form.Select> */}

          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleFileSelect}
          />

          <Button variant="secondary" style={{ width: "200px" }} onClick={triggerFileInput} disabled={!active}>
            Select File
          </Button>

          {fileName && (
            <span style={{ marginLeft: "15px", fontWeight: "500", color: "#333" }}>{fileName}</span>
          )}

          <div style={{ marginTop: "7px" }}>
            {file && !isUploading && (
              <Button variant="primary" style={{ width: "200px" }} onClick={handleUpload}>
                Upload
              </Button>
            )}

            {isUploading && (
              <div style={{ marginTop: "20px" }}>
                <ProgressBar now={uploadProgress} label={``} />
              </div>
            )}
          </div>
        </div>

        <ToastContainer position="top-right" autoClose={3000} />


{/* Executive Summary Cards */}
{uploadProgress === 100 && summaryMetrics.length > 0 && (
  <div style={{ 
    display: 'flex', 
    gap: '20px', 
    marginBottom: '20px', 
    marginLeft: '20px',
    flexWrap: 'wrap', 
    justifyContent: 'flex-start'
  }}>
    {summaryMetrics.map((card, idx) => (
      <div key={idx} style={{
        width: "370px",
        backgroundColor: card.bg,
        padding: "16px",
        marginTop: '20px',
        borderRadius: "10px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <div style={{ fontSize: "14px", color: "#666", fontWeight: "bold", marginBottom: "6px" }}>{card.label}</div>
        <div style={{ fontSize: "22px", fontWeight: "600", color: "#333" }}>{card.value}</div>
      </div>
    ))}
  </div>
)}

          {uploadProgress === 100 && multiLineData.length > 0 && (
            
            
            <div style={{ marginTop: '20px', marginLeft: '0px', padding: '0 20px' }}>
              {/* Date Filter */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Filter Cards by Date:</label>
                <select
                    value={selectedCardDate || ''}
                        onChange={(e) => {
                          setSelectedCardDate(e.target.value);
                          setSelectedDate(e.target.value); // 👈 Sync both
                        }}
                  
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  {[...new Set(multiLineData.map((d) => d.date))].map((date, idx) => (
                    <option key={idx} value={date}>{date}</option>
                  ))}
                </select>
              </div>

              {/* Cards */}
              <div className="enterprise" style={{ display: 'flex', gap: '20px', backgroundColor: 'white' }}>
                {["Sagility", "Concentrix", "Wipro"].map((title, idx) => {
                  const validDate = selectedCardDate || (multiLineData.length > 0 ? multiLineData[multiLineData.length - 1].date : null);
                  const dateData = multiLineData.find((d) => d.date === validDate);
                  const data = dateData?.details?.[title] || { fresh: 0, untouched: 0, closed: 0 };

                  const chartData = [
                      { category: "Total", name: `Fresh (${data.fresh})`, value: data.fresh },
                      { category: "Open/Assigned", name: `Open/Assigned (${data.untouched})`, value: data.untouched },
                      { category: "Closed", name: `Closed (${data.closed})`, value: data.closed },
                    ];

                  const bgMap = {
                    Sagility: "#e8f5e9",
                    Concentrix: "#e3f2fd",
                    Wipro: "#f3e5f5",
                  };

                  const colorMap = {
                    Sagility: "#388e3c",
                    Concentrix: "#1976d2",
                    Wipro: "#9c27b0",
                  };

                  return (
                    <div
                      key={idx}
                      onClick={() => setFilteredDirector(title)}
                      style={{
                        background: bgMap[title],
                        borderRadius: "6px",
                        padding: "16px",
                        width: "500px",
                        height: '240px', // Increased from 220px
                        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                     <div style={{ fontSize: "16px", color: "#333", marginBottom: "0px" }}>{title}</div>
                        <ResponsiveContainer width="100%" height={100} style={{ marginTop: '10px' }}>
                          <BarChart data={chartData}>
                            <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: "bold" }} />
                            <Tooltip />
                            <Bar dataKey="value">
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={barCategoryColors[entry.category]} />
                                ))}
                              </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <div style={{ fontSize: "14px", color: "#555", textAlign: "right", fontWeight: "normal" }}>
                          Total: {data.fresh + data.untouched + data.closed}
                        </div>
                    </div>
                  );
                })}
              </div>



            </div>
          )}



      </div>

      {uploadProgress === 100 && multiLineData.length > 0 && (
        
  <div className="p-4" style={{ display: 'flex', gap: '32px', marginLeft: '-254px', marginBottom: '20px' }}>
    <div style={{ flexGrow: 1 }}>
      <h5 style={{ fontWeight: "600", color: "#333", marginBottom: "10px" }}>Trend Overview{filteredDirector ? ` – ${filteredDirector}` : ""}</h5>
      <ResponsiveContainer width="97%" height={200}>
        <LineChart data={displayedData} style={{ fontWeight: "600" }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fill: '#333', fontWeight: 'bold', fontSize: 12 }} />
          <YAxis tick={{ fill: "#333", fontWeight: "bold", fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip />
            <Line type="monotone" dataKey="fresh" stroke={trendColorMap.fresh} strokeWidth={2} name="Total" />
            <Line type="monotone" dataKey="untouched" stroke={trendColorMap.untouched} strokeWidth={2} name="Open/Assigned" />
            <Line type="monotone" dataKey="closed" stroke={trendColorMap.closed} strokeWidth={2} name="Completed" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
        
      )}
      
        {uploadProgress === 100 && enterpriseSummary.length > 0 && multiLineData.length > 0 && (
        <div className="px-4" style={{ marginLeft: '-245px', marginBottom: '40px' }}>
          <h5 style={{ fontWeight: "600", color: "#333", marginBottom: "15px" }}>Enterprise Table Summary</h5>

        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '16px 24px',
          marginBottom: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e0e0e0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'center'
        }}>
      <div>
        
              {/* Reset Filters Button */}
          <div style={{ marginBottom: "10px" }}>
            <Button variant="outline-secondary" size="sm" onClick={() => {
              setSelectedDate(null);
              setSelectedCardDate(null);
              setFilterColumn("");
              setFilterValue("");
              setFilteredDirector(null);
            }}>
              Reset All Filters
            </Button>
          </div>

        <label style={{ fontWeight: 'bold', marginRight: '8px', color: '#555' }}>Filter By Column:</label>
        <select
          className="form-select"
          style={{ minWidth: '200px' }}
          value={filterColumn}
          onChange={(e) => {
            setFilterColumn(e.target.value);
            setFilterValue("");
          }}
        >
          <option value="">-- Select Column --</option>
          {availableColumns.map((col, idx) => (
            <option key={idx} value={col}>{col}</option>
          ))}
        </select>
      </div>

  {filterColumn && (
    <div style={{marginTop: '43px'}}>
      <label style={{ fontWeight: 'bold', marginRight: '10px', color: '#555' }}>Where Value is:</label>
      <select
        className="form-select"
        style={{ minWidth: '200px' }}
        value={availableValues.includes(filterValue) ? filterValue : ""}
        onChange={(e) => setFilterValue(e.target.value)}
      >
        <option value="">-- Select Value --</option>
        {availableValues.map((val, idx) => (
          <option key={idx} value={val}>{val}</option>
        ))}
      </select>
    </div>
  )}
</div>


{/* ▼ NEW: Filtered Rows Using Fixed Columns */}
<div style={{
  marginTop: "20px",
  background: "#fff",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  border: "1px solid #e0e0e0"
}}>
<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "-60px", marginTop: "-10px" }}>
  <Button variant="success" size="sm" onClick={handleExportFilteredCSV}>
    Export Filtered Rows to CSV
  </Button>
</div >
  <h5 style={{ fontWeight: "600", color: "#333", marginBottom: "16px", marginTop:'33px'}}>Filtered Full Row Data</h5>
  <div style={{ overflowX: "auto", marginTop:'-15px' }}>
    <table className="table table-bordered table-hover align-middle" style={{ fontSize: "14px", marginBottom: 0 }}>
      <thead className="table-light sticky-top">
        <tr>
          {fixedHeaders.map((col, idx) => (
            <th key={idx} style={{ whiteSpace: 'nowrap' }}>{col.label}</th>
          ))}
        </tr>
      </thead>
    </table>

    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
      <table className="table table-bordered table-hover align-middle" style={{ fontSize: "14px" }}>
        <tbody>
          {excelRawData.filter((row) => {
            const reportDateRaw = row["ReportDate"];
            let parsedDate = typeof reportDateRaw === "number"
              ? new Date(XLSX.SSF.parse_date_code(reportDateRaw).y, XLSX.SSF.parse_date_code(reportDateRaw).m - 1, XLSX.SSF.parse_date_code(reportDateRaw).d)
              : new Date(reportDateRaw);
            const reportDate = !isNaN(parsedDate) ? parsedDate.toISOString().split("T")[0] : null;

            const matchesDate = !selectedDate || reportDate === selectedDate;

            let cellValue = row[filterColumn];
            if (typeof cellValue === "number" && filterColumn.toLowerCase().includes("date")) {
              const d = XLSX.SSF.parse_date_code(cellValue);
              cellValue = new Date(d.y, d.m - 1, d.d).toISOString().split("T")[0];
            } else {
              cellValue = cellValue?.toString().trim();
            }

            const matchesFilter = !filterColumn || !filterValue || (cellValue === filterValue);

            return matchesDate && matchesFilter;
          }).map((row, rowIdx) => (
            <tr key={rowIdx}>
              {fixedHeaders.map((col, colIdx) => (
                <td key={colIdx} style={{ whiteSpace: "nowrap" }}>
                  {col.label === "View" ? (
                    <button className="btn btn-sm btn-outline-primary">View</button>
                  ) : (
                    row[col.key] || row[col.fallback] || ""
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>


<div style={{
  marginTop: "20px",
  background: '#fff',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  border: '1px solid #e0e0e0'
}}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={["Sagility", "Concentrix", "Wipro"].map((enterprise) => {
            const filteredRows = excelRawData.filter((row) => {
              const director = row["Director"]?.toString().trim();
              const status = row["STATUS"]?.toString().trim();
              const reportDateRaw = row["ReportDate"];

              let parsedDate = null;
              if (typeof reportDateRaw === "number") {
                const d = XLSX.SSF.parse_date_code(reportDateRaw);
                parsedDate = new Date(d.y, d.m - 1, d.d);
              } else {
                parsedDate = new Date(reportDateRaw);
              }

              const reportDate = !isNaN(parsedDate) ? parsedDate.toISOString().split("T")[0] : null;

              const matchesEnterprise = director === enterprise;
              const matchesDate = !selectedDate || reportDate === selectedDate;

              let cellValue = row[filterColumn];
              if (typeof cellValue === "number" && filterColumn.toLowerCase().includes("date")) {
                const d = XLSX.SSF.parse_date_code(cellValue);
                cellValue = new Date(d.y, d.m - 1, d.d).toISOString().split("T")[0];
              } else {
                cellValue = cellValue?.toString().trim();
              }

              const matchesFilter = !filterColumn || !filterValue || (cellValue === filterValue);

              return matchesEnterprise && matchesDate && matchesFilter;
            });

            const fresh = filteredRows.length;
            const untouched = filteredRows.filter(r => ["Open", "Assigned"].includes(r["STATUS"])).length;
            const closed = filteredRows.filter(r => r["STATUS"] === "Completed").length;

            return {
              enterprise,
              "Fresh": fresh,
              "Open/Assigned": untouched,
              "Completed": closed
            };
          })}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="enterprise" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Fresh" stackId="a" fill="#0288d1" />
            <Bar dataKey="Open/Assigned" stackId="a" fill="#f9a825" />
            <Bar dataKey="Completed" stackId="a" fill="#2e7d32" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* {categoryData.length > 0 && (
        
         <div className="px-4" style={{ marginLeft: "-10px", marginBottom: "20px", marginTop: "20px" }}>
            
          <div style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            border: "1px solid #e0e0e0"
          }}>
            <h5 style={{ fontWeight: "600", color: "#333", marginBottom: "16px" }}>Appeal Category Breakdown</h5>
            <div style={{ marginBottom: "12px" }}>
            <label style={{ fontWeight: "bold", marginRight: "10px" }}>Group Pie Chart By:</label>
            <select
              className="form-select"
              style={{ width: "300px", display: "inline-block" }}
              value={pieColumn}
              onChange={(e) => setPieColumn(e.target.value)}
            >
              <option value="">-- Select Column --</option>
              {availableColumns.map((col, idx) => (
                <option key={idx} value={col}>{col}</option>
              ))}
            </select>
          </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )} */}


</div>

)}
    </HomePage>
  );
}

export default AppealStatusOverview;