import { useState, useCallback, useRef } from "react";
import { incrementUploadCount } from "./firebase";
interface BOQItem {
item: string;
unit: string;
quantity: number;
rate: number;
aiRate: number;
amount: number;
editedRate?: number;
needsRate?: boolean;
}

interface UploadResult {
success: boolean;
pdfRead: boolean;
message: string;
boq: {
dataSource: string;
departmentEstimate: number;
expectedWinningBid: number;
executionCost: number;
expectedProfit: number;
profitMargin: number;
workingCapitalNeeded: number;
raCycleDays: number;
bidRecommendation: string;
bidRecommendationReason: string;
boqItems: BOQItem[];
materialCost: number;
labourCost: number;
equipmentCost: number;
overheadCost: number;
contingency: number;
keyMaterials: string[];
majorEquipment: string[];
executionDays: number;
riskFactors: string[];
selectedState: string;
};
}

const INDIAN_STATES = ['Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal'];

function fmt(n: number): string {
if (n >= 10000000) return "Rs " + (n / 10000000).toFixed(2) + " Cr";
if (n >= 100000) return "Rs " + (n / 100000).toFixed(1) + " L";
if (n >= 1000) return "Rs " + (n / 1000).toFixed(0) + "K";
return "Rs " + Math.round(n).toLocaleString("en-IN");
}

function fmtFull(n: number): string { return Math.round(n).toLocaleString("en-IN"); }
function fmtNum(n: number): string { return n.toLocaleString("en-IN"); }

function getCostSplit(description: string, unit: string): [number, number, number] {
const d = (description || "").toLowerCase();
const u = (unit || "").toLowerCase().replace(/\./g, "");
if ((d.includes("reinforcement") || d.includes("steel bar") || d.includes("fe500") || d.includes("tmt")) && u.includes("mt")) return [85, 10, 5];
if ((d.includes("concrete") || d.includes("rcc") || d.includes("r.c.c") || d.includes("p/l") || d.includes("rmc")) && u.includes("cum")) return [70, 15, 15];
if (d.includes("excavat")) { if (d.includes("chisel") || d.includes("breaker") || d.includes("hard rock") || d.includes("pneumatic")) return [10, 40, 50]; return [5, 35, 60]; }
if (d.includes("earth work") || d.includes("embankment") || d.includes("filling") || d.includes("stabilised soil")) return [10, 40, 50];
if (d.includes("brick") || d.includes("masonry") || d.includes("rubble")) return [60, 35, 5];
if (d.includes("centering") || d.includes("shuttering") || d.includes("formwork") || d.includes("form work")) return [50, 40, 10];
if (d.includes("sub base") || d.includes("subbase") || d.includes("wmm") || d.includes("gsb") || d.includes("granular") || d.includes("crushed stone") || d.includes("rubble soling")) return [40, 25, 35];
if (d.includes("bitumen") || d.includes("bituminous") || d.includes("dbm") || d.includes("premix") || d.includes("tack coat") || d.includes("prime coat") || d.includes("mastic") || d.includes("asphalt")) return [60, 15, 25];
if (d.includes("pipe")) return [75, 15, 10];
if (d.includes("manhole") || d.includes("cover") || d.includes("frame") || d.includes("chamber") || d.includes("grating")) return [70, 20, 10];
if (d.includes("kerb") || d.includes("water dished") || d.includes("water table") || d.includes("tree guard")) return [55, 30, 15];
if (d.includes("railing") || d.includes("bollard") || d.includes("grill") || d.includes("fabricat") || d.includes("sign") || d.includes("board")) return [65, 25, 10];
if (d.includes("road marking") || d.includes("thermoplastic") || d.includes("retro reflective") || d.includes("road stud")) return [50, 30, 20];
if (d.includes("cable") || d.includes("conduit") || d.includes("panel") || d.includes("earthing") || d.includes("electrical") || d.includes("mcb") || d.includes("elcb") || d.includes("switchfuse") || d.includes("wiring") || d.includes("tubelight") || d.includes("fixture") || d.includes("fan") || d.includes("led")) return [75, 20, 5];
if (d.includes("plaster") || d.includes("flooring") || d.includes("tactile") || d.includes("tile") || d.includes("paint")) return [55, 40, 5];
if (d.includes("demolition") || d.includes("cutting") || d.includes("removing") || d.includes("dismantl")) return [5, 70, 25];
if (d.includes("soak pit") || d.includes("dowel") || d.includes("joint") || d.includes("thermocole") || d.includes("admixture") || d.includes("waterproof")) return [50, 35, 15];
if (d.includes("survey") || d.includes("testing") || d.includes("transplant")) return [10, 80, 10];
if (d.includes("shoring") || d.includes("strutting")) return [20, 50, 30];
return [60, 25, 15];
}

const s0: React.CSSProperties = { border: "1px solid #999", padding: "6px 10px", fontWeight: "bold", background: "#f0f0f0", width: "30%" };
const s1: React.CSSProperties = { border: "1px solid #999", padding: "6px 10px" };
const s2: React.CSSProperties = { border: "1px solid #999", padding: "8px 10px", background: "#e8e8e8", textAlign: "left", fontWeight: "bold" };
const s3: React.CSSProperties = { border: "1px solid #999", padding: "8px 10px", background: "#e8e8e8", textAlign: "right", fontWeight: "bold" };
const s4: React.CSSProperties = { border: "1px solid #999", padding: "7px 10px" };
const s5: React.CSSProperties = { border: "1px solid #999", padding: "7px 10px", textAlign: "right", fontFamily: "monospace" };
const s6: React.CSSProperties = { border: "1px solid #999", padding: "7px 10px", fontWeight: "bold", background: "#f5f5f5" };
const s7: React.CSSProperties = { border: "1px solid #999", padding: "7px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold", background: "#f5f5f5" };
const s8: React.CSSProperties = { border: "1px solid #999", padding: "7px 10px", fontWeight: "bold", background: "#d5e8d4" };
const s9: React.CSSProperties = { border: "1px solid #999", padding: "7px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold", background: "#d5e8d4" };
const s10: React.CSSProperties = { border: "1px solid #999", padding: "7px 10px", fontWeight: "bold", background: "#dae8fc" };
const s11: React.CSSProperties = { border: "1px solid #999", padding: "7px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold", background: "#dae8fc" };

