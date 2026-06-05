import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_KEY = "AQ.Ab8RN6JOnzExxgmVFPRfAqx_NTSoOD0uriGqGBNDMLBFtqNoNw";

const PWD_RATES: Record<string, number> = {
'road': 2500000, 'bridge': 8000000, 'building': 3500000,
'drain': 1800000, 'water': 2000000, 'sewer': 2200000,
'lift': 1200000, 'electrical': 1500000, 'garden': 800000,
'pump': 900000, 'tank': 1100000, 'default': 2000000
};

const MATERIAL_RATES: Record<string, number> = {
'RCC': 7200, 'PCC': 5800, 'Brickwork': 4200, 'Plaster': 180,
'Flooring': 850, 'Waterproofing': 650, 'Painting': 120,
'Earthwork': 280, 'Steel': 68000, 'default': 3500
};

function estimateTenderValue(title: string, org: string): number {
const t = (title + ' ' + org).toLowerCase();
for (const [key, val] of Object.entries(PWD_RATES)) {
if (t.includes(key)) return val;
}
return PWD_RATES['default'];
}

async function downloadPDF(url: string): Promise<string> {
try {
const res = await fetch(url, {
headers: {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
'Accept': 'application/pdf,*/*',
'Referer': 'https://portal.mcgm.gov.in/',
},
signal: AbortSignal.timeout(5000),
});
if (!res.ok) return '';
const buf = await res.arrayBuffer();
return Buffer.from(buf).toString('base64');
} catch {
return '';
}
}

async function readPDFWithGemini(pdfBase64: string): Promise<string> {
try {
const res = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
contents: [{
parts: [
{ inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
{ text: `Extract BOQ from this tender PDF. Return ONLY valid JSON:
{"extractionSuccess":true,"tenderValue":0,"boqItems":[{"item":"item name","quantity":100,"unit":"Sqm","rate":850,"amount":85000}]}
If no BOQ found return: {"extractionSuccess":false,"boqItems":[]}` }
]
}],
generationConfig: { temperature: 0, maxOutputTokens: 2000 }
}),
signal: AbortSignal.timeout(6000),
}
);
const data = await res.json();
return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
} catch {
return '';
}
}

async function estimateWithAI(title: string, type: string, org: string, value: number): Promise<string> {
try {
const res = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
contents: [{
parts: [{
text: `You are a Maharashtra PWD contractor. Analyze tender:
Title: ${title}, Type: ${type}, Org: ${org}, Value: ₹${value}
Return ONLY JSON (no markdown):
{"boqItems":[{"item":"specific item for this tender","quantity":100,"unit":"Sqm","rate":850,"amount":85000}],"materialCost":0,"labourCost":0,"equipmentCost":0,"overheadCost":0,"contingency":0,"keyMaterials":["Cement","Steel","Sand"],"majorEquipment":["JCB","Mixer"],"executionDays":120,"riskFactors":["Monsoon","Utility shifting"],"bidRecommendationReason":"specific reason for this tender"}`
}]
}],
generationConfig: { temperature: 0.3, maxOutputTokens: 1500 }
}),
signal: AbortSignal.timeout(8000),
}
);
const data = await res.json();
return data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
} catch {
return '{}';
}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') return res.status(200).end();
if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

try {
const { tenderTitle, tenderValue, tenderValueNum, tenderType, organisation, pdfUrl } = req.body;

// Step 1: Get department estimate
let deptEstimate = 0;
if (tenderValueNum && tenderValueNum > 100000) {
deptEstimate = tenderValueNum;
}
if (!deptEstimate) {
const v = (tenderValue || '').replace(/,/g, '');
if (v.includes('Cr')) deptEstimate = parseFloat(v) * 10000000;
else if (v.includes('L')) deptEstimate = parseFloat(v) * 100000;
else {
const n = parseFloat(v.replace(/[^0-9.]/g, ''));
if (n > 100000) deptEstimate = n;
}
}
if (!deptEstimate || deptEstimate < 100000) {
deptEstimate = estimateTenderValue(tenderTitle || '', organisation || '');
}

// Step 2: Try PDF (fast timeout - won't block)
let boqItems: any[] = [];
let dataSource = 'pwd_estimation';
let geminiSuccess = false;
let executionCostFromBOQ = 0;

if (pdfUrl && pdfUrl.startsWith('http')) {
const pdfBase64 = await downloadPDF(pdfUrl);
if (pdfBase64.length > 500) {
const geminiText = await readPDFWithGemini(pdfBase64);
if (geminiText) {
try {
const cleaned = geminiText.replace(/```json/g, '').replace(/```/g, '').trim();
const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}');
if (parsed.boqItems && parsed.boqItems.length > 0) {
boqItems = parsed.boqItems.map((item: any) => {
const rate = item.rate || MATERIAL_RATES[item.item] || MATERIAL_RATES['default'];
const amount = item.amount || Math.round(item.quantity * rate);
return { ...item, rate, amount };
});
// FORMULA FIX: sum real BOQ items
executionCostFromBOQ = boqItems.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
dataSource = 'actual_pdf';
geminiSuccess = true;
if (parsed.tenderValue && parsed.tenderValue > 100000) {
deptEstimate = parsed.tenderValue;
}
}
} catch {}
}
}
}

// Step 3: AI estimation (always runs - gives per-tender values)
const aiResponse = await estimateWithAI(tenderTitle || '', tenderType || '', organisation || '', deptEstimate);
let aiData: any = {};
try {
const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
aiData = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}');
} catch {}

// Step 4: Calculate financials
const expectedWinningBid = Math.round(deptEstimate * 0.92);

//
