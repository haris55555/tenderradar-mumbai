import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_KEY = process.env.GEMINI_KEY || '';
const AICREDITS_KEY = "sk-live-d42243cc807dbb226103665abd51b4a7d311dea0ca749054b89eacf71c5fc232";

const PWD_RATES: Record<string, number> = {
'road': 2500000, 'bridge': 8000000, 'building': 3500000,
'drain': 1800000, 'water': 2000000, 'sewer': 2200000,
'lift': 1200000, 'electrical': 1500000, 'garden': 800000,
'pump': 900000, 'tank': 1100000, 'default': 2000000
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
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
contents: [{
parts: [
{ text: `Extract ALL BOQ line items from this tender PDF. Return ONLY this JSON:
{"tenderValue":0,"boqItems":[{"item":"description","unit":"Cum","quantity":100,"rate":7200,"amount":720000}],"extractionSuccess":true}
If no BOQ found: {"extractionSuccess":false,"tenderValue":0,"boqItems":[]}
Every item MUST have non-zero rate and amount.` },
{ inline_data: { mime_type: 'application/pdf', data: pdfBase64 } }
]
}],
generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
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
const targetCost = Math.round(value * 0.85);
const response = await fetch("https://api.aicredits.in/v1/chat/completions", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": `Bearer ${AICREDITS_KEY}`
},
body: JSON.stringify({
model: "claude-haiku-4-5",
max_tokens: 1500,
messages: [{
role: "user",
content: `You are an expert quantity surveyor for Mumbai BMC government construction projects.
Tender: ${title}
Organisation: ${org}
Type: ${type}
Department Estimate: ₹${value}

Generate realistic BOQ using Maharashtra PWD Schedule of Rates 2024-25.
CRITICAL: Every boqItem MUST have non-zero rate and amount (quantity x rate).
Total of all amounts must be close to ₹${targetCost}.

Return ONLY valid JSON (no markdown, no explanation):
{
"boqItems": [
{"item":"specific work item for this tender","quantity":500,"unit":"Cum","rate":280,"amount":140000},
{"item":"another specific item","quantity":120,"unit":"Sqm","rate":850,"amount":102000}
],
"materialCost": ${Math.round(targetCost * 0.45)},
"labourCost": ${Math.round(targetCost * 0.25)},
"equipmentCost": ${Math.round(targetCost * 0.15)},
"overheadCost": ${Math.round(targetCost * 0.10)},
"contingency": ${Math.round(targetCost * 0.05)},
"keyMaterials": ["material1","material2","material3"],
"majorEquipment": ["equipment1","equipment2"],
"executionDays": 120,
"riskFactors": ["risk1","risk2","risk3"],
"bidRecommendationReason": "specific reason for this tender type and value"
}`
}]
}),
signal: AbortSignal.timeout(8000),
});
const data = await response.json();
return data.choices?.[0]?.message?.content || '{}';
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
if (tenderValueNum && tenderValueNum > 100000) deptEstimate = tenderValueNum;
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
if (parsed.extractionSuccess && parsed.boqItems && parsed.boqItems.length > 0) {
boqItems = parsed.boqItems;
executionCostFromBOQ = boqItems.reduce((sum: number, i: any) => {
const amount = i.amount || (i.quantity * i.rate) || 0;
return sum + amount;
}, 0);
dataSource = 'actual_pdf';
geminiSuccess = true;
if (parsed.tenderValue && parsed.tenderValue > 100000) deptEstimate = parsed.tenderValue;
}
} catch {}
}
}
}

// Step 3: AICredits estimation with forced real rates
const aiResponse = await estimateWithAI(tenderTitle || '', tenderType || '', organisation || '', deptEstimate);
let aiData: any = {};
try {
const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
aiData = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}');
} catch {}

// Step 4: Calculate financials using real BOQ sums
const expectedWinningBid = Math.round(deptEstimate * 0.92);

let executionCost = 0;
if (geminiSuccess && executionCostFromBOQ > 0) {
executionCost = executionCostFromBOQ;
} else if (aiData.boqItems && aiData.boqItems.length > 0) {
executionCost = aiData.boqItems.reduce((sum: number, i: any) => {
const amount = i.amount || (i.quantity * i.rate) || 0;
return sum + amount;
}, 0);
}
if (!executionCost || executionCost < 100000) {
executionCost = Math.round(expectedWinningBid * 0.85);
}

const expectedProfit = expectedWinningBid - executionCost;
const profitMargin = Math.round((expectedProfit / expectedWinningBid) * 100);
const workingCapitalNeeded = Math.round(executionCost * 0.3);
const finalBoqItems = geminiSuccess ? boqItems : (aiData.boqItems || []);

return res.status(200).json({
success: true,
boq: {
dataSource,
departmentEstimate: deptEstimate,
expectedWinningBid,
executionCost,
expectedProfit,
profitMargin,
workingCapitalNeeded,
raCycleDays: 60,
bidRecommendation: profitMargin >= 10 ? 'YES' : profitMargin >= 7 ? 'REVIEW' : 'NO',
bidRecommendationReason: aiData.bidRecommendationReason || `${profitMargin}% margin on ${tenderType} tender`,
boqItems: finalBoqItems,
materialCost: aiData.materialCost || Math.round(executionCost * 0.45),
labourCost: aiData.labourCost || Math.round(executionCost * 0.25),
equipmentCost: aiData.equipmentCost || Math.round(executionCost * 0.15),
overheadCost: aiData.overheadCost || Math.round(executionCost * 0.10),
contingency: aiData.contingency || Math.round(executionCost * 0.05),
keyMaterials: aiData.keyMaterials || ['Cement OPC 53', 'TMT Steel Fe500D', 'River Sand'],
majorEquipment: aiData.majorEquipment || ['JCB Excavator', 'Concrete Mixer'],
executionDays: aiData.executionDays || 120,
riskFactors: aiData.riskFactors || ['Urban area work', 'Monsoon delays', 'Utility shifting'],
},
pdfRead: geminiSuccess,
message: geminiSuccess
? `✅ Real BOQ extracted from tender PDF — ${boqItems.length} items found`
: '📊 AI-estimated BOQ based on tender type and Maharashtra PWD rates'
});

} catch (error) {
return res.status(500).json({ error: 'BOQ analysis failed', details: String(error) });
}
}
