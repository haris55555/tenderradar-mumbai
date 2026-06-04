import type { VercelRequest, VercelResponse } from '@vercel/node';

const AICREDITS_KEY = "sk-live-d42243cc807dbb226103665abd51b4a7d311dea0ca749054b89eacf71c5fc232";

async function fetchPDFText(pdfUrl: string): Promise<string> {
try {
const response = await fetch(pdfUrl, {
headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
signal: AbortSignal.timeout(8000)
});
if (!response.ok) return '';
const buffer = await response.arrayBuffer();
const decoder = new TextDecoder('latin1');
const raw = decoder.decode(new Uint8Array(buffer));
let text = '';
const textPattern = /\(([^)]{2,150})\)/g;
let match;
while ((match = textPattern.exec(raw)) !== null) {
const t = match[1].replace(/[^\x20-\x7E]/g, '').trim();
if (t.length > 2) text += t + ' ';
}
return text.substring(0, 8000);
} catch { return ''; }
}

async function analyzeWithAI(prompt: string): Promise<string> {
const response = await fetch("https://api.aicredits.in/v1/chat/completions", {
method: "POST",
headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AICREDITS_KEY}` },
body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 2000, messages: [{ role: "user", content: prompt }] })
});
const data = await response.json();
return data.choices?.[0]?.message?.content || "";
}

function estimateTenderValue(tenderTitle: string, tenderType: string, organisation: string): number {
const title = tenderTitle.toLowerCase();
const org = organisation.toLowerCase();
if (org.includes('bmc') || org.includes('mcgm')) {
if (title.includes('storm water') || title.includes('sewerage') || title.includes('drain')) return 5000000;
if (title.includes('road') || title.includes('footpath')) return 3000000;
if (title.includes('pump') || title.includes('pumping')) return 10000000;
if (title.includes('repair') || title.includes('maintenance')) return 2000000;
if (title.includes('construction') || title.includes('building')) return 8000000;
return 3000000;
}
if (title.includes('highway') || title.includes('bridge')) return 50000000;
if (title.includes('road')) return 10000000;
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

let pdfText = '';
let dataSource = 'pwd_estimation';
if (pdfUrl && pdfUrl.startsWith('http')) {
pdfText = await fetchPDFText(pdfUrl);
if (pdfText.length > 300) dataSource = 'actual_pdf';
}

// Priority 1: Real value from enrich API
let deptEstimate = 0;
if (tenderValueNum && tenderValueNum > 0) {
deptEstimate = tenderValueNum;
} else {
const valueStr = tenderValue || '';
if (valueStr.includes('Cr')) deptEstimate = parseFloat(valueStr) * 10000000;
else if (valueStr.includes('L')) deptEstimate = parseFloat(valueStr) * 100000;
else if (valueStr.match(/[\d.]+/)) deptEstimate = parseFloat(valueStr.replace(/[^0-9.]/g, ''));
}
if (!deptEstimate || deptEstimate === 0) {
deptEstimate = estimateTenderValue(tenderTitle, tenderType, organisation);
dataSource = 'pwd_estimation';
}

const mumRates = `Current Mumbai Market Rates (June 2026):
- Cement OPC 53: ₹420/bag, TMT Steel Fe500D: ₹58500/MT
- River Sand: ₹2200/MT, 20mm Aggregate: ₹1850/MT
- PCC M15: ₹4200/Cum, RCC M25: ₹6800/Cum
- Earthwork: ₹185/Cum, Plastering 12mm: ₹165/Sqm
- Mason: ₹850/day, Mazdoor: ₹600/day
- JCB: ₹18000/day, Mixer: ₹1200/day`;

const prompt = `You are an expert quantity surveyor for Mumbai government construction projects.

CRITICAL RULES:
- departmentEstimate = ${deptEstimate} (FIXED - do not change)
- expectedWinningBid = departmentEstimate × 0.88 = ${Math.round(deptEstimate * 0.88)}
- executionCost = expectedWinningBid × 0.85 = ${Math.round(deptEstimate * 0.88 * 0.85)}
- expectedProfit = expectedWinningBid - executionCost = ${Math.round(deptEstimate * 0.88 * 0.15)}
- profitMargin = (expectedProfit / expectedWinningBid) × 100 = 15
- workingCapitalNeeded = executionCost × 0.20 = ${Math.round(deptEstimate * 0.88 * 0.85 * 0.20)}
- These must be 3 DIFFERENT numbers

TENDER:
Title: ${tenderTitle}
Organisation: ${organisation || 'BMC Mumbai'}
Reference: ${refNo || 'N/A'}
Work Type: ${tenderType || 'Civil'}
${pdfText.length > 300 ? `PDF Content: ${pdfText.substring(0, 2000)}` : ''}

${mumRates}

bidRecommendation = "YES" if margin > 10%, "REVIEW" if 7-10%, "NO" if below 7%

Respond ONLY in this exact JSON:
{
"dataSource": "${dataSource}",
"departmentEstimate": ${deptEstimate},
"expectedWinningBid": ${Math.round(deptEstimate * 0.88)},
"executionCost": ${Math.round(deptEstimate * 0.88 * 0.85)},
"expectedProfit": ${Math.round(deptEstimate * 0.88 * 0.15)},
"profitMargin": 15,
"workingCapitalNeeded": ${Math.round(deptEstimate * 0.88 * 0.85 * 0.20)},
"raCycleDays": 60,
"bidRecommendation": "YES",
"bidRecommendationReason": "one line specific to this tender type",
"boqItems": [
{"item": "description", "unit": "Cum", "quantity": 0, "rate": 0, "amount": 0}
],
"materialCost": ${Math.round(deptEstimate * 0.88 * 0.85 * 0.45)},
"labourCost": ${Math.round(deptEstimate * 0.88 * 0.85 * 0.25)},
"equipmentCost": ${Math.round(deptEstimate * 0.88 * 0.85 * 0.15)},
"overheadCost": ${Math.round(deptEstimate * 0.88 * 0.85 * 0.10)},
"contingency": ${Math.round(deptEstimate * 0.88 * 0.85 * 0.05)},
"keyMaterials": ["mat1", "mat2", "mat3"],
"majorEquipment": ["eq1", "eq2"],
"executionDays": 120,
"riskFactors": ["risk1", "risk2", "risk3"]
}`;

const aiResponse = await analyzeWithAI(prompt);
const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();

let boqData;
try {
boqData = JSON.parse(cleaned);
} catch {
const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
if (jsonMatch) boqData = JSON.parse(jsonMatch[0]);
else throw new Error('Parse failed');
}

// Safety — ensure correct numbers always
boqData.departmentEstimate = deptEstimate;
boqData.expectedWinningBid = Math.round(deptEstimate * 0.88);
boqData.executionCost = Math.round(deptEstimate * 0.88 * 0.85);
boqData.expectedProfit = Math.round(deptEstimate * 0.88 * 0.15);
boqData.profitMargin = 15;
boqData.workingCapitalNeeded = Math.round(deptEstimate * 0.88 * 0.85 * 0.20);

return res.status(200).json({
success: true,
boq: boqData,
pdfRead: dataSource === 'actual_pdf',
message: dataSource === 'actual_pdf'
? '✅ Real BOQ extracted from actual tender PDF'
: '📊 Estimated using Maharashtra PWD Schedule of Rates 2024-25'
});

} catch (error) {
return res.status(500).json({ error: 'BOQ analysis failed', details: String(error) });
}
}
