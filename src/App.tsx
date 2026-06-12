import { useState, useCallback, useRef } from "react";

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
};
}

function fmt(n: number): string {
if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + " L";
if (n >= 1000) return "₹" + (n / 1000).toFixed(0) + "K";
return "₹" + Math.round(n).toLocaleString('en-IN');
}

function fmtFull(n: number): string {
return Math.round(n).toLocaleString('en-IN');
}

function fmtNum(n: number): string {
return n.toLocaleString('en-IN');
}

// ============ MATERIAL / LABOUR / HIRE SPLIT CLASSIFIER ============
// Returns [materialPct, labourPct, hirePct] - mirrors server-side category logic
function getCostSplit(description: string, unit: string): [number, number, number] {
const d = (description || '').toLowerCase();
const u = (unit || '').toLowerCase().replace(/\./g, '');

if ((d.includes('reinforcement') || d.includes('steel bar') || d.includes('fe500') || d.includes('tmt')) && u.includes('mt')) {
return [85, 10, 5];
}
if ((d.includes('concrete') || d.includes('rcc') || d.includes('r.c.c') || d.includes('p/l') || d.includes('rmc')) && u.includes('cum')) {
return [70, 15, 15];
}
if (d.includes('excavat')) {
if (d.includes('chisel') || d.includes('breaker') || d.includes('hard rock') || d.includes('pneumatic')) return [10, 40, 50];
return [5, 35, 60];
}
if (d.includes('earth work') || d.includes('embankment') || d.includes('filling') || d.includes('stabilised soil')) {
return [10, 40, 50];
}
if (d.includes('brick') || d.includes('masonry') || d.includes('rubble')) {
return [60, 35, 5];
}
if (d.includes('centering') || d.includes('shuttering') || d.includes('formwork') || d.includes('form work')) {
return [50, 40, 10];
}
if (d.includes('sub base') || d.includes('subbase') || d.includes('wmm') || d.includes('gsb') || d.includes('granular') || d.includes('crushed stone') || d.includes('rubble soling')) {
return [40, 25, 35];
}
if (d.includes('bitumen') || d.includes('bituminous') || d.includes('dbm') || d.includes('premix') || d.includes('tack coat') || d.includes('prime coat') || d.includes('mastic') || d.includes('asphalt')) {
return [60, 15, 25];
}
if (d.includes('pipe')) {
return [75, 15, 10];
}
if (d.includes('manhole') || d.includes('cover') || d.includes('frame') || d.includes('chamber') || d.includes('grating')) {
return [70, 20, 10];
}
if (d.includes('kerb') || d.includes('water dished') || d.includes('water table') || d.includes('tree guard')) {
return [55, 30, 15];
}
if (d.includes('railing') || d.includes('bollard') || d.includes('grill') || d.includes('fabricat') || d.includes('sign') || d.includes('board')) {
return [65, 25, 10];
}
if (d.includes('road marking') || d.includes('thermoplastic') || d.includes('retro reflective') || d.includes('road stud')) {
return [50, 30, 20];
}
if (d.includes('cable') || d.includes('conduit') || d.includes('panel') || d.includes('earthing') || d.includes('electrical') || d.includes('mcb') || d.includes('elcb') || d.includes('switchfuse') || d.includes('wiring') || d.includes('tubelight') || d.includes('fixture') || d.includes('fan') || d.includes('led')) {
return [75, 20, 5];
}
if (d.includes('plaster') || d.includes('flooring') || d.includes('tactile') || d.includes('tile') || d.includes('paint')) {
return [55, 40, 5];
}
if (d.includes('demolition') || d.includes('cutting') || d.includes('removing') || d.includes('dismantl')) {
return [5, 70, 25];
}
if (d.includes('soak pit') || d.includes('dowel') || d.includes('joint') || d.includes('thermocole') || d.includes('admixture') || d.includes('waterproof')) {
return [50, 35, 15];
}
if (d.includes('survey') || d.includes('testing') || d.includes('transplant')) {
return [10, 80, 10];
}
if (d.includes('shoring') || d.includes('strutting')) {
return [20, 50, 30];
}
return [60, 25, 15];
}

