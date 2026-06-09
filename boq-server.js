import http from 'http';

const GEMINI_KEY = process.env.GEMINI_KEY || '';

const PWD_RATES = {
'road': 2500000, 'bridge': 8000000, 'building': 3500000,
'drain': 1800000, 'water': 2000000, 'sewer': 2200000,
'lift': 1200000, 'electrical': 1500000, 'garden': 800000,
'pump': 900000, 'tank': 1100000, 'default': 2000000
};

function estimateTenderValue(title, org) {
const t = (title + ' ' + org).toLowerCase();
for (const [key, val] of Object.entries(PWD_RATES)) {
if (t.includes(key)) return val;
}
return PWD_RATES['default'];
}

async function estimateWithGemini(title, type, org, value) {
try {
const t = Math.round(value * 0.85);

const prompt = `You are an expert quantity surveyor for Mumbai government construction projects. Analyze this specific tender carefully.

TENDER DETAILS:
- Title: ${title}
- Type: ${type}
- Organisation: ${org}
- Department Estimate: Rs ${value}

Based on the EXACT tender title and type above, provide realistic BOQ items specific to THIS work only.
Target execution cost should be Rs ${t} (85% of dept estimate).
The profit margin should reflect realistic market conditions — typically between 8% to 18% depending on complexity.

Return ONLY this JSON, no markdown, no explanation:
{
"boqItems": [
{"item": "most relevant work item for this specific tender","quantity": 500,"unit": "Cum","rate": 1200,"amount": 600000},
{"item": "second most relevant item specific to this work","quantity": 300,"unit": "Sqm","rate": 850,"amount": 255000},
{"item": "third item specific to this tender type","quantity": 150,"unit": "Rm","rate": 2200,"amount": 330000},
{"item": "fourth relevant item","quantity": 200,"unit": "Nos","rate": 4500,"amount": 900000}
],
"materialCost": ${Math.round(t * 0.45)},
"labourCost": ${Math.round(t * 0.25)},
"equipmentCost": ${Math.round(t * 0.15)},
"overheadCost": ${Math.round(t * 0.10)},
"contingency": ${Math.round(t * 0.05)},
"keyMaterials": ["primary material specific to ${type} work in Mumbai 2026","secondary material with current rate","tertiary material"],
"majorEquipment": ["primary equipment needed for ${type}","secondary equipment"],
"executionDays": 120,
"riskFactors": ["risk specific to ${type} work in Mumbai","monsoon season impact on timeline","urban site access constraints"],
"bidRecommendationReason": "Specific financial reasoning for this Rs ${value} ${type} tender considering Mumbai 2026 market rates and competition"
}`;

const body = JSON.stringify({
contents: [{ parts: [{ text: prompt }] }],
generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
});

const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body
}
);
const data = await response.json();
return data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
} catch (e) {
return '{}';
}
}

const server = http.createServer(async (req, res) => {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

if (req.method === 'OPTIONS') {
res.writeHead(200);
res.end();
return;
}

if (req.method !== 'POST' || req.url !== '/api/boq') {
res.writeHead(404);
res.end(JSON.stringify({ error: 'Not found' }));
return;
}

let body = '';
req.on('data', chunk => body += chunk);
req.on('end', async () => {
try {
const { tenderTitle, tenderValue, tenderValueNum, tenderType, organisation } = JSON.parse(body);

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

const aiResponse = await estimateWithGemini(tenderTitle || '', tenderType || '', organisation || '', deptEstimate);
let aiData = {};
try {
const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
aiData = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}');
} catch (e) {}

const expectedWinningBid = Math.round(deptEstimate * 0.92);
let executionCost = 0;
if (aiData.boqItems?.length > 0) {
executionCost = aiData.boqItems.reduce((s, i) => s + (i.amount || i.quantity * i.rate || 0), 0);
}
if (!executionCost || executionCost < 100000) {
executionCost = Math.round(expectedWinningBid * 0.85);
}

const expectedProfit = expectedWinningBid - executionCost;
const profitMargin = Math.round((expectedProfit / expectedWinningBid) * 100);

const result = {
success: true,
boq: {
dataSource: 'pwd_estimation',
departmentEstimate: deptEstimate,
expectedWinningBid,
executionCost,
expectedProfit,
profitMargin,
workingCapitalNeeded: Math.round(executionCost * 0.3),
raCycleDays: 60,
bidRecommendation: profitMargin >= 10 ? 'YES' : profitMargin >= 7 ? 'REVIEW' : 'NO',
bidRecommendationReason: aiData.bidRecommendationReason || `${profitMargin}% margin on ${tenderType} tender`,
boqItems: aiData.boqItems || [],
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
pdfRead: false,
message: '📊 AI-estimated BOQ based on Maharashtra PWD rates 2024-25'
};

res.writeHead(200, { 'Content-Type': 'application/json' });
res.end(JSON.stringify(result));

} catch (error) {
res.writeHead(500, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({ error: 'BOQ analysis failed', details: String(error) }));
}
});
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
console.log(`BOQ service running on port ${PORT}`);
});
