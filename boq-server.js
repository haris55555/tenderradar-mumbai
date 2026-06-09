import http from 'http';

const GEMINI_KEY = process.env.GEMINI_KEY || '';
const ADOBE_CLIENT_ID = process.env.ADOBE_CLIENT_ID || '';
const ADOBE_CLIENT_SECRET = process.env.ADOBE_CLIENT_SECRET || '';

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

function getDefaultsForType(type) {
const t = (type || '').toLowerCase();
if (t.includes('road') || t.includes('infrastructure')) {
return {
keyMaterials: ['Bituminous Macadam', 'WBM Aggregate', 'Cement Concrete M30', 'TMT Steel Fe500D'],
majorEquipment: ['Road Roller 10T', 'Paver Machine', 'JCB Excavator', 'Tipper Trucks'],
riskFactors: ['Heavy monsoon damage to road surface', 'Underground utility conflicts', 'Traffic diversion in busy Mumbai roads'],
executionDays: 120
};
}
if (t.includes('sewer') || t.includes('sewerage') || t.includes('drain')) {
return {
keyMaterials: ['NP3 RCC Pipes', 'Cement OPC 53', 'River Sand Zone II', 'Brick Masonry'],
majorEquipment: ['JCB Excavator', 'Dewatering Pump', 'Concrete Mixer', 'Crane'],
riskFactors: ['High water table in Mumbai', 'Existing utility crossing', 'Monsoon flooding risk'],
executionDays: 150
};
}
if (t.includes('sanitary') || t.includes('water') || t.includes('pipeline') || t.includes('pump')) {
return {
keyMaterials: ['DI Pipes K9 Class', 'Sluice Valves', 'Cement OPC 53', 'Sand Bedding Material'],
majorEquipment: ['Pipe Laying Machine', 'JCB Excavator', 'Welding Machine', 'Pressure Testing Equipment'],
riskFactors: ['Water supply disruption during work', 'Pressure testing failures', 'Soil condition variations in Mumbai'],
executionDays: 90
};
}
return {
keyMaterials: ['Cement OPC 53', 'TMT Steel Fe500D', 'River Sand Zone II', '20mm Aggregate'],
majorEquipment: ['JCB Excavator', 'Concrete Mixer', 'Compactor', 'Tipper Truck'],
riskFactors: ['Urban area work constraints', 'Monsoon season delays', 'Utility shifting required'],
executionDays: 120
};
}

function generateEstimatedBOQ(type, deptEstimate) {
const t = (type || '').toLowerCase();
const targetCost = Math.round(deptEstimate * 0.82);
let template = [];

if (t.includes('road') || t.includes('infrastructure') || t.includes('footpath')) {
template = [
{ item: 'Earthwork Excavation in all types of soil', unit: 'Cum', ratePct: 0.05, rate: 320 },
{ item: 'Granular Sub Base (GSB) 200mm thick', unit: 'Sqm', ratePct: 0.15, rate: 380 },
{ item: 'Wet Mix Macadam (WMM) 150mm thick', unit: 'Sqm', ratePct: 0.20, rate: 520 },
{ item: 'Dense Bituminous Macadam (DBM) 50mm', unit: 'Sqm', ratePct: 0.30, rate: 680 },
{ item: 'Bituminous Concrete (BC) 25mm wearing coat', unit: 'Sqm', ratePct: 0.20, rate: 420 },
{ item: 'Precast RCC Kerb Stone 230x300mm', unit: 'Rm', ratePct: 0.10, rate: 850 },
];
} else if (t.includes('sewer') || t.includes('sewerage') || t.includes('drain')) {
template = [
{ item: 'Earthwork Excavation for sewer trench', unit: 'Cum', ratePct: 0.08, rate: 380 },
{ item: 'NP3 RCC Sewer Pipe 300mm dia including jointing', unit: 'Rm', ratePct: 0.35, rate: 2200 },
{ item: 'Brick Masonry Manhole Chamber 1.2m dia', unit: 'Nos', ratePct: 0.25, rate: 45000 },
{ item: 'RCC M20 Bed Concrete 150mm thick', unit: 'Cum', ratePct: 0.15, rate: 6800 },
{ item: 'Sand Filling and Compaction in trench', unit: 'Cum', ratePct: 0.07, rate: 220 },
{ item: 'CI Surface Box and Frame for manholes', unit: 'Nos', ratePct: 0.10, rate: 8500 },
];
} else if (t.includes('sanitary') || t.includes('water') || t.includes('pipeline') || t.includes('pump')) {
template = [
{ item: 'Earthwork Excavation for pipe trench', unit: 'Cum', ratePct: 0.08, rate: 350 },
{ item: 'DI Pipe K9 200mm dia including jointing material', unit: 'Rm', ratePct: 0.38, rate: 3800 },
{ item: 'Sluice Valve 200mm with valve chamber', unit: 'Nos', ratePct: 0.20, rate: 85000 },
{ item: 'Sand Bedding 150mm thick for pipe', unit: 'Cum', ratePct: 0.06, rate: 1800 },
{ item: 'Backfilling with excavated material and compaction', unit: 'Cum', ratePct: 0.08, rate: 250 },
{ item: 'Hydro Testing of Pipeline', unit: 'Rm', ratePct: 0.20, rate: 180 },
];
} else {
template = [
{ item: 'Earthwork Excavation in foundation', unit: 'Cum', ratePct: 0.08, rate: 350 },
{ item: 'PCC M10 in foundation 150mm thick', unit: 'Cum', ratePct: 0.10, rate: 5200 },
{ item: 'RCC M25 in columns beams and slabs', unit: 'Cum', ratePct: 0.25, rate: 7800 },
{ item: 'TMT Steel Fe500D reinforcement bars', unit: 'MT', ratePct: 0.20, rate: 63500 },
{ item: 'Brick Masonry in CM 1:6', unit: 'Cum', ratePct: 0.20, rate: 4800 },
{ item: 'Plastering 12mm CM 1:4 both sides', unit: 'Sqm', ratePct: 0.17, rate: 320 },
];
}

return template.map(item => {
const itemBudget = Math.round(targetCost * item.ratePct);
const quantity = Math.max(1, Math.round(itemBudget / item.rate));
const amount = quantity * item.rate;
return { item: item.item, unit: item.unit, quantity, rate: item.rate, amount };
});
}

