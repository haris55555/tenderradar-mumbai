import http from 'http';
import { inflateRawSync } from 'zlib';

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
keyMaterials: ['Bituminous Macadam DBM Grade II', 'WBM Aggregate 40mm', 'Cement Concrete M30', 'TMT Steel Fe500D'],
majorEquipment: ['Road Roller 10T Vibratory', 'Sensor Paver Machine', 'JCB Excavator 3CX', 'Tipper Trucks 10MT'],
riskFactors: ['Heavy monsoon damage to fresh bituminous surface', 'Underground utility conflicts in urban roads', 'Traffic diversion management in busy Mumbai roads'],
executionDays: 120
};
}
if (t.includes('sewer') || t.includes('sewerage') || t.includes('drain')) {
return {
keyMaterials: ['NP3 RCC Hume Pipes', 'Cement OPC 53 Grade', 'River Sand Zone II', 'Brick Masonry Class A'],
majorEquipment: ['JCB 3CX Excavator', 'Dewatering Pump 10HP', 'Concrete Mixer 500L', 'Hydraulic Crane 10T'],
riskFactors: ['High water table in coastal Mumbai areas', 'Existing utility crossing at depth', 'Monsoon flooding risk for open trenches'],
executionDays: 150
};
}
if (t.includes('sanitary') || t.includes('water') || t.includes('pipeline') || t.includes('pump')) {
return {
keyMaterials: ['DI Pipes K9 Class IS 8329', 'Sluice Valves IS 14846', 'Cement OPC 53 Grade', 'Coarse Sand Bedding'],
majorEquipment: ['Pipe Laying Excavator', 'JCB 3CX Excavator', 'Hydraulic Pipe Bending Machine', 'Pressure Testing Equipment'],
riskFactors: ['Water supply disruption to residents during work', 'Pressure testing failures at joints', 'Soil condition variations across Mumbai zones'],
executionDays: 90
};
}
if (t.includes('electrical') || t.includes('mechanical')) {
return {
keyMaterials: ['Aluminium/Copper Cables IS 694', 'MS Conduit Pipes', 'Distribution Panels', 'Earthing Materials'],
majorEquipment: ['Cable Laying Machine', 'Hydraulic Crane 5T', 'Cable Drum Trailer', 'Megger Testing Equipment'],
riskFactors: ['Live electrical hazards during installation', 'Shutdown coordination with BMC Electrical dept', 'Specialized licensed electricians required'],
executionDays: 60
};
}
return {
keyMaterials: ['Cement OPC 53 Grade Ultratech', 'TMT Steel Fe500D TATA/JSW', 'River Sand Zone II', '20mm Graded Aggregate'],
majorEquipment: ['JCB 3CX Excavator', 'Concrete Transit Mixer', 'Plate Compactor', 'Tipper Truck 10MT'],
riskFactors: ['Urban area work with restricted access', 'Monsoon season work stoppage Jun-Sep', 'Utility shifting coordination required'],
executionDays: 120
};
}

