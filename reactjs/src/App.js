import React, { useState, useRef, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { MdDashboard } from "react-icons/md";
import { ProgressBar, Button, Form } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import axios from "axios";
import { Helmet } from "react-helmet";

function App() {
  const [rowCount, setRowCount] = useState(null);
  const [active, setActive] = React.useState(""); // No button is active on load
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const uploadIntervalRef = useRef(null);
  const toastShownRef = useRef(false);
  const [parsedRowCount, setParsedRowCount] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [nonCompliantCounts, setNonCompliantCounts] = useState({
    Y: 0,
    Blank: 0,
  });
  const [appealServiceCounts, setAppealServiceCounts] = useState({
    Customer: 0,
    HCP: 0,
    Undetermined: 0,
  });
  const [tableData, setTableData] = useState([]);
  const [fetchedData, setFetchedData] = useState([]);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setUploadProgress(0);
    toastShownRef.current = false;
    setShowDashboard(false); // Hide dashboard during new upload

    // const reader = new FileReader();
    // reader.onload = (e) => {
    //   const data = new Uint8Array(e.target.result);
    //   const workbook = XLSX.read(data, { type: "array" });

    //   const sheetName = "APP_Open_OneView_iTrack_Rpt";
    //   const worksheet = workbook.Sheets[sheetName];

    //   if (!worksheet) {
    //     toast.error(`Sheet "${sheetName}" not found in file.`);
    //     setParsedRowCount(null);
    //     setNonCompliantCounts({ Y: 0, Blank: 0 });
    //     return;
    //   }

    //   const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    //   //setParsedRowCount(jsonData.length);

    //   // capture only columns A–H
    //   const trimmedData = jsonData.map((row) => {
    //     const entries = Object.entries(row).slice(0, 8); // A–H = 8 columns
    //     return Object.fromEntries(entries);
    //   });
    //   setTableData(trimmedData);
    //   // ✅ Count values in NonCompliant2
    //   let yCount = 0;
    //   let blankCount = 0;

    //   // Appeal Service counts
    //   let customer = 0;
    //   let hcp = 0;
    //   let undetermined = 0;

    //   jsonData.forEach((row) => {
    //     const nonCompliant = row["NonCompliant2"];
    //     const appealService = row["Appeal Service"];

    //     // Count NonCompliant2
    //     if (nonCompliant === "Y") yCount++;
    //     else if (nonCompliant === "") blankCount++;

    //     // Count Appeal Service
    //     if (appealService === "Customer") customer++;
    //     else if (appealService === "HCP") hcp++;
    //     else if (appealService === "Undetermined") undetermined++;
    //   });

    //   // setNonCompliantCounts({ Y: yCount, Blank: blankCount });
    //   // setAppealServiceCounts({
    //   //   Customer: customer,
    //   //   HCP: hcp,
    //   //   Undetermined: undetermined,
    //   // });
    // };

    // reader.readAsArrayBuffer(selectedFile);
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // const handleUpload = () => {
  //   if (!file) {
  //     toast.error("Please select a file first!");
  //     return;
  //   }

  //   setIsUploading(true);
  //   clearInterval(uploadIntervalRef.current);

  //   uploadIntervalRef.current = setInterval(() => {
  //     setUploadProgress((prevProgress) => {
  //       const newProgress = prevProgress + 10;
  //       if (newProgress >= 100) {
  //         clearInterval(uploadIntervalRef.current);
  //         if (!toastShownRef.current) {
  //           toast.success("File upload complete!");
  //           toastShownRef.current = true;
  //         }

  //         // Read Excel and update row count after upload completes
  //         const reader = new FileReader();
  //         reader.onload = (e) => {
  //           const data = new Uint8Array(e.target.result);
  //           const workbook = XLSX.read(data, { type: "array" });

  //           const sheetName = "APP_Open_OneView_iTrack_Rpt";
  //           const worksheet = workbook.Sheets[sheetName];

  //           if (!worksheet) {
  //             toast.error(`Sheet "${sheetName}" not found in file.`);
  //             setRowCount(null);
  //             setShowDashboard(false);
  //             return;
  //           }

  //           const jsonData = XLSX.utils.sheet_to_json(worksheet, {
  //             defval: "",
  //           });
  //           setRowCount(jsonData.length);
  //           setShowDashboard(true); // Show dashboard only after Excel is parsed
  //         };

  //         reader.readAsArrayBuffer(file);

  //         setIsUploading(false);
  //         setShowDashboard(true); // Now show dashboard instantly
  //         setFile(null);
  //         return 100;
  //       }
  //       return newProgress;
  //     });
  //   }, 350);
  // };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first!");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    toastShownRef.current = false;

    try {
      // Step 1: Upload file to API
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await axios.post(
        "https://cg-lpi-portal.sagilityhealth.com:8081/api/Uploader/UploadAppeals",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percent);
          },
        }
      );

      if (uploadResponse.status === 200) {
        // Step 2: Call stored procedure
        const procResponse = await axios.get(
          "https://cg-lpi-portal.sagilityhealth.com:8081/api/Issue/sp_appeals"
        );

        // Step 3: Fetch data from get_appeals_main
        const dataResponse = await axios.get(
          "https://cg-lpi-portal.sagilityhealth.com:8081/api/Issue/get_appeals_main"
        );

        const dataResponseSummary = await axios.get(
          "https://cg-lpi-portal.sagilityhealth.com:8081/api/Issue/get_appeals_summary_ct"
        );

        if (dataResponse.status === 200) {
          const summary = dataResponseSummary.data[0];
          setTableData(dataResponse.data.records);
          setParsedRowCount(summary.total_Count);
          console.log(dataResponse.length);

          setNonCompliantCounts({
            Y: summary.nonCompliant2_Y_Count || 0,
            Blank: summary.nonCompliant2_Null_Count || 0,
          });

          setAppealServiceCounts({
            Customer: summary.customer_Count || 0,
            HCP: summary.hcP_Count || 0,
            Undetermined: summary.undetermined_Count || 0,
          });

          setShowDashboard(true);
          toast.success("File uploaded successfully");
        } else {
          toast.error("Failed to fetch appeal data.");
        }
      } else {
        setShowDashboard(false);
        toast.error("File upload failed.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("An error occurred during upload.");
    } finally {
      setIsUploading(false);
      setFile(null);
    }
  };

  useEffect(() => {
    return () => clearInterval(uploadIntervalRef.current);
  }, []);

  return (
    <>
      {/* Header */}
      <header
        className="navbar navbar-expand-lg"
        style={{
          height: "60px",
          background: "linear-gradient(to right, #003b70, #0071ce)",
          color: "white",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 1100,
        }}
      >
        <div class="header" className="container-fluid">
          {/* Logo */}
          <img
            src={`${process.env.PUBLIC_URL}/Cigna logo.png`}
            alt="Cigna Logo"
            style={{ height: "50px", marginLeft: "-10px" }}
          />

          {/* Right nav */}
          <div className="d-flex ms-auto align-items-center gap-3">
            {/* <span
              className="nav-link text-white"
              style={{ cursor: "pointer", fontWeight: 500 }}
            >
              Home

            </span> */}

            <span
              className="nav-link text-white"
              style={{ cursor: "pointer", fontWeight: 500 }}
            >
              Logout
            </span>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className="sidebar">
        <ul className="nav flex-column mt-4">
          <li className="nav-item mb-3 px-2">
            <button
              className={`btn w-100 d-flex align-items-center sidebar-btn ${
                active === "appeal" ? "active" : ""
              }`}
              onClick={() => setActive("appeal")}
              style={{
                padding: "10px 15px",
                fontWeight: 500,
                border: "none",
                backgroundColor: "transparent",
                color: "white",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <MdDashboard
                style={{ marginRight: "10px", fontSize: "20px", flexShrink: 0 }}
              />
              <span style={{ flexGrow: 1 }}>Appeal Command Center</span>
            </button>
          </li>
          {/* You can add more nav items here */}
        </ul>
      </div>

      {/* Main Content */}
      <main className="main-content">
        {/* Uploader */}
        <div
          className="uploader"
          style={{ marginTop: "65px", padding: "20px" }}
        >
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
            disabled={!active} // Disable if dropdown is not selected
          >
            Select File
          </Button>

          {fileName && (
            <span
              style={{ marginLeft: "15px", fontWeight: "500", color: "#333" }}
            >
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

        {/* Dashboard */}
        <div className="dashboard p-4 d-flex flex-wrap gap-4 justify-content-start">
          {/* Total Rows Card */}
          {showDashboard && parsedRowCount !== null && (
            <div
              className="card shadow-sm p-4"
              style={{
                width: "250px",
                borderRadius: "16px",
                background: "#ffffff",
                color: "#333",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <h6 style={{ fontWeight: 600, marginBottom: "10px" }}>
                Total Number of Appeals
              </h6>
              <p style={{ fontSize: "2.5rem", fontWeight: 700 }}>
                {parsedRowCount}
              </p>
            </div>
          )}

          {/* NonCompliant2 Breakdown */}
          {showDashboard &&
            (nonCompliantCounts.Y > 0 || nonCompliantCounts.Blank > 0) && (
              <div
                className="card shadow-sm p-4"
                style={{
                  width: "400px",
                  borderRadius: "16px",
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                }}
              >
                <h6
                  style={{
                    fontWeight: 600,
                    marginBottom: "15px",
                    textAlign: "left",
                  }}
                >
                  NonCompliant2 Breakdown
                </h6>
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ width: "60%", height: "200px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Y", value: nonCompliantCounts.Y },
                            { name: "Blank", value: nonCompliantCounts.Blank },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={70}
                          label={false}
                          isAnimationActive={true}
                        >
                          <Cell fill="#0071ce" />
                          <Cell fill="#e0e0e0" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      paddingLeft: "10px",
                      fontWeight: 700,
                    }}
                  >
                    <div>
                      <span style={{ color: "#0071ce", fontWeight: "bold" }}>
                        ●
                      </span>{" "}
                      Y - {nonCompliantCounts.Y}
                    </div>
                    <div>
                      <span style={{ color: "#999", fontWeight: "bold" }}>
                        ●
                      </span>{" "}
                      Blank - {nonCompliantCounts.Blank}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Appeal Service Breakdown */}
          {showDashboard && (
            <div
              className="card shadow-sm p-4"
              style={{
                width: "450px",
                borderRadius: "16px",
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
              }}
            >
              <h6
                style={{
                  fontWeight: 600,
                  marginBottom: "15px",
                  textAlign: "left",
                }}
              >
                Appeal Service Breakdown
              </h6>
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ width: "60%", height: "200px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Customer",
                            value: appealServiceCounts.Customer,
                          },
                          { name: "HCP", value: appealServiceCounts.HCP },
                          {
                            name: "Undetermined",
                            value: appealServiceCounts.Undetermined,
                          },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={70}
                        label={false}
                        isAnimationActive={true}
                      >
                        <Cell fill="#28a745" />
                        <Cell fill="#ffc107" />
                        <Cell fill="#dc3545" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    paddingLeft: "10px",
                    fontWeight: 700,
                  }}
                >
                  <div>
                    <span style={{ color: "#28a745", fontWeight: "bold" }}>
                      ●
                    </span>{" "}
                    Customer - {appealServiceCounts.Customer}
                  </div>
                  <div>
                    <span style={{ color: "#ffc107", fontWeight: "bold" }}>
                      ●
                    </span>{" "}
                    HCP - {appealServiceCounts.HCP}
                  </div>
                  <div>
                    <span style={{ color: "#dc3545", fontWeight: "bold" }}>
                      ●
                    </span>{" "}
                    Undetermined - {appealServiceCounts.Undetermined}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="table" style={{ marginTop: "30px", padding: "20px" }}>
          {showDashboard && tableData.length > 0 && (
            <div
              className="table-responsive"
              style={{
                maxHeight: "600px", // ⬅ sets the vertical size limit
                overflowY: "auto", // ⬅ enables vertical scroll
                border: "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              <table className="table table-bordered table-striped table-hover mb-0">
                <thead className="table-primary sticky-top">
                  <tr>
                    {Object.keys(tableData[0]).map((header, idx) => (
                      <th key={idx}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {Object.values(row).map((value, colIndex) => (
                        <td key={colIndex}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default App;
