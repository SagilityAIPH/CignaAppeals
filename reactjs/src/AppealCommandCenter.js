import React from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList,
} from "recharts";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import HomePage from "./HomePage";
import { Form, Button, ProgressBar, Table, Modal } from "react-bootstrap";

const AGE_BUCKETS = [
  "0-14", "15-29", "30-44", "45-59", "60-89", "90-179", "180-364", "365+"
];

const getAgeBucket = (val) => {
  const age = parseInt(val, 10);
  if (isNaN(age)) return "Unknown";
  if (age <= 14) return "0-14";
  if (age <= 29) return "15-29";
  if (age <= 44) return "30-44";
  if (age <= 59) return "45-59";
  if (age <= 89) return "60-89";
  if (age <= 179) return "90-179";
  if (age <= 364) return "180-364";
  return "365+";
};

function AppealCommandCenter() {
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [fileName, setFileName] = React.useState("");
  const [file, setFile] = React.useState(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [fullData, setFullData] = React.useState([]);
  const [filteredData, setFilteredData] = React.useState([]);
  const [ageFilter, setAgeFilter] = React.useState([]);
  const [rowsToShow, setRowsToShow] = React.useState(20);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [modalData, setModalData] = React.useState(null);
  const [showModal, setShowModal] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState("All");
  const fileInputRef = React.useRef(null);
  const navigate = useNavigate();

  const headers = [
    "AGE", "SR.", "Manager", "PROMISE", "Task Promise Date", "Rec'd",
    "System", "LPI?", "PG?", "PG Name", "OwnerID", "Owner", "Status", "View"
  ];

  const ageDistribution = AGE_BUCKETS.map((bucket) => ({
    age: bucket,
    count: filteredData.filter(
      (row) => getAgeBucket(row["AGE_HELPER"] || row["AY"]) === bucket
    ).length,
  }));

  const indexOfLastRow = currentPage * rowsToShow;
  const indexOfFirstRow = indexOfLastRow - rowsToShow;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredData.length / rowsToShow);

  const handleAgeToggle = (bucket) => {
    const updated = ageFilter.includes(bucket)
      ? ageFilter.filter((b) => b !== bucket)
      : [...ageFilter, bucket];

    setAgeFilter(updated);

    const newFiltered = updated.length
      ? fullData.filter((row) =>
          updated.includes(getAgeBucket(row["AGE_HELPER"] || row["AY"]))
        )
      : fullData;

    setFilteredData(newFiltered);
    setCurrentPage(1);
  };

  const openModal = (row) => {
    setModalData(row);
    setShowModal(true);
  };

  const closeModal = () => {
    setModalData(null);
    setShowModal(false);
  };

  return (
    <HomePage active={"appealStatus"} setActive={() => {}}>
      <div style={{ padding: "20px", marginTop: "30px", marginLeft: "-280px" }}>
        {/* Upload */}
        <div className="uploader p-4 rounded shadow-sm bg-white border mb-4 text-center">
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={(event) => {
              const selectedFile = event.target.files[0];
              if (!selectedFile) return;
              setFile(selectedFile);
              setFileName(selectedFile.name);
              setIsUploading(true);
              setUploadProgress(0);

              const reader = new FileReader();
              reader.onload = (e) => {
                const workbook = XLSX.read(e.target.result, { type: "binary" });
                const worksheet = workbook.Sheets["DATA"];
                if (!worksheet) {
                  toast.error("No 'DATA' sheet found!");
                  setIsUploading(false);
                  return;
                }
                const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                const filtered = rawData.filter(
                  (row) => ["Concentrix", "Sagility", "Wipro"].includes(row["Director"])
                );
                setFullData(filtered);
                setFilteredData(filtered);
                setUploadProgress(100);
                setIsUploading(false);
                setCurrentPage(1);
                toast.success("Upload complete and data loaded!");
              };
              reader.readAsBinaryString(selectedFile);
            }}
          />

          <Button
            variant="primary"
            style={{ width: "200px" }}
            onClick={() => fileInputRef.current.click()}
          >
            Upload Report
          </Button>

          {fileName && (
            <div className="mt-2 text-muted" style={{ fontSize: "14px" }}>
              Selected File: <strong>{fileName}</strong>
            </div>
          )}

          {isUploading && (
            <div style={{ marginTop: "15px" }}>
              <ProgressBar now={uploadProgress} />
            </div>
          )}
        </div>

        {uploadProgress === 100 && (
          <>
           <div className="p-4 rounded shadow-sm bg-white border mb-4">
              <div className="row">
                <div className="col-md-3">
                  <div className="p-3 border rounded bg-light h-100">
                    <h6 className="mb-3 text-primary text-center">Case Summary</h6>
                    <div className="mb-2 d-flex justify-content-between" style={{ fontWeight: "500", marginTop:'20px' }}>
                      <span>Total Cases:</span>
                      <strong>{fullData.length}</strong>
                    </div>
                    <div className="mb-2 d-flex justify-content-between text-primary" style={{ fontWeight: "500" }}>
                      <span>Open / Untouched:</span>
                      <strong>
                        {fullData.filter(row => row.Status?.toString().trim().toLowerCase() !== "completed").length}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between text-success" style={{ fontWeight: "500" }}>
                      <span>Completed:</span>
                      <strong>
                        {fullData.filter(row => row.Status?.toString().trim().toLowerCase() === "completed").length}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="col-md-9 mt-3 mt-md-0">
                  <div className="p-3 border rounded bg-light">
                    <h6 className="text-center text-primary mb-3">Age Inventory Summary</h6>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={ageDistribution} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="age" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0d6efd" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="count" position="top" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 d-flex flex-wrap gap-2 justify-content-center">
                      {AGE_BUCKETS.map((bucket) => {
                        const isActive = ageFilter.includes(bucket);
                        return (
                          <Button
                            key={bucket}
                            variant={isActive ? "info" : "outline-secondary"}
                            size="sm"
                            onClick={() => handleAgeToggle(bucket)}
                          >
                            {bucket}
                          </Button>
                        );
                      })}
                      {ageFilter.length > 0 && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            setAgeFilter([]);
                            setFilteredData(fullData);
                            setCurrentPage(1);
                          }}
                        >
                          Clear Filter
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>


            <div className="p-4 rounded shadow-sm bg-white border">
              <div className="mb-2">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Appeals Report</h5>
                  <div className="apply-button-wrapper">
                    <Button
                      variant="success"
                      size="sm"
                      disabled={selectedRows.length === 0}
                      onClick={() => setShowConfirmModal(true)}
                    >
                      Mark as Completed
                    </Button>
                  </div>
                </div>
                <Form.Select
                  style={{ width: "120px", fontSize: "14px", marginTop: "10px" }}
                  value={rowsToShow}
                  onChange={(e) => {
                    setRowsToShow(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={20}>20 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                </Form.Select>
              </div>

              <div className="p-2 rounded border mb-3 bg-light">
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <span className="fw-semibold text-dark" style={{ fontSize: "14px" }}>
                    Filter by Status:
                  </span>
                  <div className="btn-group" role="group" aria-label="Status filter">
                    {["All", "Open", "Completed"].map((status) => (
                      <Button
                        key={status}
                        variant={statusFilter === status ? "primary" : "outline-primary"}
                        size="sm"
                        onClick={() => {
                          setStatusFilter(status);
                          if (status === "All") {
                            setFilteredData(fullData);
                          } else {
                            setFilteredData(
                              fullData.filter((row) =>
                                status === "Completed"
                                  ? row.Status?.toString().trim().toLowerCase() === "completed"
                                  : row.Status?.toString().trim().toLowerCase() !== "completed"
                              )
                            );
                          }
                        }}
                      >
                        {status === "Open" && " "}
                        {status === "Completed" && " "}
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>


              <div style={{ maxHeight: "640px", overflowY: "auto", border: "1px solid #dee2e6", borderRadius: "6px" }}>
                <Table striped hover size="sm" className="sticky-header-table mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>
                        <Form.Check
                          type="checkbox"
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const updatedSelection = isChecked ? currentRows : [];
                            setSelectedRows(updatedSelection);
                          }}
                          checked={
                            currentRows.length > 0 && selectedRows.length === currentRows.length
                          }
                        />
                      </th>
                      {headers.map((col) => (
                        <th key={col} style={{ fontSize: "13px", whiteSpace: "nowrap" }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((row, index) => (
                      <tr
                        key={index}
                        className={
                            row.Status?.toString().trim().toLowerCase() === "completed"
                              ? "table-success"
                              : ""
                          }
                      >
                        <td>
                          <Form.Check
                            type="checkbox"
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setSelectedRows((prev) =>
                                isChecked ? [...prev, row] : prev.filter((r) => r !== row)
                              );
                            }}
                            checked={selectedRows.includes(row)}
                          />
                        </td>
                        <td>{row["AGE_HELPER"] || row["AY"]}</td>
                        <td>{row["SR ."] || row["A"]}</td>
                        <td>{row["Manager"] || row["D"]}</td>
                        <td>{row["AGE_PROMISE_BUCKET"] || row["BP"]}</td>
                        <td>{row["Promise Date"] || row["C"]}</td>
                        <td>{row["Recd By Cigna"] || row["L"]}</td>
                        <td>{row["System"] || row["Q"]}</td>
                        <td>{row["LPI?"] || row["BC"]}</td>
                        <td>{row["PG?"] || row["BD"]}</td>
                        <td>{row["PG NAME"] || row["BE"]}</td>
                        <td>{row["OwnerID"] || row["T"]}</td>
                        <td>{row["OwnerName"] || row["E"]}</td>
                        <td>{row.Status === "Completed" ? "Completed" : "Open"}</td>
                        <td>
                          <Button size="sm" variant="outline-primary" onClick={() => openModal(row)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-3">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  ◀ Previous
                </Button>
                <span style={{ fontSize: "14px" }}>
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next ▶
                </Button>
              </div>
              <div className="mt-2 text-muted">
                Selected rows: {selectedRows.length}
              </div>
            </div>
          </>
        )}

        <ToastContainer position="top-right" autoClose={3000} />

        <Modal show={showModal} onHide={closeModal} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>Full Row Details</Modal.Title>
          </Modal.Header>
          <Modal.Body className="custom-modal-body">
            {modalData && (
              <Table striped bordered hover size="sm">
                <tbody>
                  {Object.entries(modalData)
                    .filter(
                      ([key, value]) =>
                        key &&
                        key.trim() !== "" &&
                        !key.startsWith("__EMPTY") &&
                        value !== "" &&
                        value !== null &&
                        value !== undefined
                    )
                    .map(([key, value]) => (
                      <tr key={key}>
                        <td style={{ fontWeight: "bold", width: "30%" }}>{key}</td>
                        <td>{typeof value === "object" ? JSON.stringify(value) : String(value)}</td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            )}
          </Modal.Body>
        </Modal>

        <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Complete Case</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to complete {selectedRows.length} selected case{selectedRows.length > 1 ? "s" : ""}?
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" style={{ fontWeight: "bold" }} onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button
            style={{ fontWeight: "bold", width: "20%" }}
              variant="danger"
              onClick={() => {
                const updated = fullData.map((row) =>
                  selectedRows.includes(row)
                    ? { ...row, Status: "Completed" }
                    : row
                );
                setFullData(updated);
                setFilteredData(updated);
                setSelectedRows([]);
                setShowConfirmModal(false);
                toast.success("Selected cases completed successfully.");
              }}
            >
              Yes
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </HomePage>
  );
}

export default AppealCommandCenter;
