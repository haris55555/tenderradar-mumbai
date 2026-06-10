import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_KEY = process.env.GEMINI_KEY || '';

function extractRupeeAmount(text: string): number {
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

function fmt(n: number): string {
if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + ' L';
return '₹' + n;
}

async function downloadPDF(url: string): Promise<Buffer | null> {
try {
const response = await fetch(url, {
headers: {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
'Accept': 'application/pdf,*/*',
'Referer': 'https://portal.mcgm.gov.in/',
},
signal: AbortSignal.timeout(8000)
});
if (!response.ok) return null;
const buffer = await response.arrayBuffer();
return Buffer.from(buffer);
} catch { return null; }
}

function parseZipEntries(zipBuffer: Buffer): Record<string, { compression: number; data: Buffer }> {
const entries: Record<string, { compression: number; data: Buffer }> = {};
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

async function extractValueFromPDF(pdfUrl: string): Promise<{ value: number; source: string }> {
try {
// Try to get Adobe token
const ADOBE_CLIENT_ID = process.env.ADOBE_CLIENT_ID || '';
const ADOBE_CLIENT_SECRET = process.env.ADOBE_CLIENT_SECRET || '';

if (!ADOBE_CLIENT_ID || !ADOBE_CLIENT_SECRET) {
return { value: 0, source: 'no_credentials' };
}

const pdfBuffer = await downloadPDF(pdfUrl);
if (!pdfBuffer || pdfBuffer.length < 1000) return { value: 0, source: 'pdf_download_failed' };

// Get Adobe token
const params = new URLSearchParams();
params.append('client_id', ADOBE_CLIENT_ID);
params.append('client_secret', ADOBE_CLIENT_SECRET);
params.append('grant_type', 'client_credentials');
params.append('scope', 'openid,AdobeID,read_organizations,dc.annotate,dc.annotate.readonly,dc.archive,dc.print.high');

const tokenRes = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: params.toString(),
signal: AbortSignal.timeout(8000)
});
const tokenData = JSON.parse(await tokenRes.text());
const token = tokenData.access_token;
if (!token) return { value: 0, source: 'token_failed' };

// Upload PDF
const uploadRes = await fetch('https://pdf-services.adobe.io/assets', {
method: 'POST',
headers: { 'Authorization': `Bearer ${token}`, 'X-API-Key': ADOBE_CLIENT_ID, 'Content-Type': 'application/json' },
body: JSON.stringify({ mediaType: 'application/pdf' }),
signal: AbortSignal.timeout(8000)
});
const uploadData = await uploadRes.json();
if (!uploadData.uploadUri || !uploadData.assetID) return { value: 0, source: 'upload_failed' };

await fetch(uploadData.uploadUri, {
method: 'PUT',
headers: { 'Content-Type': 'application/pdf' },
body: pdfBuffer,
signal: AbortSignal.timeout(15000)
});

// Start extraction
const extractRes = await fetch('https://pdf-services.adobe.io/operation/extractpdf', {
method: 'POST',
headers: { 'Authorization': `Bearer ${token}`, 'X-API-Key': ADOBE_CLIENT_ID, 'Content-Type': 'application/json' },
body: JSON.stringify({ assetID: uploadData.assetID, elementsToExtract: ['text', 'tables'] }),
signal: AbortSignal.timeout(8000)
});
const jobLocation = extractRes.headers.get('location');
if (!jobLocation) return { value: 0, source: 'extract_failed' };

// Poll
for (let i = 0; i < 8; i++) {
await new Promise(r => setTimeout(r, 4000));
const pollRes = await fetch(jobLocation, {
headers: { 'Authorization': `Bearer ${token}`, 'X-API-Key': ADOBE_CLIENT_ID }
});
const pollData = await pollRes.json();
if (pollData.status === 'done') {
const downloadUri = pollData.resource?.downloadUri;
if (!downloadUri) return { value: 0, source: 'no_download_uri' };

const zipRes = await fetch(downloadUri);
const zipBuffer = Buffer.from(await zipRes.arrayBuffer());
const entries = parseZipEntries(zipBuffer);
const { inflateRawSync } = await import('zlib');

let maxValue = 0;
for (const [name, entry] of Object.entries(entries)) {
if (!name.endsWith('.xlsx')) continue;
let xlsxBuffer: Buffer | null = null;
if (entry.compression === 0) xlsxBuffer = entry.data;
else if (entry.compression === 8) {
try { xlsxBuffer = inflateRawSync(entry.data); } catch { continue; }
}
if (!xlsxBuffer) continue;

const xlsxEntries = parseZipEntries(xlsxBuffer);
let sharedStrings: string[] = [];
const ssEntry = xlsxEntries['xl/sharedStrings.xml'];
if (ssEntry) {
const ssBuffer = ssEntry.compression === 8 ? inflateRawSync(ssEntry.data) : ssEntry.data;
const ssXml = ssBuffer.toString('utf8');
const matches = ssXml.match(/<t[^>]*>([^<]*)<\/t>/g) || [];
sharedStrings = matches.map((m: string) => m.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim());
}

const sheetEntry = xlsxEntries['xl/worksheets/sheet1.xml'];
if (sheetEntry) {
const sheetBuffer = sheetEntry.compression === 8 ? inflateRawSync(sheetEntry.data) : sheetEntry.data;
const sheetXml = sheetBuffer.toString('utf8');
const cellMatches = sheetXml.match(/<c[^>]*>[\s\S]*?<\/c>/g) || [];
for (const cell of cellMatches) {
const typeMatch = cell.match(/t="([^"]*)"/);
const valueMatch = cell.match(/<v>([^<]*)<\/v>/);
if (!valueMatch) continue;
let value = valueMatch[1];
if (typeMatch && typeMatch[1] === 's') value = sharedStrings[parseInt(value)] || value;
const amount = extractRupeeAmount(value);
if (amount > maxValue) maxValue = amount;
}
}
}
if (maxValue > 100000) return { value: maxValue, source: 'pdf_extracted' };
return { value: 0, source: 'no_value_in_pdf' };
}
if (pollData.status === 'failed') return { value: 0, source: 'extraction_failed' };
}
return { value: 0, source: 'timeout' };
} catch (e) {
return { value: 0, source: 'error' };
}
}

