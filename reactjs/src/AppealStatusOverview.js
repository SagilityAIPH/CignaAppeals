// AppealStatusOverview.js
import HomePage from "./HomePage";
import React, { useState, useRef, useEffect } from "react";
import { Form, Button, ProgressBar } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
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
  const [selectedDateData, setSelectedDateData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [cardMetrics, setCardMetrics] = useState(null);

  useEffect(() => {
  calculateCardMetrics(selectedDate);
}, [selectedDate]);
  
const triggerFileInput = () => {
  fileInputRef.current.click();
};

const multiLineData = [
  { date: "2025-04-29", fresh: 178, closed: 120, untouched: 65 },
  { date: "2025-04-30", fresh: 165, closed: 132, untouched: 49 },
  { date: "2025-05-01", fresh: 182, closed: 140, untouched: 44 },
  { date: "2025-05-02", fresh: 191, closed: 125, untouched: 58 },
  { date: "2025-05-05", fresh: 176, closed: 138, untouched: 36 },
  { date: "2025-05-06", fresh: 188, closed: 145, untouched: 41 },
  { date: "2025-05-07", fresh: 172, closed: 110, untouched: 53 },
  { date: "2025-05-08", fresh: 169, closed: 134, untouched: 47 },
  { date: "2025-05-09", fresh: 180, closed: 118, untouched: 55 },
  { date: "2025-05-12", fresh: 190, closed: 150, untouched: 39 },
];

const calculateCardMetrics = (selectedDate) => {
  const currentIndex = multiLineData.findIndex(d => d.date === selectedDate);
  if (currentIndex < 0) return;

  const current = multiLineData[currentIndex];
  const previous = multiLineData[currentIndex - 1];
  if (!previous) return;

  const freshRate = Math.round(((current.fresh - current.untouched) / current.fresh) * 100);
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

      // ✅ Set selectedDate and compute cardMetrics
      const latestDate = multiLineData[multiLineData.length - 1].date;
      setSelectedDate(latestDate);
      calculateCardMetrics(latestDate);
    }
  }, 300);
};

 return (
    <HomePage active={"appealStatus"} setActive={() => {}}>
      <div style={{ padding: "20px", marginTop: "65px" }}>
        
        {/* Uploader Component */}
        <div className="uploader" style={{ paddingTop: "20px", paddingLeft: "20px", paddingBottom:'20px', marginTop:'0px' }}>
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

          <Button
            variant="secondary"
            style={{ width: "200px" }}
            onClick={triggerFileInput}
            disabled={!active}
          >
            Select File
          </Button>

          {fileName && (
            <span style={{ marginLeft: "15px", fontWeight: "500", color: "#333" }}>
              {fileName}
            </span>
          )}

          <div style={{ marginTop: "7px" }}>
            {file && !isUploading && (
              <Button
                variant="primary"
                style={{ width: "200px" }}
                onClick={handleUpload}
              >
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

        {uploadProgress === 100 && (
        <>
          {/* Graph */}
          <div className="graph p-4 d-flex flex-wrap gap-4 justify-content-start" style={{ marginLeft: '35px', marginTop: '0px', marginBottom: '20px' }}>
            <h5 style={{ fontWeight: "600", color: "#333", marginBottom: "-10px" }}>Trend Overview</h5>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={multiLineData} style={{ fontWeight: "600" }}>
                <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={({ x, y, payload }) => (
                      <text
                        x={x}
                        y={y + 10}
                        textAnchor="middle"
                        fill="#333"
                        style={{ cursor: "pointer", fontWeight: "bold" }}
                        onClick={() => setSelectedDate(payload.value)}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                <Tooltip />
                <Line type="monotone" dataKey="fresh" stroke="#00bcd4" name="Fresh Claims" />               
                <Line type="monotone" dataKey="untouched" stroke="#fbc02d" name="Untouched" />
                <Line type="monotone" dataKey="closed" stroke="#4caf50" name="Closed" />
                {/* <Line type="monotone" dataKey="transferred" stroke="#ff5722" name="Transferred/Pended" />
                <Line type="monotone" dataKey="inProgress" stroke="#9c27b0" name="In Progress" /> */}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Mini Dashboard */}
            {cardMetrics && (
              <div className="dashboard p-4 d-flex flex-wrap gap-4 justify-content-center text-center" style={{ marginBottom: '20px' }}>
                <div style={{ width: "100%", marginBottom: "-15px", marginTop: "-10px" }}>
                  <h5 style={{ fontWeight: "600", color: "#333" }}>Overview for {selectedDate}</h5>
                </div>

                {[
                  {
                    title: "Fresh Claims",
                    value: cardMetrics.fresh,
                    count: multiLineData.find(d => d.date === selectedDate)?.fresh || 0,
                    change: "added today",
                    bg: "linear-gradient(135deg, #e3f2fd, #bbdefb)",
                    color: "#2196f3"
                  },
                  {
                    title: "Untouched",
                    value: cardMetrics.untouched,
                    count: multiLineData.find(d => d.date === selectedDate)?.untouched || 0,
                    change: "of yesterday’s claims",
                    bg: "linear-gradient(135deg, #fff8e1, #ffe082)",
                    color: "#ffb300"
                  },
                  {
                    title: "Closed",
                    value: cardMetrics.closed,
                    count: multiLineData.find(d => {
                      const index = multiLineData.findIndex(dd => dd.date === selectedDate);
                      return multiLineData[index - 1]?.date === d.date;
                    })?.closed || 0,
                    change: "yesterday’s closure rate",
                    bg: "linear-gradient(135deg, #e8f5e9, #a5d6a7)",
                    color: "#43a047"
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: item.bg,
                      borderRadius: "16px",
                      padding: "24px",
                      width: "260px",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ fontSize: "16px", color: "#555", display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "10px" , fontWeight: "600"}}>
                      <span style={{ fontSize: "24px", marginBottom: "5px" }}>{item.icon}</span>
                      <div style={{ fontWeight: "bold" , fontWeight: "600"}}>{item.title}</div>
                      <div style={{ fontSize: "13px", color: "#888" }}>({item.count} total)</div>
                    </div>
                    <div style={{ fontSize: "36px", fontWeight: "bold", color: item.color , }}>
                      {item.value}%
                    </div>
                    <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" , fontWeight: "600"}}>{item.change}</div>
                  </div>
                ))}
              </div>
            )}
  


          {/* Tables/Numbers */}
          <div className="graph p-4 d-flex flex-wrap gap-4 justify-content-start" style={{ marginLeft: '35px', marginTop: '0px', marginBottom: '20px' }}>
            <div style={{ width: "100%", marginBottom: "-10px" }}>
              <h5 style={{ fontWeight: "600", color: "#333", marginBottom: "-10px" }}>Data Table</h5>
            </div>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#fdecea', color: '#333', textAlign: 'left' }}>
                <tr>
                  <th style={{ padding: '12px' }}>Team Lead</th>
                  <th>Fresh Claims</th>                 
                  <th>Untouched</th>
                  <th>Closed</th>
                  {/* <th>Transferred</th>
                  <th>In Progress</th> */}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: "Robert Fox",
                    fresh: 72,
                    untouched: 56,
                    closed: 63,
                    // transferred: 89,
                    // inProgress: 45
                  },
                  {
                    name: "Floyd Miles",
                    fresh: 58,
                    untouched: 40,
                    closed: 70,                 
                    // transferred: 80,
                    // inProgress: 48
                  },
                  {
                    name: "Jacob Jones",
                    fresh: 61,
                    untouched: 50,
                    closed: 55,                   
                    // transferred: 77,
                    // inProgress: 52
                  },
                  {
                    name: "Jenny Wilson",
                    fresh: 64,
                    untouched: 42,
                    closed: 59,                   
                    // transferred: 81,
                    // inProgress: 46
                  }
                ].map((lead, index) => (
                  <tr key={index} style={{ background: index % 2 === 0 ? '#fff7f5' : '#ffffff' }}>
                    <td style={{ padding: '12px', fontWeight: '500', color: '#333' }}>{lead.name}</td>
                    <td>{lead.fresh}</td>
                    <td>{lead.untouched}</td>
                    <td>{lead.closed}</td>
                    {/* <td>{lead.transferred}</td>
                    <td>{lead.inProgress}</td> */}
                    <td style={{ fontWeight: 'bold' }}>
                      {lead.fresh + lead.closed + lead.untouched}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        </>
      )}

    </HomePage>
  );
}

export default AppealStatusOverview;