function ItemRateAnalysis(props: { item: BOQItem; itemNumber: number; state: string; onClose: () => void }) {
const item = props.item;
const itemNumber = props.itemNumber;
const state = props.state;
const onClose = props.onClose;
const activeRate = item.editedRate && item.editedRate > 0 ? item.editedRate : item.aiRate > 0 ? item.aiRate : item.rate;
const itemCost = item.quantity * activeRate;
const split = getCostSplit(item.item, item.unit);
const mat = itemCost * (split[0] / 100);
const lab = itemCost * (split[1] / 100);
const hir = itemCost * (split[2] / 100);
const A = mat + lab + hir;
const B = A * 0.02;
const C = A + B;
const D = A * 0.15;
const E = C + D;
const qty = item.quantity || 1;
const perUnit = E / qty;
const matGST = mat * 0.18;
const labGST = lab * 0.18;
const hirGST = hir * 0.18;
const totGST = matGST + labGST + hirGST;
const ovhProfit = A * 0.15;
const totalPerUnit = perUnit + totGST / qty;

return (
<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", overflowY: "auto" }}>
<div className="annexure-print" style={{ background: "#fff", color: "#1a1a1a", borderRadius: "8px", maxWidth: "860px", width: "100%", maxHeight: "92vh", overflowY: "auto", padding: "40px", fontFamily: "Times New Roman, serif" }}>
<div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
<div style={{ fontSize: "12px", color: "#888" }}>Use browser Print dialog to save as PDF</div>
<div style={{ display: "flex", gap: "8px" }}>
<button onClick={() => window.print()} style={{ background: "#1a5276", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>Print or Save as PDF</button>
<button onClick={onClose} style={{ background: "#eee", color: "#333", border: "none", padding: "8px 20px", borderRadius: "6px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>Close</button>
</div>
</div>

<div style={{ textAlign: "center", fontWeight: "bold", fontSize: "16px", marginBottom: "4px" }}>Rate Analysis</div>
<div style={{ textAlign: "center", fontSize: "13px", color: "#555", marginBottom: "20px" }}>Item {itemNumber} — {state} Market Rates</div>

<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "12px" }}>
<tbody>
<tr><td style={s0}>Sr No</td><td style={s1}>{itemNumber}</td><td style={s0}>State</td><td style={s1}>{state}</td></tr>
<tr><td style={s0}>Description of Item</td><td style={{ ...s1, fontSize: "11px" }} colSpan={3}>{item.item}</td></tr>
<tr><td style={s0}>Unit</td><td style={s1}>{item.unit}</td><td style={s0}>Quantity</td><td style={s1}>{fmtNum(item.quantity)}</td></tr>
<tr><td style={s0}>PDF Rate (SOR)</td><td style={s1}>Rs {fmtFull(item.rate)}</td><td style={s0}>AI Estimated Rate</td><td style={s1}>Rs {fmtFull(item.aiRate)}</td></tr>
<tr><td style={s0}>Rate Used for Analysis</td><td style={{ ...s1, fontWeight: "bold", color: "#1a5276" }} colSpan={3}>Rs {fmtFull(activeRate)} per {item.unit}</td></tr>
<tr><td style={s0}>Total Item Cost</td><td style={{ ...s1, fontWeight: "bold" }} colSpan={3}>Rs {fmtFull(A)}</td></tr>
</tbody>
</table>

<div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "8px", borderBottom: "1px solid #ccc", paddingBottom: "4px" }}>Details of Cost for Unit of {item.unit}</div>
<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "12px" }}>
<thead>
<tr><th style={{ ...s2, width: "8%" }}>Sr</th><th style={s2}>Description of Cost Parameters</th><th style={{ ...s3, width: "18%" }}>Amount Rs</th><th style={{ ...s3, width: "18%" }}>Per Unit Rs</th></tr>
</thead>
<tbody>
<tr><td style={s4}>1</td><td style={s4}>Material Cost ({split[0]}%)</td><td style={s5}>{fmtFull(mat)}</td><td style={s5}>{fmtFull(mat / qty)}</td></tr>
<tr><td style={s4}>2</td><td style={s4}>Labour Cost ({split[1]}%)</td><td style={s5}>{fmtFull(lab)}</td><td style={s5}>{fmtFull(lab / qty)}</td></tr>
<tr><td style={s4}>3</td><td style={s4}>Material and Equipment Hire Charges ({split[2]}%)</td><td style={s5}>{fmtFull(hir)}</td><td style={s5}>{fmtFull(hir / qty)}</td></tr>
<tr><td style={s6}>A</td><td style={s6}>Total Material Labour and Hire Charges Basic Amount</td><td style={s7}>{fmtFull(A)}</td><td style={s7}>{fmtFull(A / qty)}</td></tr>
<tr><td style={s4}>B</td><td style={s4}>Maintenance and Other Charges 2 percent</td><td style={s5}>{fmtFull(B)}</td><td style={s5}>{fmtFull(B / qty)}</td></tr>
<tr><td style={s6}>C</td><td style={s6}>Total of A plus B</td><td style={s7}>{fmtFull(C)}</td><td style={s7}>{fmtFull(C / qty)}</td></tr>
<tr><td style={s4}>D</td><td style={s4}>5 percent Overhead and 10 percent Profit on Basic Amount</td><td style={s5}>{fmtFull(D)}</td><td style={s5}>{fmtFull(D / qty)}</td></tr>
<tr><td style={s6}>E</td><td style={s6}>Total with Overhead and Profit</td><td style={s7}>{fmtFull(E)}</td><td style={s7}>{fmtFull(E / qty)}</td></tr>
<tr><td style={s8}>F</td><td style={s8}>Per Unit Cost Say Rs</td><td style={s9} colSpan={2}>{fmtFull(perUnit)} per {item.unit}</td></tr>
</tbody>
</table>

<div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "8px", borderBottom: "1px solid #ccc", paddingBottom: "4px" }}>GST and Final Cost Summary</div>
<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "28px", fontSize: "12px" }}>
<thead>
<tr><th style={{ ...s2, width: "8%" }}>Sr</th><th style={s2}>Description</th><th style={{ ...s3, width: "20%" }}>Total Amount Rs</th><th style={{ ...s3, width: "20%" }}>Per Unit Rs</th></tr>
</thead>
<tbody>
<tr><td style={s4}>1</td><td style={s4}>Total Basic Amount</td><td style={s5}>{fmtFull(A)}</td><td style={s5}>{fmtFull(A / qty)}</td></tr>
<tr><td style={s4}>2</td><td style={s4}>Material GST at 18 percent</td><td style={s5}>{fmtFull(matGST)}</td><td style={s5}>{fmtFull(matGST / qty)}</td></tr>
<tr><td style={s4}>3</td><td style={s4}>Labour GST at 18 percent</td><td style={s5}>{fmtFull(labGST)}</td><td style={s5}>{fmtFull(labGST / qty)}</td></tr>
<tr><td style={s4}>4</td><td style={s4}>Hire Charges GST at 18 percent</td><td style={s5}>{fmtFull(hirGST)}</td><td style={s5}>{fmtFull(hirGST / qty)}</td></tr>
<tr><td style={s6}>5</td><td style={s6}>Total GST Amount</td><td style={s7}>{fmtFull(totGST)}</td><td style={s7}>{fmtFull(totGST / qty)}</td></tr>
<tr><td style={s4}>6</td><td style={s4}>Overhead and Contractors Profit at 15 percent</td><td style={s5}>{fmtFull(ovhProfit)}</td><td style={s5}>{fmtFull(ovhProfit / qty)}</td></tr>
<tr><td style={s10}>7</td><td style={s10}>Total Per Unit Amount including GST</td><td style={s11} colSpan={2}>{fmtFull(totalPerUnit)} per {item.unit}</td></tr>
</tbody>
</table>

