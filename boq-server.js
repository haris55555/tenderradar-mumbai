import https from 'https';
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

async function fetchGemini(prompt) {
const body = JSON.stringify({
contents: [{ parts: [{ text: prompt }] }],
generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
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
}

async function estimateWithGemini(title, type, org, value) {
try {
const t = Math.round(value * 0.85);
const prompt = `Mumbai PWD quantity surveyor. Tender: ${title}, Type: ${type}, Org: ${org}, Value: ${value}. Return ONLY valid JSON no markdown: {"boqItems":[{"item":"specific item","quantity":500,"unit":"Cum","rate":280,"amount":140000},{"item":"item2","quantity":200,"unit":"Sqm","rate":650,"amount":130000}],"materialCost":${Math.round(t*0.45)},"labourCost":${Math.round(t*0.25)},"equipmentCost":${Math.round(t*0.15)},"overheadCost":${Math.round(t*0.10)},"contingency":${Math.round(t*0.05)},"keyMaterials":["Cement OPC 53","TMT Steel Fe500D","River Sand"],"majorEquipment":["JCB Excavator
