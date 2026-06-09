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

function getDefaultsForType(type, executionCost) {
const t = (type || '').toLowerCase();
if (t.includes('road') || t.includes('infrastructure')) {
return {
keyMaterials: ['Bituminous Macadam', 'WBM Aggregate', 'Cement Concrete M30', 'TMT Steel Fe500D'],
majorEquipment: ['Road Roller 10T', 'Paver Machine', 'JCB Excavator', 'Tipper Trucks'],
riskFactors: ['Heavy monsoon damage to road surface', 'Underground utility conflicts', 'Traffic diversion in busy Mumbai roads'],
executionDays: 120
};
}
if (t.includes('sewer') || t.includes('drain')) {
return {
keyMaterials: ['NP3 RCC Pipes', 'Cement OPC 53', 'River Sand Zone II', 'Brick Masonry'],
majorEquipment: ['JCB Excavator', 'Dewatering Pump', 'Concrete Mixer', 'Crane'],
riskFactors: ['High water table in Mumbai', 'Existing utility crossing', 'Monsoon flooding risk'],
executionDays: 150
};
}
if (t.includes('water') || t.includes('sanitary') || t.includes('pipeline')) {
return {
keyMaterials: ['DI Pipes K9 Class', 'Sluice Valves', 'Cement OPC 53', 'Sand Bedding Material'],
majorEquipment: ['Pipe Laying Machine', 'JCB Excavator', 'Welding Machine', 'Pressure Testing Equipment'],
riskFactors: ['Water supply disruption during work', 'Pressure testing failures', 'Soil condition variations'],
executionDays: 90
};
}
if (t.includes('civil') || t.includes('building')) {
return {
keyMaterials: ['Cement OPC 53', 'TMT Steel Fe500D', 'River Sand Zone II', '20mm Aggregate'],
majorEquipment: ['Concrete Mixer', 'Bar Bending Machine', 'Scaffolding', 'Transit Mixer'],
riskFactors: ['Monsoon work stoppage', 'Material price escalation', 'Labour availability'],
executionDays: 180
};
}
return {
keyMaterials: ['Cement OPC 53', 'TMT Steel Fe500D', 'River Sand Zone II', '20mm Aggregate'],
majorEquipment: ['JCB Excavator', 'Concrete Mixer', 'Compactor', 'Tipper Truck'],
riskFactors: ['Urban area work constraints', 'Monsoon season delays', 'Utility shifting required'],
executionDays: 120
};
}