<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "30px" }}>
<div style={{ textAlign: "center", fontSize: "12px" }}><div style={{ borderTop: "1px solid #333", paddingTop: "8px", marginTop: "40px" }}>Signature and Seal of the Tenderer</div></div>
<div style={{ textAlign: "center", fontSize: "12px" }}><div style={{ borderTop: "1px solid #333", paddingTop: "8px", marginTop: "40px" }}>Checked and Verified by Engineer In Charge</div></div>
</div>
</div>
</div>
);
}

function UploadZone(props: { onUpload: (file: File) => void; selectedState: string; onStateChange: (state: string) => void }) {
const [dragging, setDragging] = useState(false);
const inputRef = useRef<HTMLInputElement>(null);
const handleDrop = useCallback((e: React.DragEvent) => {
e.preventDefault(); setDragging(false);
const file = e.dataTransfer.files?.[0];
if (file && file.type === "application/pdf") props.onUpload(file);
}, [props.onUpload]);

return (
<div>
<div style={{ marginBottom: "20px" }}>
<div style={{ color: "#E8EDF2", fontSize: "13px", fontWeight: "700", marginBottom: "8px" }}>Select State / UT</div>
<select
value={props.selectedState}
onChange={(e) => props.onStateChange(e.target.value)}
style={{ width: "100%", padding: "12px 16px", background: "#1A2A3A", border: "1px solid #2A3F54", borderRadius: "10px", color: "#E8EDF2", fontSize: "14px", fontWeight: "600", outline: "none", cursor: "pointer" }}
>
{INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
</select>
<div style={{ color: "#3A5068", fontSize: "11px", marginTop: "6px" }}>AI execution rates will be calibrated for {props.selectedState} market conditions</div>
</div>
<div
onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => inputRef.current?.click()}
style={{ border: `2px dashed ${dragging ? "#F5A623" : "#2A3F54"}`, borderRadius: "16px", padding: "50px 40px", textAlign: "center", cursor: "pointer", background: dragging ? "rgba(245,166,35,0.05)" : "rgba(26,42,58,0.5)", transition: "all 0.2s" }}
>
<input ref={inputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onUpload(f); e.target.value = ""; }} />
<div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
<div style={{ color: "#E8EDF2", fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>Upload your BOQ PDF</div>
<div style={{ color: "#6B7F8E", fontSize: "14px", marginBottom: "20px", lineHeight: "1.6" }}>Upload the BOQ PDF from any tender portal — public or private, any department, any state</div>
<div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#F5A623", color: "#0F1923", padding: "12px 28px", borderRadius: "10px", fontSize: "15px", fontWeight: "700" }}>Select PDF File</div>
<div style={{ color: "#3A5068", fontSize: "12px", marginTop: "16px" }}>or drag and drop your PDF here</div>
<div style={{ color: "#6B7F8E", fontSize: "13px", marginTop: "16px", lineHeight: "1.8" }}>Works best with BOQ tables containing Sr.No, Description, Unit, Qty, Rate, Amount columns. Also supports Zero-Rate BOQS where AI estimates the rates.</div>

</div>
</div>
);
}

function LoadingSteps(props: { step: number }) {
const steps = ["Uploading PDF...", "Extracting tables from document...", "Identifying BOQ line items...", "Calculating AI execution rates...", "Preparing your calculator..."];
return (
<div style={{ padding: "24px 0" }}>
{steps.map((s, i) => (
<div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", opacity: i <= props.step ? 1 : 0.3, transition: "opacity 0.5s" }}>
<div style={{ width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0, background: i < props.step ? "#00C896" : i === props.step ? "#F5A623" : "#1A2A3A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: "#0F1923" }}>{i < props.step ? "V" : i + 1}</div>
<span style={{ fontSize: "14px", color: i < props.step ? "#00C896" : i === props.step ? "#F5A623" : "#3A5068", fontWeight: i === props.step ? "600" : "400" }}>{s}</span>
</div>
))}
</div>
);
}

function BOQTable(props: { items: BOQItem[]; onRateChange: (idx: number, rate: number) => void; onViewAnalysis: (idx: number) => void }) {
return (
<div style={{ overflowX: "auto" }}>
<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
<thead>
<tr style={{ background: "#0F1923" }}>
{["#", "Description of Work", "Unit", "Qty", "PDF Rate", "AI Estimate", "Your Rate", "Your Amount", ""].map(h => (
<th key={h} style={{ padding: "12px 14px", textAlign: "left", color: "#6B7F8E", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", whiteSpace: "nowrap", borderBottom: "1px solid #1A2A3A" }}>{h}</th>
))}
</tr>
</thead>
<tbody>
{props.items.map((item, idx) => {
const aiRate = item.aiRate ?? item.rate;
const editedRate = item.editedRate ?? aiRate;
const yourAmount = item.quantity * editedRate;
const changed = editedRate !== aiRate;
const savingsPct = item.rate > 0 ? Math.round(((item.rate - aiRate) / item.rate) * 100) : 0;
return (
<tr key={idx} style={{ borderBottom: "1px solid #1A2A3A", background: item.needsRate ? "rgba(245,166,35,0.05)" : idx % 2 === 0 ? "transparent" : "rgba(26,42,58,0.3)" }}>
<td style={{ padding: "12px 14px", color: "#3A5068", fontWeight: "700" }}>{idx + 1}</td>
<td style={{ padding: "12px 14px", color: "#E8EDF2", maxWidth: "240px", lineHeight: "1.5", wordBreak: "break-word", overflowWrap: "break-word", verticalAlign: "top" }}>

{item.item}
{item.needsRate && <span style={{ marginLeft: "6px", fontSize: "10px", background: "rgba(245,166,35,0.15)", color: "#F5A623", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>Enter rate</span>}
</td>
<td style={{ padding: "12px 14px", color: "#6B7F8E", whiteSpace: "nowrap" }}>{item.unit}</td>
<td style={{ padding: "12px 14px", color: "#E8EDF2", fontWeight: "600", whiteSpace: "nowrap" }}>{fmtNum(item.quantity)}</td>
<td style={{ padding: "12px 14px", color: "#6B7F8E", whiteSpace: "nowrap" }}>{item.rate > 0 ? `Rs ${fmtNum(item.rate)}` : "-"}</td>
<td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
{aiRate > 0 ? (<div><div style={{ color: "#00C896", fontWeight: "700" }}>Rs {fmtNum(aiRate)}</div>{savingsPct !== 0 && <div style={{ color: savingsPct > 0 ? "#00C896" : "#FF4D4D", fontSize: "10px", marginTop: "1px" }}>{savingsPct > 0 ? "down" : "up"} {Math.abs(savingsPct)}% vs PDF</div>}</div>) : <span style={{ color: "#3A5068" }}>-</span>}
</td>
<td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
<span style={{ color: "#6B7F8E", fontSize: "13px" }}>Rs</span>
<input type="number" placeholder={item.needsRate ? "Enter rate" : ""} value={editedRate || ""} onFocus={(e) => e.target.select()} onChange={(e) => { const val = e.target.value; props.onRateChange(idx, val === "" ? 0 : parseFloat(val) || 0); }} style={{ width: "100px", padding: "6px 10px", background: changed ? "rgba(245,166,35,0.1)" : "#0F1923", border: `1px solid ${item.needsRate && editedRate === 0 ? "#F5A623" : changed ? "#F5A623" : "#2A3F54"}`, borderRadius: "6px", color: changed ? "#F5A623" : "#E8EDF2", fontSize: "13px", fontWeight: "600", outline: "none" }} />
</div>
</td>
<td style={{ padding: "12px 14px", fontWeight: "700", whiteSpace: "nowrap", color: item.quantity === 0 ? "#3A5068" : "#E8EDF2" }}>{item.quantity === 0 ? "-" : fmt(yourAmount)}</td>
<td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
<button onClick={() => props.onViewAnalysis(idx)} style={{ background: "rgba(26,83,158,0.15)", border: "1px solid rgba(26,83,158,0.3)", color: "#5b9bd5", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "700" }}>Rate Analysis</button>
</td>
</tr>
);
})}
</tbody>
</table>
</div>
);
}

function ProfitMeter(props: { margin: number }) {
const margin = props.margin;
const clamped = Math.max(-20, Math.min(40, margin));
const pct = ((clamped + 20) / 60) * 100;
const color = margin >= 10 ? "#00C896" : margin >= 6 ? "#F5A623" : "#FF4D4D";
const label = margin >= 10 ? "STRONG BID" : margin >= 6 ? "MARGINAL" : "LOSS RISK";
return (
<div style={{ marginBottom: "8px" }}>
<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
<span style={{ color: "#6B7F8E", fontSize: "11px", fontWeight: "700", letterSpacing: "1px" }}>PROFIT MARGIN</span>
<span style={{ color, fontSize: "11px", fontWeight: "800", letterSpacing: "1px" }}>{label}</span>
</div>
<div style={{ height: "8px", background: "#0F1923", borderRadius: "4px", overflow: "hidden", marginBottom: "6px" }}>
<div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #FF4D4D, #F5A623, #00C896)", borderRadius: "4px", transition: "width 0.5s ease" }} />
</div>
<div style={{ textAlign: "center" }}>
<span style={{ color, fontSize: "42px", fontWeight: "900", fontFamily: "monospace" }}>{margin > 0 ? "+" : ""}{margin}%</span>
</div>
</div>
);
}

function PctInput(props: { label: string; sublabel: string; value: number; onChange: (v: number) => void; basis: string; color: string }) {
const [raw, setRaw] = useState(String(props.value));
return (
<div style={{ background: "#0F1923", borderRadius: "10px", padding: "16px", border: "1px solid #2A3F54" }}>
<div style={{ color: "#E8EDF2", fontSize: "13px", fontWeight: "700", marginBottom: "2px" }}>{props.label}</div>
<div style={{ color: "#3A5068", fontSize: "11px", marginBottom: "12px", lineHeight: "1.4" }}>{props.sublabel}</div>
<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
<input type="number" min="0" max="50" step="0.5" value={raw} onFocus={(e) => e.target.select()} onChange={(e) => { setRaw(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0) props.onChange(n); }} onBlur={(e) => { const n = parseFloat(e.target.value); if (isNaN(n) || n < 0) { setRaw("0"); props.onChange(0); } else setRaw(String(n)); }} style={{ width: "70px", padding: "8px 10px", background: "#1A2A3A", border: `1px solid ${props.color}40`, borderRadius: "6px", color: props.color, fontSize: "16px", fontWeight: "800", outline: "none" }} />
<div><div style={{ color: props.color, fontSize: "16px", fontWeight: "800" }}>%</div><div style={{ color: "#3A5068", fontSize: "10px" }}>{props.basis}</div></div>
</div>
</div>
);
}

function NumInput(props: { label: string; sublabel: string; value: number; onChange: (v: number) => void; suffix: string; color: string; min?: number; max?: number }) {
const [raw, setRaw] = useState(String(props.value));
return (
<div style={{ background: "#0F1923", borderRadius: "10px", padding: "16px", border: "1px solid #2A3F54" }}>
<div style={{ color: "#E8EDF2", fontSize: "13px", fontWeight: "700", marginBottom: "2px" }}>{props.label}</div>
<div style={{ color: "#3A5068", fontSize: "11px", marginBottom: "12px", lineHeight: "1.4" }}>{props.sublabel}</div>
<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
<input type="number" min={props.min ?? 1} max={props.max ?? 999} step="1" value={raw} onFocus={(e) => e.target.select()} onChange={(e) => { setRaw(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n) && n > 0) props.onChange(n); }} onBlur={(e) => { const n = parseFloat(e.target.value); if (isNaN(n) || n <= 0) { setRaw("1"); props.onChange(1); } else setRaw(String(n)); }} style={{ width: "80px", padding: "8px 10px", background: "#1A2A3A", border: `1px solid ${props.color}40`, borderRadius: "6px", color: props.color, fontSize: "16px", fontWeight: "800", outline: "none" }} />
<div style={{ color: props.color, fontSize: "14px", fontWeight: "700" }}>{props.suffix}</div>
</div>
</div>
);
}

import AuthGate from "./AuthGate";

function MainApp({ userId, phoneNumber, userEmail }: { userId: string; phoneNumber: string; userEmail: string }) {

const [uploadState, setUploadState] = useState<"idle" | "loading" | "done" | "error">("idle");
const [loadingStep, setLoadingStep] = useState(0);
const [result, setResult] = useState<UploadResult | null>(null);
const [items, setItems] = useState<BOQItem[]>([]);
const [errorMsg, setErrorMsg] = useState("");
const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
const [selectedState, setSelectedState] = useState("Maharashtra");
const stepTimer = useRef<any>(null);

const [facilitation, setFacilitation] = useState(3);
const [overhead, setOverhead] = useState(8);
const [wastage, setWastage] = useState(5);
const [labourEscalation, setLabourEscalation] = useState(2);
const [bidPercent, setBidPercent] = useState(92);
const [bidPercentRaw, setBidPercentRaw] = useState("92");
const [projectMonths, setProjectMonths] = useState(6);
const [raCycleDays, setRaCycleDays] = useState(60);

const handleUpload = async (file: File) => {
setUploadState("loading"); setLoadingStep(0); setErrorMsg("");
let step = 0;
const advanceStep = () => { step = Math.min(step + 1, 4); setLoadingStep(step); if (step < 4) stepTimer.current = setTimeout(advanceStep, 12000); };
stepTimer.current = setTimeout(advanceStep, 8000);
try {
const formData = new FormData();
formData.append("pdf", file);
formData.append("tenderType", "Civil");
formData.append("tenderTitle", file.name.replace(".pdf", ""));
formData.append("state", selectedState);
const response = await fetch("https://boq-service-pov7.onrender.com/api/boq-upload", { method: "POST", body: formData });
clearTimeout(stepTimer.current);
if (!response.ok) { const err = await response.json(); throw new Error(err.error || "Upload failed"); }
const data: UploadResult = await response.json();
if (data.success && data.boq) {
setResult(data);
setItems(data.boq.boqItems.map(item => ({ ...item, editedRate: item.needsRate ? 0 : (item.aiRate ?? item.rate) })));
if (data.boq.executionDays) setProjectMonths(Math.ceil(data.boq.executionDays / 30));
setUploadState('done');
if (userId) incrementUploadCount(userId, phoneNumber);
} else { throw new Error('Analysis failed'); }
} catch (err: any) { clearTimeout(stepTimer.current); setErrorMsg(err.message || "Something went wrong"); setUploadState("error"); }
};

const handleRateChange = (idx: number, rate: number) => { setItems(prev => prev.map((item, i) => i === idx ? { ...item, editedRate: rate } : item)); };
const handleReset = () => { setUploadState("idle"); setResult(null); setItems([]); setErrorMsg(""); setLoadingStep(0); setSelectedItemIdx(null); };

const deptEstimate = result?.boq.departmentEstimate || 0;
const expectedWinningBid = Math.round(deptEstimate * (bidPercent / 100));
const executionCost = items.reduce((sum, item) => sum + (item.quantity * (item.editedRate ?? item.aiRate ?? item.rate ?? 0)), 0);
const facilitationCost = Math.round(expectedWinningBid * (facilitation / 100));
const overheadCost = Math.round(executionCost * (overhead / 100));
const wastageCost = Math.round(executionCost * (wastage / 100));
const labourEscCost = Math.round(executionCost * (labourEscalation / 100));
const totalRealCost = executionCost + facilitationCost + overheadCost + wastageCost + labourEscCost;
const realProfit = expectedWinningBid - totalRealCost;
const profitMargin = expectedWinningBid > 0 ? Math.round((realProfit / expectedWinningBid) * 100) : 0;
const monthlySpend = projectMonths > 0 ? Math.round(totalRealCost / projectMonths) : 0;
const raCycleMonths = raCycleDays / 30;
const minWorkingCapital = Math.round(monthlySpend * (raCycleMonths + 1));
const recommendedWorkingCapital = Math.round(monthlySpend * (raCycleMonths + 2));
const bidDecision = profitMargin >= 10 ? "BID" : profitMargin >= 6 ? "REVIEW" : "AVOID";
const bidColor = profitMargin >= 10 ? "#00C896" : profitMargin >= 6 ? "#F5A623" : "#FF4D4D";
const bidBg = profitMargin >= 10 ? "rgba(0,200,150,0.1)" : profitMargin >= 6 ? "rgba(245,166,35,0.1)" : "rgba(255,77,77,0.1)";
const bidReason = profitMargin >= 10 ? `Strong ${profitMargin}% margin - good candidate to bid` : profitMargin >= 6 ? `Marginal ${profitMargin}% margin - evaluate competition carefully` : `Only ${profitMargin}% margin - high risk of financial loss`;
const aiExecutionCost = items.reduce((sum, item) => sum + (item.quantity * (item.aiRate ?? item.rate ?? 0)), 0);
const pdfBasedCost = items.reduce((sum, item) => sum + (item.quantity * (item.rate ?? 0)), 0);
const needsRateCount = items.filter(it => it.needsRate && (it.editedRate ?? 0) === 0).length;
const activeState = result?.boq.selectedState || selectedState;

return (
<div style={{ minHeight: "100vh", background: "#0F1923", fontFamily: "'Inter', 'DM Sans', sans-serif", color: "#E8EDF2" }}>

<div style={{ borderBottom: "1px solid #1A2A3A", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
<div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
<div style={{ width: "40px", height: "40px", background: "linear-gradient(135deg, #F5A623, #FF8C00)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📐</div>
<div>
<div style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.5px" }}>Tender<span style={{ color: "#F5A623" }}>Radar</span></div>
<div style={{ fontSize: "12px", color: "#3A5068", fontWeight: "500" }}>BOQ Profit Calculator - Any Tender, Pan India</div>
</div>
</div>
{uploadState === "done" && (
<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
<div style={{ background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: "8px", padding: "6px 12px", color: "#F5A623", fontSize: "12px", fontWeight: "700" }}>{activeState}</div>
<button onClick={handleReset} style={{ background: "transparent", border: "1px solid #2A3F54", color: "#6B7F8E", padding: "8px 18px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>Upload New PDF</button>
</div>
)}
</div>

<div style={{ maxWidth: "1300px", margin: "0 auto", padding: "32px 24px" }}>

{uploadState === "idle" && (
<div style={{ maxWidth: "700px", margin: "0 auto" }}>
<div style={{ textAlign: "center", marginBottom: "40px" }}>
<div style={{ display: "inline-block", background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: "20px", padding: "6px 16px", color: "#F5A623", fontSize: "12px", fontWeight: "700", letterSpacing: "1px", marginBottom: "20px" }}>BEFORE YOU BID - KNOW YOUR PROFIT</div>
<h1 style={{ fontSize: "40px", fontWeight: "900", lineHeight: "1.15", letterSpacing: "-1px", marginBottom: "16px" }}>Will this tender<br /><span style={{ color: "#F5A623" }}>make you money?</span></h1>
<p style={{ color: "#6B7F8E", fontSize: "16px", lineHeight: "1.7" }}>Upload any BOQ PDF from any tender portal across India. We estimate real execution rates. You confirm or adjust. See your true profit.</p>
</div>
<UploadZone onUpload={handleUpload} selectedState={selectedState} onStateChange={setSelectedState} />
<div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
{[{ icon: "📋", title: "Upload BOQ", desc: "Any tender PDF - government or private, any state" }, { icon: "🤖", title: "AI Estimates Rates", desc: "Real execution cost calibrated for your state" }, { icon: "💰", title: "See Real Profit", desc: "Including facilitation, overhead and working capital" }].map((s, i) => (
<div key={i} style={{ background: "#1A2A3A", borderRadius: "12px", padding: "20px", border: "1px solid #2A3F54", textAlign: "center" }}>
<div style={{ fontSize: "28px", marginBottom: "10px" }}>{s.icon}</div>
<div style={{ color: "#E8EDF2", fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>{s.title}</div>
<div style={{ color: "#3A5068", fontSize: "12px" }}>{s.desc}</div>
</div>
))}
</div>
</div>
)}

{uploadState === "loading" && (
<div style={{ maxWidth: "500px", margin: "0 auto" }}>
<div style={{ background: "#1A2A3A", borderRadius: "16px", padding: "40px", border: "1px solid #2A3F54" }}>
<div style={{ textAlign: "center", marginBottom: "32px" }}>
<div style={{ fontSize: "48px", marginBottom: "12px" }}>⚙️</div>
<div style={{ color: "#E8EDF2", fontSize: "18px", fontWeight: "700" }}>Reading your BOQ PDF</div>
<div style={{ color: "#6B7F8E", fontSize: "13px", marginTop: "4px" }}>Extracting all items. Please wait 30 to 60 seconds.</div>
</div>
<LoadingSteps step={loadingStep} />
<div style={{ marginTop: "24px", height: "3px", background: "#0F1923", borderRadius: "2px", overflow: "hidden" }}>
<div style={{ height: "100%", width: `${((loadingStep + 1) / 5) * 100}%`, background: "linear-gradient(90deg, #F5A623, #FF8C00)", borderRadius: "2px", transition: "width 1s ease" }} />
</div>
</div>
</div>
)}

{uploadState === "error" && (
<div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
<div style={{ background: "rgba(255,77,77,0.1)", borderRadius: "16px", padding: "40px", border: "1px solid rgba(255,77,77,0.2)" }}>
<div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
<div style={{ color: "#FF4D4D", fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Upload Failed</div>
<div style={{ color: "#6B7F8E", fontSize: "14px", marginBottom: "24px" }}>{errorMsg}</div>
<button onClick={handleReset} style={{ background: "#F5A623", color: "#0F1923", border: "none", padding: "12px 28px", borderRadius: "8px", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>Try Again</button>
</div>
</div>
)}

{uploadState === "done" && result && (
<div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px", alignItems: "start" }}>
<div>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
<div>
<h2 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 6px 0" }}>Bill of Quantities</h2>
<div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: result.pdfRead ? "rgba(0,200,150,0.1)" : "rgba(245,166,35,0.1)", border: `1px solid ${result.pdfRead ? "rgba(0,200,150,0.3)" : "rgba(245,166,35,0.3)"}`, borderRadius: "20px", padding: "4px 12px", color: result.pdfRead ? "#00C896" : "#F5A623", fontSize: "12px", fontWeight: "700" }}>{result.message}</div>
</div>
</div>

{needsRateCount > 0 && (
<div style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.25)", borderRadius: "10px", padding: "12px 16px", marginBottom: "12px", color: "#F5A623", fontSize: "13px" }}>
{needsRateCount} item(s) need manual rate entry - enter rates from your tender document for accurate totals.
</div>
)}

<div style={{ display: "flex", gap: "16px", marginBottom: "12px", flexWrap: "wrap" }}>
<div style={{ fontSize: "12px", color: "#6B7F8E" }}><span style={{ color: "#6B7F8E", fontWeight: "700" }}>PDF Rate</span> = Tender SOR rate</div>
<div style={{ fontSize: "12px", color: "#6B7F8E" }}><span style={{ color: "#00C896", fontWeight: "700" }}>AI Estimate</span> = Real execution cost ({activeState})</div>
<div style={{ fontSize: "12px", color: "#6B7F8E" }}><span style={{ color: "#F5A623", fontWeight: "700" }}>Your Rate</span> = Edit if you know better</div>
<div style={{ fontSize: "12px", color: "#5b9bd5" }}><span style={{ color: "#5b9bd5", fontWeight: "700" }}>Rate Analysis</span> = Detailed breakdown per item</div>
</div>

<div style={{ background: "#1A2A3A", borderRadius: "12px", border: "1px solid #2A3F54", overflow: "hidden", marginBottom: "12px" }}>
<BOQTable items={items} onRateChange={handleRateChange} onViewAnalysis={(idx) => setSelectedItemIdx(idx)} />
</div>

<div style={{ display: "flex", gap: "12px", marginBottom: "32px", flexWrap: "wrap" }}>
<button onClick={() => setItems(prev => prev.map(item => ({ ...item, editedRate: item.needsRate ? 0 : (item.aiRate ?? item.rate) })))} style={{ background: "transparent", border: "1px solid #2A3F54", color: "#6B7F8E", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>Reset to AI Estimates</button>
<button onClick={() => setItems(prev => prev.map(item => ({ ...item, editedRate: item.needsRate ? (item.editedRate ?? 0) : item.rate })))} style={{ background: "transparent", border: "1px solid #2A3F54", color: "#6B7F8E", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>Use PDF Rates Instead</button>
</div>

<div style={{ background: "#1A2A3A", borderRadius: "12px", border: "1px solid #2A3F54", padding: "24px", marginBottom: "24px" }}>
<h3 style={{ fontSize: "15px", fontWeight: "800", marginBottom: "4px" }}>Additional Costs</h3>
<p style={{ color: "#6B7F8E", fontSize: "13px", marginBottom: "24px" }}>Real costs not shown in BOQ - adjust to match your situation</p>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
<PctInput label="Officer Facilitation" sublabel="Payments to clear work orders, inspections, approvals" value={facilitation} onChange={setFacilitation} basis="% of winning bid" color="#FF4D4D" />
<PctInput label="Office Overhead" sublabel="Admin, staff, transport, site office costs" value={overhead} onChange={setOverhead} basis="% of execution cost" color="#F5A623" />
<PctInput label="Material Wastage" sublabel="On-site wastage, theft, spoilage allowance" value={wastage} onChange={setWastage} basis="% of execution cost" color="#F5A623" />
<PctInput label="Labour Escalation" sublabel="Rate increase over project duration" value={labourEscalation} onChange={setLabourEscalation} basis="% of execution cost" color="#F5A623" />
</div>
<div style={{ marginTop: "16px", background: "#0F1923", borderRadius: "10px", padding: "16px", border: "1px solid #2A3F54" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
<div>
<div style={{ color: "#E8EDF2", fontSize: "13px", fontWeight: "700" }}>Your Bid Percentage</div>
<div style={{ color: "#3A5068", fontSize: "11px", marginTop: "2px" }}>Percent of tender estimate you plan to quote</div>
</div>
<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
<input type="number" min="70" max="100" step="0.5" value={bidPercentRaw} onFocus={(e) => e.target.select()} onChange={(e) => { setBidPercentRaw(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 70 && n <= 100) setBidPercent(n); }} onBlur={(e) => { const n = parseFloat(e.target.value); if (isNaN(n) || n < 70) { setBidPercentRaw("70"); setBidPercent(70); } else if (n > 100) { setBidPercentRaw("100"); setBidPercent(100); } else setBidPercentRaw(String(n)); }} style={{ width: "75px", padding: "8px 10px", background: "#1A2A3A", border: "1px solid #00C89640", borderRadius: "6px", color: "#00C896", fontSize: "16px", fontWeight: "800", outline: "none" }} />
<div style={{ color: "#00C896", fontSize: "16px", fontWeight: "800" }}>%</div>
</div>
</div>
</div>
</div>

<div style={{ background: "#1A2A3A", borderRadius: "12px", border: "1px solid #2A3F54", padding: "24px", marginBottom: "24px" }}>
<h3 style={{ fontSize: "15px", fontWeight: "800", marginBottom: "4px" }}>Working Capital Calculator</h3>
<p style={{ color: "#6B7F8E", fontSize: "13px", marginBottom: "24px" }}>How much cash you need before starting this tender</p>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
<NumInput label="Project Duration" sublabel="Total months to complete the work" value={projectMonths} onChange={setProjectMonths} suffix="months" color="#00C896" min={1} max={60} />
<NumInput label="RA Bill Payment Cycle" sublabel="Days after RA bill submission for payment" value={raCycleDays} onChange={setRaCycleDays} suffix="days" color="#F5A623" min={15} max={180} />
</div>
<div style={{ background: "#0F1923", borderRadius: "10px", padding: "20px", border: "1px solid #2A3F54" }}>
<div style={{ color: "#6B7F8E", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "16px" }}>WORKING CAPITAL ANALYSIS</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1A2A3A" }}>
<div><div style={{ color: "#E8EDF2", fontSize: "13px", fontWeight: "600" }}>Monthly Spend</div><div style={{ color: "#3A5068", fontSize: "11px" }}>Total cost divided by {projectMonths} months</div></div>
<div style={{ color: "#E8EDF2", fontSize: "16px", fontWeight: "800", fontFamily: "monospace" }}>{fmt(monthlySpend)}<span style={{ color: "#3A5068", fontSize: "11px" }}>/mo</span></div>
</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1A2A3A" }}>
<div><div style={{ color: "#FF4D4D", fontSize: "13px", fontWeight: "600" }}>Minimum Capital Needed</div><div style={{ color: "#3A5068", fontSize: "11px" }}>{fmt(monthlySpend)} times {(raCycleDays / 30 + 1).toFixed(1)} months</div></div>
<div style={{ color: "#FF4D4D", fontSize: "18px", fontWeight: "800", fontFamily: "monospace" }}>{fmt(minWorkingCapital)}</div>
</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1A2A3A" }}>
<div><div style={{ color: "#F5A623", fontSize: "13px", fontWeight: "600" }}>Recommended Capital</div><div style={{ color: "#3A5068", fontSize: "11px" }}>{fmt(monthlySpend)} times {(raCycleDays / 30 + 2).toFixed(1)} months</div></div>
<div style={{ color: "#F5A623", fontSize: "18px", fontWeight: "800", fontFamily: "monospace" }}>{fmt(recommendedWorkingCapital)}</div>
</div>
<div style={{ marginTop: "14px", background: "rgba(0,200,150,0.05)", borderRadius: "8px", padding: "12px", border: "1px solid rgba(0,200,150,0.1)" }}>
<div style={{ color: "#00C896", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>For Bank Loan Application</div>
<div style={{ color: "#6B7F8E", fontSize: "12px", lineHeight: "1.6" }}>Request <strong style={{ color: "#E8EDF2" }}>{fmt(recommendedWorkingCapital)}</strong> as working capital loan. Repayable from RA bills every {raCycleDays} days. Total tender value: <strong style={{ color: "#E8EDF2" }}>{fmt(expectedWinningBid)}</strong>.</div>
</div>
</div>
</div>
</div>

<div style={{ position: 'sticky', top: '24px', backgroundColor: '#0F1923' }}>
<div style={{ background: bidBg, border: `2px solid ${bidColor}40`, borderRadius: "16px", padding: "24px", marginBottom: "16px", textAlign: "center" }}>
<div style={{ color: bidColor, fontSize: "11px", fontWeight: "800", letterSpacing: "2px", marginBottom: "8px" }}>BID DECISION</div>
<div style={{ color: bidColor, fontSize: "48px", fontWeight: "900", letterSpacing: "-2px", marginBottom: "8px" }}>{bidDecision}</div>
<ProfitMeter margin={profitMargin} />
<div style={{ color: "#6B7F8E", fontSize: "12px", marginTop: "8px", lineHeight: "1.5" }}>{bidReason}</div>
</div>

<div style={{ background: "#1A2A3A", borderRadius: "12px", border: "1px solid #2A3F54", padding: "20px", marginBottom: "16px" }}>
<div style={{ color: "#6B7F8E", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>RATE COMPARISON (TOTAL)</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #0F1923" }}>
<div style={{ color: "#6B7F8E", fontSize: "12px" }}>If using PDF rates</div>
<div style={{ color: "#6B7F8E", fontSize: "14px", fontWeight: "700", fontFamily: "monospace" }}>{fmt(pdfBasedCost)}</div>
</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #0F1923" }}>
<div style={{ color: "#00C896", fontSize: "12px", fontWeight: "600" }}>AI estimated execution</div>
<div style={{ color: "#00C896", fontSize: "14px", fontWeight: "700", fontFamily: "monospace" }}>{fmt(aiExecutionCost)}</div>
</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
<div style={{ color: "#F5A623", fontSize: "12px", fontWeight: "600" }}>Your edited total</div>
<div style={{ color: "#F5A623", fontSize: "14px", fontWeight: "700", fontFamily: "monospace" }}>{fmt(executionCost)}</div>
</div>
</div>

<div style={{ background: "#1A2A3A", borderRadius: "12px", border: "1px solid #2A3F54", padding: "20px", marginBottom: "16px" }}>
<div style={{ color: "#6B7F8E", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "16px" }}>FINANCIAL SUMMARY</div>
{[
{ label: "Tender Estimate", value: fmt(deptEstimate), color: "#E8EDF2", sub: "Sum of BOQ at tender SOR rates" },
{ label: "Your Winning Bid", value: fmt(expectedWinningBid), color: "#00C896", sub: `${bidPercent}% of estimate` },
{ label: "Execution Cost", value: fmt(executionCost), color: "#E8EDF2", sub: "At your edited rates" },
{ label: "Facilitation Cost", value: fmt(facilitationCost), color: "#FF4D4D", sub: `${facilitation}% of bid` },
{ label: "Overhead Wastage Escalation", value: fmt(overheadCost + wastageCost + labourEscCost), color: "#F5A623", sub: "All additional costs" },
{ label: "Total Real Cost", value: fmt(totalRealCost), color: "#E8EDF2", sub: "Everything you spend", bold: true },
{ label: realProfit >= 0 ? "Net Profit" : "Net Loss", value: fmt(Math.abs(realProfit)), color: realProfit >= 0 ? "#00C896" : "#FF4D4D", sub: realProfit >= 0 ? "You keep this" : "You lose this", bold: true },
].map((row) => (
<div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #0F1923" }}>
<div><div style={{ color: "#6B7F8E", fontSize: "12px" }}>{row.label}</div><div style={{ color: "#3A5068", fontSize: "10px" }}>{row.sub}</div></div>
<div style={{ color: row.color, fontSize: row.bold ? "15px" : "14px", fontWeight: row.bold ? "800" : "600", fontFamily: "monospace" }}>{row.value}</div>
</div>
))}
</div>

<div style={{ background: "#1A2A3A", borderRadius: "12px", border: "1px solid #2A3F54", padding: "20px", marginBottom: "16px" }}>
<div style={{ color: "#6B7F8E", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>WORKING CAPITAL</div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
<div style={{ background: "#0F1923", borderRadius: "8px", padding: "12px", border: "1px solid rgba(255,77,77,0.2)" }}><div style={{ color: "#6B7F8E", fontSize: "10px", fontWeight: "700", marginBottom: "4px" }}>MINIMUM</div><div style={{ color: "#FF4D4D", fontSize: "16px", fontWeight: "800" }}>{fmt(minWorkingCapital)}</div><div style={{ color: "#3A5068", fontSize: "10px", marginTop: "2px" }}>Must have upfront</div></div>
<div style={{ background: "#0F1923", borderRadius: "8px", padding: "12px", border: "1px solid rgba(245,166,35,0.2)" }}><div style={{ color: "#6B7F8E", fontSize: "10px", fontWeight: "700", marginBottom: "4px" }}>RECOMMENDED</div><div style={{ color: "#F5A623", fontSize: "16px", fontWeight: "800" }}>{fmt(recommendedWorkingCapital)}</div><div style={{ color: "#3A5068", fontSize: "10px", marginTop: "2px" }}>Safe with delays</div></div>
<div style={{ background: "#0F1923", borderRadius: "8px", padding: "12px", border: "1px solid #2A3F54" }}><div style={{ color: "#6B7F8E", fontSize: "10px", fontWeight: "700", marginBottom: "4px" }}>MONTHLY SPEND</div><div style={{ color: "#E8EDF2", fontSize: "16px", fontWeight: "800" }}>{fmt(monthlySpend)}</div><div style={{ color: "#3A5068", fontSize: "10px", marginTop: "2px" }}>Per month</div></div>
<div style={{ background: "#0F1923", borderRadius: "8px", padding: "12px", border: "1px solid #2A3F54" }}><div style={{ color: "#6B7F8E", fontSize: "10px", fontWeight: "700", marginBottom: "4px" }}>RA CYCLE</div><div style={{ color: "#6B7F8E", fontSize: "16px", fontWeight: "800" }}>{raCycleDays} days</div><div style={{ color: "#3A5068", fontSize: "10px", marginTop: "2px" }}>Payment every</div></div>
</div>
</div>

<div style={{ background: "#1A2A3A", borderRadius: "12px", border: "1px solid #2A3F54", padding: "20px", marginBottom: "16px" }}>
<div style={{ color: "#6B7F8E", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>RETURNS</div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
<div style={{ background: "#0F1923", borderRadius: "8px", padding: "12px", border: "1px solid #2A3F54" }}><div style={{ color: "#6B7F8E", fontSize: "10px", fontWeight: "700", marginBottom: "4px" }}>ROI</div><div style={{ color: realProfit > 0 ? "#00C896" : "#FF4D4D", fontSize: "16px", fontWeight: "800" }}>{totalRealCost > 0 ? `${Math.round((realProfit / totalRealCost) * 100)}%` : "-"}</div><div style={{ color: "#3A5068", fontSize: "10px", marginTop: "2px" }}>Return on investment</div></div>
<div style={{ background: "#0F1923", borderRadius: "8px", padding: "12px", border: "1px solid #2A3F54" }}><div style={{ color: "#6B7F8E", fontSize: "10px", fontWeight: "700", marginBottom: "4px" }}>DURATION</div><div style={{ color: "#6B7F8E", fontSize: "16px", fontWeight: "800" }}>{projectMonths} months</div><div style={{ color: "#3A5068", fontSize: "10px", marginTop: "2px" }}>Project timeline</div></div>
</div>
</div>

{result.boq.riskFactors && result.boq.riskFactors.length > 0 && (
<div style={{ background: "rgba(245,166,35,0.05)", borderRadius: "12px", border: "1px solid rgba(245,166,35,0.15)", padding: "16px" }}>
<div style={{ color: "#F5A623", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "10px" }}>RISK FACTORS</div>
{result.boq.riskFactors.map((r, i) => (<div key={i} style={{ color: "#6B7F8E", fontSize: "12px", marginBottom: "6px", lineHeight: "1.5" }}>- {r}</div>))}
</div>
)}
</div>
</div>
)}
</div>

{selectedItemIdx !== null && items[selectedItemIdx] && (
<ItemRateAnalysis item={items[selectedItemIdx]} itemNumber={selectedItemIdx + 1} state={activeState} onClose={() => setSelectedItemIdx(null)} />
)}

<style>{`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
input[type=number] { -moz-appearance: textfield; }
select option { background: #1A2A3A; color: #E8EDF2; }
@media print {
body * { visibility: hidden; }
.annexure-print, .annexure-print * { visibility: visible; }
.annexure-print { position: absolute; left: 0; top: 0; max-height: none; }
.no-print { display: none; }
}
`}</style>
</div>
);
}

export default function App() {
return (
<AuthGate>
{(user, phoneNumber) => <MainApp userId={user.uid} phoneNumber={phoneNumber} userEmail={user.email || ""} />}
</AuthGate>
);
}




