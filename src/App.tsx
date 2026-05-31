import { useState } from "react";

const PORTALS = ["BMC", "GeM", "CPPP", "PWD Maharashtra", "MMRDA", "MSRDC"];
const WORK_TYPES = ["All", "Civil", "Roads & Infrastructure", "Sanitary", "Sewerage"];

const portalColors: Record<string, string> = {
BMC: "#0369a1", GeM: "#065f46", CPPP: "#6d28d9",
"PWD Maharashtra": "#92400e", MMRDA: "#9f1239", MSRDC: "#c2410c",
};
const portalBg: Record<string, string> = {
BMC: "#e0f2fe", GeM: "#d1fae5", CPPP: "#ede9fe",
"PWD Maharashtra": "#fef3c7", MMRDA: "#ffe4e6", MSRDC: "#ffedd5",
};

interface Material { cement: number; steel: number; pipes: number; sand: number; misc: number; }
interface Tender {
id: number; portal: string; title: string; type: string; value: string; emd: string;
valueNum: number; deadline: string; location: string; status: string; summary: string;
docs: string[]; risk: string; materials: Material; labourDays: number; equipmentDays: number;
}

const mockTenders: Tender[] = [
{ id: 1, portal: "BMC", title: "Reconstruction of Internal Roads at Kurla Ward", type: "Roads & Infrastructure", value: "₹1.85 Cr", emd: "₹3.70 L", valueNum: 18500000, deadline: "12 days", location: "Kurla, Mumbai", status: "new", summary: "Reconstruction and resurfacing of internal roads across 4 sectors in Kurla Ward. Includes storm water drain repair alongside road work.", docs: ["Registration Certificate", "ITR (3 years)", "Experience Certificate", "Solvency Certificate"], risk: "low", materials: { cement: 380, steel: 8, pipes: 0, sand: 45, misc: 12 }, labourDays: 120, equipmentDays: 45 },
{ id: 2, portal: "BMC", title: "Sewerage Network Upgradation — Andheri East Zone", type: "Sewerage", value: "₹4.20 Cr", emd: "₹8.40 L", valueNum: 42000000, deadline: "18 days", location: "Andheri East, Mumbai", status: "new", summary: "Laying of new sewerage lines, manholes, and junction chambers in Andheri East. Involves trench cutting in developed area with traffic management.", docs: ["Registration Certificate", "Similar Work Experience (₹2Cr+)", "Solvency Certificate", "GST Registration"], risk: "medium", materials: { cement: 420, steel: 15, pipes: 180, sand: 60, misc: 20 }, labourDays: 200, equipmentDays: 90 },
{ id: 3, portal: "MMRDA", title: "Construction of Footpaths & Drains — BKC Expansion", type: "Civil", value: "₹92 L", emd: "₹1.84 L", valueNum: 9200000, deadline: "7 days", location: "Bandra Kurla Complex", status: "urgent", summary: "Construction of RCC footpaths, drainage channels, and utility ducting in BKC Phase 3 expansion area. Fast-track project with strict timeline.", docs: ["Registration Certificate", "ITR (2 years)", "Completion Certificates"], risk: "low", materials: { cement: 180, steel: 6, pipes: 20, sand: 25, misc: 8 }, labourDays: 60, equipmentDays: 20 },
{ id: 4, portal: "PWD Maharashtra", title: "Repair of Sanitary Installations — Govt. Buildings Worli", type: "Sanitary", value: "₹38 L", emd: "₹76,000", valueNum: 3800000, deadline: "21 days", location: "Worli, Mumbai", status: "open", summary: "Annual maintenance and repair of sanitary fittings, plumbing, and water supply systems across 6 government buildings in Worli.", docs: ["Registration Certificate", "Plumbing License", "GST Registration"], risk: "low", materials: { cement: 40, steel: 2, pipes: 35, sand: 8, misc: 10 }, labourDays: 30, equipmentDays: 5 },
{ id: 5, portal: "GeM", title: "Stormwater Drain Construction — Malad West", type: "Civil", value: "₹2.60 Cr", emd: "₹5.20 L", valueNum: 26000000, deadline: "15 days", location: "Malad West, Mumbai", status: "new", summary: "Construction of box drains and stormwater channels to address flooding. Includes dewatering, excavation, and RCC work in densely populated area.", docs: ["Class I Contractor License", "ITR (3 years)", "Bank Solvency", "Experience Certificate"], risk: "high", materials: { cement: 520, steel: 22, pipes: 80, sand: 70, misc: 18 }, labourDays: 180, equipmentDays: 80 },
{ id: 6, portal: "CPPP", title: "Civil Works — Municipal School Renovation Dharavi", type: "Civil", value: "₹55 L", emd: "₹1.10 L", valueNum: 5500000, deadline: "25 days", location: "Dharavi, Mumbai", status: "open", summary: "Renovation of 3 municipal school buildings including civil repairs, waterproofing, and toilet block upgradation.", docs: ["Registration Certificate", "ITR (2 years)", "GST Registration"], risk: "low", materials: { cement: 120, steel: 4, pipes: 15, sand: 18, misc: 6 }, labourDays: 45, equipmentDays: 12 },
];