function generateBOQItems(title, type, value) {
const t = (type || title || '').toLowerCase();
const baseValue = Math.round(value * 0.85);

if (t.includes('road') || t.includes('infrastructure') || t.includes('footpath')) {
const area = Math.round(baseValue / 1200);
return [
{ item: 'Earthwork Excavation in all types of soil', unit: 'Cum', quantity: Math.round(area * 0.3), rate: 320, amount: Math.round(area * 0.3 * 320) },
{ item: 'Granular Sub Base (GSB) 200mm thick', unit: 'Sqm', quantity: area, rate: 380, amount: Math.round(area * 380) },
{ item: 'Wet Mix Macadam (WMM) 150mm thick', unit: 'Sqm', quantity: area, rate: 520, amount: Math.round(area * 520) },
{ item: 'Dense Bituminous Macadam (DBM) 50mm', unit: 'Sqm', quantity: area, rate: 680, amount: Math.round(area * 680) },
{ item: 'Bituminous Concrete (BC) 25mm wearing coat', unit: 'Sqm', quantity: area, rate: 420, amount: Math.round(area * 420) },
{ item: 'Precast RCC Kerb Stone 230x300mm', unit: 'Rm', quantity: Math.round(area * 0.08), rate: 850, amount: Math.round(area * 0.08 * 850) },
];
}

if (t.includes('sewer') || t.includes('drain') || t.includes('nala')) {
const length = Math.round(baseValue / 8500);
return [
{ item: 'Earthwork Excavation for sewer trench', unit: 'Cum', quantity: Math.round(length * 2.5), rate: 380, amount: Math.round(length * 2.5 * 380) },
{ item: 'NP3 RCC Sewer Pipe 300mm dia', unit: 'Rm', quantity: length, rate: 2200, amount: Math.round(length * 2200) },
{ item: 'Brick Masonry Manhole Chamber 1.2m dia', unit: 'Nos', quantity: Math.round(length / 30), rate: 45000, amount: Math.round((length / 30) * 45000) },
{ item: 'RCC M20 Bed Concrete 150mm', unit: 'Cum', quantity: Math.round(length * 0.12), rate: 6800, amount: Math.round(length * 0.12 * 6800) },
{ item: 'Sand Filling and Compaction', unit: 'Cum', quantity: Math.round(length * 1.8), rate: 220, amount: Math.round(length * 1.8 * 220) },
];
}

if (t.includes('water') || t.includes('pipeline') || t.includes('pump')) {
const length = Math.round(baseValue / 6500);
return [
{ item: 'Earthwork Excavation for pipe trench', unit: 'Cum', quantity: Math.round(length * 2), rate: 350, amount: Math.round(length * 2 * 350) },
{ item: 'DI Pipe K9 200mm dia including jointing', unit: 'Rm', quantity: length, rate: 3800, amount: Math.round(length * 3800) },
{ item: 'Sluice Valve 200mm with valve chamber', unit: 'Nos', quantity: Math.round(length / 200), rate: 85000, amount: Math.round((length / 200) * 85000) },
{ item: 'Sand Bedding 150mm for pipe', unit: 'Cum', quantity: Math.round(length * 0.08), rate: 1800, amount: Math.round(length * 0.08 * 1800) },
{ item: 'Backfilling and Compaction', unit: 'Cum', quantity: Math.round(length * 1.5), rate: 250, amount: Math.round(length * 1.5 * 250) },
];
}

// Default civil works
const area = Math.round(baseValue / 4500);
return [
{ item: 'Earthwork Excavation in foundation', unit: 'Cum', quantity: Math.round(area * 0.5), rate: 350, amount: Math.round(area * 0.5 * 350) },
{ item: 'PCC M10 in foundation 150mm thick', unit: 'Cum', quantity: Math.round(area * 0.15), rate: 5200, amount: Math.round(area * 0.15 * 5200) },
{ item: 'RCC M25 in columns beams slabs', unit: 'Cum', quantity: Math.round(area * 0.25), rate: 7800, amount: Math.round(area * 0.25 * 7800) },
{ item: 'TMT Steel Fe500D reinforcement', unit: 'MT', quantity: Math.round(area * 0.025), rate: 63500, amount: Math.round(area * 0.025 * 63500) },
{ item: 'Brick Masonry in CM 1:6', unit: 'Cum', quantity: Math.round(area * 0.3), rate: 4800, amount: Math.round(area * 0.3 * 4800) },
{ item: 'Plastering 12mm CM 1:4 both sides', unit: 'Sqm', quantity: area, rate: 320, amount: Math.round(area * 320) },
];
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

// Generate BOQ items based on tender type
const boqItems = generateBOQItems(tenderTitle || '', tenderType || '', deptEstimate);
const defaults = getDefaultsForType(tenderType || '', deptEstimate);

// Calculate real execution cost from BOQ items
const executionCost = boqItems.reduce((sum, item) => sum + (item.amount || 0), 0);
const expectedWinningBid = Math.round(deptEstimate * 0.92);
const expectedProfit = expectedWinningBid - executionCost;
const profitMargin = Math.round((expectedProfit / expectedWinningBid) * 100);

// Try to get AI reasoning for bid recommendation
let bidReason = '';
try {
const prompt = `For a Mumbai government ${tenderType} tender worth Rs ${deptEstimate}, with execution cost Rs ${executionCost} and profit margin ${profitMargin}%, provide a ONE sentence specific bid recommendation reason. Be specific about ${tenderType} work risks and opportunities in Mumbai 2026.`;
const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
contents: [{ parts: [{ text: prompt }] }],
generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
})
}
);
const data = await response.json();
bidReason = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
} catch (e) {
bidReason = '';
}

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