function generateEstimatedBOQ(type, deptEstimate) {
const t = (type || '').toLowerCase();
const targetCost = Math.round(deptEstimate * 0.82);
let template = [];
if (t.includes('road') || t.includes('infrastructure') || t.includes('footpath')) {
template = [
{ item: 'Earthwork Excavation in all types of soil including disposal', unit: 'Cum', ratePct: 0.05, rate: 380 },
{ item: 'Granular Sub Base (GSB) 200mm compacted thickness', unit: 'Sqm', ratePct: 0.14, rate: 450 },
{ item: 'Wet Mix Macadam (WMM) 150mm compacted thickness', unit: 'Sqm', ratePct: 0.19, rate: 620 },
{ item: 'Dense Bituminous Macadam (DBM) 50mm thick', unit: 'Sqm', ratePct: 0.30, rate: 780 },
{ item: 'Bituminous Concrete (BC) 25mm wearing course', unit: 'Sqm', ratePct: 0.22, rate: 520 },
{ item: 'Precast RCC Kerb Stone 230x300mm with foundation', unit: 'Rm', ratePct: 0.10, rate: 950 },
];
} else if (t.includes('sewer') || t.includes('sewerage') || t.includes('drain')) {
template = [
{ item: 'Earthwork Excavation for sewer trench including shoring', unit: 'Cum', ratePct: 0.08, rate: 420 },
{ item: 'NP3 RCC Sewer Pipe 300mm dia including rubber ring jointing', unit: 'Rm', ratePct: 0.34, rate: 2800 },
{ item: 'Brick Masonry Manhole Chamber 1.2m dia with CI cover', unit: 'Nos', ratePct: 0.25, rate: 52000 },
{ item: 'RCC M20 Bed Concrete 150mm thick for pipe bedding', unit: 'Cum', ratePct: 0.14, rate: 7800 },
{ item: 'Sand Filling and Compaction in layers in trench', unit: 'Cum', ratePct: 0.07, rate: 280 },
{ item: 'CI Surface Box and Frame for manhole access', unit: 'Nos', ratePct: 0.12, rate: 9500 },
];
} else if (t.includes('sanitary') || t.includes('water') || t.includes('pipeline') || t.includes('pump')) {
template = [
{ item: 'Earthwork Excavation for pipe trench including disposal', unit: 'Cum', ratePct: 0.08, rate: 420 },
{ item: 'DI Pipe K9 Class 200mm dia including jointing material', unit: 'Rm', ratePct: 0.37, rate: 4500 },
{ item: 'Sluice Valve 200mm with CI valve chamber', unit: 'Nos', ratePct: 0.20, rate: 95000 },
{ item: 'Coarse Sand Bedding 150mm thick for pipe', unit: 'Cum', ratePct: 0.06, rate: 2200 },
{ item: 'Backfilling with excavated material and compaction in layers', unit: 'Cum', ratePct: 0.08, rate: 300 },
{ item: 'Hydro Testing of Pipeline at 1.5x working pressure', unit: 'Rm', ratePct: 0.21, rate: 220 },
];
} else if (t.includes('electrical') || t.includes('mechanical')) {
template = [
{ item: 'Supply and laying of HT XLPE Cable 11KV 3CX 95sqmm', unit: 'Rm', ratePct: 0.30, rate: 2200 },
{ item: 'Supply and installation of LT Distribution Panel with MCBs', unit: 'Nos', ratePct: 0.25, rate: 320000 },
{ item: 'Earthing with GI electrode and strips as per IE rules', unit: 'Set', ratePct: 0.15, rate: Math.round(targetCost * 0.15) },
{ item: 'MS Conduit wiring with copper cables in buildings', unit: 'Rm', ratePct: 0.20, rate: 480 },
{ item: 'Testing commissioning and load trial of installations', unit: 'Ls', ratePct: 0.10, rate: Math.round(targetCost * 0.10) },
];
} else {
template = [
{ item: 'Earthwork Excavation in hard soil for foundation', unit: 'Cum', ratePct: 0.08, rate: 420 },
{ item: 'PCC M10 in foundation and plinth 150mm thick', unit: 'Cum', ratePct: 0.10, rate: 6200 },
{ item: 'RCC M25 in columns beams slabs and foundations', unit: 'Cum', ratePct: 0.24, rate: 9200 },
{ item: 'TMT Steel Fe500D reinforcement bars including binding', unit: 'MT', ratePct: 0.20, rate: 63500 },
{ item: 'Brick Masonry in CM 1:6 for walls', unit: 'Cum', ratePct: 0.21, rate: 5800 },
{ item: 'Cement Plastering 12mm CM 1:4 both sides of walls', unit: 'Sqm', ratePct: 0.17, rate: 380 },
];
}
return template.map(item => {
const itemBudget = Math.round(targetCost * item.ratePct);
const quantity = Math.max(1, Math.round(itemBudget / item.rate));
const amount = quantity * item.rate;
return { item: item.item, unit: item.unit, quantity, rate: item.rate, amount };
});
}