const RATES = { cement: 420, steel: 58500, pipes: 2200, sand: 2200, misc: 1000, labour_skilled: 850, labour_unskilled: 600, jcb: 18000, mixer: 1200, pump: 2500 };

function calcCosts(tender: Tender) {
const mat_cement = tender.materials.cement * RATES.cement;
const mat_steel = tender.materials.steel * RATES.steel;
const mat_pipes = tender.materials.pipes * RATES.pipes;
const mat_sand = tender.materials.sand * RATES.sand;
const mat_misc = tender.materials.misc * RATES.misc;
const totalMaterials = mat_cement + mat_steel + mat_pipes + mat_sand + mat_misc;
const lab_skilled = Math.round(tender.labourDays * 0.4) * RATES.labour_skilled;
const lab_unskilled = Math.round(tender.labourDays * 0.6) * RATES.labour_unskilled;
const lab_supervisor = Math.round(tender.labourDays / 30) * 35000;
const totalLabour = lab_skilled + lab_unskilled + lab_supervisor;
const eq_jcb = Math.round(tender.equipmentDays * 0.4) * RATES.jcb;
const eq_mixer = Math.round(tender.equipmentDays * 0.3) * RATES.mixer;
const eq_pump = Math.round(tender.equipmentDays * 0.3) * RATES.pump;
const totalEquipment = eq_jcb + eq_mixer + eq_pump;
const siteOverhead = Math.round(totalMaterials * 0.08);
const transport = Math.round(totalMaterials * 0.05);
const compliance = Math.round(tender.valueNum * 0.015);
const subtotal = totalMaterials + totalLabour + totalEquipment + siteOverhead + transport + compliance;
const gst = Math.round(subtotal * 0.18);
const tds = Math.round(tender.valueNum * 0.02);
const labourCess = Math.round(tender.valueNum * 0.01);
const retention = Math.round(tender.valueNum * 0.05);
const totalCost = subtotal + gst;
const profit = tender.valueNum - totalCost - tds - labourCess;
const margin = Math.round((profit / tender.valueNum) * 100);
return { mat_cement, mat_steel, mat_pipes, mat_sand, mat_misc, totalMaterials, lab_skilled, lab_unskilled, lab_supervisor, totalLabour, eq_jcb, eq_mixer, eq_pump, totalEquipment, siteOverhead, transport, compliance, subtotal, gst, tds, labourCess, retention, totalCost, profit, margin };
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

function CostRow({ label, value, indent = false, bold = false }: { label: string; value: number; indent?: boolean; bold?: boolean }) {
return (
<div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
<span style={{ color: bold ? "#0f172a" : "#475569", fontSize: "12px", fontWeight: bold ? "700" : "500", paddingLeft: indent ? "16px" : "0" }}>{indent ? "└ " : ""}{label}</span>
<span style={{ color: bold ? "#0f172a" : "#64748b", fontSize: "12px", fontWeight: bold ? "700" : "500" }}>{fmt(value)}</span>
</div>
);
}

function FinancialPanel({ tender }: { tender: Tender }) {
const c = calcCosts(tender);
const [open, setOpen] = useState<string | null>("materials");
const sections = [
{ key: "materials", icon: "📦", label: "Materials", total: c.totalMaterials, rows: [{ label: `Cement (${tender.materials.cement} bags × ₹420)`, value: c.mat_cement }, { label: `Steel & TMT (${tender.materials.steel} MT)`, value: c.mat_steel }, { label: "Pipes & Fittings", value: c.mat_pipes }, { label: "Sand & Aggregates", value: c.mat_sand }, { label: "Miscellaneous", value: c.mat_misc }] },
{ key: "labour", icon: "👷", label: "Labour", total: c.totalLabour, rows: [{ label: "Skilled Labour (Mason, Bar Bender)", value: c.lab_skilled }, { label: "Unskilled Labour (Mazdoor)", value: c.lab_unskilled }, { label: "Supervisor / Foreman", value: c.lab_supervisor }] },
{ key: "equipment", icon: "🚜", label: "Equipment & Machinery", total: c.totalEquipment, rows: [{ label: "JCB / Excavator Hire", value: c.eq_jcb }, { label: "Concrete Mixer", value: c.eq_mixer }, { label: "Pumps & Compactor", value: c.eq_pump }] },
{ key: "overhead", icon: "🏗", label: "Site Overheads & Others", total: c.siteOverhead + c.transport + c.compliance, rows: [{ label: "Site Setup, Fencing & Security", value: c.siteOverhead }, { label: "Transport & Logistics", value: c.transport }, { label: "Insurance, Testing & Permits", value: c.compliance }] },
{ key: "taxes", icon: "💰", label: "Taxes & Deductions", total: c.gst + c.tds + c.labourCess + c.retention, rows: [{ label: "GST (18%)", value: c.gst }, { label: "TDS by Govt (2%)", value: c.tds }, { label: "Labour Cess (1%)", value: c.labourCess }, { label: "Retention Money (5%)", value: c.retention }] },
];
const raStages = [
{ stage: "RA Bill 1 (25%)", spend: Math.round(c.totalCost * 0.3), receive: Math.round(tender.valueNum * 0.22) },
{ stage: "RA Bill 2 (50%)", spend: Math.round(c.totalCost * 0.35), receive: Math.round(tender.valueNum * 0.24) },
{ stage: "RA Bill 3 (75%)", spend: Math.round(c.totalCost * 0.25), receive: Math.round(tender.valueNum * 0.28) },
{ stage: "Final Bill (100%)", spend: Math.round(c.totalCost * 0.1), receive: Math.round(tender.valueNum * 0.18) },
];
return (
<div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
{[{ label: "Total Cost", value: fmt(c.totalCost), bg: "#fef2f2", color: "#991b1b" }, { label: "Net Profit", value: fmt(c.profit), bg: "#f0fdf4", color: "#166534" }, { label: "Margin", value: c.margin + "%", bg: c.margin > 20 ? "#f0fdf4" : "#fef3c7", color: c.margin > 20 ? "#166534" : "#92400e" }].map(item => (
<div key={item.label} style={{ background: item.bg, borderRadius: "10px", padding: "10px", textAlign: "center" }}>
<div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700", marginBottom: "3px" }}>{item.label}</div>
<div style={{ color: item.color, fontSize: "15px", fontWeight: "800" }}>{item.value}</div>
</div>
))}
</div>
<div style={{ marginBottom: "16px" }}>
<div style={{ color: "#64748b", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "8px" }}>EXECUTION COST BIFURCATION</div>
{sections.map(s => (
<div key={s.key} style={{ marginBottom: "6px", border: "1.5px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
<div onClick={() => setOpen(open === s.key ? null : s.key)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8fafc", cursor: "pointer" }}>
<span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{s.icon} {s.label}</span>
<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
<span style={{ fontSize: "13px", fontWeight: "800", color: "#0369a1" }}>{fmt(s.total)}</span>
<span style={{ color: "#94a3b8" }}>{open === s.key ? "▲" : "▼"}</span>
</div>
</div>
{open === s.key && (
<div style={{ padding: "10px 14px", background: "#fff" }}>
{s.rows.map(r => <CostRow key={r.label} label={r.label} value={r.value} indent />)}
</div>
)}
</div>
))}
<div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#0369a1", borderRadius: "10px", marginTop: "8px" }}>
<span style={{ color: "#fff", fontSize: "13px", fontWeight: "800" }}>TOTAL EXECUTION COST</span>
<span style={{ color: "#fff", fontSize: "13px", fontWeight: "800" }}>{fmt(c.totalCost)}</span>
</div>
</div>
<div style={{ marginBottom: "16px" }}>
<div style={{ color: "#64748b", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "8px" }}>RA BILL CASH FLOW TIMELINE</div>
<div style={{ background: "#f8fafc", borderRadius: "10px", overflow: "hidden", border: "1.5px solid #e2e8f0" }}>
<div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "8px 14px", background: "#e2e8f0" }}>
{["Stage", "You Spend", "Govt Pays", "Net"].map(h => <span key={h} style={{ color: "#64748b", fontSize: "10px", fontWeight: "700" }}>{h}</span>)}
</div>
{raStages.map((r, i) => {
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
<span style={{ color: "#991b1b", fontSize: "11px", fontWeight: "800" }}>{fmt(c.totalCost)}</span>
<span style={{ color: "#166534", fontSize: "11px", fontWeight: "800" }}>{fmt(tender.valueNum)}</span>
<span style={{ color: "#166534", fontSize: "11px", fontWeight: "800" }}>+{fmt(c.profit)}</span>
</div>
</div>
<p style={{ color: "#94a3b8", fontSize: "11px", marginTop: "6px" }}>⚠ Payments shown after standard deductions (TDS, cess, retention)</p>
</div>
<div>
<div style={{ color: "#64748b", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "8px" }}>MUMBAI MATERIAL RATES (TODAY)</div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
{[{ label: "Ultratech Cement", value: "₹420/bag" }, { label: "TATA TMT Steel (12mm)", value: "₹58,500/MT" }, { label: "River Sand", value: "₹2,200/MT" }, { label: "20mm Aggregate", value: "₹1,850/MT" }, { label: "Mason (Skilled)", value: "₹850/day" }, { label: "JCB / Excavator", value: "₹18,000/day" }].map(item => (
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

function DetailPanel({ tender, onClose }: { tender: Tender; onClose: () => void }) {
const [activeTab, setActiveTab] = useState<"overview" | "financial">("overview");
const risk = riskConfig[tender.risk];

return (
<div style={{ background: "#fff", borderRadius: "16px", border: "1.5px solid #e2e8f0", padding: "24px", height: "100%", overflowY: "auto", boxSizing: "border-box", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
<Badge color={portalColors[tender.portal]} bg={portalBg[tender.portal]}>{tender.portal}</Badge>
<button onClick={onClose} style={{ background: "#f1f5f9", border: "none", color: "#64748b", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>✕ Close</button>
</div>
<h2 style={{ color: "#0f172a", fontSize: "16px", fontWeight: "800", lineHeight: "1.4", marginBottom: "16px" }}>{tender.title}</h2>
<div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
{(["overview", "financial"] as const).map(tab => (
<button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? "#0369a1" : "#f1f5f9", color: activeTab === tab ? "#fff" : "#64748b", border: "none", borderRadius: "8px", padding: "8px 18px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
{tab === "overview" ? "📋 Overview" : "💰 Financial Analysis"}
</button>
))}
</div>
{activeTab === "overview" ? (
<div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
{[{ label: "Tender Value", value: tender.value, bg: "#f0fdf4", color: "#166534" }, { label: "EMD Required", value: tender.emd, bg: "#fffbeb", color: "#92400e" }, { label: "Deadline", value: tender.deadline, bg: "#fef2f2", color: "#991b1b" }].map(item => (
<div key={item.label} style={{ background: item.bg, borderRadius: "10px", padding: "12px", textAlign: "center" }}>
<div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700", marginBottom: "4px" }}>{item.label}</div>
<div style={{ color: item.color, fontSize: "14px", fontWeight: "800" }}>{item.value}</div>
</div>
))}
</div>
<div style={{ background: "#f8fafc", borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
<div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", marginBottom: "8px" }}>TENDER OVERVIEW</div>
<p style={{ color: "#334155", fontSize: "13px", lineHeight: "1.65", margin: 0 }}>{tender.summary}</p>
</div>
<div style={{ background: "#f8fafc", borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
<div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", marginBottom: "10px" }}>DOCUMENTS REQUIRED</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
{tender.docs.map((doc: string) => (
<span key={doc} style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", fontWeight: "600" }}>{doc}</span>
))}
</div>
</div>
<div style={{ background: risk.bg, border: `1px solid ${risk.border}`, borderRadius: "10px", padding: "12px" }}>
<span style={{ color: risk.color, fontSize: "13px", fontWeight: "700" }}>
{tender.risk === "low" && "✓ LOW RISK — Strong candidate, recommended to bid"}
{tender.risk === "medium" && "⚠ MEDIUM RISK — Evaluate cash flow before committing"}
{tender.risk === "high" && "✕ HIGH RISK — Complex execution, bid only if well resourced"}
</span>
</div>
</div>
) : (
<FinancialPanel tender={tender} />
)}
</div>
);
}

function TenderCard({ tender, onSelect, selected }: { tender: Tender; onSelect: (t: Tender) => void; selected: boolean }) {
const risk = riskConfig[tender.risk];
const status = statusConfig[tender.status];
const c = calcCosts(tender);
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
{[{ label: "VALUE", value: tender.value, bg: "#f8fafc", color: "#0f172a" }, { label: "EMD", value: tender.emd, bg: "#fffbeb", color: "#92400e" }, { label: "PROFIT EST.", value: fmt(c.profit), bg: "#f0fdf4", color: "#166534" }].map(item => (
<div key={item.label} style={{ background: item.bg, borderRadius: "8px", padding: "8px 10px" }}>
<div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "700", marginBottom: "2px" }}>{item.label}</div>
<div style={{ color: item.color, fontSize: "14px", fontWeight: "800" }}>{item.value}</div>
</div>
))}
</div>
<div style={{ display: "flex", justifyContent: "space-between" }}>
<span style={{ color: "#64748b", fontSize: "12px" }}>📍 {tender.location}</span>
<span style={{ color: "#64748b", fontSize: "12px" }}>⏰ {tender.deadline} left</span>
</div>
</div>
);
}

export default function TenderRadar() {
const [selected, setSelected] = useState<Tender | null>(null);
const [activeFilter, setActiveFilter] = useState("All");
const [portalFilter, setPortalFilter] = useState("All");
const [scanning, setScanning] = useState(false);
const [scanProgress, setScanProgress] = useState(0);
const [lastScan, setLastScan] = useState("Today, 6:00 AM");

const filtered = mockTenders
.filter((t: Tender) => activeFilter === "All" || t.type === activeFilter)
.filter((t: Tender) => portalFilter === "All" || t.portal === portalFilter);

const handleScan = () => {
setScanning(true);
setScanProgress(0);
const interval = setInterval(() => {
setScanProgress(p => {
if (p >= 100) { clearInterval(interval); setScanning(false); setLastScan("Just now"); return 100; }
return p + 7;
});
}, 160);
};

return (
<div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#0f172a" }}>
<div style={{ background: "#fff", borderBottom: "1.5px solid #e2e8f0", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
<div>
<div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "3px" }}>
<div style={{ width: "34px", height: "34px", background: "linear-gradient(135deg, #0369a1, #0ea5e9)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px" }}>🏗</div>
<h1 style={{ fontSize: "20px", fontWeight: "900", margin: 0, color: "#0f172a" }}>TenderRadar <span style={{ color: "#0369a1" }}>Mumbai</span></h1>
</div>
<p style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>AI-powered tender discovery · BMC · GeM · CPPP · PWD · MMRDA · MSRDC</p>
</div>
<div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
<div style={{ textAlign: "right" }}>
<div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "600" }}>LAST SCANNED</div>
<div style={{ color: "#334155", fontSize: "13px", fontWeight: "700" }}>{lastScan}</div>
</div>
<button onClick={handleScan} disabled={scanning} style={{ background: scanning ? "#f1f5f9" : "linear-gradient(135deg, #0369a1, #0ea5e9)", border: scanning ? "1.5px solid #e2e8f0" : "none", color: scanning ? "#94a3b8" : "#fff", borderRadius: "10px", padding: "10px 20px", fontSize: "13px", fontWeight: "700", cursor: scanning ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "7px" }}>
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
<span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: "12px", fontWeight: "600" }}>{filtered.length} tenders found today</span>
</div>
<div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", minHeight: "calc(100vh - 160px)" }}>
<div style={{ padding: "22px 28px", overflowY: "auto" }}>
<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "20px" }}>
{[{ label: "Total Tenders", value: filtered.length, bg: "#f0f9ff", color: "#0369a1" }, { label: "Urgent", value: filtered.filter((t: Tender) => t.status === "urgent").length, bg: "#fef2f2", color: "#b91c1c" }, { label: "Low Risk", value: filtered.filter((t: Tender) => t.risk === "low").length, bg: "#f0fdf4", color: "#166534" }].map(s => (
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
{filtered.map((t: Tender) => <TenderCard key={t.id} tender={t} onSelect={setSelected} selected={selected?.id === t.id} />)}
</div>
</div>
{selected && (
<div style={{ padding: "22px 28px 22px 4px", overflowY: "auto" }}>
<DetailPanel tender={selected} onClose={() => setSelected(null)} />
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
