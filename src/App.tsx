import { useState, useEffect } from "react";

const PORTALS = ["BMC", "GeM", "CPPP", "PWD Maharashtra", "MMRDA", "MSRDC"];
const WORK_TYPES = ["All", "Civil", "Roads & Infrastructure", "Sanitary", "Sewerage", "Electrical & Mechanical"];

const portalColors: Record<string, string> = {
BMC: "#0369a1", GeM: "#065f46", CPPP: "#6d28d9",
"PWD Maharashtra": "#92400e", MMRDA: "#9f1239", MSRDC: "#c2410c",
};
const portalBg: Record<string, string> = {
BMC: "#e0f2fe", GeM: "#d1fae5", CPPP: "#ede9fe",
"PWD Maharashtra": "#fef3c7", MMRDA: "#ffe4e6", MSRDC: "#ffedd5",
};

interface BOQItem { item: string; unit: string; quantity: number; rate: number; amount: number; }
interface BOQData {
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
}

interface EnrichData {
tenderValue: number;
tenderValueText: string;
emd: number;
emdText: string;
workDescription?: string;
dataSource: string;
confidence: string;
}

interface Tender {
id: number; portal: string; title: string; type: string; value: string; emd: string;
valueNum: number; deadline: string; location: string; status: string; summary: string;
docs: string[]; risk: string; organisation?: string; refNo?: string; pdfUrl?: string; tenderUrl?: string;
}

const SAMPLE_TENDERS: Tender[] = [
{ id: 1, portal: "BMC", title: "Reconstruction of Internal Roads at Kurla Ward", type: "Roads & Infrastructure", value: "₹1.85 Cr", emd: "₹3.70 L", valueNum: 18500000, deadline: "12 days", location: "Kurla, Mumbai", status: "new", summary: "Reconstruction and resurfacing of internal roads across 4 sectors in Kurla Ward.", docs: ["Registration Certificate", "ITR (3 years)", "Experience Certificate", "Solvency Certificate"], risk: "low", organisation: "BMC Mumbai" },
{ id: 2, portal: "BMC", title: "Sewerage Network Upgradation — Andheri East Zone", type: "Sewerage", value: "₹4.20 Cr", emd: "₹8.40 L", valueNum: 42000000, deadline: "18 days", location: "Andheri East, Mumbai", status: "new", summary: "Laying of new sewerage lines, manholes, and junction chambers in Andheri East.", docs: ["Registration Certificate", "Similar Work Experience (₹2Cr+)", "Solvency Certificate", "GST Registration"], risk: "medium", organisation: "BMC Mumbai" },
{ id: 3, portal: "PWD Maharashtra", title: "Repair of Sanitary Installations — Govt. Buildings Worli", type: "Sanitary", value: "₹38 L", emd: "₹76,000", valueNum: 3800000, deadline: "21 days", location: "Worli, Mumbai", status: "open", summary: "Annual maintenance and repair of sanitary fittings across 6 government buildings.", docs: ["Registration Certificate", "Plumbing License", "GST Registration"], risk: "low", organisation: "PWD Maharashtra" },
];

function cleanDeadline(deadline: string): string {
if (!deadline) return 'Check Portal';
if (deadline === 'Check Portal' || deadline === 'Today' || deadline === 'Tomorrow' || deadline === 'Expired') return deadline;
if (deadline.includes(' days')) return deadline;
let fixed = deadline.replace(/(\d{2})\s+(\w+),?\s+(\d{4})\d+/g, (_match, day, month, year) => `${day} ${month}, ${year.substring(0, 4)}`);
fixed = fixed.replace(/(\d{4})\d{4,8}$/, '$1').trim();
try {
const date = new Date(fixed);
if (!isNaN(date.getTime())) {
const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
if (days < 0) return 'Expired';
if (days === 0) return 'Today';
if (days === 1) return 'Tomorrow';
return `${days} days`;
}
} catch {}
return fixed;
}

function fmt(n: number): string {
if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + " L";
if (n >= 1000) return "₹" + (n / 1000).toFixed(0) + "K";
return "₹" + n;
}

const riskConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
low: { color: "#166534", bg: "#dcfce7", border: "#bbf7d0", label: "Low Risk" },
medium: { color: "#92400e", bg: "#fef3c7", border: "#fde68a", label: "Medium Risk" },
high: { color: "#991b1b", bg: "#fee2e2", border: "#fecaca", label: "High Risk" },
};
const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
new: { color: "#1d4ed8", bg: "#dbeafe", label: "New" },
urgent: { color: "#b91c1c", bg: "#fee2e2", label: "Urgent" },
open: { color: "#6d28d9", bg: "#ede9fe", label: "Open" },
};

