import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const GEMINI_KEY = process.env.GEMINI_KEY || '';

// ============ AI ESTIMATED RATE — UNIVERSAL CLASSIFIER ============
function classifyAndEstimate(description, unit, pdfRate) {
const d = (description || '').toLowerCase();
const u = (unit || '').toLowerCase().replace(/\./g, '');

if ((d.includes('reinforcement') || d.includes('steel bar') || d.includes('fe500') || d.includes('tmt')) &&
(u === 'mt' || u.includes('mt'))) {
return Math.round(63500 + 2800);
}

if ((d.includes('concrete') || d.includes(' cc ') || d.includes('r.c.c') || d.includes('rcc') || d.includes('p/l') || d.includes('rmc')) &&
(u === 'cum' || u.includes('cum'))) {
if (d.includes('m-40') || d.includes('m40') || d.includes('m-45') || d.includes('m45')) return Math.round(pdfRate * 0.93);
if (d.includes('m-25') || d.includes('m25') || d.includes('m-30') || d.includes('m30')) return Math.round(pdfRate * 0.90);
if (d.includes('m-15') || d.includes('m15') || d.includes('m-10') || d.includes('m10') || d.includes('lean concrete') || d.includes('pcc')) return Math.round(pdfRate * 0.88);
return Math.round(pdfRate * 0.90);
}

if (d.includes('excavat') && (u === 'cum' || u.includes('cum'))) {
if (d.includes('chisel') || d.includes('breaker') || d.includes('hard rock') || d.includes('pneumatic')) return Math.round(pdfRate * 0.78);
return Math.round(pdfRate * 0.65);
}

if ((d.includes('earth work') || d.includes('p/l earth') || d.includes('embankment') || d.includes('filling') || d.includes('top layer of earth') || d.includes('stabilised soil')) &&
(u === 'cum' || u.includes('cum') || u === 'sqm')) {
return Math.round(pdfRate * 0.70);
}

if ((d.includes('brick') || d.includes('masonry') || d.includes('rubble')) && (u === 'cum' || u.includes('cum'))) {
return Math.round(pdfRate * 0.88);
}

if ((d.includes('centering') || d.includes('shuttering') || d.includes('formwork') || d.includes('form work')) &&
(u === 'sqm' || u.includes('sqm'))) {
return Math.round(pdfRate * 0.85);
}

if (d.includes('sub base') || d.includes('subbase') || d.includes('wet mix macadam') || d.includes('wmm') ||
d.includes('gsb') || d.includes('granular') || d.includes('crushed stone') || d.includes('rubble soling') ||
d.includes('metal gradation')) {
return Math.round(pdfRate * 0.80);
}

if (d.includes('bitumen') || d.includes('bituminous') || d.includes('dbm') || d.includes('premix') ||
d.includes('tack coat') || d.includes('prime coat') || d.includes('mastic') || d.includes('asphalt')) {
return Math.round(pdfRate * 0.87);
}

if (d.includes('pipe') && (u === 'rmt' || u === 'm' || u.includes('mtr') || u === 'rm')) {
if (d.includes('hdpe') || d.includes('di pipe') || d.includes('m.s') || d.includes('ms pipe')) return Math.round(pdfRate * 0.85);
return Math.round(pdfRate * 0.78);
}

if ((d.includes('manhole') || d.includes('cover') || d.includes('frame') || d.includes('chamber') || d.includes('grating')) &&
(u === 'no' || u === 'nos' || u === 'each')) {
if (d.includes('c.i') || d.includes('ci ') || d.includes('cast iron') || d.includes('m.s')) return Math.round(pdfRate * 0.82);
return Math.round(pdfRate * 0.75);
}

if ((d.includes('kerb') || d.includes('water dished') || d.includes('water table') || d.includes('tree guard')) &&
(u === 'rmt' || u.includes('rmt') || u === 'rm')) {
return Math.round(pdfRate * 0.78);
}

if ((d.includes('railing') || d.includes('bollard') || d.includes('grill') || d.includes('fabricat') ||
d.includes('sign') || d.includes('board')) && d.includes('m.s')) {
return Math.round(pdfRate * 0.75);
}

if (d.includes('road marking') || d.includes('thermoplastic') || d.includes('retro reflective') || d.includes('road stud')) {
return Math.round(pdfRate * 0.80);
}

if (d.includes('cable') || d.includes('conduit') || d.includes('panel') || d.includes('earthing') ||
d.includes('electrical') || d.includes('xlpe') || d.includes('mcb') || d.includes('elcb') ||
d.includes('switchfuse') || d.includes('distribution board') || d.includes('wiring') ||
d.includes('tubelight') || d.includes('fixture') || d.includes('fan') || d.includes('bulkhead') ||
d.includes('tpn') || d.includes('led')) {
return Math.round(pdfRate * 0.85);
}

if (d.includes('plaster') || d.includes('flooring') || d.includes('tactile') || d.includes('tile') ||
d.includes('paint') || d.includes('stencil')) {
return Math.round(pdfRate * 0.82);
}

if (d.includes('demolition') || d.includes('cutting') || d.includes('removing') || d.includes('dismantl') ||
d.includes('extra')) {
return Math.round(pdfRate * 0.70);
}

if (d.includes('soak pit') || d.includes('dowel') || d.includes('joint') || d.includes('thermocole') ||
d.includes('admixture') || d.includes('waterproof')) {
return Math.round(pdfRate * 0.80);
}

if (d.includes('survey') || d.includes('testing') || d.includes('transplant') || d.includes('cutting down of tree') ||
d.includes('publicity') || d.includes('cbo') || d.includes('procuring')) {
return Math.round(pdfRate * 0.75);
}

if (d.includes('shoring') || d.includes('strutting')) {
return Math.round(pdfRate * 0.75);
}

return Math.round(pdfRate * 0.85);
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
riskFactors: ['Live electrical hazards during installation', 'Shutdown coordination required', 'Specialized licensed electricians required'],
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
return { item: item.item, unit: item.unit, quantity, rate: item.rate, amount, aiRate: Math.round(item.rate * 0.85) };
});
}