async function estimateValueWithGemini(title: string, refNo: string): Promise<{ value: number; text: string; emd: number; emdText: string }> {
try {
const prompt = `For this Mumbai BMC government tender, estimate the tender value and EMD amount.

Tender Title: ${title}
Reference: ${refNo}

Based on BMC Mumbai typical rates:
- Storm water drain/sewer work: ₹30L-2Cr
- Road repair/resurfacing: ₹20-80L
- Pump maintenance: ₹50L-2Cr
- Civil repair works: ₹10-50L
- Water main/pipeline: ₹50L-5Cr
- New construction: ₹1-10Cr
- Safety railings/fixtures: ₹20-50L

Return ONLY valid JSON:
{"tenderValue":5000000,"tenderValueText":"₹50 L","emd":100000,"emdText":"₹1 L"}`;

const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
contents: [{ parts: [{ text: prompt }] }],
generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
}),
signal: AbortSignal.timeout(6000)
}
);
const data = await response.json();
const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
let parsed = null;
try { parsed = JSON.parse(cleaned); } catch {
const match = cleaned.match(/\{[\s\S]*\}/);
if (match) try { parsed = JSON.parse(match[0]); } catch {}
}
if (parsed) return parsed;
} catch {}
return { value: 5000000, tenderValueText: 'See Portal', emd: 100000, emdText: 'See Portal' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') return res.status(200).end();
if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

try {
const { pdfUrl, refNo, title } = req.body;

// Step 1: Try Adobe PDF extraction for real value
let realValue = 0;
let dataSource = 'estimated';
let confidence = 'low';

if (pdfUrl && pdfUrl.startsWith('http')) {
const result = await extractValueFromPDF(pdfUrl);
if (result.value > 100000) {
realValue = result.value;
dataSource = 'pdf_extracted';
confidence = 'high';
}
}

// Step 2: If no real value, use Gemini estimation
if (realValue === 0) {
const estimated = await estimateValueWithGemini(title || '', refNo || '');
return res.status(200).json({
tenderValue: estimated.value || estimated.tenderValue,
tenderValueText: estimated.tenderValueText || fmt(estimated.value || 5000000),
emd: estimated.emd,
emdText: estimated.emdText || fmt(estimated.emd || 100000),
workDescription: title,
dataSource: 'estimated',
confidence: 'medium'
});
}

// Return real value
const emd = Math.round(realValue * 0.02);
return res.status(200).json({
tenderValue: realValue,
tenderValueText: fmt(realValue),
emd,
emdText: fmt(emd),
workDescription: title,
dataSource,
confidence
});

} catch (error) {
return res.status(500).json({ error: String(error) });
}
}