function Badge({ children, color, bg, border }: { children: React.ReactNode; color: string; bg: string; border?: string }) {
return <span style={{ background: bg, color, border: `1px solid ${border || bg}`, borderRadius: "5px", padding: "2px 9px", fontSize: "11px", fontWeight: "700" }}>{children}</span>;
}

function DecisionCard({ boq }: { boq: BOQData }) {
const recColor = boq.bidRecommendation === 'YES' ? '#166534' : boq.bidRecommendation === 'REVIEW' ? '#92400e' : '#991b1b';
const recBg = boq.bidRecommendation === 'YES' ? '#dcfce7' : boq.bidRecommendation === 'REVIEW' ? '#fef3c7' : '#fee2e2';
const recIcon = boq.bidRecommendation === 'YES' ? '✅' : boq.bidRecommendation === 'REVIEW' ? '⚠️' : '❌';
return (
<div style={{ background: recBg, border: `2px solid ${recColor}`, borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
<div>
<div style={{ color: recColor, fontSize: "11px", fontWeight: "800", letterSpacing: "1px", marginBottom: "4px" }}>BID DECISION</div>
<div style={{ color: recColor, fontSize: "24px", fontWeight: "900" }}>{recIcon} {boq.bidRecommendation}</div>
</div>
<div style={{ textAlign: "right" }}>
<div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700" }}>PROFIT MARGIN</div>
<div style={{ color: recColor, fontSize: "28px", fontWeight: "900" }}>{boq.profitMargin}%</div>
</div>
</div>
<p style={{ color: recColor, fontSize: "13px", fontWeight: "600", margin: "0 0 16px 0" }}>{boq.bidRecommendationReason}</p>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
{[
{ label: "Dept Estimate", value: fmt(boq.departmentEstimate), sub: "Govt's budget" },
{ label: "Your Bid", value: fmt(boq.expectedWinningBid), sub: "Quote this to win" },
{ label: "Execution Cost", value: fmt(boq.executionCost), sub: "Your actual spend" },
].map(item => (
<div key={item.label} style={{ background: "rgba(255,255,255,0.7)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
<div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700", marginBottom: "2px" }}>{item.label}</div>
<div style={{ color: "#0f172a", fontSize: "13px", fontWeight: "800" }}>{item.value}</div>
<div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px" }}>{item.sub}</div>
</div>
))}
</div>
</div>
);
}

function WorkingCapitalCard({ boq }: { boq: BOQData }) {
return (
<div style={{ background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
<div style={{ color: "#0369a1", fontSize: "11px", fontWeight: "800", letterSpacing: "1px", marginBottom: "12px" }}>💰 WORKING CAPITAL ANALYSIS</div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
{[
{ label: "Working Capital Needed", value: fmt(boq.workingCapitalNeeded), color: "#991b1b", sub: "Need this upfront" },
{ label: "RA Payment Cycle", value: `${boq.raCycleDays} days`, color: "#0369a1", sub: "Govt pays every" },
{ label: "Expected Profit", value: fmt(boq.expectedProfit), color: "#166534", sub: "After all costs" },
{ label: "Execution Timeline", value: `${boq.executionDays} days`, color: "#6d28d9", sub: "To complete work" },
].map(item => (
<div key={item.label} style={{ background: "#fff", borderRadius: "8px", padding: "10px", border: "1px solid #e2e8f0" }}>
<div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700", marginBottom: "2px" }}>{item.label}</div>
<div style={{ color: item.color, fontSize: "15px", fontWeight: "800" }}>{item.value}</div>
<div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px" }}>{item.sub}</div>
</div>
))}
</div>
</div>
);
}

function BOQPanel({ boq, message }: { boq: BOQData; message: string }) {
const isReal = boq.dataSource === 'actual_pdf';
return (
<div>
<DecisionCard boq={boq} />
<WorkingCapitalCard boq={boq} />
<div style={{ background: isReal ? "#f0fdf4" : "#f8fafc", border: `1.5px solid ${isReal ? "#bbf7d0" : "#e2e8f0"}`, borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
<div style={{ color: isReal ? "#166534" : "#64748b", fontSize: "11px", fontWeight: "800", marginBottom: "12px" }}>{message}</div>
<div style={{ marginBottom: "12px" }}>
<div style={{ color: "#64748b", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "8px" }}>COST BIFURCATION</div>
{[
{ icon: "📦", label: "Materials", value: boq.materialCost },
{ icon: "👷", label: "Labour", value: boq.labourCost },
{ icon: "🚜", label: "Equipment", value: boq.equipmentCost },
{ icon: "🏗", label: "Overheads", value: boq.overheadCost },
{ icon: "⚡", label: "Contingency", value: boq.contingency },
].map(item => (
<div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", background: "#fff", borderRadius: "7px", marginBottom: "4px", border: "1px solid #e2e8f0" }}>
<span style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>{item.icon} {item.label}</span>
<span style={{ fontSize: "12px", fontWeight: "800", color: "#0369a1" }}>{fmt(item.value)}</span>
</div>
))}
<div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#0369a1", borderRadius: "8px", marginTop: "6px" }}>
<span style={{ color: "#fff", fontSize: "12px", fontWeight: "800" }}>TOTAL EXECUTION COST</span>
<span style={{ color: "#fff", fontSize: "12px", fontWeight: "800" }}>{fmt(boq.executionCost)}</span>
</div>
</div>
{boq.boqItems && boq.boqItems.length > 0 && (
<div style={{ marginBottom: "12px" }}>
<div style={{ color: "#64748b", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "8px" }}>BOQ LINE ITEMS</div>
<div style={{ background: "#fff", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
<div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr 1fr", padding: "8px 12px", background: "#f1f5f9" }}>
{["Item", "Unit", "Qty", "Rate", "Amount"].map(h => <span key={h} style={{ color: "#64748b", fontSize: "10px", fontWeight: "700" }}>{h}</span>)}
</div>
{boq.boqItems.slice(0, 10).map((item, i) => (
<div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr 1fr", padding: "7px 12px", borderBottom: "1px solid #f1f5f9" }}>
<span style={{ color: "#334155", fontSize: "11px" }}>{item.item}</span>
<span style={{ color: "#64748b", fontSize: "11px" }}>{item.unit}</span>
<span style={{ color: "#64748b", fontSize: "11px" }}>{item.quantity}</span>
<span style={{ color: "#64748b", fontSize: "11px" }}>₹{item.rate}</span>
<span style={{ color: "#0369a1", fontSize: "11px", fontWeight: "700" }}>{fmt(item.amount)}</span>
</div>
))}
</div>
</div>
)}
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
<div style={{ background: "#fff", borderRadius: "8px", padding: "10px", border: "1px solid #e2e8f0" }}>
<div style={{ color: "#64748b", fontSize: "10px", fontWeight: "700", marginBottom: "6px" }}>KEY MATERIALS</div>
{(boq.keyMaterials || []).map((m, i) => <div key={i} style={{ color: "#334155", fontSize: "11px", marginBottom: "2px" }}>• {m}</div>)}
</div>
<div style={{ background: "#fff", borderRadius: "8px", padding: "10px", border: "1px solid #e2e8f0" }}>
<div style={{ color: "#64748b", fontSize: "10px", fontWeight: "700", marginBottom: "6px" }}>MAJOR EQUIPMENT</div>
{(boq.majorEquipment || []).map((e, i) => <div key={i} style={{ color: "#334155", fontSize: "11px", marginBottom: "2px" }}>• {e}</div>)}
</div>
</div>
<div style={{ background: "#fffbeb", borderRadius: "8px", padding: "10px", border: "1px solid #fde68a" }}>
<div style={{ color: "#92400e", fontSize: "10px", fontWeight: "700", marginBottom: "6px" }}>⚠ RISK FACTORS</div>
{(boq.riskFactors || []).map((r, i) => <div key={i} style={{ color: "#92400e", fontSize: "11px", marginBottom: "2px" }}>• {r}</div>)}
</div>
<div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "8px" }}>
{isReal ? "✅ Extracted from actual tender PDF" : "📊 Estimated using Maharashtra PWD Schedule of Rates 2024-25. Accuracy ±15%."}
</div>
</div>
<div style={{ marginBottom: "16px" }}>
<div style={{ color: "#64748b", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "8px" }}>RA BILL CASH FLOW TIMELINE</div>
<div style={{ background: "#f8fafc", borderRadius: "10px", overflow: "hidden", border: "1.5px solid #e2e8f0" }}>
<div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "8px 14px", background: "#e2e8f0" }}>
{["Stage", "You Spend", "Govt Pays", "Net"].map(h => <span key={h} style={{ color: "#64748b", fontSize: "10px", fontWeight: "700" }}>{h}</span>)}
</div>
{[
{ stage: "RA Bill 1 (25%)", spend: Math.round(boq.executionCost * 0.25), receive: Math.round(boq.expectedWinningBid * 0.22) },
{ stage: "RA Bill 2 (50%)", spend: Math.round(boq.executionCost * 0.25), receive: Math.round(boq.expectedWinningBid * 0.23) },
{ stage: "RA Bill 3 (75%)", spend: Math.round(boq.executionCost * 0.25), receive: Math.round(boq.expectedWinningBid * 0.23) },
{ stage: "Final Bill (100%)", spend: Math.round(boq.executionCost * 0.25), receive: Math.round(boq.expectedWinningBid * 0.27) },
].map((r, i) => {
const net = r.receive - r.spend;
return (
<div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 14px", borderBottom: "1px solid #e2e8f0" }}>
<span style={{ color: "#334155", fontSize: "11px", fontWeight: "600" }}>{r.stage}</span>
<span style={{ color: "#991b1b", fontSize: "11px", fontWeight: "600" }}>{fmt(r.spend)}</span>
<span style={{ color: "#166534", fontSize: "11px", fontWeight: "600" }}>{fmt(r.receive)}</span>
<span style={{ color: net >= 0 ? "#166534" : "#991b1b", fontSize: "11px", fontWeight: "700" }}>{net >= 0 ? "+" : ""}{fmt(net)}</span>
</div>
);
})}
<div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 14px", background: "#f0fdf4" }}>
<span style={{ color: "#166534", fontSize: "11px", fontWeight: "800" }}>TOTAL</span>
<span style={{ color: "#991b1b", fontSize: "11px", fontWeight: "800" }}>{fmt(boq.executionCost)}</span>
<span style={{ color: "#166534", fontSize: "11px", fontWeight: "800" }}>{fmt(boq.expectedWinningBid)}</span>
<span style={{ color: "#166534", fontSize: "11px", fontWeight: "800" }}>+{fmt(boq.expectedProfit)}</span>
</div>
</div>
<p style={{ color: "#94a3b8", fontSize: "11px", marginTop: "6px" }}>⚠ After TDS 2%, Labour Cess 1%, Retention 5%</p>
</div>
<div>
<div style={{ color: "#64748b", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "8px" }}>MUMBAI MATERIAL RATES (TODAY)</div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
{[
{ label: "Ultratech Cement OPC 53", value: "₹420/bag" },
{ label: "TATA TMT Steel Fe500D", value: "₹63,500/MT" },
{ label: "River Sand (Zone II)", value: "₹2,800/MT" },
{ label: "20mm Aggregate", value: "₹1,950/MT" },
{ label: "Mason (Mistri)", value: "₹1,050/day" },
{ label: "JCB / Excavator", value: "₹21,000/day" }
].map(item => (
<div key={item.label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px", display: "flex", justifyContent: "space-between" }}>
<span style={{ color: "#64748b", fontSize: "11px" }}>{item.label}</span>
<span style={{ color: "#0369a1", fontSize: "11px", fontWeight: "700" }}>{item.value}</span>
</div>
))}
</div>
</div>
</div>
);
}

function DetailPanel({ tender, onClose, boqData, setBoqData, boqMessage, setBoqMessage }: {
tender: Tender;
onClose: () => void;
boqData: BOQData | null;
setBoqData: (d: BOQData | null) => void;
boqMessage: string;
setBoqMessage: (m: string) => void;
}) {
const [activeTab, setActiveTab] = useState<"overview" | "financial">("overview");
const [aiSummary, setAiSummary] = useState("");
const [aiLoading, setAiLoading] = useState(false);
const [aiGenerated, setAiGenerated] = useState(false);
const [boqLoading, setBoqLoading] = useState(false);
const [uploadLoading, setUploadLoading] = useState(false);
const [enrichData, setEnrichData] = useState<EnrichData | null>(null);
const [enrichLoading, setEnrichLoading] = useState(false);
const risk = riskConfig[tender.risk];
const deadline = cleanDeadline(tender.deadline);

useEffect(() => {
setActiveTab("overview");
setAiSummary("");
setAiGenerated(false);
setEnrichData(null);
if (tender.portal === 'BMC' && tender.value === 'See Portal') {
enrichTender();
}
}, [tender.id]);

const enrichTender = async () => {
setEnrichLoading(true);
try {
const response = await fetch("/api/enrich", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
tenderUrl: tender.tenderUrl || '',
pdfUrl: tender.pdfUrl || '',
refNo: tender.refNo || '',
title: tender.title
})
});
const data = await response.json();
if (data.tenderValue && data.tenderValue > 0) {
setEnrichData(data);
}
} catch {}
setEnrichLoading(false);
};

const displayValue = enrichData?.tenderValueText || tender.value;
const displayEmd = enrichData?.emdText || tender.emd;
const displayValueNum = enrichData?.tenderValue || tender.valueNum;

const generateAI = async () => {
setAiLoading(true);
try {
const response = await fetch("/api/analyze", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
prompt: `You are a senior advisor helping a Mumbai contractor evaluate this tender:
Tender: ${tender.title}
Portal: ${tender.portal}
Value: ${displayValue}
EMD: ${displayEmd}
Deadline: ${deadline}
Organisation: ${tender.organisation || 'BMC Mumbai'}
Risk: ${tender.risk}

Give response in 4 sections:
WHAT THE WORK IS
IS THIS WORTH BIDDING?
WATCH OUT FOR
ACTION IN NEXT 48 HOURS

Under 200 words. Direct and practical for Mumbai contractor.`
})
});
const data = await response.json();
setAiSummary(data.result || "Analysis unavailable.");
setAiGenerated(true);
} catch {
setAiSummary("Could not generate analysis. Please try again.");
setAiGenerated(true);
}
setAiLoading(false);
};

const generateBOQ = async () => {
setBoqLoading(true);
try {
const response = await fetch("https://boq-service-pov7.onrender.com/api/boq", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
tenderTitle: tender.title,
tenderValue: displayValue,
tenderValueNum: displayValueNum,
tenderType: tender.type,
organisation: tender.organisation || 'BMC Mumbai',
refNo: tender.refNo || '',
pdfUrl: tender.pdfUrl || ''
})
});
const data = await response.json();
if (data.success && data.boq) {
setBoqData(data.boq);
setBoqMessage(data.message);
setActiveTab("financial");
}
} catch {
alert("BOQ analysis failed. Please try again.");
}
setBoqLoading(false);
};

