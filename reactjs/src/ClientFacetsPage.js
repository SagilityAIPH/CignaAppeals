// ClientFacetsPage.js
import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LabelList, ComposedChart, Line, Legend,
} from "recharts";



/* ────────── helper ────────── */
const isProclaim = (txt = "") =>
  txt.trim().toLowerCase() === "proclaim";   // <- still show as “Facet”

const formatExcelDate = (value) => {
  if (typeof value === "number") {
    const jsDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    return jsDate.toISOString().split("T")[0];
  }
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return value || "";
};

function ClientFacetsPage() {
  /* ─── state ─── */
  const [excelData, setExcelData]             = useState([]);
  const [facetSummary, setFacetSummary]       = useState([]);
  const [facetTrend, setFacetTrend]           = useState([]);
  const [latestFacetDate, setLatestFacetDate] = useState("");
  const [latestFacetCounts, setLatestFacetCounts] = useState({});
  const [trendView, setTrendView]             = useState("Daily");
  const [isLoading, setIsLoading]             = useState(false);
const [facetPendedSummary, setFacetPendedSummary] = useState([]);
const [selectedPendedGsp,  setSelectedPendedGsp]  = useState("All");
const [pendedSort,         setPendedSort]         = useState({
  key: "Total",
  direction: "desc"
});
const [facetComplianceTrend, setFacetComplianceTrend] = useState([]);
const [directorStats, setDirectorStats] = useState({});
const [complianceView, setComplianceView] = useState("Daily");
const [memberProviderSummary, setMemberProviderSummary] = useState([]);
const [facetIFPInventory, setFacetIFPInventory] = useState([]);

  /* ─── processing ─── */
  const processWorkbook = (wb) => {
    const ws = wb.Sheets["DATA"];
    if (!ws) { alert('Sheet "DATA" not found'); setIsLoading(false); return; }

    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
    setExcelData(json);

    /* ▸ summary counts */
    const gsps = ["Sagility", "Concentrix", "Wipro"];
    const summary = gsps.map((gsp) => ({
      Department: gsp,
      Count: json.filter(r =>
        isProclaim(r["Claim System"]) &&
        (r["Department"] || "").toLowerCase().includes("appeal") &&
        (r["Director"]   || "").trim() === gsp
      ).length
    }));
    setFacetSummary(summary);
    calculateDirectorStats(json);


/* ── Member vs Provider (Product field) ─────────────────────── */
{
  const mpDirectors = ["Sagility", "Concentrix", "Wipro"];
  const counts = mpDirectors.reduce(
    (acc, d) => ({ ...acc, [d]: { Member: 0, Provider: 0 } }),
    {}
  );

  json.forEach((row) => {
    if (!isProclaim(row["Claim System"])) return;

    const dir = (row["Director"] || "").trim();
    const product = (row["Product"] || "").toLowerCase();

    if (!mpDirectors.includes(dir)) return;

    if (product.includes("mbr"))  counts[dir].Member   += 1;
    if (product.includes("prov")) counts[dir].Provider += 1;
  });

  const summary = mpDirectors.map((d) => ({
    Department: d,
    Member:     counts[d].Member,
    Provider:   counts[d].Provider,
    Total:      counts[d].Member + counts[d].Provider,
  }));

  // optional total row
  const grand = {
    Department: "Total",
    Member:   summary.reduce((s, r) => s + r.Member, 0),
    Provider: summary.reduce((s, r) => s + r.Provider, 0),
    Total:    summary.reduce((s, r) => s + r.Total, 0),
  };
  summary.push(grand);

  setMemberProviderSummary(summary);
}
/* ───────────────────────────────────────────────────────────── */



    /* ▸ trend rows */
    const trendMap = {};
    json.forEach((row) => {
      if (!isProclaim(row["Claim System"])) return;
      if (!(row["Department"] || "").toLowerCase().includes("appeal")) return;

      const date = formatExcelDate(row["ReportDate"]);
      if (!date) return;

      const owner  = (row["OwnerName"] || "").trim();
      const status = (row["Status"]    || "").trim().toLowerCase();

      if (!trendMap[date])
        trendMap[date] = { date, Assigned:0, Unassigned:0, Open:0, Pended:0, Completed:0 };

      owner ? trendMap[date].Assigned++ : trendMap[date].Unassigned++;
      if (["open","pended","completed"].includes(status))
        trendMap[date][status.charAt(0).toUpperCase()+status.slice(1)]++;
    });

    const trendRows = Object.values(trendMap)
      .sort((a,b)=>new Date(a.date)-new Date(b.date));
    setFacetTrend(trendRows);

    /* ▸ latest-date badge */
    const latestDate = trendRows.length ? trendRows.at(-1).date : "";
    setLatestFacetDate(latestDate);

    const badgeCounts = latestDate
      ? json.filter(r =>
          isProclaim(r["Claim System"]) &&
          (r["Department"] || "").toLowerCase().includes("appeal") &&
          formatExcelDate(r["ReportDate"]) === latestDate
        ).reduce((acc,r)=>{
          const d = (r["Director"]||"").trim();
          if (gsps.includes(d)) acc[d] = (acc[d]||0)+1;
          return acc;
        },{})
      : {};
    setLatestFacetCounts(badgeCounts);
    setIsLoading(false);
  };

  /* ▸ auto-load sample file once */
  useEffect(() => {
    setIsLoading(true);
    fetch(process.env.PUBLIC_URL + "/Appeals_Sample.xlsx")
      .then(r => { if (!r.ok) throw new Error("file"); return r.arrayBuffer(); })
      .then(buf => processWorkbook(XLSX.read(new Uint8Array(buf), { type:"array" })))
      .catch(e => { console.error(e); alert("Cannot load sample file."); setIsLoading(false); });
  }, []);

  /* ▸ Daily → Weekly / Monthly transform */
  const transformedTrend = useMemo(() => {
    if (trendView === "Daily") return facetTrend;

    const buckets = {};
    facetTrend.forEach(r=>{
      const d = new Date(r.date);
      let key = "";

      if (trendView === "Weekly") {
        const wk = new Date(d); wk.setDate(d.getDate()-d.getDay());
        key = wk.toISOString().split("T")[0];
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; // Monthly
      }

      if (!buckets[key])
        buckets[key] = { date:key, Assigned:0, Open:0, Pended:0, Completed:0, Unassigned:0 };

      ["Assigned","Open","Pended","Completed","Unassigned"].forEach(k=>{
        buckets[key][k] += r[k] || 0;
      });
    });
    return Object.values(buckets).sort((a,b)=>new Date(a.date)-new Date(b.date));
  }, [facetTrend, trendView]);

  /* ─── render ─── */


/* ───────── Pended / Routed Facet Appeals Breakdown ───────── */
useEffect(() => {
  if (!excelData.length) { setFacetPendedSummary([]); return; }

  const reasonsList = [
    "Routed to CASA Diary-Clinical review",
    "Routed to HD Review- Non IFP",
    "Sent for Adjustment",
    "Routed to Coder review",
    "Mail sent to TPV ( Pricing Review)",
    "Mail sent to Prepay",
    "Mail sent to SIU Review",
    "Routed to Correspondence",
    "Mail sent to Vendor Pricing",
    "Routed to Auth Load",
    "Routed to Committee",
    "Routed to Pharmacy",
    "Routed to Behavioral",
    "Routed to Transplant",
    "Routed to Dialysis",
    "Mail sent to Evicore",
    "Mail sent to Pathwell",
    "Mail sent to RRG ( Revenue recovery group )",
    "Mail sent to Oral notification",
    "Mail sent to Expedited Appeals",
    "Routed to File Request",
    "Mail sent to EMR ( Escalated mail review )",
    "Routed to Customer VS Provider",
    "DPL Intake",
    "Mail sent for AOR verification",
    "Misroutes"
  ];

  const directors = ["Sagility", "Concentrix", "Wipro"];

  const stripPrefix = (txt = "") =>
    txt.replace(/^(routed to |mail sent to |mail sent for )/i, "").trim();

  /* period-level grouping */
  const groups = {};

  excelData.forEach((row, idx) => {
    if (!isProclaim(row["Claim System"])) return;
    if (!(row["Department"] || "").toLowerCase().includes("appeal")) return;
    if ((row["Status"] || "").trim().toLowerCase() !== "pended") return;

    const director = (row["Director"] || "").trim();
    if (!directors.includes(director)) return;

    /* date → period key */
    let jsDate = null;
    const rawDate = row["ReportDate"];
    if (rawDate instanceof Date)           jsDate = rawDate;
    else if (typeof rawDate === "number")  jsDate = new Date((rawDate - 25569) * 86400 * 1000);
    else if (typeof rawDate === "string") {
      const p = new Date(rawDate);
      if (!isNaN(p)) jsDate = p;
    }
    if (!jsDate) return;

    const getKey = (d) => {
      if (trendView === "Daily") return d.toISOString().split("T")[0];
      if (trendView === "Weekly") {
        const s = new Date(d);
        s.setDate(d.getDate() - d.getDay()); // Sunday start
        return s.toISOString().split("T")[0];
      }
      /* Monthly */
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    const periodKey = getKey(jsDate);

    const rawReason = (row["Pend Reason"] || row["Pended Reason"] || "").trim();
    const cleaned   = stripPrefix(rawReason.toLowerCase());

    let reason = reasonsList.find((r) =>
      stripPrefix(r.toLowerCase()).includes(cleaned) ||
      cleaned.includes(stripPrefix(r.toLowerCase()))
    );
    if (!reason) reason = reasonsList[idx % reasonsList.length];

    if (!groups[periodKey])         groups[periodKey] = {};
    if (!groups[periodKey][reason]) groups[periodKey][reason] =
      { Sagility: 0, Concentrix: 0, Wipro: 0 };

    groups[periodKey][reason][director] += 1;
  });

  /* latest period */
  const latestKey =
    trendView === "Monthly"
      ? Object.keys(groups).sort().pop()
      : Object.keys(groups).sort((a, b) => new Date(a) - new Date(b)).pop();

  const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) : "0.0");

  const summary = reasonsList.map((r) => {
    const g = (groups[latestKey] && groups[latestKey][r]) ||
              { Sagility: 0, Concentrix: 0, Wipro: 0 };
    const total = g.Sagility + g.Concentrix + g.Wipro;
    return {
      Reason: r,
      Sagility:      g.Sagility,
      SagilityPct:   pct(g.Sagility, total),
      Concentrix:    g.Concentrix,
      ConcentrixPct: pct(g.Concentrix, total),
      Wipro:         g.Wipro,
      WiproPct:      pct(g.Wipro, total),
      Total:         total
    };
  });

  setFacetPendedSummary(summary);
}, [excelData, trendView]);