function extractRupeeAmount(text) {
const patterns = [
/₹\s*([\d,]+(?:\.\d+)?)/,
/Rs\.?\s*([\d,]+(?:\.\d+)?)/i,
/INR\s*([\d,]+(?:\.\d+)?)/i,
];
for (const pattern of patterns) {
const match = text.match(pattern);
if (match) {
const num = parseFloat(match[1].replace(/,/g, ''));
if (num > 100000) return num;
}
}
return 0;
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
const data = JSON.parse(await response.text());
if (data.access_token) { console.log('Adobe token obtained'); return data.access_token; }
return null;
} catch (e) { console.log('Adobe token error:', e.message); return null; }
}

async function downloadPDF(url) {
try {
const response = await fetch(url, {
headers: {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
'Accept': 'application/pdf,*/*',
'Referer': 'https://portal.mcgm.gov.in/irj/portal/anonymous/qletenders_new?guest_user=english',
},
signal: AbortSignal.timeout(25000)
});
console.log('PDF status:', response.status);
if (!response.ok) return null;
const buffer = await response.arrayBuffer();
console.log('PDF size:', buffer.byteLength);
return Buffer.from(buffer);
} catch (e) { console.log('PDF error:', e.message); return null; }
}

async function extractWithAdobe(pdfBuffer, token) {
try {
const uploadRes = await fetch('https://pdf-services.adobe.io/assets', {
method: 'POST',
headers: { 'Authorization': `Bearer ${token}`, 'X-API-Key': ADOBE_CLIENT_ID, 'Content-Type': 'application/json' },
body: JSON.stringify({ mediaType: 'application/pdf' }),
signal: AbortSignal.timeout(15000)
});
const uploadData = await uploadRes.json();
if (!uploadData.uploadUri || !uploadData.assetID) { console.log('Upload asset failed:', JSON.stringify(uploadData)); return null; }
await fetch(uploadData.uploadUri, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: pdfBuffer, signal: AbortSignal.timeout(60000) });
const extractRes = await fetch('https://pdf-services.adobe.io/operation/extractpdf', {
method: 'POST',
headers: { 'Authorization': `Bearer ${token}`, 'X-API-Key': ADOBE_CLIENT_ID, 'Content-Type': 'application/json' },
body: JSON.stringify({ assetID: uploadData.assetID, elementsToExtract: ['text', 'tables'] }),
signal: AbortSignal.timeout(15000)
});
const jobLocation = extractRes.headers.get('location');
if (!jobLocation) { console.log('No job location'); return null; }
for (let i = 0; i < 12; i++) {
await new Promise(r => setTimeout(r, 5000));
const pollRes = await fetch(jobLocation, { headers: { 'Authorization': `Bearer ${token}`, 'X-API-Key': ADOBE_CLIENT_ID }, signal: AbortSignal.timeout(10000) });
const pollData = await pollRes.json();
console.log('Poll:', pollData.status);
if (pollData.status === 'done') {
const downloadUri = pollData.resource?.downloadUri;
if (!downloadUri) { console.log('No download URI'); return null; }
const zipRes = await fetch(downloadUri, { signal: AbortSignal.timeout(30000) });
const zipBuffer = Buffer.from(await zipRes.arrayBuffer());
console.log('ZIP size:', zipBuffer.length);
return zipBuffer;
}
if (pollData.status === 'failed') { console.log('Adobe extraction failed'); return null; }
}
return null;
} catch (e) { console.log('Adobe error:', e.message); return null; }
}

function parseZipEntries(zipBuffer) {
const entries = {};
let pos = 0;
while (pos < zipBuffer.length - 4) {
if (zipBuffer[pos] === 0x50 && zipBuffer[pos+1] === 0x4B &&
zipBuffer[pos+2] === 0x03 && zipBuffer[pos+3] === 0x04) {
const compression = zipBuffer.readUInt16LE(pos + 8);
const compressedSize = zipBuffer.readUInt32LE(pos + 18);
const nameLen = zipBuffer.readUInt16LE(pos + 26);
const extraLen = zipBuffer.readUInt16LE(pos + 28);
const name = zipBuffer.slice(pos + 30, pos + 30 + nameLen).toString('utf8');
const dataStart = pos + 30 + nameLen + extraLen;
entries[name] = { compression, data: zipBuffer.slice(dataStart, dataStart + compressedSize) };
pos = dataStart + compressedSize;
} else { pos++; }
}
return entries;
}