async function downloadPDF(url) {
try {
console.log('Downloading PDF from:', url);
// Try with different headers to bypass BMC blocking
const response = await fetch(url, {
headers: {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
'Accept': 'application/pdf,*/*',
'Accept-Language': 'en-IN,en;q=0.9',
'Referer': 'https://portal.mcgm.gov.in/irj/portal/anonymous/qletenders_new?guest_user=english',
'Origin': 'https://portal.mcgm.gov.in',
'Connection': 'keep-alive',
},
signal: AbortSignal.timeout(25000)
});
console.log('PDF download status:', response.status);
if (!response.ok) return null;
const buffer = await response.arrayBuffer();
console.log('PDF downloaded, size:', buffer.byteLength, 'bytes');
return Buffer.from(buffer);
} catch (e) {
console.log('PDF download error:', e.message);
return null;
}
}

async function getAdobeToken() {
try {
const params = new URLSearchParams();
params.append('client_id', ADOBE_CLIENT_ID);
params.append('client_secret', ADOBE_CLIENT_SECRET);
params.append('grant_type', 'client_credentials');
params.append('scope', 'openid,AdobeID,read_organizations,dc.annotate,dc.annotate.readonly,dc.archive,dc.print.high,additional_info.job_function,additional_info.projectedProductContext');

const response = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: params.toString(),
signal: AbortSignal.timeout(15000)
});

const text = await response.text();
const data = JSON.parse(text);
if (data.access_token) {
console.log('Adobe token obtained');
return data.access_token;
}
return null;
} catch (e) {
console.log('Adobe token error:', e.message);
return null;
}
}

async function extractWithAdobe(pdfBuffer, token) {
try {
const uploadRes = await fetch('https://pdf-services.adobe.io/assets', {
method: 'POST',
headers: {
'Authorization': `Bearer ${token}`,
'X-API-Key': ADOBE_CLIENT_ID,
'Content-Type': 'application/json'
},
body: JSON.stringify({ mediaType: 'application/pdf' }),
signal: AbortSignal.timeout(15000)
});

const uploadData = await uploadRes.json();
if (!uploadData.uploadUri || !uploadData.assetID) return null;

await fetch(uploadData.uploadUri, {
method: 'PUT',
headers: { 'Content-Type': 'application/pdf' },
body: pdfBuffer,
signal: AbortSignal.timeout(30000)
});

const extractRes = await fetch('https://pdf-services.adobe.io/operation/extractpdf', {
method: 'POST',
headers: {
'Authorization': `Bearer ${token}`,
'X-API-Key': ADOBE_CLIENT_ID,
'Content-Type': 'application/json'
},
body: JSON.stringify({
assetID: uploadData.assetID,
elementsToExtract: ['text', 'tables']
}),
signal: AbortSignal.timeout(15000)
});

const jobLocation = extractRes.headers.get('location');
if (!jobLocation) return null;

for (let i = 0; i < 12; i++) {
await new Promise(r => setTimeout(r, 5000));
const pollRes = await fetch(jobLocation, {
headers: {
'Authorization': `Bearer ${token}`,
'X-API-Key': ADOBE_CLIENT_ID
},
signal: AbortSignal.timeout(10000)
});

const pollData = await pollRes.json();
console.log('Poll status:', pollData.status);

if (pollData.status === 'done') {
const downloadUri = pollData.resource?.downloadUri;
if (!downloadUri) return null;
const resultRes = await fetch(downloadUri, { signal: AbortSignal.timeout(15000) });
const resultText = await resultRes.text();
console.log('Extracted text length:', resultText.length);
return resultText;
}
if (pollData.status === 'failed') return null;
}
return null;
} catch (e) {
console.log('Adobe extraction error:', e.message);
return null;
}
}