const sortIcon = (col) =>
  pendedSort.key !== col ? "" : pendedSort.direction === "asc" ? "▲" : "▼";

const handlePendedSort = (key) => {
  setPendedSort((prev) => ({
    key,
    direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
  }));
};

const sortedFacetPended = useMemo(() => {
  const { key, direction } = pendedSort;
  return [...facetPendedSummary].sort((a, b) => {
    const vA = isNaN(a[key]) ? a[key] : Number(a[key]);
    const vB = isNaN(b[key]) ? b[key] : Number(b[key]);
    if (vA < vB) return direction === "asc" ? -1 : 1;
    if (vA > vB) return direction === "asc" ?  1 : -1;
    return 0;
  });
}, [facetPendedSummary, pendedSort]);


/* ───────── Out-of-Compliance Facet Trend ───────── */
useEffect(() => {
  if (!excelData.length) return;

  const buckets = {};

  excelData.forEach((row) => {
    if (!isProclaim(row["Claim System"])) return;

    const ooc = (row["NonCompliant2"] || "").trim().toUpperCase();
    if (ooc !== "YES" && ooc !== "NO") return;

    const director = (row["Director"] || "").trim();
    if (!["Sagility", "Concentrix", "Wipro"].includes(director)) return;

    const rawDate = row["ReportDate"];
    let jsDate = null;
    if (rawDate instanceof Date)           jsDate = rawDate;
    else if (typeof rawDate === "number")  jsDate = new Date((rawDate - 25569) * 86400 * 1000);
    else if (typeof rawDate === "string") {
      const d = new Date(rawDate);
      if (!isNaN(d)) jsDate = d;
    }
    if (!jsDate) return;

    const getKey = (d) => {
      if (trendView === "Daily") return d.toISOString().split("T")[0];
      if (trendView === "Weekly") {
        const s = new Date(d);
        s.setDate(d.getDate() - d.getDay());
        return s.toISOString().split("T")[0];
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    const key = getKey(jsDate);
    const oocKey = `${ooc}_${director}`; // YES_Sagility

    if (!buckets[key]) buckets[key] = {};
    buckets[key][oocKey] = (buckets[key][oocKey] || 0) + 1;
  });

  const result = Object.entries(buckets)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, data]) => ({
      date,
      Sagility_Yes:     data["YES_Sagility"]     || 0,
      Sagility_No:      data["NO_Sagility"]      || 0,
      Concentrix_Yes:   data["YES_Concentrix"]   || 0,
      Concentrix_No:    data["NO_Concentrix"]    || 0,
      Wipro_Yes:        data["YES_Wipro"]        || 0,
      Wipro_No:         data["NO_Wipro"]         || 0,
    }));

  setFacetComplianceTrend(result);
}, [excelData, trendView]);

