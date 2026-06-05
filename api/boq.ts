import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_KEY = process.env.GEMINI_KEY || '';

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
signal: AbortSignal.timeout(4000),
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
{ text: `Extract BOQ from this tender PDF. Return ONLY JSON:
{"tenderValue":0,"boqItems":[{"item":"description","unit":"Cum","quantity":100,"rate":7200,"amount":720000}],"extractionSuccess":true}
If no BOQ: {"extractionSuccess":false,"tenderValue":0,"boqItems":[]}` },
{ inline_data: { mime_type: 'application/pdf', data: pdfBase64 } }
]
}],
generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
}),
signal: AbortSignal.timeout(4000),
}
);
const data = await res.json();
return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
} catch {
return '';
}
}

async function estimateWithGemini(title: string, type: string, org: string, value: number): Promise<string> {
try {
const targetCost = Math.round(value * 0.85);
const res = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
contents: [{
parts: [{
text: `You are an expert quantity surveyor for Mumbai BMC government construction.
Tender: ${title}
Type: ${type}
Organisation