function UploadZone({ onUpload }: { onUpload: (file: File) => void }) {
const [dragging, setDragging] = useState(false);
const inputRef = useRef<HTMLInputElement>(null);

const handleDrop = useCallback((e: React.DragEvent) => {
e.preventDefault();
setDragging(false);
const file = e.dataTransfer.files?.[0];
if (file && file.type === 'application/pdf') onUpload(file);
}, [onUpload]);

return (
<div
onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
onDragLeave={() => setDragging(false)}
onDrop={handleDrop}
onClick={() => inputRef.current?.click()}
style={{
border: `2px dashed ${dragging ? '#F5A623' : '#2A3F54'}`,
borderRadius: '16px', padding: '60px 40px', textAlign: 'center',
cursor: 'pointer',
background: dragging ? 'rgba(245,166,35,0.05)' : 'rgba(26,42,58,0.5)',
transition: 'all 0.2s',
}}
>
<input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }}
onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
<div style={{ fontSize: '56px', marginBottom: '20px' }}>📋</div>
<div style={{ color: '#E8EDF2', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
Upload your BOQ PDF
</div>
<div style={{ color: '#6B7F8E', fontSize: '15px', marginBottom: '24px', lineHeight: '1.6' }}>
Download the tender document from any government portal<br />
and upload it here to get your exact profit calculation
</div>
<div style={{
display: 'inline-flex', alignItems: 'center', gap: '8px',
background: '#F5A623', color: '#0F1923',
padding: '12px 28px', borderRadius: '10px',
fontSize: '15px', fontWeight: '700',
}}>
📂 Select PDF File
</div>
<div style={{ color: '#3A5068', fontSize: '12px', marginTop: '16px' }}>
or drag and drop your PDF here
</div>
</div>
);
}

function LoadingSteps({ step }: { step: number }) {
const steps = [
"Uploading PDF...",
"Extracting tables from document...",
"Identifying BOQ line items...",
"Calculating AI execution rates...",
"Preparing your calculator...",
];
return (
<div style={{ padding: '24px 0' }}>
{steps.map((s, i) => (
<div key={i} style={{
display: 'flex', alignItems: 'center', gap: '12px',
marginBottom: '12px', opacity: i <= step ? 1 : 0.3, transition: 'opacity 0.5s',
}}>
<div style={{
width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
background: i < step ? '#00C896' : i === step ? '#F5A623' : '#1A2A3A',
display: 'flex', alignItems: 'center', justifyContent: 'center',
fontSize: '12px', fontWeight: '700', color: '#0F1923',
}}>
{i < step ? '✓' : i + 1}
</div>
<span style={{
fontSize: '14px',
color: i < step ? '#00C896' : i === step ? '#F5A623' : '#3A5068',
fontWeight: i === step ? '600' : '400',
}}>{s}</span>
</div>
))}
</div>
);
}

function BOQTable({ items, onRateChange }: { items: BOQItem[]; onRateChange: (idx: number, rate: number) => void }) {
return (
<div style={{ overflowX: 'auto' }}>
<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
<thead>
<tr style={{ background: '#0F1923' }}>
{['#', 'Description of Work', 'Unit', 'Qty', 'PDF Rate', 'AI Estimate', 'Your Rate', 'Your Amount'].map(h => (
<th key={h} style={{
padding: '12px 14px', textAlign: 'left',
color: '#6B7F8E', fontSize: '11px', fontWeight: '700',
letterSpacing: '0.5px', whiteSpace: 'nowrap',
borderBottom: '1px solid #1A2A3A',
}}>{h}</th>
))}
</tr>
</thead>
<tbody>
{items.map((item, idx) => {
const aiRate = item.aiRate ?? item.rate;
const editedRate = item.editedRate ?? aiRate;
const yourAmount = item.quantity * editedRate;
const changed = editedRate !== aiRate;
const savingsPct = item.rate > 0 ? Math.round(((item.rate - aiRate) / item.rate) * 100) : 0;
return (
<tr key={idx} style={{
borderBottom: '1px solid #1A2A3A',
background: item.needsRate ? 'rgba(245,166,35,0.05)' : idx % 2 === 0 ? 'transparent' : 'rgba(26,42,58,0.3)',
}}>
<td style={{ padding: '12px 14px', color: '#3A5068', fontWeight: '700' }}>{idx + 1}</td>
<td style={{ padding: '12px 14px', color: '#E8EDF2', maxWidth: '260px', lineHeight: '1.5' }}>
{item.item}
{item.quantity === 0 && (
<span style={{
marginLeft: '6px', fontSize: '10px', background: '#1A2A3A',
color: '#6B7F8E', padding: '2px 6px', borderRadius: '4px',
}}>Not selected</span>
)}
{item.needsRate && (
<span style={{
marginLeft: '6px', fontSize: '10px', background: 'rgba(245,166,35,0.15)',
color: '#F5A623', padding: '2px 6px', borderRadius: '4px', fontWeight: '700',
}}>Enter rate manually</span>
)}
</td>
<td style={{ padding: '12px 14px', color: '#6B7F8E', whiteSpace: 'nowrap' }}>{item.unit}</td>
<td style={{ padding: '12px 14px', color: '#E8EDF2', fontWeight: '600', whiteSpace: 'nowrap' }}>
{fmtNum(item.quantity)}
</td>
<td style={{ padding: '12px 14px', color: '#6B7F8E', whiteSpace: 'nowrap' }}>
{item.rate > 0 ? `₹${fmtNum(item.rate)}` : '—'}
</td>
<td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
{aiRate > 0 ? (
<>
<div style={{ color: '#00C896', fontWeight: '700' }}>₹{fmtNum(aiRate)}</div>
{savingsPct !== 0 && (
<div style={{ color: savingsPct > 0 ? '#00C896' : '#FF4D4D', fontSize: '10px', marginTop: '1px' }}>
{savingsPct > 0 ? '↓' : '↑'} {Math.abs(savingsPct)}% vs PDF
</div>
)}
</>
) : <span style={{ color: '#3A5068' }}>—</span>}
</td>
<td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
<span style={{ color: '#6B7F8E', fontSize: '13px' }}>₹</span>
<input
type="number"
placeholder={item.needsRate ? "Enter rate" : ""}
value={editedRate || ''}
onFocus={(e) => e.target.select()}
onChange={(e) => {
const val = e.target.value;
onRateChange(idx, val === '' ? 0 : parseFloat(val) || 0);
}}
style={{
width: '100px', padding: '6px 10px',
background: changed ? 'rgba(245,166,35,0.1)' : '#0F1923',
border: `1px solid ${item.needsRate && editedRate === 0 ? '#F5A623' : changed ? '#F5A623' : '#2A3F54'}`,
borderRadius: '6px',
color: changed ? '#F5A623' : '#E8EDF2',
fontSize: '13px', fontWeight: '600', outline: 'none',
}}
/>
</div>
</td>
<td style={{
padding: '12px 14px', fontWeight: '700', whiteSpace: 'nowrap',
color: item.quantity === 0 ? '#3A5068' : '#E8EDF2',
}}>
{item.quantity === 0 ? '—' : fmt(yourAmount)}
</td>
</tr>
);
})}
</tbody>
</table>
</div>
);
}

