import type { VercelRequest, VercelResponse } from '@vercel/node';

const AICREDITS_KEY = "sk-live-d42243cc807dbb226103665abd51b4a7d311dea0ca749054b89eacf71c5fc232";

async function fetchPageHTML(url: string): Promise<string> {
try {
const response = await fetch(url, {
headers: {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
'Accept': 'text/html,application/xhtml+xml',
},
signal: AbortSignal.timeout(8000)
});
if (!response.ok) return '';
const html = await response.text();
// Extract just the text content — remove HTML tags
return html
.replace(/<script[\s\S]*?<\/script>/gi, '')
.replace(/<style[\s\S]*?<\/style>/gi, '')
.replace(/<[^>]+>/g, ' ')
.replace(/\s+/g, ' ')
.substring(0, 5000);
} catch { return ''; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') return res.status(200).end();
if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

try {
const { tenderUrl, pdfUrl, refNo, title } = req.body;

// Try to fetch BMC tender detail page
let pageText = '';

// BMC tender detail URL from ref number
const bmcDetailUrl = tenderUrl ||
`https://portal.mcgm.gov.in/irj/portal/anonymous/qletenders_new?guest_user=english`;

pageText = await fetchPageHTML(bmcDetailUrl);

// If page text is too short, try pdf url page
if (pageText.length < 200 && pdfUrl) {
pageText = await fetchPageHTML(pdfUrl.replace('.pdf', ''));
}

const prompt = `You are extracting tender financial data from a BMC Mumbai government tender page.

TENDER TITLE: ${title}
REFERENCE NUMBER: ${refNo}

PAGE CONTENT:
${pageText || 'Page not accessible'}

Extract the following from the page content. If not found, make a realistic estimate based on the tender title and BMC typical rates.

For BMC Mumbai tenders:
- Storm water drain/sewer work: ₹30-80L typically
- Road repair/resurfacing: ₹20-50L typically
- Pump maintenance/operations: ₹50L-2Cr typically
- Civil repair works: ₹10-40L typically
- New construction: ₹50L-5Cr typically
- Safety railings/fixtures: ₹20-50L typically

Respond ONLY in this exact JSON:
{
"tenderValue": 0,
"tenderValueText": "₹XX L",
"emd": 0,
"emdText": "₹XX L",
"workDescription": "brief description",
"dataSource": "page_extracted or estimated",
"confidence": "high or medium or low"
}

All amounts in Indian Rupees. tenderValue and emd must be numbers (not strings).`;

const response = await fetch("https://api.aicredits.in/v1/chat/completions", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": `Bearer ${AICREDITS_KEY}`
},
body: JSON.stringify({
model: "claude-haiku-4-5",
max_tokens: 500,
messages: [{ role: "user", content: prompt }]
})
});

const data = await response.json();
const text = data.choices?.[0]?.message?.content || '';
const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

let result;
try {
result = JSON.parse(cleaned);
} catch {
const match = cleaned.match(/\{[\s\S]*\}/);
result = match ? JSON.parse(match[0]) : null;
}

if (!result) {
return res.status(200).json({
tenderValue: 5000000,
tenderValueText: 'See Portal',
emd: 100000,
emdText: 'See Portal',
dataSource: 'estimated',
confidence: 'low'
});
}

return res.status(200).json(result);

} catch (error) {
return res.status(500).json({ error: String(error) });
}
}