function decompressEntry(entry) {
if (entry.compression === 0) return entry.data;
if (entry.compression === 8) {
try { return inflateRawSync(entry.data); } catch (e) { return null; }
}
return null;
}

async function parseBOQFromZip(zipBuffer) {
try {
const entries = parseZipEntries(zipBuffer);
console.log('ZIP entries:', Object.keys(entries).join(', '));
let allText = '';
let tenderValue = 0;
const xlsxFiles = Object.keys(entries).filter(f => f.endsWith('.xlsx'));
console.log('XLSX files count:', xlsxFiles.length);

for (const xlsxFile of xlsxFiles) {
const xlsxBuffer = decompressEntry(entries[xlsxFile]);
if (!xlsxBuffer) continue;
const xlsxEntries = parseZipEntries(xlsxBuffer);

let sharedStrings = [];
const ssEntry = xlsxEntries['xl/sharedStrings.xml'];
if (ssEntry) {
const ssBuffer = decompressEntry(ssEntry);
if (ssBuffer) {
const ssXml = ssBuffer.toString('utf8');
const matches = ssXml.match(/<t[^>]*>([^<]*)<\/t>/g) || [];
sharedStrings = matches.map(m =>
m.replace(/<[^>]+>/g, '')
.replace(/&amp;/g, '&')
.replace(/&lt;/g, '<')
.replace(/&gt;/g, '>')
.replace(/_x000D_/g, '')
.trim()
);
}
}

const sheetEntry = xlsxEntries['xl/worksheets/sheet1.xml'];
if (sheetEntry) {
const sheetBuffer = decompressEntry(sheetEntry);
if (sheetBuffer) {
const sheetXml = sheetBuffer.toString('utf8');
const cellMatches = sheetXml.match(/<c[^>]*>[\s\S]*?<\/c>/g) || [];
const rowValues = [];
for (const cell of cellMatches) {
const typeMatch = cell.match(/t="([^"]*)"/);
const valueMatch = cell.match(/<v>([^<]*)<\/v>/);
if (!valueMatch) continue;
let value = valueMatch[1];
if (typeMatch && typeMatch[1] === 's') value = sharedStrings[parseInt(value)] || value;
// Clean the value
value = value.replace(/_x000D_/g, '').replace(/\s+/g, ' ').trim();
if (value && value.length > 0) rowValues.push(value);
}

// Clean row before adding
const cleanedRow = rowValues.join(' | ').replace(/_x000D_/g, '').replace(/\s+/g, ' ').trim();
if (cleanedRow.length > 5) allText += cleanedRow + '\n';

for (const val of rowValues) {
const amount = extractRupeeAmount(val);
if (amount > tenderValue) tenderValue = amount;
}
}
}
}

console.log('Total text length:', allText.length);
console.log('Text sample:', allText.substring(0, 500));
console.log('Tender value found:', tenderValue);

// Send to Gemini for BOQ extraction
if (allText.length > 100) {
try {
const prompt = `Extract BOQ (Bill of Quantities) line items from this Mumbai government tender document data.

The data has columns like: Sr. No. | Item No. | Description | Quantity | Rate | Amount
OR: SR NO | ITEM CODE | ITEM DESCRIPTION | UNIT | QTY | RATE | AMOUNT

Look for rows that have:
- A description of work (excavation, pipes, concrete, etc.)
- A unit (Cum, Sqm, Rm, Nos, MT, LS etc.)
- A quantity (number)
- A rate (price per unit in rupees)
- An amount (quantity × rate)

Data:
${allText.substring(0, 7000)}

Return ONLY valid JSON no markdown:
{"extractionSuccess":true,"boqItems":[{"item":"full description of work item","unit":"Cum","quantity":100,"rate":380,"amount":38000}],"tenderValue":0}

Important:
- Extract ALL work items you find
- item should be the full description
- quantity, rate, amount must be numbers not strings
- If no clear BOQ items found return: {"extractionSuccess":false,"boqItems":[],"tenderValue":0}`;

const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
contents: [{ parts: [{ text: prompt }] }],
generationConfig: { temperature: 0.1, maxOutputTokens: 4000 }
}),
signal: AbortSignal.timeout(25000)
}
);
const geminiData = await response.json();
const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
console.log('Gemini BOQ response:', responseText.substring(0, 800));