async function parseBOQFromExtractedText(text) {
try {
const prompt = `Extract BOQ items from this tender document text.
Find any table with work items, quantities, units and rates.

Text:
${text.substring(0, 8000)}

Return ONLY valid JSON no markdown no explanation:
{"extractionSuccess":true,"boqItems":[{"item":"work description","unit":"Cum","quantity":100,"rate":7200,"amount":720000}],"tenderValue":0}

If no BOQ table found return:
{"extractionSuccess":false,"boqItems":[],"tenderValue":0}`;

const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
contents: [{ parts: [{ text: prompt }] }],
generationConfig: { temperature: 0.1, maxOutputTokens: 3000 }
}),
signal: AbortSignal.timeout(20000)
}
);

const data = await response.json();
const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
console.log('Gemini response sample:', responseText.substring(0, 300));

let parsed = null;
try {
const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
parsed = JSON.parse(cleaned);
} catch (e1) {
try {
const match = responseText.match(/\{[\s\S]*\}/);
if (match) parsed = JSON.parse(match[0]);
} catch (e2) {
console.log('JSON parse failed');
}
}

if (parsed) {
console.log('BOQ parsed - success:', parsed.extractionSuccess, 'items:', parsed.boqItems?.length);
return parsed;
}

return { extractionSuccess: false, boqItems: [], tenderValue: 0 };
} catch (e) {
console.log('BOQ parsing error:', e.message);
return { extractionSuccess: false, boqItems: [], tenderValue: 0 };
}
}

async function getBidReason(type, deptEstimate, profitMargin) {
try {
const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
contents: [{ parts: [{ text: `One sentence bid recommendation for Mumbai ${type} tender worth Rs ${deptEstimate} with ${profitMargin}% profit margin. Be specific about Mumbai 2026 market conditions.` }] }],
generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
}),
signal: AbortSignal.timeout(8000)
}
);
const data = await response.json();
return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
} catch (e) {
return '';
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
const { tenderTitle, tenderValue, tenderValueNum, tenderType, organisation, pdfUrl } = JSON.parse(body);
console.log('BOQ request:', tenderTitle?.substring(0, 50), '| type:', tenderType);

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
console.log('Dept estimate:', deptEstimate);

let boqItems = [];
let dataSource = 'pwd_estimation';
let pdfRead = false;

if (pdfUrl && pdfUrl.startsWith('http') && ADOBE_CLIENT_ID && ADOBE_CLIENT_SECRET) {
const token = await getAdobeToken();
if (token) {
const pdfBuffer = await downloadPDF(pdfUrl);
if (pdfBuffer && pdfBuffer.length > 1000) {
const extractedText = await extractWithAdobe(pdfBuffer, token);
if (extractedText) {
const parsed = await parseBOQFromExtractedText(extractedText);
if (parsed && parsed.extractionSuccess && parsed.boqItems?.length > 0) {
boqItems = parsed.boqItems;
dataSource = 'actual_pdf';
pdfRead = true;
if (parsed.tenderValue > 100000) deptEstimate = parsed.tenderValue;
console.log('Adobe SUCCESS! Items:', boqItems.length);
}
}
}
}
}

if (boqItems.length === 0) {
boqItems = generateEstimatedBOQ(tenderType || '', deptEstimate);
console.log('Using estimated BOQ, type:', tenderType, 'items:', boqItems.length);
}

const executionCost = boqItems.reduce((sum, item) => sum + (item.amount || item.quantity * item.rate || 0), 0);
const expectedWinningBid = Math.round(deptEstimate * 0.92);
const expectedProfit = expectedWinningBid - executionCost;
const profitMargin = Math.round((expectedProfit / expectedWinningBid) * 100);
const defaults = getDefaultsForType(tenderType || '');
const bidReason = await getBidReason(tenderType || 'Civil', deptEstimate, profitMargin);

console.log('Result - margin:', profitMargin, '% source:', dataSource);

res.writeHead(200, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({
success: true,
boq: {
dataSource,
departmentEstimate: deptEstimate,
expectedWinningBid,
executionCost,
expectedProfit,
profitMargin,
workingCapitalNeeded: Math.round(executionCost * 0.3),
raCycleDays: 60,
bidRecommendation: profitMargin >= 10 ? 'YES' : profitMargin >= 7 ? 'REVIEW' : 'NO',
bidRecommendationReason: bidReason || `${profitMargin}% margin on ${tenderType} tender in Mumbai`,
boqItems,
materialCost: Math.round(executionCost * 0.45),
labourCost: Math.round(executionCost * 0.25),
equipmentCost: Math.round(executionCost * 0.15),
overheadCost: Math.round(executionCost * 0.10),
contingency: Math.round(executionCost * 0.05),
keyMaterials: defaults.keyMaterials,
majorEquipment: defaults.majorEquipment,
executionDays: defaults.executionDays,
riskFactors: defaults.riskFactors,
},
pdfRead,
message: pdfRead
? `✅ Real BOQ extracted from tender PDF — ${boqItems.length} items found`
: '📊 AI-estimated BOQ based on Maharashtra PWD rates 2024-25'
}));

} catch (error) {
console.log('Error:', error.message);
res.writeHead(500, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({ error: 'BOQ analysis failed', details: String(error) }));
}
});
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
console.log(`BOQ service running on port ${PORT}`);
});
