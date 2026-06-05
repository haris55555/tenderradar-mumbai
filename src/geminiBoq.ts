const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || '';

export async function getBoqAnalysis(
tenderTitle: string,
tenderType: string,
organisation: string,
tenderValue: string,
tenderValueNum: number
): Promise<any> {
let deptEstimate = tenderValueNum && tenderValueNum > 100000 ? tenderValueNum : 0;

if (!deptEstimate) {
const v = (tenderValue || '').replace(/,/g, '');
if (v.includes('Cr')) deptEstimate = parseFloat(v) * 10000000;
else if (v.includes('L')) deptEstimate = parseFloat(v) * 100000;
else {
const n = parseFloat(v.replace(/[^0-9.]/g, ''));
if (n > 100000) deptEstimate = n;
}
}

const PWD_RATES: Record<string, number> = {
'road': 2500000, 'bridge': 8000000, 'building': 3500000,
'drain': 1800000, 'water': 2000000, 'sewer': 2200000,
'lift': 1200000, 'electrical': 1500000, 'garden': 800000,
'pump': 900000, 'tank': 1100000, 'default': 2000000
};

if (!deptEstimate || deptEstimate < 100000) {
const t = (tenderTitle + ' ' + organisation).toLowerCase();
deptEstimate = PWD_RATES['default'];
for (const [key, val] of Object.entries(PWD_RATES)) {
if (t.includes(key)) { deptEstimate = val; break; }
}
}

const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
contents: [{
parts: [{
text: `You are a Maharashtra PWD contractor expert. Analyze this tender:
Title: ${tenderTitle}
Type: ${tenderType}
Organisation: ${organisation}
Estimated Value: ₹${deptEstimate}

Return ONLY a JSON object (no markdown):
{
"boqItems": [{"item":"specific work item","quantity":100,"unit":"Sqm","rate":850,"amount":85000}],
"materialCost": 0,
"labourCost": 0,
"equipmentCost": 0,
"overheadCost": 0,
"contingency": 0,
"keyMaterials": ["mat1","mat2","mat3"],
"majorEquipment": ["equip1","equip2"],
"executionDays": 120,
"riskFactors": ["risk1","risk2","risk3"],
"bidRecommendationReason": "specific reason"
}`
}]
}],
generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
})
}
);

const data = await response.json();
const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
const aiData = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}');

const expectedWinningBid = Math.round(deptEstimate * 0.92);
let executionCost = 0;
if (aiData.boqItems?.length > 0) {
executionCost = aiData.boqItems.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
}
if (!executionCost || executionCost < 100000) {
executionCost = Math.round(expectedWinningBid * 0.85);
}

const expectedProfit = expectedWinningBid - executionCost;
const profitMargin = Math.round((expectedProfit / expectedWinningBid) * 100);

return {
success: true,
boq: {
dataSource: 'ai_estimation',
departmentEstimate: deptEstimate,
expectedWinningBid,
executionCost,
expectedProfit,
profitMargin,
workingCapitalNeeded: Math.round(executionCost * 0.3),
raCycleDays: 60,
bidRecommendation: profitMargin >= 10 ? 'YES' : profitMargin >= 7 ? 'REVIEW' : 'NO',
bidRecommendationReason: aiData.bidRecommendationReason || `${profitMargin}% estimated margin`,
boqItems: aiData.boqItems || [],
materialCost: aiData.materialCost || Math.round(executionCost * 0.45),
labourCost: aiData.labourCost || Math.round(executionCost * 0.25),
equipmentCost: aiData.equipmentCost || Math.round(executionCost * 0.15),
overheadCost: aiData.overheadCost || Math.round(executionCost * 0.10),
contingency: aiData.contingency || Math.round(executionCost * 0.05),
keyMaterials: aiData.keyMaterials
