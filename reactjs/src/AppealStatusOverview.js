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

          const counts = {
            Sagility: 0,
            Concentrix: 0,
            Wipro: 0,
          };

          const groupedByDate = {};

          json.forEach((row) => {
            const director = row["Director"]?.toString().trim();
            const status = row["STATUS"]?.toString().trim();
            const reportDateRaw = row["ReportDate"];

            if (director === "Sagility") counts.Sagility++;
            else if (director === "Concentrix") counts.Concentrix++;
            else if (director === "Wipro") counts.Wipro++;

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

            // Track by director
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

          const latestDate = resultArray[resultArray.length - 1]?.date;
          setSelectedDate(latestDate);
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

  return (
    <HomePage active={"appealStatus"} setActive={() => {}}>
      <div style={{ padding: "20px", marginTop: "30px", marginLeft: "-280px" }}>
        <div className="uploader" style={{ paddingTop: "20px", paddingLeft: "20px", paddingBottom: '20px', marginTop: '0px' }}>
          <Form.Select
            aria-label="Select Report Type"
            style={{ width: "300px", marginBottom: "10px", fontSize: "15px" }}
            value={active}
            onChange={(e) => setActive(e.target.value)}
          >
            <option value="">-- Select Report --</option>
            <option value="appeals">Appeals Open Inventory Report</option>
            <option value="impact">Impact</option>
          </Form.Select>

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
      </div>

      {uploadProgress === 100 && multiLineData.length > 0 && (
        <div className="p-4" style={{ display: 'flex', gap: '32px', marginLeft: '-245px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { title: "Sagility", count: directorCounts?.Sagility || 0, bg: "#e3f2fd", color: "#1976d2" },
              { title: "Concentrix", count: directorCounts?.Concentrix || 0, bg: "#e8f5e9", color: "#388e3c" },
              { title: "Wipro", count: directorCounts?.Wipro || 0, bg: "#fff3e0", color: "#f57c00" },
            ].map((item, idx) => (
              <div
                key={idx}
                onClick={() => setFilteredDirector(item.title)}
                style={{
                  background: item.bg,
                  borderRadius: "12px",
                  padding: "16px",
                  width: "200px",
                  height:'80px',
                  marginBottom: '20px',
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                <div style={{ fontSize: "16px", color: "#333" }}>{item.title}</div>
                <div style={{ fontSize: "24px", color: item.color }}>{item.count}</div>
              </div>
            ))}
          </div>
          <div style={{ flexGrow: 1 }}>
            <h5 style={{ fontWeight: "600", color: "#333", marginBottom: "10px" }}>Trend Overview{filteredDirector ? ` – ${filteredDirector}` : ""}</h5>
            <ResponsiveContainer width="80%" height={300}>
              <LineChart data={displayedData} style={{ fontWeight: "600" }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#333', fontWeight: 'bold', fontSize: 12 }}
                />
                <YAxis tick={{ fill: "#333", fontWeight: "bold", fontSize: 12 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="fresh" stroke="#00bcd4" strokeWidth={2} name="Fresh Claims" />
                <Line type="monotone" dataKey="untouched" stroke="#fbc02d" strokeWidth={2} name="Untouched" />
                <Line type="monotone" dataKey="closed" stroke="#4caf50" strokeWidth={2} name="Closed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
        </div>
      )}
    </HomePage>
  );
}

export default AppealStatusOverview;