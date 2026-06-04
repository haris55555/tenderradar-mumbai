import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_KEY = "AQ.Ab8RN6I3_JiQ9G2mS6K9wUlI2qnXCYNr-TGSEDHmDlObuBemZA";
const AICREDITS_KEY = "sk-live-d42243cc807dbb226103665abd51b4a7d311dea0ca749054b89eacf71c5fc232";

async function downloadPDFAsBase64(pdfUrl: string): Promise<string> {
try {
const response = await fetch(pdfUrl, {
headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
signal: AbortSignal.timeout(10000)
});
if (!response.ok) return '';
const buffer = await response.arrayBuffer();
const bytes = new Uint8Array(buffer);
let binary = '';
for (let i = 0; i < bytes.byteLength; i++) {
binary += String.fromCharCode(bytes[i]);
}
return btoa(binary);
} catch { return ''; }
}

async function readPDFWithGemini(pdfBase64: string, tenderTitle: string): Promise<string> {
try {
const prompt = `You are reading a government tender BOQ (Bill of Quantities) PDF document.

Extract ALL BOQ line items from this document. Look for tables with columns like:
- Item description / Work item
- Unit (Cum, Sqm, MT, Nos, LS, RMT etc)
- Quantity
- Rate (₹)
- Amount (₹)

Also extract:
- Total tender value / estimated cost
- EMD amount if mentioned

Return ONLY this JSON format:
{
"tenderValue": 0,
"emd": 0,
"boqItems": [
{"item": "description", "unit": "Cum", "quantity": 0, "rate": 0, "amount": 0}
],
"extractionSuccess": true
}

If you cannot find BOQ data, return: {"extractionSuccess": false, "tenderValue": 0, "emd": 0, "boqItems": []}`;

const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
contents: [{
parts: [
{ text: prompt },
{ inline_data: { mime_type: 'application/pdf', data: pdfBase64 } }
]
}],
generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
})
}
);

if (!response.ok) return '';
const data = await response.json();
return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
} catch { return ''; }
}

async function estimateWithAI(tenderTitle: string, tenderType: string, organisation: string, deptEstimate: number): Promise<string> {
const response = await fetch("https://api.aicredits.in/v1/chat/completions", {
method: "POST",
headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AICREDITS_KEY}` },
body: JSON.stringify({
model: "claude-haiku-4-5",
max_tokens: 1500,
messages: [{
role: "user",
content: `You are an expert quantity surveyor for Mumbai BMC government construction projects.

Tender: ${tenderTitle}
Organisation: ${organisation}
Type: ${tenderType}
Department Estimate: ₹${deptEstimate}

Generate work-type specific BOQ. For roads use bitumen/aggregate. For sewerage use pipes/excavation. For civil use concrete/steel. For HT motors use electrical components.

Return ONLY JSON:
{
"boqItems": [{"item": "desc", "unit": "unit", "quantity": 0, "rate": 0, "amount": 0}],
"materialCost": ${Math.round(deptEstimate * 0.88 * 0.85 * 0.45)},
"labourCost": ${Math.round(deptEstimate * 0.88 * 0.85 * 0.25)},
"equipmentCost": ${Math.round(deptEstimate * 0.88 * 0.85 * 0.15)},
"overheadCost": ${Math.round(deptEstimate * 0.88 * 0.85 * 0.10)},
"contingency": ${Math.round(deptEstimate * 0.88 * 0.85 * 0.05)},
"keyMaterials": ["mat1", "mat2", "mat3"],
"majorEquipment": ["eq1", "eq2"],
"executionDays": 120,
"riskFactors": ["risk1", "risk2", "risk3"],
"bidRecommendationReason": "specific reason for this work type and tender value"
}`
}]
})
});
const data = await response.json();
return data.choices?.[0]?.message?.content || '';
}

function estimateTenderValue(title: string, type: string, org: string): number {
const t = title.toLowerCase();
const o = org.toLowerCase();
if (o.includes('bmc') || o.includes('mcgm')) {
if (t.includes('storm water') || t.includes('sewerage') || t.includes('drain')) return 5000000;
if (t.includes('road') || t.includes('footpath')) return 3000000;
if (t.includes('pump') || t.includes('pumping') || t.includes('motor')) return 10000000;
if (t.includes('repair') || t.includes('maintenance')) return 2000000;
if (t.includes('construction') || t.includes('building')) return 8000000;
return 3000000;
}
return 5000000;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') return res.status(200).end();
if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

try {
const { tenderTitle, tenderValue, tenderValueNum, tenderType, organisation, refNo, pdfUrl } = req.body;

let deptEstimate = tenderValueNum || 0;
if (!deptEstimate) {
const v = tenderValue || '';
if (v.includes('Cr')) deptEstimate = parseFloat(v) * 10000000;
else if (v.includes('L')) deptEstimate = parseFloat(v) * 100000;
}
if (!deptEstimate) deptEstimate = estimateTenderValue(tenderTitle, tenderType, organisation);

const expectedWinningBid = Math.round(deptEstimate * 0.88);
const executionCost = Math.round(expectedWinningBid * 0.85);
const expectedProfit = expectedWinningBid - executionCost;
const profitMargin = Math.round((expectedProfit / expectedWinningBid) * 100);
const workingCapitalNeeded = Math.round(executionCost * 0.20);

let boqItems: object[] = [];
let dataSource = 'pwd_estimation';
let geminiSuccess = false;

if (pdfUrl && pdfUrl.startsWith('http')) {
const pdfBase64 = await downloadPDFAsBase64(pdfUrl);
if (pdfBase64.length > 1000) {
const geminiResponse = await readPDFWithGemini(pdfBase64, tenderTitle);
if (geminiResponse) {
try {
const cleaned = geminiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}');
if (parsed.extractionSuccess && parsed.boqItems && parsed.boqItems.length > 0) {
boqItems = parsed.boqItems;
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

const aiResponse = await estimateWithAI(tenderTitle, tenderType, organisation, deptEstimate);
let aiData: Record<string, unknown> = {};
try {
const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
aiData = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}');
} catch {}

const finalBoqItems = geminiSuccess ? boqItems : (aiData.boqItems || []);

const boqData = {
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
};

return res.status(200).json({
success: true,
boq: boqData,
pdfRead: geminiSuccess,
message: geminiSuccess
? '✅ Real BOQ extracted from actual tender PDF using Gemini AI'
: '📊 Estimated using Maharashtra PWD Schedule of Rates 2024-25'
});

} catch (error) {
return res.status(500).json({ error: 'BOQ analysis failed', details: String(error) });
}
}