function ProfitMeter({ margin }: { margin: number }) {
const clamped = Math.max(-20, Math.min(40, margin));
const pct = ((clamped + 20) / 60) * 100;
const color = margin >= 10 ? '#00C896' : margin >= 6 ? '#F5A623' : '#FF4D4D';
const label = margin >= 10 ? 'STRONG BID' : margin >= 6 ? 'MARGINAL' : 'LOSS RISK';
return (
<div style={{ marginBottom: '8px' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
<span style={{ color: '#6B7F8E', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>PROFIT MARGIN</span>
<span style={{ color, fontSize: '11px', fontWeight: '800', letterSpacing: '1px' }}>{label}</span>
</div>
<div style={{ height: '8px', background: '#0F1923', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
<div style={{
height: '100%', width: `${pct}%`,
background: 'linear-gradient(90deg, #FF4D4D, #F5A623, #00C896)',
borderRadius: '4px', transition: 'width 0.5s ease',
}} />
</div>
<div style={{ textAlign: 'center' }}>
<span style={{ color, fontSize: '42px', fontWeight: '900', fontFamily: 'monospace' }}>
{margin > 0 ? '+' : ''}{margin}%
</span>
</div>
</div>
);
}

function PctInput({ label, sublabel, value, onChange, basis, color }: {
label: string; sublabel: string; value: number;
onChange: (v: number) => void; basis: string; color: string;
}) {
const [raw, setRaw] = useState(String(value));
return (
<div style={{ background: '#0F1923', borderRadius: '10px', padding: '16px', border: '1px solid #2A3F54' }}>
<div style={{ color: '#E8EDF2', fontSize: '13px', fontWeight: '700', marginBottom: '2px' }}>{label}</div>
<div style={{ color: '#3A5068', fontSize: '11px', marginBottom: '12px', lineHeight: '1.4' }}>{sublabel}</div>
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
<input
type="number" min="0" max="50" step="0.5"
value={raw}
onFocus={(e) => e.target.select()}
onChange={(e) => {
setRaw(e.target.value);
const n = parseFloat(e.target.value);
if (!isNaN(n) && n >= 0) onChange(n);
}}
onBlur={(e) => {
const n = parseFloat(e.target.value);
if (isNaN(n) || n < 0) { setRaw('0'); onChange(0); }
else setRaw(String(n));
}}
style={{
width: '70px', padding: '8px 10px',
background: '#1A2A3A', border: `1px solid ${color}40`,
borderRadius: '6px', color,
fontSize: '16px', fontWeight: '800', outline: 'none',
}}
/>
<div>
<div style={{ color, fontSize: '16px', fontWeight: '800' }}>%</div>
<div style={{ color: '#3A5068', fontSize: '10px' }}>{basis}</div>
</div>
</div>
</div>
);
}

function NumInput({ label, sublabel, value, onChange, suffix, color, min, max }: {
label: string; sublabel: string; value: number;
onChange: (v: number) => void; suffix: string; color: string;
min?: number; max?: number;
}) {
const [raw, setRaw] = useState(String(value));
return (
<div style={{ background: '#0F1923', borderRadius: '10px', padding: '16px', border: '1px solid #2A3F54' }}>
<div style={{ color: '#E8EDF2', fontSize: '13px', fontWeight: '700', marginBottom: '2px' }}>{label}</div>
<div style={{ color: '#3A5068', fontSize: '11px', marginBottom: '12px', lineHeight: '1.4' }}>{sublabel}</div>
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
<input
type="number" min={min ?? 1} max={max ?? 999} step="1"
value={raw}
onFocus={(e) => e.target.select()}
onChange={(e) => {
setRaw(e.target.value);
const n = parseFloat(e.target.value);
if (!isNaN(n) && n > 0) onChange(n);
}}
onBlur={(e) => {
const n = parseFloat(e.target.value);
if (isNaN(n) || n <= 0) { setRaw('1'); onChange(1); }
else setRaw(String(n));
}}
style={{
width: '80px', padding: '8px 10px',
background: '#1A2A3A', border: `1px solid ${color}40`,
borderRadius: '6px', color,
fontSize: '16px', fontWeight: '800', outline: 'none',
}}
/>
<div style={{ color, fontSize: '14px', fontWeight: '700' }}>{suffix}</div>
</div>
</div>
);
}

// ============ ANNEXURE-D RATE ANALYSIS VIEW ============
function AnnexureD({ tenderTitle, materialTotal, labourTotal, hireTotal, onClose }: {
tenderTitle: string;
materialTotal: number;
labourTotal: number;
hireTotal: number;
onClose: () => void;
}) {
const A = materialTotal + labourTotal + hireTotal; // Total Material+Labour+Hire = Basic Amount
const bPct = 2; // Maintenance/Other %
const B = A * (bPct / 100);
const C = A + B;
const dPct = 15; // 5% Overhead + 10% Profit
const D = A * (dPct / 100);
const E = C + D;
const F = E; // project-level "per unit" = total

const gstRate = 18;
const materialGST = materialTotal * (gstRate / 100);
const labourGST = labourTotal * (gstRate / 100);
const hireGST = hireTotal * (gstRate / 100);
const totalGST = materialGST + labourGST + hireGST;
const overheadProfit15 = A * 0.15;
const totalPerUnitAmount = E + totalGST;

return (
<div style={{
position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
background: 'rgba(0,0,0,0.7)', zIndex: 1000,
display: 'flex', alignItems: 'center', justifyContent: 'center',
padding: '20px', overflowY: 'auto',
}}>
<div className="annexure-print" style={{
background: '#fff', color: '#1a1a1a', borderRadius: '8px',
maxWidth: '850px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
padding: '40px', fontFamily: "'Times New Roman', serif",
}}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }} className="no-print">
<div style={{ fontSize: '12px', color: '#888' }}>Print or save as PDF using your browser's print dialog</div>
<div style={{ display: 'flex', gap: '8px' }}>
<button onClick={() => window.print()} style={{
background: '#F5A623', color: '#0F1923', border: 'none',
padding: '8px 20px', borderRadius: '6px', fontWeight: '700',
cursor: 'pointer', fontSize: '13px',
}}>🖨 Print / Save as PDF</button>
<button onClick={onClose} style={{
background: '#eee', color: '#333', border: 'none',
padding: '8px 20px', borderRadius: '6px', fontWeight: '700',
cursor: 'pointer', fontSize: '13px',
}}>✕ Close</button>
</div>
</div>

<div style={{ textAlign: 'center', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>Annexure-D</div>
<div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline' }}>Rate Analysis</div>

<table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '12px' }}>
<tbody>
<tr>
<td style={tdLabel}>Item Description</td>
<td style={tdValue} colSpan={3}>{tenderTitle || 'Project — Overall Rate Analysis'}</td>
</tr>
<tr>
<td style={tdLabel}>Sr. No.</td>
<td style={tdValue}>1</td>
<td style={tdLabel}>Code</td>
<td style={tdValue}>Overall Project</td>
</tr>
<tr>
<td style={tdLabel}>Unit</td>
<td style={tdValue}>Project</td>
<td style={tdLabel}>Quantity</td>
<td style={tdValue}>1 (Lump Sum)</td>
</tr>
<tr>
<td style={tdLabel}>Basic Rate (Amount excl. GST)</td>
<td style={tdValue} colSpan={3}>₹ {fmtFull(A)}</td>
</tr>
</tbody>