function extractRupeeAmount(text) {
const patterns = [
/₹\s*([\d,]+(?:\.\d+)?)/,
/Rs\.?\s*([\d,]+(?:\.\d+)?)/i,
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

const KNOWN_UNITS = [
'cum', 'sqm', 'rm', 'nos', 'mt', 'kg', 'ltr', 'ls', 'set',
'rmt', 'sqft', 'cft', 'mtr', 'unit', 'job', 'lot',
'month', 'day', 'hr', 'ton', 'quintal', 'bag', 'pair',
'cbo', 'each', 'no', 'num', 'per', 'point', 'trip', 'visit',
'lump', 'seat', 'sq.m.', 'sq.ft.', 'sq.m', 'rs/kg', 'm', 'mm',
'shift', 'm.depth', 'mtr.', 'nos.', 'set.', 'sqm.', 'rmt.', 'each.'
];

const SUMMARY_KEYWORDS = [
'estimated cost', 'contractors rebate', "contractor's rebate",
'gst 18', 'contract sum', 'contingency', 'contract cost',
'water charges', 'sewerage charges', 'supervision charges',
'total project cost', 'project cost', 'cost after rebate',
'physical contingency', 'cost contingency', 'grand total',
'net amount', 'taxable amount', 'total amount in rs',
'total :', 'total:', 'sub total', 'subtotal'
];

function isSummaryRow(row) {
const rowStr = row.join(' ').toLowerCase().trim();
return SUMMARY_KEYWORDS.some(keyword => rowStr.includes(keyword));
}

function isNoteRow(row) {
const firstCell = (row[0] || '').toLowerCase().trim();
const secondCell = (row[1] || '').toLowerCase().trim();
const rowStr = row.join(' ').toLowerCase().trim();
return firstCell.startsWith('note') || secondCell.startsWith('note') ||
rowStr.startsWith('note:') || rowStr.startsWith('note ');
}

function isHeaderRepeatRow(row) {
const rowLower = row.map(v => (v || '').toLowerCase().trim());
const hasDesc = rowLower.some(v => v.includes('description'));
const hasSrNo = rowLower.some(v => v.includes('sr.no') || v.includes('sr no') || v === 'sr.no.' || v === 'sr no');
const hasQtyOrAmount = rowLower.some(v => v.includes('qty') || v.includes('quantity') || v.includes('amount'));
return (hasDesc && (hasSrNo || hasQtyOrAmount));
}

function isUnit(val) {
if (!val) return false;
const v = val.toLowerCase().trim().replace(/\./g, '');
return KNOWN_UNITS.includes(v) || KNOWN_UNITS.includes(val.toLowerCase().trim());
}

function isNumber(val) {
if (!val) return false;
const cleaned = val.toString().replace(/,/g, '').replace(/₹/g, '').trim();
const n = parseFloat(cleaned);
return !isNaN(n) && cleaned.length > 0;
}

function parseNumber(val) {
if (!val) return 0;
return parseFloat(val.toString().replace(/,/g, '').replace(/₹/g, '').trim()) || 0;
}

function isDescriptionText(val) {
if (!val) return false;
const v = val.trim();
if (v.length < 3) return false;
if (/^\d+(\.\d+)?$/.test(v)) return false;
if (isUnit(v)) return false;
if (/^[A-Z]$/.test(v)) return false;
return /[a-zA-Z]/.test(v) && v.length > 3;
}

function isCategoryHeaderRow(row, descCol, qtyCol, rateCol, amountCol) {
const nonEmptyVals = row.filter(v => (v || '').trim().length > 0);
if (nonEmptyVals.length === 0 || nonEmptyVals.length > 2) return false;

const qty = qtyCol >= 0 && qtyCol < row.length ? parseNumber(row[qtyCol]) : 0;
const rate = rateCol >= 0 && rateCol < row.length ? parseNumber(row[rateCol]) : 0;
const amount = amountCol >= 0 && amountCol < row.length ? parseNumber(row[amountCol]) : 0;

if (qty > 0 || rate > 0 || amount > 0) return false;

const val = nonEmptyVals[0];
return isDescriptionText(val) && val.length < 40;
}

function detectHeader(rows) {
for (let i = 0; i < Math.min(rows.length, 15); i++) {
const row = rows[i];
const rowLower = row.map(v => (v || '').toLowerCase().trim());
const hasDesc = rowLower.some(v => v.includes('description') || v.includes('particulars'));
const hasQty = rowLower.some(v => v.includes('qty') || v.includes('quantity'));
const hasRate = rowLower.some(v => v === 'rate' || v.startsWith('rate'));
const hasAmount = rowLower.some(v => v.includes('amount') || v === 'amt');

if (hasDesc && (hasQty || hasRate || hasAmount)) {
let descCol = -1, unitCol = -1, qtyCol = -1, rateCol = -1, amountCol = -1;
for (let ci = 0; ci < rowLower.length; ci++) {
const v = rowLower[ci];
if ((v.includes('description') || v.includes('particulars')) && descCol === -1) descCol = ci;
if ((isUnit(v) || v === 'unit' || v === 'per') && unitCol === -1) unitCol = ci;
if ((v.includes('qty') || v.includes('quantity')) && qtyCol === -1) qtyCol = ci;
if ((v === 'rate' || v === 'rate (rs)' || v.startsWith('rate')) && rateCol === -1) rateCol = ci;
if ((v.includes('amount') || v === 'amt') && amountCol === -1) amountCol = ci;
}
return { headerRowIdx: i, descCol, unitCol, qtyCol, rateCol, amountCol };
}
}
return null;
}

function isMeasurementSheet(rows, header) {
const { rateCol, amountCol } = header;
if (rateCol === -1 && amountCol === -1) return true;

const headerRow = rows[header.headerRowIdx].map(v => (v || '').toLowerCase());
const hasDimensions = headerRow.some(v => v.includes('length')) &&
headerRow.some(v => v.includes('width')) &&
headerRow.some(v => v.includes('height'));
if (hasDimensions) return true;

return false;
}

function parseTable(rows) {
const header = detectHeader(rows);
if (!header) return [];

if (isMeasurementSheet(rows, header)) {
console.log(' -> Skipped: Measurement Sheet style table');
return [];
}

const { headerRowIdx, descCol, unitCol, qtyCol, rateCol, amountCol } = header;
console.log(` -> Header at row ${headerRowIdx}: desc=${descCol} unit=${unitCol} qty=${qtyCol} rate=${rateCol} amount=${amountCol}`);

if (descCol === -1 || (rateCol === -1 && amountCol === -1)) {
console.log(' -> Skipped: no description or no rate/amount column');
return [];
}

const boqItems = [];
let pendingDescription = '';
let parentDescription = '';

for (let i = headerRowIdx + 1; i < rows.length; i++) {
const row = rows[i];
if (!row || row.length === 0) continue;

if (isSummaryRow(row)) {
console.log(` -> Summary at row ${i}, stopping`);
break;
}

if (isNoteRow(row)) continue;
if (isHeaderRepeatRow(row)) continue;
if (isCategoryHeaderRow(row, descCol, qtyCol, rateCol, amountCol)) {
console.log(` -> Category header skipped at row ${i}: ${row.join(' ').substring(0, 40)}`);
pendingDescription = '';
parentDescription = '';
continue;
}

const rowStr = row.join(' ').trim();
if (rowStr.length < 2) continue;

const desc = descCol >= 0 && descCol < row.length ? (row[descCol] || '').trim() : '';
const unit = unitCol >= 0 && unitCol < row.length ? (row[unitCol] || '').trim() : '';
const qtyRaw = qtyCol >= 0 && qtyCol < row.length ? (row[qtyCol] || '').trim() : '';
const rateRaw = rateCol >= 0 && rateCol < row.length ? (row[rateCol] || '').trim() : '';
const amountRaw = amountCol >= 0 && amountCol < row.length ? (row[amountCol] || '').trim() : '';

const qty = parseNumber(qtyRaw);
const rate = parseNumber(rateRaw);
const amount = parseNumber(amountRaw);

const hasNumericData = rate > 0 || amount > 0;

const firstCell = (row[0] || '').trim();
const isSubItem = /^[A-Za-z]$/.test(firstCell);
const isMainItem = /^\d+$/.test(firstCell);

if (hasNumericData) {
let finalDesc = '';

if (isSubItem) {
const subDesc = desc || firstCell;
finalDesc = parentDescription ? `${parentDescription} (${subDesc})` : subDesc;
} else {
finalDesc = pendingDescription || desc;
if (isMainItem && (pendingDescription || desc)) {
parentDescription = pendingDescription || desc;
}
}

if (!finalDesc || finalDesc.length < 3 || !isDescriptionText(finalDesc)) {
const altDesc = row.find(v => isDescriptionText(v || '') && (v || '').length > 5);
if (altDesc) finalDesc = altDesc;
}

if (finalDesc && finalDesc.length > 3 && isDescriptionText(finalDesc)) {
let finalQty = qty;
let finalRate = rate;
let finalAmount = amount;
let finalUnit = unit || 'Nos';

if (finalAmount === 0 && finalQty > 0 && finalRate > 0) finalAmount = Math.round(finalQty * finalRate * 100) / 100;
if (finalQty === 0 && finalRate > 0 && finalAmount > 0) finalQty = Math.round((finalAmount / finalRate) * 100) / 100;
if (finalRate === 0 && finalQty > 0 && finalAmount > 0) finalRate = Math.round(finalAmount / finalQty);

const aiRate = finalRate > 0 ? classifyAndEstimate(finalDesc, finalUnit, finalRate) : 0;

boqItems.push({
item: finalDesc.substring(0, 300),
unit: finalUnit.toUpperCase(),
quantity: Math.round(finalQty * 100) / 100,
rate: Math.round(finalRate * 100) / 100,
amount: Math.round(finalAmount * 100) / 100,
aiRate: aiRate,
needsRate: false
});
}

if (!isSubItem) pendingDescription = '';

} else if (desc && isDescriptionText(desc)) {
if (isMainItem || (!isSubItem && !pendingDescription)) {
pendingDescription = desc;
parentDescription = desc;
} else if (pendingDescription && !isSubItem) {
pendingDescription += ' ' + desc;
}
} else if (!desc && !hasNumericData) {
const anyDesc = row.find((v, idx) => idx !== 0 && isDescriptionText(v || '') && (v || '').length > 10);
if (anyDesc && !isSubItem) {
if (pendingDescription) pendingDescription += ' ' + anyDesc;
else { pendingDescription = anyDesc; parentDescription = anyDesc; }
}
}
}

console.log(` -> Found ${boqItems.length} items in this table`);
return boqItems;
}

// ============ FALLBACK PARSER for interleaved BOQ+Measurement Sheet PDFs ============
function looksLikeItemCode(val) {
if (!val) return false;
const v = val.trim().replace(/\s+/g, '');
if (v.length < 5 || v.length > 25) return false;
return /^[A-Z]\d/.test(v) && (v.match(/-/g) || []).length >= 1 && /[A-Z]/i.test(v);
}

function looksLikeSrNo(val) {
if (!val) return false;
return /^\d{1,4}$/.test(val.trim());
}

function fallbackParseInterleaved(allRows) {
const items = [];
let current = null;

for (let i = 0; i < allRows.length; i++) {
const row = allRows[i];
if (!row || row.length === 0) continue;

const nonEmpty = row.map(v => (v || '').trim()).filter(v => v.length > 0);
if (nonEmpty.length === 0) continue;

let srNoIdx = -1, codeIdx = -1;
for (let ci = 0; ci < row.length; ci++) {
const val = (row[ci] || '').trim();
if (srNoIdx === -1 && looksLikeSrNo(val) && parseInt(val) > 0 && parseInt(val) < 1000) {
srNoIdx = ci;
} else if (srNoIdx !== -1 && codeIdx === -1 && looksLikeItemCode(val)) {
codeIdx = ci;
break;
}
}

if (srNoIdx !== -1 && codeIdx !== -1 && codeIdx > srNoIdx) {
if (current && current.description.length > 10) {
items.push(current);
}
const descParts = [];
for (let ci = codeIdx + 1; ci < row.length; ci++) {
const v = (row[ci] || '').trim();
if (v.length > 0) descParts.push(v);
}
current = {
srNo: row[srNoIdx].trim(),
itemCode: row[codeIdx].trim().replace(/\s+/g, ''),
description: descParts.join(' '),
quantity: 0,
unit: '',
rate: 0,
amount: 0,
needsRate: true
};
continue;
}

if (current) {
const rowStr = row.join(' ');
const sayMatch = rowStr.match(/Say\s*\|?\s*([\d,]+\.?\d*)\s*\|?\s*([A-Za-z.]+)\s*$/i);
if (sayMatch) {
current.quantity = parseNumber(sayMatch[1]);
current.unit = sayMatch[2].toUpperCase().replace(/\./g, '');
items.push(current);
current = null;
continue;
}

if (nonEmpty[0] && nonEmpty[0].toLowerCase() === 'say' && nonEmpty.length >= 2) {
const lastVal = nonEmpty[nonEmpty.length - 1];
const secondLastVal = nonEmpty[nonEmpty.length - 2];
if (isUnit(lastVal) && isNumber(secondLastVal)) {
current.quantity = parseNumber(secondLastVal);
current.unit = lastVal.toUpperCase().replace(/\./g, '');
items.push(current);
current = null;
continue;
}
}

if (current.description.length < 150 && nonEmpty.length <= 2) {
const textVal = nonEmpty.find(v => isDescriptionText(v) && !looksLikeSrNo(v));
if (textVal && !textVal.toLowerCase().includes('say') && parseNumber(textVal) === 0) {
current.description += ' ' + textVal;
}
}
}
}

if (current && current.description.length > 10) {
items.push(current);
}

const validItems = items
.filter(it => it.description.length > 10 && it.quantity > 0)
.map(it => ({
item: it.description.substring(0, 300),
unit: it.unit || 'NOS',
quantity: it.quantity,
rate: 0,
amount: 0,
aiRate: 0,
needsRate: true,
itemCode: it.itemCode
}));

console.log(`Fallback parser found ${validItems.length} items needing rate input`);
return validItems;
}

// ============ PDFPLUMBER EXTRACTION via Python subprocess ============
function extractTablesWithPdfplumber(pdfPath) {
return new Promise((resolve, reject) => {
const py = spawn('python3', [path.join(process.cwd(), 'extract.py'), pdfPath]);
let stdout = '';
let stderr = '';

py.stdout.on('data', (data) => { stdout += data.toString(); });
py.stderr.on('data', (data) => { stderr += data.toString(); });

py.on('close', (code) => {
if (code !== 0) {
console.log('Python extraction error:', stderr.substring(0, 500));
reject(new Error('PDF extraction failed: ' + stderr.substring(0, 200)));
return;
}
try {
const tables = JSON.parse(stdout);
resolve(tables);
} catch (e) {
console.log('Failed to parse Python output:', stdout.substring(0, 500));
reject(new Error('Failed to parse extraction output'));
}
});

py.on('error', (err) => {
reject(new Error('Failed to start Python: ' + err.message));
});
});
}

function processExtractedTables(tables) {
console.log(`Pdfplumber extracted ${tables.length} tables`);

let allBoqItems = [];
let unmatchedRows = [];
let tenderValue = 0;

for (let t = 0; t < tables.length; t++) {
const rows = tables[t];
if (!rows || rows.length === 0) continue;

const hasBoqHeader = rows.some(row => {
const rl = row.map(v => (v || '').toLowerCase());
return rl.some(v => v.includes('description') || v.includes('particulars')) &&
rl.some(v => v.includes('qty') || v.includes('quantity') || v.includes('rate') || v.includes('amount'));
});

if (hasBoqHeader) {
console.log(`Processing table ${t} (${rows.length} rows) as potential BOQ table`);
const items = parseTable(rows);
if (items.length > 0) {
allBoqItems = allBoqItems.concat(items);
} else {
unmatchedRows = unmatchedRows.concat(rows);
}
} else {
unmatchedRows = unmatchedRows.concat(rows);
}

for (const row of rows) {
for (const val of row) {
const amount = extractRupeeAmount(val || '');
if (amount > tenderValue) tenderValue = amount;
}
}
}

console.log('Clean-table items:', allBoqItems.length);
console.log('Unmatched rows for fallback:', unmatchedRows.length);

if (unmatchedRows.length > 0) {
const fallbackItems = fallbackParseInterleaved(unmatchedRows);
const existingDescs = new Set(allBoqItems.map(it => it.item.substring(0, 60).toLowerCase()));
const newFallbackItems = fallbackItems.filter(it => !existingDescs.has(it.item.substring(0, 60).toLowerCase()));
console.log('Fallback items added (after dedup):', newFallbackItems.length);
allBoqItems = allBoqItems.concat(newFallbackItems);
}

console.log('Total items across all tables:', allBoqItems.length);
console.log('Tender value found:', tenderValue);

const estimatedCostFromItems = allBoqItems.reduce((sum, item) => sum + (item.amount || 0), 0);

if (allBoqItems.length > 0) {
return {
extractionSuccess: true,
boqItems: allBoqItems,
tenderValue: estimatedCostFromItems > 0 ? estimatedCostFromItems : tenderValue
};
}
return { extractionSuccess: false, boqItems: [], tenderValue };
}

async function getBidReason(type, deptEstimate, profitMargin) {
try {
const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
contents: [{ parts: [{ text: `One sentence bid recommendation for Mumbai ${type} tender worth Rs ${deptEstimate} with ${profitMargin}% profit margin. Mumbai June 2026 market.` }] }],
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
const cleanBoundary = boundary.replace(/"/g, '');
const parts = body.toString('binary').split('--' + cleanBoundary);
for (const part of parts) {
if (part.includes('filename=') || part.includes('application/pdf')) {
const headerEnd = part.indexOf('\r\n\r\n');
if (headerEnd !== -1) {
const fileData = Buffer.from(part.slice(headerEnd + 4, part.length - 2), 'binary');
if (fileData.length > 100) return fileData;
}
}
}
const pdfStart = body.indexOf(Buffer.from('%PDF'));
if (pdfStart !== -1) return body.slice(pdfStart);
return null;
} catch (e) { return null; }
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

if (req.method === 'POST' && req.url === '/api/boq-upload') {
let tempPdfPath = null;
try {
const contentType = req.headers['content-type'] || '';
const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
if (!boundaryMatch) { res.writeHead(400); res.end(JSON.stringify({ error: 'No boundary' })); return; }

const pdfBuffer = parseMultipart(body, boundaryMatch[1]);
if (!pdfBuffer || pdfBuffer.length < 1000) { res.writeHead(400); res.end(JSON.stringify({ error: 'No valid PDF' })); return; }
if (!pdfBuffer.slice(0, 4).toString().startsWith('%PDF')) { res.writeHead(400); res.end(JSON.stringify({ error: 'Not a valid PDF' })); return; }

console.log('PDF upload received, size:', pdfBuffer.length);

const bodyStr = body.toString('binary');
let tenderType = 'Civil';
let tenderTitle = '';
const typeMatch = bodyStr.match(/name="tenderType"\r\n\r\n([^\r\n]+)/);
const titleMatch = bodyStr.match(/name="tenderTitle"\r\n\r\n([^\r\n]+)/);
if (typeMatch) tenderType = typeMatch[1];
if (titleMatch) tenderTitle = titleMatch[1];
console.log('Type:', tenderType, '| Title:', tenderTitle.substring(0, 50));

// Write PDF to temp file for pdfplumber
tempPdfPath = path.join(os.tmpdir(), `boq_${Date.now()}.pdf`);
fs.writeFileSync(tempPdfPath, pdfBuffer);

console.log('Extracting tables with pdfplumber...');
const tables = await extractTablesWithPdfplumber(tempPdfPath);
const parsed = processExtractedTables(tables);

console.log('Result - success:', parsed.extractionSuccess, 'items:', parsed.boqItems?.length, 'value:', parsed.tenderValue);

let deptEstimate = parsed.tenderValue > 0 ? parsed.tenderValue : 5000000;
let boqItems = [];
let pdfRead = false;
let dataSource = 'pwd_estimation';

if (parsed.extractionSuccess && parsed.boqItems?.length > 0) {
boqItems = parsed.boqItems;
pdfRead = true;
dataSource = 'actual_pdf';
} else {
boqItems = generateEstimatedBOQ(tenderType, deptEstimate);
dataSource = parsed.tenderValue > 100000 ? 'pdf_value_estimated_boq' : 'pwd_estimation';
}

const executionCost = boqItems.reduce((sum, item) => sum + (item.quantity * (item.aiRate || item.rate || 0)), 0);
const expectedWinningBid = Math.round(deptEstimate * 0.92);
const expectedProfit = expectedWinningBid - executionCost;
const profitMargin = expectedWinningBid > 0 ? Math.round((expectedProfit / expectedWinningBid) * 100) : 0;
const defaults = getDefaultsForType(tenderType);
const bidReason = await getBidReason(tenderType, deptEstimate, profitMargin);

const needsRateCount = boqItems.filter(it => it.needsRate).length;
const message = pdfRead
? `✅ Real BOQ extracted from uploaded PDF — ${boqItems.length} items found${needsRateCount > 0 ? ` (${needsRateCount} need rate input)` : ''}`
: parsed.tenderValue > 100000
? `📄 Real tender value ₹${(parsed.tenderValue / 10000000).toFixed(2)} Cr extracted — BOQ estimated using 2026 Mumbai rates`
: '📊 BOQ estimated using 2026 Mumbai market rates';

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
console.log('Upload error:', error.message);
res.writeHead(500); res.end(JSON.stringify({ error: 'Upload failed', details: String(error.message) }));
} finally {
if (tempPdfPath && fs.existsSync(tempPdfPath)) {
try { fs.unlinkSync(tempPdfPath); } catch (e) {}
}
}
return;
}

res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
});
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`BOQ service running on port ${PORT}`));

