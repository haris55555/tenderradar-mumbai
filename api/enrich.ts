import type { VercelRequest, VercelResponse } from '@vercel/node';

const AICREDITS_KEY = "sk-live-d42243cc807dbb226103665abd51b4a7d311dea0ca749054b89eacf71c5fc232";

const BMC_ESTIMATES: Record<string, { min: number; max: number }> = {
'lift': { min: 800000, max: 2500000 },
'elevator': { min: 800000, max: 2500000 },
'pump': { min: 1000000, max: 5000000 },
'road': { min: 2000000, max: 8000000 },
'drain': { min: 1500000, max: 6000000 },
'sewer': { min: 2000000, max: 7000000 },
'water': { min: 1500000, max: 6000000 },
'building': { min: 3000000, max: 15000000 },
'repair': { min: 500000, max: 3000000 },
'garden': { min: 500000, max: 2000000 },
'electrical': { min: 800000, max: 4000000 },
'bridge': { min: 5000000, max: 20000000 },
'default': { min: 1000000, max: 5000000 }
};

function estimateFromTitle(title: string): { value: number; text: string } {
const t = title.toLowerCase();
for (const [key, range] of Object.entries(BMC_ESTIMATES)) {
if (t.includes(key)) {
// Use middle of range + some variation based on title length
const variation = (title.length % 10) / 10;
const value = Math.round(range.min + (range.max - range.min) * (0.3 + variation * 0.4));
const inLakhs = value / 100000;
const text = inLakhs >= 100 ? `₹${(inLakhs/100).toFixed(1)} Cr` : `₹${inLakhs.toFixed(0)} L`;
return { value, text };
}
}
const range = BMC_ESTIMATES['default'];
const variation = (title.length % 10) / 10;
const value = Math.round(range.min + (range.max - range.min) * (0.3 + variation * 0.4));
const inLakhs = value / 100000;
const text = inLakhs >= 100 ? `₹${(inLakhs/100).toFixed(1)} Cr` : `₹${inLakhs.toFixed(0)} L`;
return { value, text };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') return res.status(200).end();
if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

try {
const { tenderUrl, tenderTitle, refNo } = req.body;

// Try to fetch real page first
let pageText = '';
if (tenderUrl) {
try {
const pageRes = await fetch(tenderUrl, {
headers: {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
'Accept': 'text/html,*/*',
},
signal: AbortSignal.timeout(4000),
});
if (pageRes.ok) {
const html = await pageRes.text();
pageText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000);
}
} catch {}
}

// If we got page content, use AI to extract value
if (pageText && pageText.length > 200) {
const prompt = `Extract tender value and EMD from this BMC Mumbai tender page.
Title: ${tenderTitle}
Ref: ${refNo}
Page content: ${pageText}

Return ONLY JSON:
{"tenderValue":0,"tenderValueText":"₹XX L","emd":0,"emdText":"₹XX L","dataSource":"page_extracted","confidence":"high"}
If not found on page, estimate based on title. All amounts in rupees.`;

try {
const aiRes = await fetch("https://api.aicredits.in/v1/chat/completions", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": `Bearer ${AICREDITS_KEY}`
},
body: JSON.stringify({
model: "claude-haiku-4-5",
max_tokens: 300,
messages: [{ role: "user", content: prompt }]
}),
signal: AbortSignal.timeout(5000),
});
const data = await aiRes.json();
const text = data.choices?.[0]?.message?.content || '';
const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
const result = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}');
if (result.tenderValue && result.tenderValue > 100000) {
return res.status(200).json(result);
}
} catch {}
}

// Fallback: estimate from title (always gives different values per tender)
const estimated = estimateFromTitle(tenderTitle || '');
return res.status(200).json({
tenderValue: estimated.value,
tenderValueText: estimated.text,
emd: Math.round(estimated.value * 0.02),
emdText: `₹${Math.round(estimated.value * 0.02 / 100000)} L`,
dataSource: 'estimated',
confidence: 'medium'
});

} catch (error) {
return res.status(500).json({ error: String(error) });
}
}
