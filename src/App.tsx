import { useState, useCallback, useRef } from "react";

interface BOQItem {
item: string;
unit: string;
quantity: number;
rate: number;
aiRate: number;
amount: number;
editedRate?: number;
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

function fmtNum(n: number): string {
return n.toLocaleString('en-IN');
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
"Uploading PDF to Adobe AI...",
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
background: idx % 2 === 0 ? 'transparent' : 'rgba(26,42,58,0.3)',
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
</td>
<td style={{ padding: '12px 14px', color: '#6B7F8E', whiteSpace: 'nowrap' }}>{item.unit}</td>
<td style={{ padding: '12px 14px', color: '#E8EDF2', fontWeight: '600', whiteSpace: 'nowrap' }}>
{fmtNum(item.quantity)}
</td>
<td style={{ padding: '12px 14px', color: '#6B7F8E', whiteSpace: 'nowrap' }}>
₹{fmtNum(item.rate)}
</td>
<td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
<div style={{ color: '#00C896', fontWeight: '700' }}>₹{fmtNum(aiRate)}</div>
{savingsPct !== 0 && (
<div style={{ color: savingsPct > 0 ? '#00C896' : '#FF4D4D', fontSize: '10px', marginTop: '1px' }}>
{savingsPct > 0 ? '↓' : '↑'} {Math.abs(savingsPct)}% vs PDF
</div>
)}
</td>
<td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
<span style={{ color: '#6B7F8E', fontSize: '13px' }}>₹</span>
<input
type="number"
value={editedRate || ''}
onFocus={(e) => e.target.select()}
onChange={(e) => {
const val = e.target.value;
onRateChange(idx, val === '' ? 0 : parseFloat(val) || 0);
}}
style={{
width: '100px', padding: '6px 10px',
background: changed ? 'rgba(245,166,35,0.1)' : '#0F1923',
border: `1px solid ${changed ? '#F5A623' : '#2A3F54'}`,
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

export default function App() {
const [uploadState, setUploadState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
const [loadingStep, setLoadingStep] = useState(0);
const [result, setResult] = useState<UploadResult | null>(null);
const [items, setItems] = useState<BOQItem[]>([]);
const [errorMsg, setErrorMsg] = useState('');
const stepTimer = useRef<any>(null);

const [facilitation, setFacilitation] = useState(3);
const [overhead, setOverhead] = useState(8);
const [wastage, setWastage] = useState(5);
const [labourEscalation, setLabourEscalation] = useState(2);
const [bidPercent, setBidPercent] = useState(92);
const [bidPercentRaw, setBidPercentRaw] = useState('92');

const [projectMonths, setProjectMonths] = useState(6);
const [raCycleDays, setRaCycleDays] = useState(60);

const handleUpload = async (file: File) => {
setUploadState('loading');
setLoadingStep(0);
setErrorMsg('');

let step = 0;
const advanceStep = () => {
step = Math.min(step + 1, 4);
setLoadingStep(step);
if (step < 4) stepTimer.current = setTimeout(advanceStep, 12000);
};
stepTimer.current = setTimeout(advanceStep, 8000);

try {
const formData = new FormData();
formData.append('pdf', file);
formData.append('tenderType', 'Civil');
formData.append('tenderTitle', file.name.replace('.pdf', ''));

const response = await fetch('https://boq-service-pov7.onrender.com/api/boq-upload', {
method: 'POST', body: formData,
});
clearTimeout(stepTimer.current);

if (!response.ok) {
const err = await response.json();
throw new Error(err.error || 'Upload failed');
}

const data: UploadResult = await response.json();
if (data.success && data.boq) {
setResult(data);
setItems(data.boq.boqItems.map(item => ({ ...item, editedRate: item.aiRate ?? item.rate })));
if (data.boq.executionDays) {
setProjectMonths(Math.ceil(data.boq.executionDays / 30));
}
setUploadState('done');
} else {
throw new Error('Analysis failed');
}
} catch (err: any) {
clearTimeout(stepTimer.current);
setErrorMsg(err.message || 'Something went wrong');
setUploadState('error');
}
};

const handleRateChange = (idx: number, rate: number) => {
setItems(prev => prev.map((item, i) => i === idx ? { ...item, editedRate: rate } : item));
};

const handleReset = () => {
setUploadState('idle');
setResult(null);
setItems([]);
setErrorMsg('');
setLoadingStep(0);
};

const deptEstimate = result?.boq.departmentEstimate || 0;
const expectedWinningBid = Math.round(deptEstimate * (bidPercent / 100));
const executionCost = items.reduce((sum, item) => sum + (item.quantity * (item.editedRate ?? item.aiRate ?? item.rate)), 0);
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

const bidDecision = profitMargin >= 10 ? 'BID' : profitMargin >= 6 ? 'REVIEW' : 'AVOID';
const bidColor = profitMargin >= 10 ? '#00C896' : profitMargin >= 6 ? '#F5A623' : '#FF4D4D';
const bidBg = profitMargin >= 10 ? 'rgba(0,200,150,0.1)' : profitMargin >= 6 ? 'rgba(245,166,35,0.1)' : 'rgba(255,77,77,0.1)';

const bidReason = profitMargin >= 10
? `Strong ${profitMargin}% margin — good candidate to bid on this tender`
: profitMargin >= 6
? `Marginal ${profitMargin}% margin — evaluate competition carefully before committing`
: `Only ${profitMargin}% margin after all costs — high risk of financial loss`;

// Total of AI estimated rates (default scenario, before user edits)
const aiExecutionCost = items.reduce((sum, item) => sum + (item.quantity * (item.aiRate ?? item.rate)), 0);
const pdfBasedCost = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

return (
<div style={{ minHeight: '100vh', background: '#0F1923', fontFamily: "'Inter', 'DM Sans', sans-serif", color: '#E8EDF2' }}>

{/* Header */}
<div style={{
borderBottom: '1px solid #1A2A3A', padding: '20px 32px',
display: 'flex', justifyContent: 'space-between', alignItems: 'center',
}}>
<div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
<div style={{
width: '40px', height: '40px',
background: 'linear-gradient(135deg, #F5A623, #FF8C00)',
borderRadius: '10px', display: 'flex', alignItems: 'center',
justifyContent: 'center', fontSize: '20px',
}}>📐</div>
<div>
<div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }}>
TenderRadar <span style={{ color: '#F5A623' }}>Mumbai</span>
</div>
<div style={{ fontSize: '12px', color: '#3A5068', fontWeight: '500' }}>
BOQ Profit Calculator — Any Government Tender
</div>
</div>
</div>
{uploadState === 'done' && (
<button onClick={handleReset} style={{
background: 'transparent', border: '1px solid #2A3F54',
color: '#6B7F8E', padding: '8px 18px', borderRadius: '8px',
cursor: 'pointer', fontSize: '13px', fontWeight: '600',
}}>↩ Upload New PDF</button>
)}
</div>

<div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>

{/* IDLE */}
{uploadState === 'idle' && (
<div style={{ maxWidth: '700px', margin: '0 auto' }}>
<div style={{ textAlign: 'center', marginBottom: '48px' }}>
<div style={{
display: 'inline-block',
background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)',
borderRadius: '20px', padding: '6px 16px',
color: '#F5A623', fontSize: '12px', fontWeight: '700',
letterSpacing: '1px', marginBottom: '20px',
}}>
BEFORE YOU BID — KNOW YOUR PROFIT
</div>
<h1 style={{ fontSize: '40px', fontWeight: '900', lineHeight: '1.15', letterSpacing: '-1px', marginBottom: '16px' }}>
Will this tender<br />
<span style={{ color: '#F5A623' }}>make you money?</span>
</h1>
<p style={{ color: '#6B7F8E', fontSize: '16px', lineHeight: '1.7' }}>
Upload the BOQ PDF from any government tender portal.<br />
We estimate real execution rates. You confirm or adjust. See your true profit.
</p>
</div>
<UploadZone onUpload={handleUpload} />
<div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
{[
{ icon: '📋', title: 'Upload BOQ', desc: 'Any government tender PDF — BMC, PWD, MMRDA, CPWD' },
{ icon: '🤖', title: 'AI Estimates Rates', desc: 'Real execution cost per item, not just SOR rate' },
{ icon: '💰', title: 'See Real Profit', desc: 'Including facilitation, overhead & working capital' },
].map((step, i) => (
<div key={i} style={{
background: '#1A2A3A', borderRadius: '12px', padding: '20px',
border: '1px solid #2A3F54', textAlign: 'center',
}}>
<div style={{ fontSize: '28px', marginBottom: '10px' }}>{step.icon}</div>
<div style={{ color: '#E8EDF2', fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{step.title}</div>
<div style={{ color: '#3A5068', fontSize: '12px' }}>{step.desc}</div>
</div>
))}
</div>
</div>
)}

{/* LOADING */}
{uploadState === 'loading' && (
<div style={{ maxWidth: '500px', margin: '0 auto' }}>
<div style={{ background: '#1A2A3A', borderRadius: '16px', padding: '40px', border: '1px solid #2A3F54' }}>
<div style={{ textAlign: 'center', marginBottom: '32px' }}>
<div style={{ fontSize: '48px', marginBottom: '12px' }}>⚙️</div>
<div style={{ color: '#E8EDF2', fontSize: '18px', fontWeight: '700' }}>Reading your BOQ PDF</div>
<div style={{ color: '#6B7F8E', fontSize: '13px', marginTop: '4px' }}>Adobe AI is extracting all items. Please wait 30–60 seconds.</div>
</div>
<LoadingSteps step={loadingStep} />
<div style={{ marginTop: '24px', height: '3px', background: '#0F1923', borderRadius: '2px', overflow: 'hidden' }}>
<div style={{
height: '100%', width: `${((loadingStep + 1) / 5) * 100}%`,
background: 'linear-gradient(90deg, #F5A623, #FF8C00)',
borderRadius: '2px', transition: 'width 1s ease',
}} />
</div>
</div>
</div>
)}

{/* ERROR */}
{uploadState === 'error' && (
<div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
<div style={{ background: 'rgba(255,77,77,0.1)', borderRadius: '16px', padding: '40px', border: '1px solid rgba(255,77,77,0.2)' }}>
<div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
<div style={{ color: '#FF4D4D', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Upload Failed</div>
<div style={{ color: '#6B7F8E', fontSize: '14px', marginBottom: '24px' }}>{errorMsg}</div>
<button onClick={handleReset} style={{
background: '#F5A623', color: '#0F1923', border: 'none',
padding: '12px 28px', borderRadius: '8px', fontSize: '14px',
fontWeight: '700', cursor: 'pointer',
}}>Try Again</button>
</div>
</div>
)}

{/* DONE */}
{uploadState === 'done' && result && (
<div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>

{/* Left Column */}
<div>
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
<div>
<h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px 0' }}>Bill of Quantities</h2>
<div style={{
display: 'inline-flex', alignItems: 'center', gap: '6px',
background: result.pdfRead ? 'rgba(0,200,150,0.1)' : 'rgba(245,166,35,0.1)',
border: `1px solid ${result.pdfRead ? 'rgba(0,200,150,0.3)' : 'rgba(245,166,35,0.3)'}`,
borderRadius: '20px', padding: '4px 12px',
color: result.pdfRead ? '#00C896' : '#F5A623',
fontSize: '12px', fontWeight: '700',
}}>
{result.pdfRead ? '✅' : '📊'} {result.message}
</div>
</div>
</div>

{/* Legend */}
<div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
<div style={{ fontSize: '12px', color: '#6B7F8E' }}>
<span style={{ color: '#6B7F8E', fontWeight: '700' }}>PDF Rate</span> = Government's SOR rate (reference)
</div>
<div style={{ fontSize: '12px', color: '#6B7F8E' }}>
<span style={{ color: '#00C896', fontWeight: '700' }}>AI Estimate</span> = Real execution cost (our analysis)
</div>
<div style={{ fontSize: '12px', color: '#6B7F8E' }}>
<span style={{ color: '#F5A623', fontWeight: '700' }}>Your Rate</span> = Edit if you know better
</div>
</div>

{/* BOQ Table */}
<div style={{ background: '#1A2A3A', borderRadius: '12px', border: '1px solid #2A3F54', overflow: 'hidden', marginBottom: '12px' }}>
<BOQTable items={items} onRateChange={handleRateChange} />
</div>

<div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
<button
onClick={() => setItems(prev => prev.map(item => ({ ...item, editedRate: item.aiRate ?? item.rate })))}
style={{
background: 'transparent', border: '1px solid #2A3F54',
color: '#6B7F8E', padding: '8px 16px', borderRadius: '8px',
cursor: 'pointer', fontSize: '12px',
}}
>↩ Reset to AI Estimates</button>
<button
onClick={() => setItems(prev => prev.map(item => ({ ...item, editedRate: item.rate })))}
style={{
background: 'transparent', border: '1px solid #2A3F54',
color: '#6B7F8E', padding: '8px 16px', borderRadius: '8px',
cursor: 'pointer', fontSize: '12px',
}}
>Use PDF Rates Instead</button>
</div>

{/* Additional Costs */}
<div style={{ background: '#1A2A3A', borderRadius: '12px', border: '1px solid #2A3F54', padding: '24px', marginBottom: '24px' }}>
<h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '4px' }}>Additional Costs</h3>
<p style={{ color: '#6B7F8E', fontSize: '13px', marginBottom: '24px' }}>
Real costs not shown in BOQ — adjust to match your situation
</p>
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
<PctInput
label="Officer Facilitation"
sublabel="Payments to clear work orders, inspections, approvals"
value={facilitation} onChange={setFacilitation}
basis="% of winning bid" color="#FF4D4D"
/>
<PctInput
label="Office Overhead"
sublabel="Admin, staff, transport, site office costs"
value={overhead} onChange={setOverhead}
basis="% of execution cost" color="#F5A623"
/>
<PctInput
label="Material Wastage"
sublabel="On-site wastage, theft, spoilage allowance"
value={wastage} onChange={setWastage}
basis="% of execution cost" color="#F5A623"
/>
<PctInput
label="Labour Escalation"
sublabel="Rate increase over project duration"
value={labourEscalation} onChange={setLabourEscalation}
basis="% of execution cost" color="#F5A623"
/>
</div>

{/* Bid % */}
<div style={{ marginTop: '16px', background: '#0F1923', borderRadius: '10px', padding: '16px', border: '1px solid #2A3F54' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<div>
<div style={{ color: '#E8EDF2', fontSize: '13px', fontWeight: '700' }}>Your Bid Percentage</div>
<div style={{ color: '#3A5068', fontSize: '11px', marginTop: '2px' }}>
% of dept estimate you plan to quote — e.g. 92 means you bid ₹92L on a ₹1Cr tender (8% below estimate)
</div>
</div>
<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
<input
type="number" min="70" max="100" step="0.5"
value={bidPercentRaw}
onFocus={(e) => e.target.select()}
onChange={(e) => {
setBidPercentRaw(e.target.value);
const n = parseFloat(e.target.value);
if (!isNaN(n) && n >= 70 && n <= 100) setBidPercent(n);
}}
onBlur={(e) => {
const n = parseFloat(e.target.value);
if (isNaN(n) || n < 70) { setBidPercentRaw('70'); setBidPercent(70); }
else if (n > 100) { setBidPercentRaw('100'); setBidPercent(100); }
else setBidPercentRaw(String(n));
}}
style={{
width: '75px', padding: '8px 10px',
background: '#1A2A3A', border: '1px solid #00C89640',
borderRadius: '6px', color: '#00C896',
fontSize: '16px', fontWeight: '800', outline: 'none',
}}
/>
<div style={{ color: '#00C896', fontSize: '16px', fontWeight: '800' }}>%</div>
</div>
</div>
</div>
</div>

{/* Working Capital Calculator */}
<div style={{ background: '#1A2A3A', borderRadius: '12px', border: '1px solid #2A3F54', padding: '24px', marginBottom: '24px' }}>
<h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '4px' }}>💰 Working Capital Calculator</h3>
<p style={{ color: '#6B7F8E', fontSize: '13px', marginBottom: '24px' }}>
How much cash you need in your bank before starting this tender
</p>

<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
<NumInput
label="Project Duration"
sublabel="Total months to complete the work (excluding monsoon if applicable)"
value={projectMonths} onChange={setProjectMonths}
suffix="months" color="#00C896" min={1} max={60}
/>
<NumInput
label="RA Bill Payment Cycle"
sublabel="How many days after submitting RA bill does govt typically pay?"
value={raCycleDays} onChange={setRaCycleDays}
suffix="days" color="#F5A623" min={15} max={180}
/>
</div>

<div style={{ background: '#0F1923', borderRadius: '10px', padding: '20px', border: '1px solid #2A3F54' }}>
<div style={{ color: '#6B7F8E', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', marginBottom: '16px' }}>
WORKING CAPITAL ANALYSIS
</div>

<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1A2A3A' }}>
<div>
<div style={{ color: '#E8EDF2', fontSize: '13px', fontWeight: '600' }}>Monthly Spend</div>
<div style={{ color: '#3A5068', fontSize: '11px' }}>Total cost ÷ {projectMonths} months</div>
</div>
<div style={{ color: '#E8EDF2', fontSize: '16px', fontWeight: '800', fontFamily: 'monospace' }}>
{fmt(monthlySpend)}<span style={{ color: '#3A5068', fontSize: '11px' }}>/mo</span>
</div>
</div>

<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1A2A3A' }}>
<div>
<div style={{ color: '#FF4D4D', fontSize: '13px', fontWeight: '600' }}>Minimum Capital Needed</div>
<div style={{ color: '#3A5068', fontSize: '11px' }}>
{fmt(monthlySpend)} × {(raCycleDays / 30 + 1).toFixed(1)} months (1 RA cycle + 1 buffer)
</div>
</div>
<div style={{ color: '#FF4D4D', fontSize: '18px', fontWeight: '800', fontFamily: 'monospace' }}>
{fmt(minWorkingCapital)}
</div>
</div>

<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1A2A3A' }}>
<div>
<div style={{ color: '#F5A623', fontSize: '13px', fontWeight: '600' }}>Recommended Capital</div>
<div style={{ color: '#3A5068', fontSize: '11px' }}>
{fmt(monthlySpend)} × {(raCycleDays / 30 + 2).toFixed(1)} months (safer — covers payment delays)
</div>
</div>
<div style={{ color: '#F5A623', fontSize: '18px', fontWeight: '800', fontFamily: 'monospace' }}>
{fmt(recommendedWorkingCapital)}
</div>
</div>

<div style={{ marginTop: '14px', background: 'rgba(0,200,150,0.05)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(0,200,150,0.1)' }}>
<div style={{ color: '#00C896', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
🏦 For Bank Loan Application
</div>
<div style={{ color: '#6B7F8E', fontSize: '12px', lineHeight: '1.6' }}>
Request <strong style={{ color: '#E8EDF2' }}>{fmt(recommendedWorkingCapital)}</strong> as working capital loan.
Repayable from RA bills received every {raCycleDays} days.
Total project value: <strong style={{ color: '#E8EDF2' }}>{fmt(expectedWinningBid)}</strong>.
</div>
</div>
</div>
</div>
</div>

{/* Right Column — Dashboard */}
<div style={{ position: 'sticky', top: '24px' }}>

{/* Bid Decision */}
<div style={{ background: bidBg, border: `2px solid ${bidColor}40`, borderRadius: '16px', padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
<div style={{ color: bidColor, fontSize: '11px', fontWeight: '800', letterSpacing: '2px', marginBottom: '8px' }}>
BID DECISION
</div>
<div style={{ color: bidColor, fontSize: '48px', fontWeight: '900', letterSpacing: '-2px', marginBottom: '8px' }}>
{bidDecision === 'BID' ? '✅' : bidDecision === 'REVIEW' ? '⚠️' : '❌'} {bidDecision}
</div>
<ProfitMeter margin={profitMargin} />
<div style={{ color: '#6B7F8E', fontSize: '12px', marginTop: '8px', lineHeight: '1.5' }}>
{bidReason}
</div>
</div>

{/* Rate Comparison */}
<div style={{ background: '#1A2A3A', borderRadius: '12px', border: '1px solid #2A3F54', padding: '20px', marginBottom: '16px' }}>
<div style={{ color: '#6B7F8E', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', marginBottom: '12px' }}>
RATE COMPARISON (TOTAL)
</div>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #0F1923' }}>
<div style={{ color: '#6B7F8E', fontSize: '12px' }}>If using PDF rates</div>
<div style={{ color: '#6B7F8E', fontSize: '14px', fontWeight: '700', fontFamily: 'monospace' }}>{fmt(pdfBasedCost)}</div>
</div>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #0F1923' }}>
<div style={{ color: '#00C896', fontSize: '12px', fontWeight: '600' }}>AI estimated execution</div>
<div style={{ color: '#00C896', fontSize: '14px', fontWeight: '700', fontFamily: 'monospace' }}>{fmt(aiExecutionCost)}</div>
</div>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
<div style={{ color: '#F5A623', fontSize: '12px', fontWeight: '600' }}>Your edited total</div>
<div style={{ color: '#F5A623', fontSize: '14px', fontWeight: '700', fontFamily: 'monospace' }}>{fmt(executionCost)}</div>
</div>
</div>

{/* Financial Summary */}
<div style={{ background: '#1A2A3A', borderRadius: '12px', border: '1px solid #2A3F54', padding: '20px', marginBottom: '16px' }}>
<div style={{ color: '#6B7F8E', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', marginBottom: '16px' }}>
FINANCIAL SUMMARY
</div>
{[
{ label: 'Dept Estimate', value: fmt(deptEstimate), color: '#E8EDF2', sub: "Sum of BOQ at PDF/SOR rates" },
{ label: 'Your Winning Bid', value: fmt(expectedWinningBid), color: '#00C896', sub: `${bidPercent}% of estimate` },
{ label: 'Execution Cost', value: fmt(executionCost), color: '#E8EDF2', sub: 'At your edited rates' },
{ label: 'Facilitation Cost', value: fmt(facilitationCost), color: '#FF4D4D', sub: `${facilitation}% of bid` },
{ label: 'Overhead + Wastage + Escalation', value: fmt(overheadCost + wastageCost + labourEscCost), color: '#F5A623', sub: 'All additional costs' },
{ label: 'Total Real Cost', value: fmt(totalRealCost), color: '#E8EDF2', sub: 'Everything you spend', bold: true },
{ label: realProfit >= 0 ? 'Net Profit' : 'Net Loss', value: fmt(Math.abs(realProfit)), color: realProfit >= 0 ? '#00C896' : '#FF4D4D', sub: realProfit >= 0 ? 'You keep this' : 'You lose this', bold: true },
].map((row) => (
<div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #0F1923' }}>
<div>
<div style={{ color: '#6B7F8E', fontSize: '12px' }}>{row.label}</div>
<div style={{ color: '#3A5068', fontSize: '10px' }}>{row.sub}</div>
</div>
<div style={{ color: row.color, fontSize: (row as any).bold ? '15px' : '14px', fontWeight: (row as any).bold ? '800' : '600', fontFamily: 'monospace' }}>
{row.value}
</div>
</div>
))}
</div>

{/* Working Capital Summary */}
<div style={{ background: '#1A2A3A', borderRadius: '12px', border: '1px solid #2A3F54', padding: '20px', marginBottom: '16px' }}>
<div style={{ color: '#6B7F8E', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', marginBottom: '12px' }}>
💰 WORKING CAPITAL
</div>
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
<div style={{ background: '#0F1923', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,77,77,0.2)' }}>
<div style={{ color: '#6B7F8E', fontSize: '10px', fontWeight: '700', marginBottom: '4px' }}>MINIMUM</div>
<div style={{ color: '#FF4D4D', fontSize: '16px', fontWeight: '800' }}>{fmt(minWorkingCapital)}</div>
<div style={{ color: '#3A5068', fontSize: '10px', marginTop: '2px' }}>Must have upfront</div>
</div>
<div style={{ background: '#0F1923', borderRadius: '8px', padding: '12px', border: '1px solid rgba(245,166,35,0.2)' }}>
<div style={{ color: '#6B7F8E', fontSize: '10px', fontWeight: '700', marginBottom: '4px' }}>RECOMMENDED</div>
<div style={{ color: '#F5A623', fontSize: '16px', fontWeight: '800' }}>{fmt(recommendedWorkingCapital)}</div>
<div style={{ color: '#3A5068', fontSize: '10px', marginTop: '2px' }}>Safe with delays</div>
</div>
<div style={{ background: '#0F1923', borderRadius: '8px', padding: '12px', border: '1px solid #2A3F54' }}>
<div style={{ color: '#6B7F8E', fontSize: '10px', fontWeight: '700', marginBottom: '4px' }}>MONTHLY SPEND</div>
<div style={{ color: '#E8EDF2', fontSize: '16px', fontWeight: '800' }}>{fmt(monthlySpend)}</div>
<div style={{ color: '#3A5068', fontSize: '10px', marginTop: '2px' }}>Per month</div>
</div>
<div style={{ background: '#0F1923', borderRadius: '8px', padding: '12px', border: '1px solid #2A3F54' }}>
<div style={{ color: '#6B7F8E', fontSize: '10px', fontWeight: '700', marginBottom: '4px' }}>RA CYCLE</div>
<div style={{ color: '#6B7F8E', fontSize: '16px', fontWeight: '800' }}>{raCycleDays} days</div>
<div style={{ color: '#3A5068', fontSize: '10px', marginTop: '2px' }}>Govt pays every</div>
</div>
</div>
</div>

{/* ROI */}
<div style={{ background: '#1A2A3A', borderRadius: '12px', border: '1px solid #2A3F54', padding: '20px', marginBottom: '16px' }}>
<div style={{ color: '#6B7F8E', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', marginBottom: '12px' }}>
RETURNS
</div>
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
<div style={{ background: '#0F1923', borderRadius: '8px', padding: '12px', border: '1px solid #2A3F54' }}>
<div style={{ color: '#6B7F8E', fontSize: '10px', fontWeight: '700', marginBottom: '4px' }}>ROI</div>
<div style={{ color: realProfit > 0 ? '#00C896' : '#FF4D4D', fontSize: '16px', fontWeight: '800' }}>
{totalRealCost > 0 ? `${Math.round((realProfit / totalRealCost) * 100)}%` : '—'}
</div>
<div style={{ color: '#3A5068', fontSize: '10px', marginTop: '2px' }}>Return on investment</div>
</div>
<div style={{ background: '#0F1923', borderRadius: '8px', padding: '12px', border: '1px solid #2A3F54' }}>
<div style={{ color: '#6B7F8E', fontSize: '10px', fontWeight: '700', marginBottom: '4px' }}>DURATION</div>
<div style={{ color: '#6B7F8E', fontSize: '16px', fontWeight: '800' }}>{projectMonths} months</div>
<div style={{ color: '#3A5068', fontSize: '10px', marginTop: '2px' }}>Project timeline</div>
</div>
</div>
</div>

{/* Risk Factors */}
{result.boq.riskFactors?.length > 0 && (
<div style={{ background: 'rgba(245,166,35,0.05)', borderRadius: '12px', border: '1px solid rgba(245,166,35,0.15)', padding: '16px' }}>
<div style={{ color: '#F5A623', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', marginBottom: '10px' }}>⚠ RISK FACTORS</div>
{result.boq.riskFactors.map((r, i) => (
<div key={i} style={{ color: '#6B7F8E', fontSize: '12px', marginBottom: '6px', lineHeight: '1.5' }}>• {r}</div>
))}
</div>
)}
</div>
</div>
)}
</div>

<style>{`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
input[type=number] { -moz-appearance: textfield; }
`}</style>
</div>
);
}