const uploadBOQPDF = async (file: File) => {
setUploadLoading(true);
try {
const formData = new FormData();
formData.append('pdf', file);
formData.append('tenderType', tender.type);
formData.append('tenderTitle', tender.title);
const response = await fetch('https://boq-service-pov7.onrender.com/api/boq-upload', {
method: 'POST',
body: formData,
});
const data = await response.json();
if (data.success && data.boq) {
setBoqData(data.boq);
setBoqMessage(data.message);
setActiveTab("financial");
} else {
alert("PDF analysis failed. Please try a different file.");
}
} catch {
alert("PDF upload failed. Please try again.");
}
setUploadLoading(false);
};

return (
<div style={{ background: "#fff", borderRadius: "16px", border: "1.5px solid #e2e8f0", padding: "24px", height: "100%", overflowY: "auto", boxSizing: "border-box", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
<Badge color={portalColors[tender.portal]} bg={portalBg[tender.portal]}>{tender.portal}</Badge>
<button onClick={onClose} style={{ background: "#f1f5f9", border: "none", color: "#64748b", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>✕ Close</button>
</div>
<h2 style={{ color: "#0f172a", fontSize: "15px", fontWeight: "800", lineHeight: "1.4", marginBottom: "16px" }}>{tender.title}</h2>

{enrichLoading && (
<div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "12px", color: "#0369a1" }}>
🔍 Fetching real tender value from BMC portal...
</div>
)}
{enrichData && enrichData.dataSource !== 'estimated' && (
<div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "12px", color: "#166534", fontWeight: "600" }}>
✅ Real tender value fetched from BMC portal ({enrichData.confidence} confidence)
</div>
)}

<button onClick={generateBOQ} disabled={boqLoading || uploadLoading || enrichLoading} style={{ width: "100%", background: boqLoading ? "#f1f5f9" : boqData ? "#166534" : "linear-gradient(135deg, #166534, #16a34a)", border: "none", color: boqLoading ? "#94a3b8" : "#fff", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: "700", cursor: boqLoading ? "not-allowed" : "pointer", marginBottom: "10px" }}>
{boqLoading ? "📊 Calculating BOQ & Bid..." : boqData ? "✅ BOQ Complete — View Financial Tab" : enrichLoading ? "⏳ Loading tender value first..." : "📊 Get BOQ Analysis & Bid Decision"}
</button>

{/* PDF Upload Section */}
<div style={{ marginBottom: "14px" }}>
<input
type="file"
accept=".pdf"
id={`boq-upload-${tender.id}`}
style={{ display: 'none' }}
onChange={(e) => {
const file = e.target.files?.[0];
if (file) uploadBOQPDF(file);
e.target.value = '';
}}
/>
<label
htmlFor={`boq-upload-${tender.id}`}
style={{
display: 'block',
width: '100%',
background: uploadLoading ? '#f1f5f9' : 'transparent',
border: '1.5px dashed #cbd5e1',
color: uploadLoading ? '#94a3b8' : '#64748b',
borderRadius: '10px',
padding: '12px',
fontSize: '12px',
fontWeight: '600',
cursor: uploadLoading ? 'not-allowed' : 'pointer',
textAlign: 'center',
boxSizing: 'border-box',
}}
>
{uploadLoading ? '⏳ Reading BOQ PDF with Adobe AI...' : '📎 Upload BOQ PDF from MahaTenders → Get Real Calculations'}
</label>
</div>

<div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
{(["overview", "financial"] as const).map(tab => (
<button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? "#0369a1" : "#f1f5f9", color: activeTab === tab ? "#fff" : "#64748b", border: "none", borderRadius: "8px", padding: "8px 18px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
{tab === "overview" ? "📋 Overview" : "💰 Financial & Bid Analysis"}
</button>
))}
</div>

{activeTab === "overview" ? (
<div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
{[
{ label: "Tender Value", value: enrichLoading ? "Loading..." : displayValue, bg: "#f0fdf4", color: "#166534" },
{ label: "EMD Required", value: enrichLoading ? "Loading..." : displayEmd, bg: "#fffbeb", color: "#92400e" },
{ label: "Deadline", value: deadline, bg: "#fef2f2", color: "#991b1b" }
].map(item => (
<div key={item.label} style={{ background: item.bg, borderRadius: "10px", padding: "12px", textAlign: "center" }}>
<div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700", marginBottom: "4px" }}>{item.label}</div>
<div style={{ color: item.color, fontSize: "13px", fontWeight: "800" }}>{item.value}</div>
</div>
))}
</div>
<div style={{ background: "#f8fafc", borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
<div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", marginBottom: "8px" }}>TENDER OVERVIEW</div>
<p style={{ color: "#334155", fontSize: "13px", lineHeight: "1.65", margin: 0 }}>{enrichData?.workDescription || tender.summary}</p>
</div>
{tender.refNo && (
<div style={{ background: "#f8fafc", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px" }}>
<span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "700" }}>REF NO: </span>
<span style={{ color: "#334155", fontSize: "11px", fontWeight: "600" }}>{tender.refNo}</span>
</div>
)}
<div style={{ background: "#f8fafc", borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
<div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", marginBottom: "10px" }}>DOCUMENTS REQUIRED</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
{tender.docs.map((doc: string) => (
<span key={doc} style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", fontWeight: "600" }}>{doc}</span>
))}
</div>
</div>
<div style={{ background: risk.bg, border: `1px solid ${risk.border}`, borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
<span style={{ color: risk.color, fontSize: "13px", fontWeight: "700" }}>
{tender.risk === "low" && "✓ LOW RISK — Strong candidate, recommended to bid"}
{tender.risk === "medium" && "⚠ MEDIUM RISK — Evaluate cash flow before committing"}
{tender.risk === "high" && "✕ HIGH RISK — Complex execution, bid only if well resourced"}
</span>
</div>
{!aiGenerated ? (
<button onClick={generateAI} disabled={aiLoading} style={{ width: "100%", background: aiLoading ? "#f1f5f9" : "linear-gradient(135deg, #0369a1, #0ea5e9)", border: aiLoading ? "1.5px solid #e2e8f0" : "none", color: aiLoading ? "#94a3b8" : "#fff", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: "700", cursor: aiLoading ? "not-allowed" : "pointer" }}>
{aiLoading ? "🤖 Analysing..." : "🤖 Get AI Expert Analysis"}
</button>
) : (
<div style={{ background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: "12px", padding: "18px" }}>
<div style={{ color: "#0369a1", fontSize: "11px", fontWeight: "800", marginBottom: "12px" }}>🤖 AI EXPERT ANALYSIS</div>
<p style={{ color: "#1e3a5f", fontSize: "13px", lineHeight: "1.75", margin: 0, whiteSpace: "pre-wrap" }}>{aiSummary}</p>
</div>
)}
</div>
) : (
<div>
{boqData ? (
<BOQPanel boq={boqData} message={boqMessage} />
) : (
<div style={{ textAlign: "center", padding: "40px 20px" }}>
<div style={{ fontSize: "40px", marginBottom: "16px" }}>📊</div>
<p style={{ color: "#64748b", fontSize: "14px", marginBottom: "8px" }}>Click "Get BOQ Analysis & Bid Decision" above</p>
<p style={{ color: "#94a3b8", fontSize: "12px" }}>Or upload BOQ PDF from MahaTenders for real calculations</p>
</div>
)}
</div>
)}
</div>
);
}

function TenderCard({ tender, onSelect, selected }: { tender: Tender; onSelect: (t: Tender) => void; selected: boolean }) {
const risk = riskConfig[tender.risk];
const status = statusConfig[tender.status];
const deadline = cleanDeadline(tender.deadline);
return (
<div onClick={() => onSelect(tender)} style={{ background: selected ? "#f0f9ff" : "#fff", border: selected ? "1.5px solid #0ea5e9" : "1.5px solid #e2e8f0", borderRadius: "14px", padding: "18px 20px", cursor: "pointer", transition: "all 0.18s", boxShadow: selected ? "0 4px 20px rgba(14,165,233,0.12)" : "0 1px 4px rgba(0,0,0,0.05)" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
<Badge color={portalColors[tender.portal]} bg={portalBg[tender.portal]}>{tender.portal}</Badge>
<Badge color={status.color} bg={status.bg}>{tender.status === "urgent" ? "⚡ URGENT" : status.label}</Badge>
</div>
<Badge color={risk.color} bg={risk.bg} border={risk.border}>{risk.label}</Badge>
</div>
<p style={{ color: "#0f172a", fontSize: "14px", fontWeight: "700", lineHeight: "1.45", marginBottom: "12px" }}>{tender.title}</p>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" }}>
{[
{ label: "DEPT ESTIMATE", value: tender.value, bg: "#f8fafc", color: "#0f172a" },
{ label: "EMD", value: tender.emd, bg: "#fffbeb", color: "#92400e" },
{ label: "DEADLINE", value: deadline, bg: deadline === 'Expired' ? "#fef2f2" : "#f0fdf4", color: deadline === 'Expired' ? "#991b1b" : "#166534" }
].map(item => (
<div key={item.label} style={{ background: item.bg, borderRadius: "8px", padding: "8px 10px" }}>
<div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700", marginBottom: "2px" }}>{item.label}</div>
<div style={{ color: item.color, fontSize: "12px", fontWeight: "800" }}>{item.value}</div>
</div>
))}
</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
<span style={{ color: "#64748b", fontSize: "12px" }}>📍 {tender.location}</span>
<span style={{ background: "#f0fdf4", color: "#166534", fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "6px" }}>📊 BOQ + Bid Analysis</span>
</div>
</div>
);
}

export default function TenderRadar() {
const [tenders, setTenders] = useState<Tender[]>(SAMPLE_TENDERS);
const [selected, setSelected] = useState<Tender | null>(null);
const [activeFilter, setActiveFilter] = useState("All");
const [portalFilter, setPortalFilter] = useState("All");
const [scanning, setScanning] = useState(false);
const [scanProgress, setScanProgress] = useState(0);
const [lastScan, setLastScan] = useState("Loading...");
const [isLive, setIsLive] = useState(false);
const [counts, setCounts] = useState({ bmc: 0, pwd: 0, cppp: 0 });
const [boqData, setBoqData] = useState<BOQData | null>(null);
const [boqMessage, setBoqMessage] = useState("");

const fetchTenders = async () => {
setScanning(true);
setScanProgress(0);
try {
const progress = setInterval(() => setScanProgress(p => p < 90 ? p + 10 : p), 400);
const res = await fetch('/api/tenders');
clearInterval(progress);
if (res.ok) {
const data = await res.json();
if (data.tenders && data.tenders.length > 0) {
setTenders(data.tenders);
setIsLive(data.source === 'live');
setCounts({ bmc: data.bmcCount || 0, pwd: data.pwdCount || 0, cppp: 0 });
setLastScan(`Just now — 🟢 ${data.total} live tenders`);
} else {
setLastScan("Just now — Sample data");
}
}
} catch {
setLastScan("Just now — Sample data");
}
setScanProgress(100);
setTimeout(() => setScanning(false), 500);
};

useEffect(() => { fetchTenders(); }, []);

const filtered = tenders
.filter(t => activeFilter === "All" || t.type === activeFilter)
.filter(t => portalFilter === "All" || t.portal === portalFilter)
.filter(t => cleanDeadline(t.deadline) !== 'Expired');

const handleSelectTender = (t: Tender) => {
setSelected(t);
setBoqData(null);
setBoqMessage("");
};

return (
<div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#0f172a" }}>
<div style={{ background: "#fff", borderBottom: "1.5px solid #e2e8f0", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
<div>
<div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "3px" }}>
<div style={{ width: "34px", height: "34px", background: "linear-gradient(135deg, #0369a1, #0ea5e9)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px" }}>🏗</div>
<h1 style={{ fontSize: "20px", fontWeight: "900", margin: 0, color: "#0f172a" }}>
TenderRadar <span style={{ color: "#0369a1" }}>Mumbai</span>
{isLive && <span style={{ background: "#dcfce7", color: "#166534", fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", marginLeft: "8px" }}>🟢 LIVE</span>}
</h1>
</div>
<p style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>
Real-time tender discovery · BOQ Analysis · Bid Decision Tool
{isLive && ` · BMC: ${counts.bmc} active tenders`}
</p>
</div>
<div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
<div style={{ textAlign: "right" }}>
<div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "600" }}>LAST SCANNED</div>
<div style={{ color: "#334155", fontSize: "12px", fontWeight: "700" }}>{lastScan}</div>
</div>
<button onClick={fetchTenders} disabled={scanning} style={{ background: scanning ? "#f1f5f9" : "linear-gradient(135deg, #0369a1, #0ea5e9)", border: scanning ? "1.5px solid #e2e8f0" : "none", color: scanning ? "#94a3b8" : "#fff", borderRadius: "10px", padding: "10px 20px", fontSize: "13px", fontWeight: "700", cursor: scanning ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "7px" }}>
<span style={{ display: "inline-block", animation: scanning ? "spin 1s linear infinite" : "none" }}>⟳</span>
{scanning ? `Scanning ${scanProgress}%` : "Scan Now"}
</button>
</div>
</div>
{scanning && <div style={{ height: "3px", background: "#e0f2fe" }}><div style={{ height: "100%", width: `${scanProgress}%`, background: "linear-gradient(90deg, #0369a1, #0ea5e9)", transition: "width 0.18s" }} /></div>}
<div style={{ background: "#fff", borderBottom: "1.5px solid #e2e8f0", padding: "10px 28px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
<button onClick={() => setPortalFilter("All")} style={{ background: portalFilter === "All" ? "#0369a1" : "#f1f5f9", color: portalFilter === "All" ? "#fff" : "#64748b", border: "none", borderRadius: "20px", padding: "4px 13px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>All Portals</button>
{PORTALS.map(p => (
<button key={p} onClick={() => setPortalFilter(p)} style={{ background: portalFilter === p ? portalColors[p] : portalBg[p], color: portalFilter === p ? "#fff" : portalColors[p], border: "none", borderRadius: "20px", padding: "4px 13px", fontSize: "11px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
<span style={{ width: "6px", height: "6px", borderRadius: "50%", background: portalFilter === p ? "#fff" : portalColors[p], display: "inline-block" }} />{p}
</button>
))}
<span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: "12px", fontWeight: "600" }}>{filtered.length} active tenders</span>
</div>
<div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", minHeight: "calc(100vh - 160px)" }}>
<div style={{ padding: "22px 28px", overflowY: "auto" }}>
<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "20px" }}>
{[
{ label: "Active Tenders", value: filtered.length, bg: "#f0f9ff", color: "#0369a1" },
{ label: "Urgent", value: filtered.filter(t => t.status === "urgent").length, bg: "#fef2f2", color: "#b91c1c" },
{ label: "Low Risk", value: filtered.filter(t => t.risk === "low").length, bg: "#f0fdf4", color: "#166534" }
].map(s => (
<div key={s.label} style={{ background: s.bg, borderRadius: "12px", padding: "14px", textAlign: "center", border: "1.5px solid #e2e8f0" }}>
<div style={{ color: s.color, fontSize: "26px", fontWeight: "900" }}>{s.value}</div>
<div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "600", marginTop: "2px" }}>{s.label}</div>
</div>
))}
</div>
<div style={{ display: "flex", gap: "8px", marginBottom: "18px", flexWrap: "wrap" }}>
{WORK_TYPES.map(f => (
<button key={f} onClick={() => setActiveFilter(f)} style={{ background: activeFilter === f ? "#0369a1" : "#fff", border: activeFilter === f ? "1.5px solid #0369a1" : "1.5px solid #e2e8f0", color: activeFilter === f ? "#fff" : "#64748b", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>{f}</button>
))}
</div>
<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
{filtered.map(t => <TenderCard key={t.id} tender={t} onSelect={handleSelectTender} selected={selected?.id === t.id} />)}
</div>
</div>
{selected && (
<div style={{ padding: "22px 28px 22px 4px", overflowY: "auto" }}>
<DetailPanel
key={selected.id}
tender={selected}
onClose={() => { setSelected(null); setBoqData(null); setBoqMessage(""); }}
boqData={boqData}
setBoqData={setBoqData}
boqMessage={boqMessage}
setBoqMessage={setBoqMessage}
/>
</div>
)}
</div>
<style>{`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
* { box-sizing: border-box; }
`}</style>
</div>
);
}