const barColors = { YES: "#F4817F", NO: "#3991D9" };

const bgColors = {
  Sagility:   "#E7FEF4",
  Concentrix: "#E7ECFE",
  Wipro:      "#F4EAFB",
};


const calculateDirectorStats = (data) => {
  const trendCounts = { Sagility:{}, Concentrix:{}, Wipro:{} };

  data.forEach((row) => {
    if (!isProclaim(row["Claim System"])) return;

    const director   = (row["Director"] || "").trim();
    const compliance = (row["NonCompliant2"] || "").trim().toUpperCase();

    let rawDate = row["ReportDate"];
    let reportDate = null;
    if (rawDate instanceof Date) {
      reportDate = rawDate.toISOString().split("T")[0];
    } else if (typeof rawDate === "number") {
      const js = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
      reportDate = js.toISOString().split("T")[0];
    }
    if (!director || !reportDate || !trendCounts[director]) return;

    if (!trendCounts[director][reportDate])
      trendCounts[director][reportDate] = { YES:0, NO:0 };

    if (compliance === "YES") trendCounts[director][reportDate].YES++;
    else if (compliance === "NO") trendCounts[director][reportDate].NO++;
  });

  const formatted = {};
  Object.entries(trendCounts).forEach(([dir, map])=>{
    formatted[dir] = Object.entries(map).map(([date, counts])=>({
      date, ...counts
    }));
  });
  setDirectorStats(formatted);
};


