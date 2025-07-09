// ClientImpactPage.js
import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList
} from "recharts";

function ClientImpactPage() {
  /* ─── state ─── */
  const [impactSummary,     setImpactSummary]     = useState([]);
  const [rawImpactData,     setRawImpactData]     = useState([]);
  const [impactStatusFilter,setImpactStatusFilter]= useState("All");
  const [isLoading,         setIsLoading]         = useState(false);

  /* ─── helper to build summary ─── */
  const generateImpactSummary = (data, statusFilter) => {
    const departments = ["Concentrix", "Sagility", "Stateside", "Wipro"];
    const ageBuckets  = ["0-15 days","16-30 days","31-60 days","61+ days"];

    /* init 0 counts */
    const grouped = {};
    departments.forEach(dept=>{
      grouped[dept] = Object.fromEntries(ageBuckets.map(b=>[b,0]));
    });

    data.forEach(row=>{
      const status = (row["Case status"]||"").trim().toLowerCase();
      if (statusFilter!=="All" && status!==statusFilter.toLowerCase()) return;

      const dept   = row["helper_location2"];
      const bucket = row["helper_AGE_bucket2"];
      if (departments.includes(dept) && ageBuckets.includes(bucket))
        grouped[dept][bucket] += 1;
    });

    const summary = departments.map(dept=>{
      const counts = grouped[dept];
      const total  = Object.values(counts).reduce((a,b)=>a+b,0);
      return { Department:dept, ...counts, Total:total };
    });

    /* grand-total row */
    const grand = { Department:"Total" };
    ageBuckets.forEach(b=>{
      grand[b] = summary.reduce((s,r)=>s + r[b],0);
    });
    grand.Total = summary.reduce((s,r)=>s + r.Total,0);
    summary.push(grand);

    return summary;
  };

  /* ─── read workbook ─── */
  const processWorkbook = (wb) => {
    const impSheet = wb.Sheets["IMPACT"];
    if (!impSheet) { alert('Sheet "IMPACT" not found'); setIsLoading(false); return; }

    const impData = XLSX.utils.sheet_to_json(impSheet, { defval:"" });
    setRawImpactData(impData);
    setImpactSummary(generateImpactSummary(impData, impactStatusFilter));
    setIsLoading(false);
  };

  const handleAutoUpload = () => {
    setIsLoading(true);
    fetch(process.env.PUBLIC_URL + "/Appeals_Sample.xlsx")
      .then(r=>{ if(!r.ok) throw new Error("file"); return r.arrayBuffer(); })
      .then(buf=>{
        const wb = XLSX.read(new Uint8Array(buf), { type:"array" });
        processWorkbook(wb);
      })
      .catch(e=>{ console.error(e); alert("Cannot load sample file."); setIsLoading(false); });
  };

  /* auto-load once */
  useEffect(() => { handleAutoUpload(); }, []);

  /* re-compute summary when filter changes */
  useEffect(() => {
    if (rawImpactData.length)
      setImpactSummary(generateImpactSummary(rawImpactData, impactStatusFilter));
  }, [impactStatusFilter, rawImpactData]);

  /* ─── render ─── */
  return (
    <div style={{ padding:"20px 0 0 0", fontFamily:"Lexend, sans-serif" }}>
      {impactSummary.length > 0 && (
        <div style={{
          marginLeft:"-30px", backgroundColor:"#F5F6FA",
          borderRadius:"10px", padding:"20px"
        }}>
          <h3 style={{
            fontSize:"19px", fontWeight:"500", color:"#003b70",
            marginBottom:"16px", marginTop:"0"
          }}>
            Impact Summary
          </h3>

          {/* case-status filter */}
          <div style={{ marginBottom:"12px" }}>
            <label style={{
              fontWeight:"500", color:"#003b70", marginRight:"8px"
            }}>
              Filter by Case Status:
            </label>
            <select
              value={impactStatusFilter}
              onChange={e=>setImpactStatusFilter(e.target.value)}
              style={{
                padding:"8px 12px", borderRadius:"6px",
                border:"1px solid #ccc", fontSize:"14px",
                width:"150px", fontFamily:"inherit",
                color:"#003b70", backgroundColor:"#fff"
              }}
            >
              {["All","Open","Failed"].map(opt=><option key={opt}>{opt}</option>)}
            </select>
          </div>

          {/* summary table */}
          <div style={{ overflowX:"auto", border:"1px solid #ddd" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
              <thead style={{ backgroundColor:"#009fe3", color:"white" }}>
                <tr>
                  {["Department","0-15 days","16-30 days","31-60 days","61+ days","Total"]
                    .map(h=>(
                      <th key={h} style={{
                        padding:"10px", border:"1px solid #ccc", textAlign:"left"
                      }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {impactSummary.map((row,i)=>(
                  <tr key={i} style={{
                    backgroundColor: i%2?"#f3f6fb":"#fff"
                  }}>
                    <td style={{
                      padding:"8px", border:"1px solid #eee",
                      fontWeight: row.Department==="Total"?"600":"400"
                    }}>{row.Department}</td>
                    {["0-15 days","16-30 days","31-60 days","61+ days","Total"].map(b=>(
                      <td key={b} style={{
                        padding:"8px", border:"1px solid #eee", textAlign:"left"
                      }}>
                        {row[b] > 0 ? row[b] : "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* age-bucket bar chart */}
          <div style={{
            marginTop:"20px", backgroundColor:"white",
            borderRadius:"12px", padding:"24px",
            boxShadow:"0 8px 24px rgba(0,0,0,0.05)"
          }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={impactSummary.filter(r=>r.Department!=="Total")}
                margin={{ top:20, right:30, left:0, bottom:5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="Department" tick={{ fontSize:12 }}/>
                <YAxis allowDecimals={false} tick={{ fontSize:12 }}/>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize:"12px" }}/>

                <Bar dataKey="0-15 days"  fill="#00C49F">
                  <LabelList dataKey="0-15 days"  position="top"
                             style={{ fontSize:10, fontWeight:"bold" }}/>
                </Bar>
                <Bar dataKey="16-30 days" fill="#0071CE">
                  <LabelList dataKey="16-30 days" position="top"
                             style={{ fontSize:10, fontWeight:"bold" }}/>
                </Bar>
                <Bar dataKey="31-60 days" fill="#FFA726">
                  <LabelList dataKey="31-60 days" position="top"
                             style={{ fontSize:10, fontWeight:"bold" }}/>
                </Bar>
                <Bar dataKey="61+ days"  fill="#EF5350">
                  <LabelList dataKey="61+ days"  position="top"
                             style={{ fontSize:10, fontWeight:"bold" }}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {isLoading && (
        <p style={{ marginLeft:"-30px", color:"#0071ce", fontWeight:500 }}>
          Loading workbook…
        </p>
      )}
    </div>
  );
}

export default ClientImpactPage;
