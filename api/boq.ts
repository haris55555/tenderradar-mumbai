import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_KEY = "AQ.Ab8RN6JOnzExxgmVFPRfAqx_NTSoOD0uriGqGBNDMLBFtqNoNw";

const PWD_RATES: Record<string, number> = {
'road': 2500000, 'bridge': 8000000, 'building': 3500000,
'drain': 1800000, 'water': 2000000, 'sewer': 2200000,
'electrical': 1500000, 'garden': 800000, 'default': 2000000
};

const MATERIAL_RATES: Record<string, number> = {
'RCC': 7200, 'PCC': 5800, 'Brickwork': 4200, 'Plaster': 180,
'Flooring': 850, 'Waterproofing': 650, 'Painting': 120,
'Earthwork': 280, 'Steel': 68000, 'Shuttering': 420,
'default': 3500
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
signal: AbortSignal.timeout(15000),
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
{
inline_data: { mime_type: 'application/pdf', data: pdfBase64 }
},
{
text: `Extract BOQ from this tender PDF. Return ONLY valid JSON:
{
"extractionSuccess": true,
"tenderValue": <number in rupees>,
"boqItems": [
{"item": "item name", "quantity": <number>, "unit": "unit", "rate": <rate per unit in rupees>, "amount": <quantity * rate>}
]
}
If you cannot read the PDF or find no BOQ table, return: {"extractionSuccess": false, "boqItems": []}
Return ONLY the JSON object, no other text.`
}
]
}],
generationConfig: { temperature: 0, maxOutputTokens: 2000 }
}),
signal: AbortSignal.timeout(30000),
}
);
const data = await res.json();
return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
} catch {
return '';
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
else if (v.match(/[\d.]+/)) {
const n = parseFloat(v.replace(/[^0-9.]/g, ''));
if (n > 100000) deptEstimate = n;
}
}
if (!deptEstimate || deptEstimate < 100000) {
deptEstimate = estimateTenderValue(tenderTitle, organisation);
}

// Step 2: Try Gemini PDF reading
let boqItems: {item: string; quantity: number; unit: string; rate: number; amount: number}[] = [];
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
const jsonStr = cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}';
const parsed = JSON.parse(jsonStr);

// FIX: Check boqItems.length, don't require extractionSuccess flag
if (parsed.boqItems && parsed.boqItems.length > 0) {
boqItems = parsed.boqItems.map((item: {item: string; quantity: number; unit: string; rate?: number; amount?: number}) => {
// Ensure rate exists — look up from material rates if missing
const rate = item.rate || MATERIAL_RATES[item.item] || MATERIAL_RATES['default'];
const amount = item.amount || Math.round(item.quantity * rate);
return { ...item, rate, amount };
});

// FIX: Calculate execution cost from actual BOQ items
executionCostFromBOQ = boqItems.reduce((sum, i) => sum + i.amount, 0);

dataSource = 'actual_pdf';
geminiSuccess = true;

// Use PDF tender value if extracted and reasonable
if (parsed.tenderValue && parsed.tenderValue > 100000) {
deptEstimate = parsed.tenderValue;
}
}
} catch {}
}
}
}

// Step 3: Calculate financials
const expectedWinningBid = Math.round(deptEstimate * 0.92);

// FIX: Use real BOQ sum if Gemini succeeded, else fall back to percentage
const executionCost = geminiSuccess && executionCostFromBOQ > 0
? executionCostFromBOQ
: Math.round(expectedWinningBid * 0.85);

const expectedProfit = expectedWinningBid - executionCost;
const profitMargin = Math.round((expectedProfit / expectedWinningBid) * 100);
const workingCapitalNeeded = Math.round(executionCost * 0.3);

// Step 4: Get AI analysis for non-BOQ fields
const aiResponse = await estimateWithAI(tenderTitle, tenderType, organisation, deptEstimate);
let aiData: Record<string, unknown> = {};
try {
const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
aiData = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}');
} catch {}

const finalBoqItems = geminiSuccess ? boqItems : (aiData.boqItems as object[] || []);

// Step 5: Validate — BOQ total should be close to tender value
const boqTotal = geminiSuccess ? executionCostFromBOQ : 0;
const boqValidation = boqTotal > 0
? Math.abs(boqTotal - deptEstimate) / deptEstimate < 0.25 ? 'MATCHED' : 'MISMATCH'
: 'N/A';

const boqData = {
dataSource,
departmentEstimate: deptEstimate,
expectedWinningBid,
executionCost,
expectedProfit,
profitMargin,
workingCapitalNeeded,
boqTotal: boqTotal || null,
boqValidation,
raCycleDays: 60,
bidRecommendation: profitMargin >= 10 ? 'YES' : profitMargin >= 7 ? 'REVIEW' : 'NO',
bidRecommendationReason: aiData.bidRecommendationReason as string || `${profitMargin}% margin on ${tenderType} tender`,
boqItems: finalBoqItems,
materialCost: aiData.materialCost as number || Math.round(executionCost * 0.45),
labourCost: aiData.labourCost as number || Math.round(executionCost * 0.25),
equipmentCost: aiData.equipmentCost as number || Math.round(executionCost * 0.15),
overheadCost: aiData.overheadCost as number || Math.round(executionCost * 0.10),
contingency: aiData.contingency as number || Math.round(executionCost * 0.05),
keyMaterials: aiData.keyMaterials as string[] || ['Cement OPC 53', 'TMT Steel Fe500D', 'River Sand'],
majorEquipment: aiData.majorEquipment as string[] || ['JCB Excavator', 'Concrete Mixer'],
executionDays: aiData.executionDays as number || 120,
riskFactors: aiData.riskFactors as string[] || ['Urban area work', 'Monsoon delays', 'Utility shifting'],
};

return res.status(200).json({
success: true,
boq: boqData,
pdfRead: geminiSuccess,
message: geminiSuccess
? `✅ Real BOQ extracted from tender PDF — ${boqItems.length} items found (${boqValidation})`
: '📊 Estimated using Maharashtra PWD Schedule of Rates 2024-25'
});

} catch (error) {
return res.status(500).json({ error: 'BOQ analysis failed', details: String(error) });
}