const transformedComplianceTrend = useMemo(() => {
  if (complianceView === "Daily") return directorStats;

  const groupBy = (arr, type) => {
    const grouped = {};
    arr.forEach(({ date, YES, NO }) => {
      const d = new Date(date);
      let key = "";

      if (type === "Weekly") {
        const s = new Date(d);
        s.setDate(d.getDate() - d.getDay());        // Sun
        key = s.toISOString().split("T")[0];
      } else {                                      // Monthly
        key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      }

      if (!grouped[key]) grouped[key] = { date:key, YES:0, NO:0 };
      grouped[key].YES += YES || 0;
      grouped[key].NO  += NO  || 0;
    });
    return Object.values(grouped).sort((a,b)=>new Date(a.date)-new Date(b.date));
  };

  const res = {};
  Object.entries(directorStats).forEach(
    ([dir, vals]) => { res[dir] = groupBy(vals, complianceView); }
  );
  return res;
}, [complianceView, directorStats]);

















  return (
    <div style={{ padding:"20px 0 0 0", fontFamily:"Lexend, sans-serif" }}>
      {/* ===== Facet Appeals Summary (using Proclaim data) ===== */}
      {facetSummary.length > 0 && (
        <div style={{
          marginLeft:"-30px", backgroundColor:"#F5F6FA",
          borderRadius:"10px", padding:"20px"
        }}>
          <h3 style={{
            fontSize:"19px", fontWeight:"500", color:"#003b70",
            margin:"0 0 10px 0"
          }}>
            Facet Appeals Summary
          </h3>

          <div style={{
            backgroundColor:"#e8f0fe", border:"1px solid #c4d4ec",
            borderRadius:"8px", padding:"16px", marginBottom:"16px",
            boxShadow:"0 4px 8px rgba(0,0,0,0.05)"
          }}>
            <div style={{ fontSize:"16px", fontWeight:"600", color:"#003b70", marginBottom:"6px" }}>
              Total Facet Appeals as of {latestFacetDate || "--"}
            </div>
            <div style={{ fontSize:"14px", fontWeight:"500", color:"#003b70" }}>
              Total Appeals:&nbsp;
              {Object.values(latestFacetCounts).reduce((a,b)=>a+b,0) || 0}
              &nbsp;|&nbsp; Sagility: {latestFacetCounts.Sagility||0}
              &nbsp;|&nbsp; Concentrix: {latestFacetCounts.Concentrix||0}
              &nbsp;|&nbsp; Wipro: {latestFacetCounts.Wipro||0}
            </div>
          </div>

          {/* view switch */}
          <div style={{ marginBottom:"12px" }}>
            <label style={{ fontWeight:"500", color:"#003b70", marginRight:"8px" }}>
              View:
            </label>
            <select
              value={trendView}
              onChange={e=>setTrendView(e.target.value)}
              style={{
                padding:"8px 12px", borderRadius:"6px", border:"1px solid #ccc",
                fontSize:"14px", width:"150px", fontFamily:"inherit",
                color:"#003b70", backgroundColor:"#fff"
              }}
            >
              {["Daily","Weekly","Monthly"].map(v=><option key={v}>{v}</option>)}
            </select>
          </div>

          {/* chart */}
          <div style={{
            backgroundColor:"white", borderRadius:"12px",
            padding:"24px", boxShadow:"0 8px 24px rgba(0,0,0,0.05)"
          }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={transformedTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize:11, dy:19 }} angle={-35} height={50}/>
                <YAxis allowDecimals={false} tick={{ fontSize:13 }}/>
                <Tooltip/>
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize:13 }}/>

                <Bar dataKey="Assigned"  fill="#42A5F5">
                  <LabelList dataKey="Assigned"  position="top" style={{ fontSize:10, fontWeight:"bold" }}/>
                </Bar>
                <Bar dataKey="Open"      fill="#00C49F">
                  <LabelList dataKey="Open"      position="top" style={{ fontSize:10, fontWeight:"bold" }}/>
                </Bar>
                <Bar dataKey="Pended"    fill="#FFB300">
                  <LabelList dataKey="Pended"    position="top" style={{ fontSize:10, fontWeight:"bold" }}/>
                </Bar>
                <Bar dataKey="Completed" fill="#66BB6A">
                  <LabelList dataKey="Completed" position="top" style={{ fontSize:10, fontWeight:"bold" }}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {isLoading && (
        <p style={{ marginLeft:"-30px", color:"#0071ce", fontWeight:500 }}>
         
        </p>
      )}


{/* ===== Pended / Routed Facet Appeals Breakdown ===== */}
{facetPendedSummary.length > 0 && (
  <div style={{
    marginTop:"30px", marginLeft:"-30px", marginBottom:"30px",
    backgroundColor:"#F5F6FA", borderRadius:"10px", padding:"20px"
  }}>
    <h3 style={{
      fontSize:"19px", fontWeight:"500", color:"#003b70",
      margin:"0 0 15px 0"
    }}>
      Pended / Routed Facet Appeals Breakdown — {trendView}
    </h3>

    {/* GSP filter */}
    <div style={{ marginBottom:"12px" }}>
      <label style={{ fontWeight:"500", color:"#003b70", marginRight:"8px" }}>
        Filter by GSP:
      </label>
      <select
        value={selectedPendedGsp}
        onChange={(e) => setSelectedPendedGsp(e.target.value)}
        style={{
          padding:"8px 12px", borderRadius:"6px", border:"1px solid #ccc",
          fontSize:"14px", width:"180px", fontFamily:"inherit",
          color:"#003b70", backgroundColor:"#fff"
        }}
      >
        {["All", "Sagility", "Concentrix", "Wipro"].map((g) => (
          <option key={g}>{g}</option>
        ))}
      </select>
    </div>

    {/* Scrollable table */}
    <div style={{
      overflowX:"auto", overflowY:"auto", maxHeight:"260px",
      border:"1px solid #ddd", borderRadius:"6px"
    }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
        <thead style={{ backgroundColor:"#f1f8ff", position:"sticky", top:0 }}>
          <tr>
            {(() => {
              const base = [
                { label:"Reason",        key:"Reason"        },
                { label:"Sagility #",    key:"Sagility"      },
                { label:"Sagility %",    key:"SagilityPct"   },
                { label:"Concentrix #",  key:"Concentrix"    },
                { label:"Concentrix %",  key:"ConcentrixPct" },
                { label:"Wipro #",       key:"Wipro"         },
                { label:"Wipro %",       key:"WiproPct"      },
                { label:"Total #",       key:"Total"         }
              ];
              const cols = selectedPendedGsp === "All"
                ? base
                : base.filter(c =>
                    ["Reason","Total",`${selectedPendedGsp}`,`${selectedPendedGsp}Pct`]
                      .some(h => c.key.startsWith(h.replace(" #","").replace(" %","")))
                  );
              return cols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => handlePendedSort(c.key)}
                  style={{
                    padding:"10px", border:"1px solid #ccc",
                    cursor:"pointer", userSelect:"none"
                  }}
                >
                  {c.label}&nbsp;{sortIcon(c.key)}
                </th>
              ));
            })()}
          </tr>
        </thead>
        <tbody>
          {sortedFacetPended.map((row, idx) => (
            <tr key={row.Reason} style={{ backgroundColor:idx%2?"#f3f6fb":"#fff" }}>
              <td style={{ padding:"8px", border:"1px solid #eee", fontWeight:"600" }}>
                {row.Reason}
              </td>

              {(["All"].includes(selectedPendedGsp)
                ? ["Sagility","Concentrix","Wipro"]
                : [selectedPendedGsp]
              ).map((gsp) => (
                <React.Fragment key={gsp}>
                  <td style={{ padding:"8px", border:"1px solid #eee" }}>{row[gsp]}</td>
                  <td style={{ padding:"8px", border:"1px solid #eee" }}>{row[`${gsp}Pct`]}%</td>
                </React.Fragment>
              ))}

              <td style={{ padding:"8px", border:"1px solid #eee", fontWeight:"600" }}>
                {row.Total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}



{/* Out of Compliance */}
{Object.entries(directorStats).length > 0 && (
  <div style={{
    paddingTop:"20px",
    marginLeft:"-30px",
    backgroundColor:"#F5F6FA",
    borderRadius:"10px"
  }}>
    <h3 style={{
      fontSize:"19px",
      fontWeight:"500",
      color:"#003b70",
      marginLeft:"20px",
      marginBottom:"10px",
      marginTop:"10px",
      fontFamily:"Lexend, sans-serif"
    }}>
      Out of Compliance
    </h3>

    {/* selector */}
    <div style={{ marginBottom:"12px", marginLeft:"20px" }}>
      <label style={{
        fontWeight:"500", color:"#003b70", marginRight:"8px"
      }}>
        View:
      </label>
      <select
        value={complianceView}
        onChange={(e)=>setComplianceView(e.target.value)}
        style={{
          padding:"8px 12px",
          borderRadius:"6px",
          border:"1px solid #ccc",
          fontSize:"14px",
          width:"150px",
          fontFamily:"inherit",
          color:"#003b70",
          backgroundColor:"#fff"
        }}
      >
        {["Daily","Weekly","Monthly"].map(opt=>(
          <option key={opt}>{opt}</option>
        ))}
      </select>
    </div>

    {/* cards */}
    <div style={{
      display:"flex",
      flexWrap:"wrap",
      gap:"24px"
    }}>
      {Object.entries(transformedComplianceTrend).map(
        ([director, values]) => (
        <div key={director} style={{
          background:`linear-gradient(to right, ${bgColors[director]} 0%, #ffffff 100%)`,
          borderRadius:"10px",
          marginBottom:"20px",
          marginRight:"-30px",
          marginLeft:"20px",
          padding:"24px",
          width:"450px",
          height:"150px",
          boxShadow:"0 6px 16px rgba(0,0,0,0.06)",
          display:"flex",
          flexDirection:"column",
          justifyContent:"space-between",
          transition:"transform 0.2s ease"
        }}>
          <div style={{
            fontSize:"16px",
            fontWeight:"600",
            color:"#003b70",
            marginBottom:"10px",
            marginTop:"-10px",
            borderBottom:"1px solid #ddd",
            paddingBottom:"5px"
          }}>
            {director}
          </div>

          <ResponsiveContainer width="80%" height={150}>
            <ComposedChart data={values}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis
                dataKey="date"
                tick={{ angle:-35, fontSize:10, textAnchor:"end" }}
                height={50}
              />
              <YAxis
                allowDecimals={false}
                tick={{
                  fontSize:10,
                  fontWeight:"bold",
                  fill:"#333"
                }}
              />
              <Tooltip/>

              <Bar
                dataKey="YES"
                fill={barColors.YES}
                barSize={20}
                name="YES"
                radius={[4,4,0,0]}
              >
                <LabelList
                  dataKey="YES"
                  position="top"
                  style={{ fontSize:10, fontWeight:"bold" }}
                />
              </Bar>

              <Bar
                dataKey="NO"
                fill={barColors.NO}
                barSize={20}
                name="NO"
                stackId="a"
                radius={[4,4,0,0]}
              >
                <LabelList
                  dataKey="NO"
                  position="top"
                  style={{ fontSize:10, fontWeight:"bold" }}
                />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  </div>
)}



{/* Member vs Provider Inventory */}
{memberProviderSummary.length > 0 && (
  <div style={{
    marginTop: "20px",
    marginLeft: "-30px",
    backgroundColor: "#F5F6FA",
    borderRadius: "10px",
    padding: "20px",
    fontFamily: "Lexend, sans-serif",
  }}>
    <h3 style={{
      fontSize: "19px",
      fontWeight: "500",
      color: "#003b70",
      marginBottom: "10px",
      marginTop: "0px"
    }}>
      Member vs Provider Inventory
    </h3>

    <div style={{
      marginTop: "0px",
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "24px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.05)"
    }}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={memberProviderSummary.filter(r => r.Department !== "Total")}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="Department" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: "12px" }} />

          <Bar dataKey="Member" fill="#1E88E5">
            <LabelList dataKey="Member"
                       position="top"
                       style={{ fontSize: 10, fontWeight: "bold" }} />
          </Bar>
          <Bar dataKey="Provider" fill="#7E57C2">
            <LabelList dataKey="Provider"
                       position="top"
                       style={{ fontSize: 10, fontWeight: "bold" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
)}

















    </div>



  );
}

export default ClientFacetsPage;