let parsed = null;
try {
parsed = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());
} catch {
const match = responseText.match(/\{[\s\S]*\}/);
if (match) try { parsed = JSON.parse(match[0]); } catch {}
}

if (parsed?.extractionSuccess && parsed?.boqItems?.length > 0) {
console.log('BOQ extraction SUCCESS! Items:', parsed.boqItems.length);
return {
extractionSuccess: true,
boqItems: parsed.boqItems,
tenderValue: tenderValue || parsed.tenderValue
};
} else {
console.log('Gemini could not extract BOQ items');
}
} catch (e) { console.log('Gemini error:', e.message); }
}

if (tenderValue > 100000) {
return { extractionSuccess: false, boqItems: [], tenderValue, realValueFound: true };
}
return { extractionSuccess: false, boqItems: [], tenderValue: 0 };
} catch (e) {
console.log('ZIP parse error:', e.message);
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
contents: [{ parts: [{ text: `One sentence bid recommendation for Mumbai ${type} tender worth Rs ${deptEstimate} with ${profitMargin}% profit margin. Be specific about Mumbai June 2026 market conditions and competition level.` }] }],
generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
}),
signal: AbortSignal.timeout(8000)
}
);
const data = await response.json();
return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
} catch (e) { return ''; }
}

function parseMultipart(body, boundary) {
try {
console.log('Parsing multipart, boundary:', boundary);
console.log('Body size:', body.length);

const cleanBoundary = boundary.replace(/"/g, '');
const parts = body.toString('binary').split('--' + cleanBoundary);
console.log('Parts found:', parts.length);

for (const part of parts) {
if (part.includes('filename=') || part.includes('application/pdf') || part.includes('Content-Type: application')) {
const headerEnd = part.indexOf('\r\n\r\n');
if (headerEnd !== -1) {
const fileData = Buffer.from(part.slice(headerEnd + 4, part.length - 2), 'binary');
console.log('File data size:', fileData.length);
if (fileData.length > 100) return fileData;
}
}
}

const pdfStart = body.indexOf(Buffer.from('%PDF'));
if (pdfStart !== -1) {
console.log('Found PDF header at position:', pdfStart);
return body.slice(pdfStart);
}

return null;
} catch (e) { console.log('Multipart parse error:', e.message); return null; }
}

const server = http.createServer(async (req, res) => {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

const chunks = [];
req.on('data', chunk => chunks.push(chunk));

req.on('end', async () => {
const body = Buffer.concat(chunks);

// PDF Upload endpoint
if (req.method === 'POST' && req.url === '/api/boq-upload') {
try {
const contentType = req.headers['content-type'] || '';
console.log('Upload received, content-type:', contentType.substring(0, 150));
console.log('Body size:', body.length);

const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
if (!boundaryMatch) {
console.log('No boundary found');
res.writeHead(400); res.end(JSON.stringify({ error: 'No boundary' })); return;
}

const pdfBuffer = parseMultipart(body, boundaryMatch[1]);
console.log('PDF buffer:', pdfBuffer ? pdfBuffer.length + ' bytes' : 'null');

if (!pdfBuffer || pdfBuffer.length < 1000) {
res.writeHead(400); res.end(JSON.stringify({ error: 'No valid PDF found in upload' })); return;
}

const header = pdfBuffer.slice(0, 4).toString();
console.log('PDF header check:', header);
if (!header.startsWith('%PDF')) {
res.writeHead(400); res.end(JSON.stringify({ error: 'File does not appear to be a valid PDF' })); return;
}

const bodyStr = body.toString('binary');
let tenderType = 'Civil';
let tenderTitle = '';
const typeMatch = bodyStr.match(/name="tenderType"\r\n\r\n([^\r\n]+)/);
const titleMatch = bodyStr.match(/name="tenderTitle"\r\n\r\n([^\r\n]+)/);
if (typeMatch) tenderType = typeMatch[1];
if (titleMatch) tenderTitle = titleMatch[1];
console.log('Tender type:', tenderType, '| Title:', tenderTitle.substring(0, 50));

const token = await getAdobeToken();
if (!token) { res.writeHead(500); res.end(JSON.stringify({ error: 'Adobe auth failed' })); return; }

console.log('Starting Adobe extraction, PDF size:', pdfBuffer.length);
const zipBuffer = await extractWithAdobe(pdfBuffer, token);
if (!zipBuffer) {
res.writeHead(500); res.end(JSON.stringify({ error: 'PDF extraction failed' })); return;
}

const parsed = await parseBOQFromZip(zipBuffer);
console.log('BOQ parsed - success:', parsed.extractionSuccess, 'items:', parsed.boqItems?.length, 'value:', parsed.tenderValue);

let deptEstimate = parsed.tenderValue > 100000 ? parsed.tenderValue : estimateTenderValue(tenderTitle, '');
let boqItems = [];
let pdfRead = false;
let dataSource = 'pwd_estimation';

if (parsed.extractionSuccess && parsed.boqItems?.length > 0) {
boqItems = parsed.boqItems;
pdfRead = true;
dataSource = 'actual_pdf';
console.log('Using REAL BOQ items:', boqItems.length);
} else {
boqItems = generateEstimatedBOQ(tenderType, deptEstimate);
dataSource = parsed.tenderValue > 100000 ? 'pdf_value_estimated_boq' : 'pwd_estimation';
console.log('Using estimated BOQ:', boqItems.length);
}

const executionCost = boqItems.reduce((sum, item) => sum + (item.amount || 0), 0);
const expectedWinningBid = Math.round(deptEstimate * 0.92);
const expectedProfit = expectedWinningBid - executionCost;
const profitMargin = Math.round((expectedProfit / expectedWinningBid) * 100);
const defaults = getDefaultsForType(tenderType);
const bidReason = await getBidReason(tenderType, deptEstimate, profitMargin);

let message = pdfRead
? `✅ Real BOQ extracted from uploaded PDF — ${boqItems.length} items found`
: parsed.tenderValue > 100000
? `📄 Real tender value ₹${(parsed.tenderValue / 10000000).toFixed(2)} Cr extracted — BOQ estimated using 2026 Mumbai rates`
: '📊 BOQ estimated using 2026 Mumbai market rates';

console.log('Upload result - margin:', profitMargin, '% source:', dataSource, 'pdfRead:', pdfRead);

res.writeHead(200, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({
success: true,
boq: {
dataSource, departmentEstimate: deptEstimate, expectedWinningBid, executionCost,
expectedProfit, profitMargin, workingCapitalNeeded: Math.round(executionCost * 0.3),
raCycleDays: 60,
bidRecommendation: profitMargin >= 10 ? 'YES' : profitMargin >= 7 ? 'REVIEW' : 'NO',
bidRecommendationReason: bidReason || `${profitMargin}% margin on ${tenderType} tender`,
boqItems, materialCost: Math.round(executionCost * 0.45), labourCost: Math.round(executionCost * 0.25),
equipmentCost: Math.round(executionCost * 0.15), overheadCost: Math.round(executionCost * 0.10),
contingency: Math.round(executionCost * 0.05), keyMaterials: defaults.keyMaterials,
majorEquipment: defaults.majorEquipment, executionDays: defaults.executionDays, riskFactors: defaults.riskFactors,
},
pdfRead,
message
}));

} catch (error) {
console.log('Upload error:', error.message, error.stack);
res.writeHead(500); res.end(JSON.stringify({ error: 'Upload failed', details: String(error) }));
}
return;
}

// Regular BOQ endpoint
if (req.method === 'POST' && req.url === '/api/boq') {
try {
const { tenderTitle, tenderValue, tenderValueNum, tenderType, organisation, pdfUrl } = JSON.parse(body.toString());
console.log('BOQ request:', tenderTitle?.substring(0, 50), '| type:', tenderType);

let deptEstimate = 0;
if (tenderValueNum && tenderValueNum > 100000) deptEstimate = tenderValueNum;
if (!deptEstimate) {
const v = (tenderValue || '').replace(/,/g, '');
if (v.includes('Cr')) deptEstimate = parseFloat(v) * 10000000;
else if (v.includes('L')) deptEstimate = parseFloat(v) * 100000;
else { const n = parseFloat(v.replace(/[^0-9.]/g, '')); if (n > 100000) deptEstimate = n; }
}
if (!deptEstimate || deptEstimate < 100000) deptEstimate = estimateTenderValue(tenderTitle || '', organisation || '');
console.log('Dept estimate:', deptEstimate);

let boqItems = [];
let dataSource = 'pwd_estimation';
let pdfRead = false;
let realValueFromPDF = 0;

if (pdfUrl && pdfUrl.startsWith('http') && ADOBE_CLIENT_ID && ADOBE_CLIENT_SECRET) {
const token = await getAdobeToken();
if (token) {
const pdfBuffer = await downloadPDF(pdfUrl);
if (pdfBuffer && pdfBuffer.length > 1000) {
const zipBuffer = await extractWithAdobe(pdfBuffer, token);
if (zipBuffer) {
const parsed = await parseBOQFromZip(zipBuffer);
if (parsed.tenderValue > 100000) {
realValueFromPDF = parsed.tenderValue;
deptEstimate = parsed.tenderValue;
}
if (parsed.extractionSuccess && parsed.boqItems?.length > 0) {
boqItems = parsed.boqItems;
dataSource = 'actual_pdf';
pdfRead = true;
}
}
}
}
}

if (boqItems.length === 0) {
boqItems = generateEstimatedBOQ(tenderType || '', deptEstimate);
dataSource = realValueFromPDF > 0 ? 'pdf_value_estimated_boq' : 'pwd_estimation';
}

const executionCost = boqItems.reduce((sum, item) => sum + (item.amount || 0), 0);
const expectedWinningBid = Math.round(deptEstimate * 0.92);
const expectedProfit = expectedWinningBid - executionCost;
const profitMargin = Math.round((expectedProfit / expectedWinningBid) * 100);
const defaults = getDefaultsForType(tenderType || '');
const bidReason = await getBidReason(tenderType || 'Civil', deptEstimate, profitMargin);

let message = '📊 BOQ estimated using 2026 Mumbai market rates';
if (pdfRead) message = `✅ Real BOQ extracted from tender PDF — ${boqItems.length} items found`;
else if (realValueFromPDF > 0) message = `📄 Real tender value ₹${(realValueFromPDF / 10000000).toFixed(2)} Cr extracted from PDF — BOQ estimated using 2026 Mumbai rates`;

console.log('Result - margin:', profitMargin, '% source:', dataSource);

res.writeHead(200, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({
success: true,
boq: {
dataSource, departmentEstimate: deptEstimate, expectedWinningBid, executionCost,
expectedProfit, profitMargin, workingCapitalNeeded: Math.round(executionCost * 0.3),
raCycleDays: 60,
bidRecommendation: profitMargin >= 10 ? 'YES' : profitMargin >= 7 ? 'REVIEW' : 'NO',
bidRecommendationReason: bidReason || `${profitMargin}% margin on ${tenderType} tender in Mumbai`,
boqItems, materialCost: Math.round(executionCost * 0.45), labourCost: Math.round(executionCost * 0.25),
equipmentCost: Math.round(executionCost * 0.15), overheadCost: Math.round(executionCost * 0.10),
contingency: Math.round(executionCost * 0.05), keyMaterials: defaults.keyMaterials,
majorEquipment: defaults.majorEquipment, executionDays: defaults.executionDays, riskFactors: defaults.riskFactors,
},
pdfRead,
message
}));

} catch (error) {
console.log('Error:', error.message);
res.writeHead(500); res.end(JSON.stringify({ error: 'BOQ analysis failed', details: String(error) }));
}
return;
}

res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
});
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`BOQ service running on port ${PORT}`));
