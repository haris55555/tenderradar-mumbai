import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const GEMINI_KEY = process.env.GEMINI_KEY || '';

const STATE_MULTIPLIERS = {
'Maharashtra': 1.00, 'Delhi': 1.15, 'Karnataka': 0.92, 'Gujarat': 0.88,
'Tamil Nadu': 0.90, 'Rajasthan': 0.82, 'Uttar Pradesh': 0.78, 'Madhya Pradesh': 0.78,
'West Bengal': 0.85, 'Telangana': 0.91, 'Kerala': 1.05, 'Punjab': 0.95,
'Haryana': 0.98, 'Andhra Pradesh': 0.89, 'Odisha': 0.80, 'Bihar': 0.75,
'Jharkhand': 0.76, 'Chhattisgarh': 0.77, 'Assam': 0.82, 'Goa': 1.08,
};

function getStateMultiplier(state) { return STATE_MULTIPLIERS[state] || 1.0; }

function classifyAndEstimate(description, unit, pdfRate, stateMultiplier) {
const d = (description || '').toLowerCase();
const u = (unit || '').toLowerCase().replace(/\./g, '');
const m = stateMultiplier || 1.0;

const BASE_RATES = {
excavation_manual: 390, excavation_mechanical: 1100,
pcc_m10: 6200, rcc_m20: 8700, rcc_m25: 9500, rcc_m30: 10200, rcc_m35: 11000, rcc_m40: 12000,
steel: 67000, brickwork: 6000, blockwork: 5200, formwork: 300,
plastering_12mm: 400, plastering_20mm: 480,
flooring_tiles: 750, flooring_vitrified: 950, flooring_granite: 1800, flooring_marble: 2200,
waterproofing: 200, waterproofing_terrace: 220, waterproofing_basement: 280,
painting_interior: 135, painting_exterior: 160,
doors_flush: 9500, doors_panel: 14000, windows_upvc: 950, windows_aluminium: 1100,
false_ceiling: 380, dado_tiles: 680, stone_masonry: 7200,
earth_filling: 280, sand_filling: 320, demolition: 180,
gsb: 450, wmm: 620, dbm: 780, bc: 520, kerb: 950,
pipe_upvc_110: 380, pipe_upvc_160: 580, pipe_swg: 420,
manhole_brick: 52000, cable_wiring: 480, conduit: 120, switchboard: 1800, earthing: 8500,
railing_ms: 2200, gate_ms: 4500, grill_ms: 1800, signage: 3500,
};

function baseRate(key) { return Math.round((BASE_RATES[key] || 500) * m * 0.85); }

if ((d.includes('reinforcement') || d.includes('steel bar') || d.includes('fe500') || d.includes('tmt') || d.includes('steel re')) && (u === 'mt' || u.includes('mt') || u === 'kg')) {
const rate = u === 'kg' ? BASE_RATES.steel / 1000 : BASE_RATES.steel;
return pdfRate > 0 ? Math.round(pdfRate * 0.98 * m) : Math.round(rate * m * 0.85);
}
if ((d.includes('concrete') || d.includes(' cc ') || d.includes('r.c.c') || d.includes('rcc') || d.includes('p/l') || d.includes('rmc') || d.includes('reinforced cement')) && (u === 'cum' || u.includes('cum'))) {
if (d.includes('m-40') || d.includes('m40') || d.includes('m-45') || d.includes('m45')) return pdfRate > 0 ? Math.round(pdfRate * 0.93 * m) : Math.round(BASE_RATES.rcc_m40 * m * 0.85);
if (d.includes('m-35') || d.includes('m35')) return pdfRate > 0 ? Math.round(pdfRate * 0.92 * m) : Math.round(BASE_RATES.rcc_m35 * m * 0.85);
if (d.includes('m-30') || d.includes('m30')) return pdfRate > 0 ? Math.round(pdfRate * 0.91 * m) : Math.round(BASE_RATES.rcc_m30 * m * 0.85);
if (d.includes('m-25') || d.includes('m25')) return pdfRate > 0 ? Math.round(pdfRate * 0.90 * m) : Math.round(BASE_RATES.rcc_m25 * m * 0.85);
if (d.includes('m-20') || d.includes('m20')) return pdfRate > 0 ? Math.round(pdfRate * 0.90 * m) : Math.round(BASE_RATES.rcc_m20 * m * 0.85);
if (d.includes('m-15') || d.includes('m15') || d.includes('m-10') || d.includes('m10') || d.includes('lean') || d.includes('pcc')) return pdfRate > 0 ? Math.round(pdfRate * 0.88 * m) : Math.round(BASE_RATES.pcc_m10 * m * 0.85);
return pdfRate > 0 ? Math.round(pdfRate * 0.90 * m) : Math.round(BASE_RATES.rcc_m25 * m * 0.85);
}
if (d.includes('excavat') && (u === 'cum' || u.includes('cum'))) {
if (d.includes('chisel') || d.includes('breaker') || d.includes('hard rock') || d.includes('pneumatic') || d.includes('mechanical') || d.includes('jcb')) return pdfRate > 0 ? Math.round(pdfRate * 0.78 * m) : baseRate('excavation_mechanical');
return pdfRate > 0 ? Math.round(pdfRate * 0.65 * m) : baseRate('excavation_manual');
}
if (d.includes('earth work') || d.includes('p/l earth') || d.includes('embankment') || d.includes('filling') || d.includes('backfill') || d.includes('top layer of earth') || d.includes('stabilised soil')) {
if (d.includes('sand')) return pdfRate > 0 ? Math.round(pdfRate * 0.72 * m) : baseRate('sand_filling');
return pdfRate > 0 ? Math.round(pdfRate * 0.70 * m) : baseRate('earth_filling');
}
if (d.includes('brick') || d.includes('masonry') || d.includes('block work') || d.includes('blockwork') || d.includes('aac') || d.includes('flyash')) {
if (d.includes('aac') || d.includes('flyash') || d.includes('block')) return pdfRate > 0 ? Math.round(pdfRate * 0.88 * m) : baseRate('blockwork');
if (d.includes('stone') || d.includes('rubble')) return pdfRate > 0 ? Math.round(pdfRate * 0.88 * m) : baseRate('stone_masonry');
return pdfRate > 0 ? Math.round(pdfRate * 0.88 * m) : baseRate('brickwork');
}
if (d.includes('centering') || d.includes('shuttering') || d.includes('formwork') || d.includes('form work')) return pdfRate > 0 ? Math.round(pdfRate * 0.85 * m) : baseRate('formwork');
if (d.includes('sub base') || d.includes('subbase') || d.includes('wmm') || d.includes('wet mix') || d.includes('gsb') || d.includes('granular') || d.includes('crushed stone') || d.includes('rubble soling') || d.includes('metal gradation')) {
if (d.includes('wmm') || d.includes('wet mix')) return pdfRate > 0 ? Math.round(pdfRate * 0.80 * m) : baseRate('wmm');
return pdfRate > 0 ? Math.round(pdfRate * 0.80 * m) : baseRate('gsb');
}
if (d.includes('bitumen') || d.includes('bituminous') || d.includes('dbm') || d.includes('premix') || d.includes('tack coat') || d.includes('prime coat') || d.includes('mastic') || d.includes('asphalt')) {
if (d.includes('bc') || d.includes('wearing') || d.includes('surface')) return pdfRate > 0 ? Math.round(pdfRate * 0.87 * m) : baseRate('bc');
return pdfRate > 0 ? Math.round(pdfRate * 0.87 * m) : baseRate('dbm');
}
if (d.includes('plaster') || d.includes('rendering') || d.includes('neeru') || d.includes('snowcem')) {
if (d.includes('20mm') || d.includes('25mm')) return pdfRate > 0 ? Math.round(pdfRate * 0.82 * m) : baseRate('plastering_20mm');
return pdfRate > 0 ? Math.round(pdfRate * 0.82 * m) : baseRate('plastering_12mm');
}
if (d.includes('flooring') || d.includes('floor') || d.includes('tile') || d.includes('tactile') || d.includes('kota') || d.includes('granite') || d.includes('marble') || d.includes('vitrified')) {
if (d.includes('granite')) return pdfRate > 0 ? Math.round(pdfRate * 0.82 * m) : baseRate('flooring_granite');
if (d.includes('marble')) return pdfRate > 0 ? Math.round(pdfRate * 0.82 * m) : baseRate('flooring_marble');
if (d.includes('vitrified')) return pdfRate > 0 ? Math.round(pdfRate * 0.82 * m) : baseRate('flooring_vitrified');
return pdfRate > 0 ? Math.round(pdfRate * 0.82 * m) : baseRate('flooring_tiles');
}
if (d.includes('dado') || d.includes('wall tile') || d.includes('ceramic')) return pdfRate > 0 ? Math.round(pdfRate * 0.82 * m) : baseRate('dado_tiles');
if (d.includes('waterproof') || d.includes('water proof') || d.includes('damp proof') || d.includes('admixture')) {
if (d.includes('basement') || d.includes('raft') || d.includes('retaining')) return pdfRate > 0 ? Math.round(pdfRate * 0.80 * m) : baseRate('waterproofing_basement');
if (d.includes('terrace') || d.includes('roof')) return pdfRate > 0 ? Math.round(pdfRate * 0.80 * m) : baseRate('waterproofing_terrace');
return pdfRate > 0 ? Math.round(pdfRate * 0.80 * m) : baseRate('waterproofing');
}
if (d.includes('paint') || d.includes('primer') || d.includes('putty') || d.includes('texture') || d.includes('distemper') || d.includes('stencil') || d.includes('whitewash')) {
if (d.includes('exterior') || d.includes('external') || d.includes('acrylic') || d.includes('weathershield')) return pdfRate > 0 ? Math.round(pdfRate * 0.82 * m) : baseRate('painting_exterior');
return pdfRate > 0 ? Math.round(pdfRate * 0.82 * m) : baseRate('painting_interior');
}
if (d.includes('door') || (d.includes('shutter') && !d.includes('rolling'))) {
if (d.includes('flush') || d.includes('panel') || d.includes('timber') || d.includes('wooden') || d.includes('teak')) return pdfRate > 0 ? Math.round(pdfRate * 0.80 * m) : baseRate('doors_panel');
return pdfRate > 0 ? Math.round(pdfRate * 0.80 * m) : baseRate('doors_flush');
}
if (d.includes('window') || d.includes('ventilator')) {
if (d.includes('aluminium') || d.includes('aluminum')) return pdfRate > 0 ? Math.round(pdfRate * 0.80 * m) : baseRate('windows_aluminium');
return pdfRate > 0 ? Math.round(pdfRate * 0.80 * m) : baseRate('windows_upvc');
}
if (d.includes('false ceiling') || d.includes('gypsum') || d.includes('grid ceiling') || d.includes('puf panel')) return pdfRate > 0 ? Math.round(pdfRate * 0.82 * m) : baseRate('false_ceiling');
if (d.includes('pipe') && (u === 'rmt' || u === 'm' || u.includes('mtr') || u === 'rm' || u === 'nos')) {
if (d.includes('hdpe') || d.includes('di pipe') || d.includes('m.s') || d.includes('ms pipe') || d.includes('gi pipe')) return pdfRate > 0 ? Math.round(pdfRate * 0.85 * m) : baseRate('pipe_upvc_160');
if (d.includes('110') || d.includes('100mm')) return pdfRate > 0 ? Math.round(pdfRate * 0.78 * m) : baseRate('pipe_upvc_110');
return pdfRate > 0 ? Math.round(pdfRate * 0.78 * m) : baseRate('pipe_swg');
}
if (d.includes('water closet') || d.includes('wc') || d.includes('wash basin') || d.includes('sink') || d.includes('urinal') || d.includes('nahani') || d.includes('trap') || d.includes('faucet') || d.includes('tap') || d.includes('bib cock') || d.includes('shower')) {
return pdfRate > 0 ? Math.round(pdfRate * 0.82 * m) : Math.round(3500 * m * 0.85);
}
if (d.includes('manhole') || d.includes('cover') || d.includes('frame') || d.includes('chamber') || d.includes('grating') || d.includes('sump')) {
if (d.includes('c.i') || d.includes('ci ') || d.includes('cast iron') || d.includes('m.s')) return pdfRate > 0 ? Math.round(pdfRate * 0.82 * m) : Math.round(12000 * m * 0.85);
return pdfRate > 0 ? Math.round(pdfRate * 0.75 * m) : baseRate('manhole_brick');
}
if (d.includes('cable') || d.includes('conduit') || d.includes('panel') || d.includes('earthing') || d.includes('electrical') || d.includes('xlpe') || d.includes('mcb') || d.includes('elcb') || d.includes('switchfuse') || d.includes('distribution board') || d.includes('wiring') || d.includes('tubelight') || d.includes('fixture') || d.includes('fan') || d.includes('bulkhead') || d.includes('tpn') || d.includes('led') || d.includes('light') || d.includes('switch') || d.includes('socket')) {
if (d.includes('earthing')) return pdfRate > 0 ? Math.round(pdfRate * 0.85 * m) : baseRate('earthing');
if (d.includes('conduit')) return pdfRate > 0 ? Math.round(pdfRate * 0.85 * m) : baseRate('conduit');
if (d.includes('switch') || d.includes('socket')) return pdfRate > 0 ? Math.round(pdfRate * 0.85 * m) : baseRate('switchboard');
return pdfRate > 0 ? Math.round(pdfRate * 0.85 * m) : baseRate('cable_wiring');
}
if (d.includes('railing') || d.includes('handrail') || d.includes('balustrade') || d.includes('grill') || d.includes('gate') || d.includes('fencing') || d.includes('bollard') || d.includes('fabricat')) {
if (d.includes('gate')) return pdfRate > 0 ? Math.round(pdfRate * 0.75 * m) : baseRate('gate_ms');
if (d.includes('grill')) return pdfRate > 0 ? Math.round(pdfRate * 0.75 * m) : baseRate('grill_ms');
return pdfRate > 0 ? Math.round(pdfRate * 0.75 * m) : baseRate('railing_ms');
}
if (d.includes('sign') || d.includes('board') || d.includes('display') || d.includes('name plate') || d.includes('lettering')) return pdfRate > 0 ? Math.round(pdfRate * 0.80 * m) : baseRate('signage');
if (d.includes('kerb') || d.includes('water dished') || d.includes('water table') || d.includes('tree guard')) return pdfRate > 0 ? Math.round(pdfRate * 0.78 * m) : baseRate('kerb');
if (d.includes('road marking') || d.includes('thermoplastic') || d.includes('retro reflective') || d.includes('road stud')) return pdfRate > 0 ? Math.round(pdfRate * 0.80 * m) : Math.round(800 * m * 0.85);
if (d.includes('demolition') || d.includes('dismantl') || d.includes('removing') || d.includes('breaking') || d.includes('cutting')) return pdfRate > 0 ? Math.round(pdfRate * 0.70 * m) : baseRate('demolition');
if (d.includes('shoring') || d.includes('strutting') || d.includes('underpinning')) return pdfRate > 0 ? Math.round(pdfRate * 0.75 * m) : Math.round(850 * m * 0.85);
if (d.includes('survey') || d.includes('testing') || d.includes('transplant') || d.includes('cutting down of tree') || d.includes('publicity') || d.includes('procuring') || d.includes('cbo')) return pdfRate > 0 ? Math.round(pdfRate * 0.75 * m) : Math.round(2000 * m * 0.85);
return pdfRate > 0 ? Math.round(pdfRate * 0.85 * m) : Math.round(500 * m * 0.85);
}

function getDefaultsForType(type) {
const t = (type || '').toLowerCase();
if (t.includes('road') || t.includes('infrastructure')) return { keyMaterials: ['Bituminous Macadam DBM Grade II', 'WBM Aggregate 40mm', 'Cement Concrete M30', 'TMT Steel Fe500D'], majorEquipment: ['Road Roller 10T Vibratory', 'Sensor Paver Machine', 'JCB Excavator 3CX', 'Tipper Trucks 10MT'], riskFactors: ['Heavy monsoon damage to fresh bituminous surface', 'Underground utility conflicts in urban roads', 'Traffic diversion management in busy roads'], executionDays: 120 };
if (t.includes('sewer') || t.includes('sewerage') || t.includes('drain')) return { keyMaterials: ['NP3 RCC Hume Pipes', 'Cement OPC 53 Grade', 'River Sand Zone II', 'Brick Masonry Class A'], majorEquipment: ['JCB 3CX Excavator', 'Dewatering Pump 10HP', 'Concrete Mixer 500L', 'Hydraulic Crane 10T'], riskFactors: ['High water table in coastal areas', 'Existing utility crossing at depth', 'Monsoon flooding risk for open trenches'], executionDays: 150 };
if (t.includes('sanitary') || t.includes('water') || t.includes('pipeline') || t.includes('pump')) return { keyMaterials: ['DI Pipes K9 Class IS 8329', 'Sluice Valves IS 14846', 'Cement OPC 53 Grade', 'Coarse Sand Bedding'], majorEquipment: ['Pipe Laying Excavator', 'JCB 3CX Excavator', 'Hydraulic Pipe Bending Machine', 'Pressure Testing Equipment'], riskFactors: ['Water supply disruption to residents during work', 'Pressure testing failures at joints', 'Soil condition variations'], executionDays: 90 };
if (t.includes('electrical') || t.includes('mechanical')) return { keyMaterials: ['Aluminium/Copper Cables IS 694', 'MS Conduit Pipes', 'Distribution Panels', 'Earthing Materials'], majorEquipment: ['Cable Laying Machine', 'Hydraulic Crane 5T', 'Cable Drum Trailer', 'Megger Testing Equipment'], riskFactors: ['Live electrical hazards during installation', 'Shutdown coordination required', 'Specialized licensed electricians required'], executionDays: 60 };
return { keyMaterials: ['Cement OPC 53 Grade Ultratech', 'TMT Steel Fe500D TATA/JSW', 'River Sand Zone II', '20mm Graded Aggregate'], majorEquipment: ['JCB 3CX Excavator', 'Concrete Transit Mixer', 'Plate Compactor', 'Tipper Truck 10MT'], riskFactors: ['Urban area work with restricted access', 'Monsoon season work stoppage Jun-Sep', 'Utility shifting coordination required'], executionDays: 120 };
}

function generateEstimatedBOQ(type, deptEstimate, stateMultiplier) {
const t = (type || '').toLowerCase();
const m = stateMultiplier || 1.0;
const targetCost = Math.round(deptEstimate * 0.82);
let template = [];
if (t.includes('road') || t.includes('infrastructure') || t.includes('footpath')) {
template = [{ item: 'Earthwork Excavation in all types of soil', unit: 'Cum', ratePct: 0.05, rate: Math.round(380 * m) }, { item: 'Granular Sub Base GSB 200mm', unit: 'Sqm', ratePct: 0.14, rate: Math.round(450 * m) }, { item: 'Wet Mix Macadam WMM 150mm', unit: 'Sqm', ratePct: 0.19, rate: Math.round(620 * m) }, { item: 'Dense Bituminous Macadam DBM 50mm', unit: 'Sqm', ratePct: 0.30, rate: Math.round(780 * m) }, { item: 'Bituminous Concrete BC 25mm', unit: 'Sqm', ratePct: 0.22, rate: Math.round(520 * m) }, { item: 'Precast RCC Kerb Stone 230x300mm', unit: 'Rm', ratePct: 0.10, rate: Math.round(950 * m) }];
} else if (t.includes('sewer') || t.includes('sewerage') || t.includes('drain')) {
template = [{ item: 'Earthwork Excavation for sewer trench', unit: 'Cum', ratePct: 0.08, rate: Math.round(420 * m) }, { item: 'NP3 RCC Sewer Pipe 300mm dia', unit: 'Rm', ratePct: 0.34, rate: Math.round(2800 * m) }, { item: 'Brick Masonry Manhole Chamber 1.2m dia', unit: 'Nos', ratePct: 0.25, rate: Math.round(52000 * m) }, { item: 'RCC M20 Bed Concrete 150mm thick', unit: 'Cum', ratePct: 0.14, rate: Math.round(7800 * m) }, { item: 'Sand Filling and Compaction in layers', unit: 'Cum', ratePct: 0.07, rate: Math.round(280 * m) }, { item: 'CI Surface Box and Frame for manhole', unit: 'Nos', ratePct: 0.12, rate: Math.round(9500 * m) }];
} else if (t.includes('sanitary') || t.includes('water') || t.includes('pipeline') || t.includes('pump')) {
template = [{ item: 'Earthwork Excavation for pipe trench', unit: 'Cum', ratePct: 0.08, rate: Math.round(420 * m) }, { item: 'DI Pipe K9 Class 200mm dia', unit: 'Rm', ratePct: 0.37, rate: Math.round(4500 * m) }, { item: 'Sluice Valve 200mm with CI valve chamber', unit: 'Nos', ratePct: 0.20, rate: Math.round(95000 * m) }, { item: 'Coarse Sand Bedding 150mm thick', unit: 'Cum', ratePct: 0.06, rate: Math.round(2200 * m) }, { item: 'Backfilling with excavated material', unit: 'Cum', ratePct: 0.08, rate: Math.round(300 * m) }, { item: 'Hydro Testing of Pipeline', unit: 'Rm', ratePct: 0.21, rate: Math.round(220 * m) }];
} else if (t.includes('electrical') || t.includes('mechanical')) {
template = [{ item: 'Supply and laying of HT XLPE Cable 11KV', unit: 'Rm', ratePct: 0.30, rate: Math.round(2200 * m) }, { item: 'Supply and installation of LT Distribution Panel', unit: 'Nos', ratePct: 0.25, rate: Math.round(320000 * m) }, { item: 'Earthing with GI electrode and strips', unit: 'Set', ratePct: 0.15, rate: Math.round(targetCost * 0.15 * m) }, { item: 'MS Conduit wiring with copper cables', unit: 'Rm', ratePct: 0.20, rate: Math.round(480 * m) }, { item: 'Testing commissioning and load trial', unit: 'Ls', ratePct: 0.10, rate: Math.round(targetCost * 0.10 * m) }];
} else {
template = [{ item: 'Earthwork Excavation in hard soil', unit: 'Cum', ratePct: 0.08, rate: Math.round(420 * m) }, { item: 'PCC M10 in foundation and plinth', unit: 'Cum', ratePct: 0.10, rate: Math.round(6200 * m) }, { item: 'RCC M25 in columns beams slabs', unit: 'Cum', ratePct: 0.24, rate: Math.round(9500 * m) }, { item: 'TMT Steel Fe500D reinforcement bars', unit: 'MT', ratePct: 0.20, rate: Math.round(67000 * m) }, { item: 'Brick Masonry in CM 1:6 for walls', unit: 'Cum', ratePct: 0.21, rate: Math.round(6000 * m) }, { item: 'Cement Plastering 12mm CM 1:4', unit: 'Sqm', ratePct: 0.17, rate: Math.round(400 * m) }];
}
return template.map(item => {
const itemBudget = Math.round(targetCost * item.ratePct);
const quantity = Math.max(1, Math.round(itemBudget / item.rate));
const amount = quantity * item.rate;
return { item: item.item, unit: item.unit, quantity, rate: item.rate, amount, aiRate: Math.round(item.rate * 0.85) };
});
}

function extractRupeeAmount(text) {
const match = (text || '').match(/Rs\.?\s*([\d,]+(?:\.\d+)?)/i);
if (match) { const num = parseFloat(match[1].replace(/,/g, '')); if (num > 100000) return num; }
return 0;
}

const KNOWN_UNITS = ['cum', 'sqm', 'rm', 'nos', 'mt', 'kg', 'ltr', 'ls', 'set', 'rmt', 'sqft', 'cft', 'mtr', 'unit', 'job', 'lot', 'month', 'day', 'hr', 'ton', 'quintal', 'bag', 'pair', 'cbo', 'each', 'no', 'num', 'per', 'point', 'trip', 'visit', 'lump', 'seat', 'sq.m', 'rs/kg', 'm', 'mm', 'shift', 'mtr.', 'nos.', 'set.', 'sqm.', 'rmt.', 'each.'];
const SUMMARY_KEYWORDS = ['estimated cost', 'contractors rebate', "contractor's rebate", 'gst 18', 'contract sum', 'contingency', 'contract cost', 'water charges', 'sewerage charges', 'supervision charges', 'total project cost', 'project cost', 'cost after rebate', 'physical contingency', 'cost contingency', 'grand total', 'net amount', 'taxable amount', 'total amount in rs'];
const UNIT_PATTERNS = ['Sqm', 'Cum', 'Rmt', 'Nos', 'MT', 'Kg', 'Ltr', 'Mtr', 'Each', 'Set', 'Ls', 'Rm', 'Sqft', 'Cft', 'Job', 'Lot', 'Bag', 'Ton'];

function isUnit(val) {
if (!val) return false;
const v = val.toLowerCase().trim().replace(/\./g, '');
return KNOWN_UNITS.includes(v) || KNOWN_UNITS.includes(val.toLowerCase().trim());
}

function parseNumber(val) {
if (!val) return 0;
return parseFloat(val.toString().replace(/,/g, '').replace(/Rs/gi, '').trim()) || 0;
}

function isDescriptionText(val) {
if (!val) return false;
const v = val.trim();
if (v.length < 4) return false;
if (/^\d+(\.\d+)?$/.test(v)) return false;
if (isUnit(v)) return false;
return /[a-zA-Z]/.test(v) && v.length > 4;
}

function isHeaderRepeatRow(row) {
const rowLower = row.map(v => (v || '').toLowerCase().trim());
const hasDesc = rowLower.some(v => v.includes('description'));
const hasSrNo = rowLower.some(v => v.includes('sr.no') || v.includes('sr no'));
const hasQtyOrAmount = rowLower.some(v => v.includes('qty') || v.includes('quantity') || v.includes('amount'));
return (hasDesc && (hasSrNo || hasQtyOrAmount));
}

function isNoteRow(row) {
const firstCell = (row[0] || '').toLowerCase().trim();
const rowStr = row.join(' ').toLowerCase().trim();
return firstCell.startsWith('note') || rowStr.startsWith('note:') || rowStr.startsWith('note ');
}

function isSummaryRow(row) {
const rowStr = row.join(' ').toLowerCase().trim();
return SUMMARY_KEYWORDS.some(keyword => rowStr.includes(keyword));
}

function isMeasurementSheetTable(rows) {
for (let i = 0; i < Math.min(rows.length, 5); i++) {
if (!Array.isArray(rows[i])) continue;
const rl = rows[i].map(v => (v || '').toLowerCase());
if (rl.some(v => v.includes('length')) && rl.some(v => v.includes('width')) && rl.some(v => v.includes('height'))) return true;
}
return false;
}

function detectHeader(rows) {
for (let i = 0; i < Math.min(rows.length, 15); i++) {
const row = rows[i];
if (!Array.isArray(row)) continue;
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
if (qtyCol === -1 && rateCol !== -1 && amountCol !== -1 && amountCol > rateCol + 1) qtyCol = rateCol + 1;
console.log(`Header detected: desc=${descCol} unit=${unitCol} qty=${qtyCol} rate=${rateCol} amount=${amountCol}`);
return { headerRowIdx: i, descCol, unitCol, qtyCol, rateCol, amountCol };
}
}
return null;
}

// ============ DERIVE COLUMN ORDER FROM TABLE HEADER ============
// This is the key function — reads the table header to understand
// whether Rate comes before Qty or after, then passes this to text parser
function deriveColOrderFromTableHeader(tables) {
for (const rows of tables) {
if (!rows || rows.length === 0) continue;
const header = detectHeader(rows);
if (!header) continue;

const { qtyCol, rateCol, amountCol } = header;

// If both rate and qty columns found, determine order
if (rateCol >= 0 && qtyCol >= 0) {
const rateBeforeQty = rateCol < qtyCol;
const hasRateInPdf = rateCol >= 0;
console.log(`Column order from table header: rateCol=${rateCol} qtyCol=${qtyCol} rateBeforeQty=${rateBeforeQty}`);
return { rateBeforeQty, hasRateInPdf, isZeroRate: false };
}

// Rate found but no qty column — rate before qty (DT1 style where qty header is split)
if (rateCol >= 0 && qtyCol === -1) {
console.log(`Rate found at col ${rateCol}, qty col not found — assuming rate before qty`);
return { rateBeforeQty: true, hasRateInPdf: true, isZeroRate: false };
}

// Qty found but no rate column — zero rate BOQ
if (qtyCol >= 0 && rateCol === -1) {
console.log(`Qty found at col ${qtyCol}, no rate col — zero rate BOQ`);
return { rateBeforeQty: false, hasRateInPdf: false, isZeroRate: true };
}
}

// Default: standard format qty before rate
console.log('No table header found for col order — using default: qty before rate');
return { rateBeforeQty: false, hasRateInPdf: true, isZeroRate: false };
}

function parseTableClean(rows, stateMultiplier) {
const header = detectHeader(rows);
if (!header) { console.log(' -> No header found'); return []; }
const { headerRowIdx, descCol, unitCol, qtyCol, rateCol, amountCol } = header;
if (descCol === -1 || (rateCol === -1 && amountCol === -1)) { console.log(' -> Skipped: missing columns'); return []; }

const boqItems = [];
let pendingDescription = '';
let parentDescription = '';
const m = stateMultiplier || 1.0;

for (let i = headerRowIdx + 1; i < rows.length; i++) {
const row = rows[i];
if (!row || !Array.isArray(row) || row.length === 0) continue;
if (isSummaryRow(row)) { console.log(` -> Summary row at ${i}, stopping`); break; }
if (isNoteRow(row)) continue;
if (isHeaderRepeatRow(row)) continue;

const desc = descCol >= 0 && descCol < row.length ? (row[descCol] || '').trim() : '';
const unit = unitCol >= 0 && unitCol < row.length ? (row[unitCol] || '').trim() : '';
const qty = parseNumber(qtyCol >= 0 && qtyCol < row.length ? row[qtyCol] : '');
const rate = parseNumber(rateCol >= 0 && rateCol < row.length ? row[rateCol] : '');
const amount = parseNumber(amountCol >= 0 && amountCol < row.length ? row[amountCol] : '');
const hasNumericData = rate > 0 || amount > 0;
const firstCell = (row[0] || '').trim();
const isSubItem = /^[A-Za-z]$/.test(firstCell);
const isMainItem = /^\d+$/.test(firstCell);

if (hasNumericData) {
let finalDesc = isSubItem
? (parentDescription ? `${parentDescription} (${desc || firstCell})` : (desc || firstCell))
: (pendingDescription || desc);
if (isMainItem && (pendingDescription || desc)) parentDescription = pendingDescription || desc;
if (!finalDesc || finalDesc.length < 3 || !isDescriptionText(finalDesc)) {
const alt = row.find(v => isDescriptionText(v || '') && (v || '').length > 5);
if (alt) finalDesc = alt;
}
if (finalDesc && finalDesc.length > 3 && isDescriptionText(finalDesc)) {
let fQty = qty, fRate = rate, fAmount = amount, fUnit = unit || 'Nos';
if (fAmount === 0 && fQty > 0 && fRate > 0) fAmount = Math.round(fQty * fRate * 100) / 100;
if (fQty === 0 && fRate > 0 && fAmount > 0) fQty = Math.round((fAmount / fRate) * 100) / 100;
if (fRate === 0 && fQty > 0 && fAmount > 0) fRate = Math.round(fAmount / fQty);
const aiRate = classifyAndEstimate(finalDesc, fUnit, fRate, m);
boqItems.push({ item: finalDesc.substring(0, 300), unit: fUnit.toUpperCase(), quantity: Math.round(fQty * 100) / 100, rate: Math.round(fRate * 100) / 100, amount: Math.round(fAmount * 100) / 100, aiRate, needsRate: false });
}
if (!isSubItem) pendingDescription = '';
} else if (desc && isDescriptionText(desc)) {
if (isMainItem || (!isSubItem && !pendingDescription)) { pendingDescription = desc; parentDescription = desc; }
else { pendingDescription += ' ' + desc; }
} else if (!desc && !hasNumericData) {
const anyDesc = row.find((v, idx) => idx !== 0 && isDescriptionText(v || '') && (v || '').length > 10);
if (anyDesc && !isSubItem) {
if (pendingDescription) pendingDescription += ' ' + anyDesc;
else { pendingDescription = anyDesc; parentDescription = anyDesc; }
}
}
}

console.log(` -> Table parser found ${boqItems.length} items`);
return boqItems;
}

function extractNumbersFromLine(line) {
const matches = (line || '').match(/[\d,]+\.?\d*/g) || [];
return matches.map(m => parseFloat(m.replace(/,/g, ''))).filter(n => !isNaN(n) && n > 0);
}

function findUnitInLine(line) {
for (const u of UNIT_PATTERNS) {
const match = (line || '').match(new RegExp(`\\b${u}\\b`, 'i'));
if (match) return { unit: u.toUpperCase(), startIdx: match.index, endIdx: match.index + match[0].length };
}
return null;
}

// ============ NUMBER ASSIGNMENT USING TABLE COLUMN ORDER ============
function assignNumbers(nums, colOrder) {
if (!nums || nums.length === 0) return { qty: 0, rate: 0, amount: 0 };

// Zero rate BOQ explicitly detected — last number is total qty
if (colOrder.isZeroRate) {
return { qty: nums[nums.length - 1], rate: 0, amount: 0 };
}

if (nums.length === 1) return { qty: nums[0], rate: 0, amount: 0 };

if (nums.length === 2) {
if (colOrder.rateBeforeQty) return { qty: nums[1], rate: nums[0], amount: 0 };
return { qty: nums[0], rate: nums[1], amount: 0 };
}

if (nums.length >= 3) {
// Try column-order-based assignment first
let qty, rate, amount;
if (colOrder.rateBeforeQty) {
// DT1 style: rate first, qty second, amount last
rate = nums[0]; qty = nums[1]; amount = nums[nums.length - 1];
} else {
// Standard style: qty first, rate second, amount last
qty = nums[0]; rate = nums[1]; amount = nums[nums.length - 1];
}

// Validate: qty * rate should ≈ amount
if (qty > 0 && rate > 0 && amount > 0) {
if (Math.abs(qty * rate - amount) / (amount + 1) < 0.25) {
return { qty, rate, amount };
}
}

// Validation failed — try all combinations
for (let qi = 0; qi < nums.length - 1; qi++) {
for (let ri = qi + 1; ri < nums.length; ri++) {
for (let ai = ri + 1; ai < nums.length; ai++) {
if (Math.abs(nums[qi] * nums[ri] - nums[ai]) / (nums[ai] + 1) < 0.20) {
return { qty: nums[qi], rate: nums[ri], amount: nums[ai] };
}
}
}
}

// No combination validates — means rate/amount columns are empty (building BOQ style)
// Tower1, Tower2, Tower3, TotalQty pattern — last number is total qty
if (nums.length >= 4) {
console.log(`No qty*rate=amount match for ${nums.length} numbers — taking last as total qty`);
return { qty: nums[nums.length - 1], rate: 0, amount: 0 };
}

// 3 numbers, no validation — use column order as-is
if (colOrder.rateBeforeQty) {
return { qty: nums[1], rate: nums[0], amount: nums[2] };
}
return { qty: nums[0], rate: nums[1], amount: nums[2] };
}

return { qty: 0, rate: 0, amount: 0 };
}



if (nums.length >= 3) {
// Try column-order-based assignment first
let qty, rate, amount;
if (colOrder.rateBeforeQty) {
rate = nums[0]; qty = nums[1]; amount = nums[nums.length - 1];
} else {
qty = nums[0]; rate = nums[1]; amount = nums[nums.length - 1];
}

// Validate: qty * rate should ≈ amount
if (qty > 0 && rate > 0 && amount > 0) {
if (Math.abs(qty * rate - amount) / (amount + 1) < 0.25) {
return { qty, rate, amount };
}
}

// Column order didn't validate — try all combinations
for (let qi = 0; qi < nums.length - 1; qi++) {
for (let ri = qi + 1; ri < nums.length; ri++) {
for (let ai = ri + 1; ai < nums.length; ai++) {
if (Math.abs(nums[qi] * nums[ri] - nums[ai]) / (nums[ai] + 1) < 0.20) {
return { qty: nums[qi], rate: nums[ri], amount: nums[ai] };
}
}
}
}

// No validation match — use column order as-is
if (colOrder.rateBeforeQty) {
return { qty: nums[1] || 0, rate: nums[0], amount: nums[nums.length - 1] };
}
return { qty: nums[0], rate: nums[1] || 0, amount: nums[nums.length - 1] };
}

return { qty: 0, rate: 0, amount: 0 };
}

function isNewBoqItem(line) {
const srNoMatch = line.match(/^(\d{1,3}(?:\.\d{1,2})?)\s+(.+)/);
if (!srNoMatch) return null;
const srNo = parseFloat(srNoMatch[1]);
const rest = srNoMatch[2].trim();
if (srNo < 1 || srNo > 500) return null;
if (!/[a-zA-Z]{4,}/.test(rest)) return null;
const unitPos = findUnitInLine(rest);
if (!unitPos) return null;
const afterUnit = rest.substring(unitPos.endIdx);
const numsAfterUnit = (afterUnit.match(/[\d,]+\.?\d*/g) || [])
.map(s => parseFloat(s.replace(/,/g, '')))
.filter(n => n > 0 && n < 100000000);
if (numsAfterUnit.length < 2) return null;
return {
srNo,
desc: rest.substring(0, unitPos.startIdx).trim() || rest,
unit: unitPos.unit,
nums: numsAfterUnit
};
}

function cleanDesc(desc) {
return desc.replace(/^[A-Z0-9]{2,}-[A-Z0-9]+-?[A-Z0-9-]*/g, '').replace(/\s+/g, ' ').trim().substring(0, 300);
}

function parseBoqFromText(pages, stateMultiplier, colOrder) {
const items = [];
const allText = pages.join('\n');
const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
const m = stateMultiplier || 1.0;
console.log(`Text parser: ${pages.length} pages, ${lines.length} lines | colOrder: rateFirst=${colOrder.rateBeforeQty} zeroRate=${colOrder.isZeroRate}`);

const STOP_KEYWORDS = ['estimated cost', 'grand total', 'contingency', 'supervision charges', 'total project cost'];
const SKIP_STARTS = ['drk office', 'security room', 'pump room', 'rest room', 'prayer hall', 'wood storage', 'washing area', 'fire escape', 'lift lobby'];

let currentItem = null;

const saveCurrentItem = () => {
if (!currentItem || currentItem.desc.length < 5) { currentItem = null; return; }
const parsed = assignNumbers(currentItem.nums, colOrder);
if (parsed && parsed.qty > 0) {
if (parsed.rate === 0 && parsed.amount > 0 && parsed.qty > 0) {
parsed.rate = Math.round(parsed.amount / parsed.qty);
}
const aiRate = classifyAndEstimate(currentItem.desc, currentItem.unit, parsed.rate, m);
items.push({
item: cleanDesc(currentItem.desc),
unit: currentItem.unit,
quantity: Math.round(parsed.qty * 100) / 100,
rate: Math.round(parsed.rate * 100) / 100,
amount: Math.round(parsed.amount * 100) / 100,
aiRate,
needsRate: false
});
}
currentItem = null;
};

for (let i = 0; i < lines.length; i++) {
const line = lines[i];
const lineLower = line.toLowerCase();

if (STOP_KEYWORDS.some(k => lineLower.includes(k))) { saveCurrentItem(); continue; }
if (lineLower.includes('length') && lineLower.includes('width') && lineLower.includes('height')) continue;
if (SKIP_STARTS.some(k => lineLower.startsWith(k))) continue;
if (lineLower.startsWith('say ') || lineLower === 'say') continue;
if (line.match(/^[\d\s.,]+$/) && line.trim().split(/\s+/).length <= 5) continue;

const newItem = isNewBoqItem(line);
if (newItem) {
saveCurrentItem();
currentItem = { srNo: newItem.srNo, desc: newItem.desc, unit: newItem.unit, nums: newItem.nums };
continue;
}

if (currentItem) {
if (lineLower.includes('sr.no') || lineLower.includes('description') ||
lineLower.includes('amount') || lineLower.includes('page no') ||
lineLower.includes('bill of quantities')) continue;
if (isDescriptionText(line) && !/^\d+\s*$/.test(line)) {
currentItem.desc += ' ' + line;
}
}
}
saveCurrentItem();

console.log(`Text parser found ${items.length} items`);
return items;
}

function validateItems(items) {
if (items.length === 0) return 0;
return items.filter(it => it.quantity > 0 && it.quantity < 9999999).length;
}

function extractTablesWithPdfplumber(pdfPath) {
return new Promise((resolve, reject) => {
const py = spawn('python3', [path.join(process.cwd(), 'extract.py'), pdfPath]);
let stdout = '';
let stderr = '';
py.stdout.on('data', (data) => { stdout += data.toString(); });
py.stderr.on('data', (data) => { stderr += data.toString(); });
py.on('close', (code) => {
if (code !== 0) { console.log('Python error:', stderr.substring(0, 300)); reject(new Error('PDF extraction failed')); return; }
try { resolve(JSON.parse(stdout)); }
catch (e) { reject(new Error('Failed to parse extraction output')); }
});
py.on('error', (err) => { reject(new Error('Failed to start Python: ' + err.message)); });
});
}

function processExtracted(extracted, stateMultiplier) {
const m = stateMultiplier || 1.0;
let tableItems = [];
let textItems = [];
let tenderValue = 0;

const tables = extracted && extracted.tables ? extracted.tables : (Array.isArray(extracted) ? extracted : []);

// STEP 1: Derive column order from table header (works even if table parser can't extract all items)
const colOrder = deriveColOrderFromTableHeader(tables);
console.log(`Using column order: rateBeforeQty=${colOrder.rateBeforeQty} isZeroRate=${colOrder.isZeroRate}`);

// STEP 2: Run table parser
if (tables.length > 0) {
const headerTableIndices = [];
for (let t = 0; t < tables.length; t++) {
const rows = tables[t];
if (!rows || rows.length === 0) continue;
const hasBoqHeader = rows.some(row => {
if (!Array.isArray(row)) return false;
const rl = row.map(v => (v || '').toLowerCase());
return rl.some(v => v.includes('description') || v.includes('particulars')) &&
rl.some(v => v.includes('qty') || v.includes('quantity') || v.includes('rate') || v.includes('amount'));
});
if (hasBoqHeader) headerTableIndices.push(t);
for (const row of rows) {
if (!Array.isArray(row)) continue;
for (const val of row) {
const amount = extractRupeeAmount(val || '');
if (amount > tenderValue) tenderValue = amount;
}
}
}

console.log(`Found ${headerTableIndices.length} BOQ header tables`);

for (let hi = 0; hi < headerTableIndices.length; hi++) {
const startIdx = headerTableIndices[hi];
const endIdx = hi + 1 < headerTableIndices.length ? headerTableIndices[hi + 1] : tables.length;
let combinedRows = [...tables[startIdx]];
for (let t = startIdx + 1; t < endIdx; t++) {
if (!tables[t] || tables[t].length === 0) continue;
if (!Array.isArray(tables[t][0])) continue;
if (isMeasurementSheetTable(tables[t])) continue;
combinedRows = combinedRows.concat(tables[t]);
}
console.log(`BOQ section ${hi + 1}: ${combinedRows.length} combined rows`);
const items = parseTableClean(combinedRows, m);
tableItems = tableItems.concat(items);
console.log(` -> Got ${items.length} items from BOQ section ${hi + 1}`);
}
console.log(`Table parser total: ${tableItems.length} items`);
}

// STEP 3: Run text parser WITH column order from table header
if (extracted && extracted.pages && extracted.pages.length > 0) {
for (const page of extracted.pages) {
const match = page.match(/(?:Total Amount|Estimated Cost)[^\d]*([\d,]+(?:\.\d+)?)/i);
if (match) { const val = parseFloat(match[1].replace(/,/g, '')); if (val > tenderValue) tenderValue = val; }
}
textItems = parseBoqFromText(extracted.pages, m, colOrder);
console.log(`Text parser total: ${textItems.length} items`);
}

// STEP 4: Pick winner
const tableValid = validateItems(tableItems);
const textValid = validateItems(textItems);
console.log(`Validation — Table: ${tableValid}/${tableItems.length} | Text: ${textValid}/${textItems.length}`);

let boqItems = [];
if (tableValid === 0 && textValid === 0) {
boqItems = tableItems.length >= textItems.length ? tableItems : textItems;
} else if (textValid > tableValid) {
console.log(`Winner: text parser`);
boqItems = textItems;
} else {
console.log(`Winner: table parser`);
boqItems = tableItems;
}

const estimatedCost = boqItems.reduce((sum, item) => sum + (item.amount || 0), 0);
if (boqItems.length > 0) return { extractionSuccess: true, boqItems, tenderValue: estimatedCost > 0 ? estimatedCost : tenderValue };
return { extractionSuccess: false, boqItems: [], tenderValue };
}

async function getBidReason(type, deptEstimate, profitMargin, state) {
try {
const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
method: 'POST', headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ contents: [{ parts: [{ text: `One sentence bid recommendation for ${state || 'India'} ${type} tender worth Rs ${deptEstimate} with ${profitMargin}% profit margin.` }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 100 } }),
signal: AbortSignal.timeout(8000)
});
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
let selectedState = 'Maharashtra';
const typeMatch = bodyStr.match(/name="tenderType"\r\n\r\n([^\r\n]+)/);
const titleMatch = bodyStr.match(/name="tenderTitle"\r\n\r\n([^\r\n]+)/);
const stateMatch = bodyStr.match(/name="state"\r\n\r\n([^\r\n]+)/);
if (typeMatch) tenderType = typeMatch[1];
if (titleMatch) tenderTitle = titleMatch[1];
if (stateMatch) selectedState = stateMatch[1];
console.log('Type:', tenderType, '| State:', selectedState, '| Title:', tenderTitle.substring(0, 50));

const stateMultiplier = getStateMultiplier(selectedState);
tempPdfPath = path.join(os.tmpdir(), `boq_${Date.now()}.pdf`);
fs.writeFileSync(tempPdfPath, pdfBuffer);

console.log('Extracting with pdfplumber...');
const extracted = await extractTablesWithPdfplumber(tempPdfPath);
const parsed = processExtracted(extracted, stateMultiplier);

console.log('Result - success:', parsed.extractionSuccess, 'items:', parsed.boqItems?.length, 'value:', parsed.tenderValue);

let deptEstimate = parsed.tenderValue > 0 ? parsed.tenderValue : 5000000;
let boqItems = [];
let pdfRead = false;
let dataSource = 'estimation';

if (parsed.extractionSuccess && parsed.boqItems?.length > 0) {
boqItems = parsed.boqItems;
pdfRead = true;
dataSource = 'actual_pdf';
} else {
boqItems = generateEstimatedBOQ(tenderType, deptEstimate, stateMultiplier);
dataSource = parsed.tenderValue > 100000 ? 'pdf_value_estimated_boq' : 'estimation';
}

const executionCost = boqItems.reduce((sum, item) => sum + (item.quantity * (item.aiRate || item.rate || 0)), 0);
const expectedWinningBid = Math.round(deptEstimate * 0.92);
const expectedProfit = expectedWinningBid - executionCost;
const profitMargin = expectedWinningBid > 0 ? Math.round((expectedProfit / expectedWinningBid) * 100) : 0;
const defaults = getDefaultsForType(tenderType);
const bidReason = await getBidReason(tenderType, deptEstimate, profitMargin, selectedState);

const needsRateCount = boqItems.filter(it => it.needsRate).length;
const message = pdfRead
? `BOQ extracted from PDF - ${boqItems.length} items found${needsRateCount > 0 ? ` (${needsRateCount} need rate input)` : ''}`
: parsed.tenderValue > 100000
? `Tender value Rs ${(parsed.tenderValue / 10000000).toFixed(2)} Cr extracted - BOQ estimated using ${selectedState} market rates`
: `BOQ estimated using ${selectedState} market rates`;

res.writeHead(200, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({
success: true,
boq: {
dataSource, departmentEstimate: deptEstimate, expectedWinningBid, executionCost,
expectedProfit, profitMargin, workingCapitalNeeded: Math.round(executionCost * 0.3),
raCycleDays: 60, selectedState,
bidRecommendation: profitMargin >= 10 ? 'YES' : profitMargin >= 7 ? 'REVIEW' : 'NO',
bidRecommendationReason: bidReason || `${profitMargin}% margin on ${tenderType} tender`,
boqItems, materialCost: Math.round(executionCost * 0.45), labourCost: Math.round(executionCost * 0.25),
equipmentCost: Math.round(executionCost * 0.15), overheadCost: Math.round(executionCost * 0.10),
contingency: Math.round(executionCost * 0.05), keyMaterials: defaults.keyMaterials,
majorEquipment: defaults.majorEquipment, executionDays: defaults.executionDays, riskFactors: defaults.riskFactors,
},
pdfRead, message
}));

} catch (error) {
console.log('Upload error:', error.message);
res.writeHead(500); res.end(JSON.stringify({ error: 'Upload failed', details: String(error.message) }));
} finally {
if (tempPdfPath && fs.existsSync(tempPdfPath)) { try { fs.unlinkSync(tempPdfPath); } catch (e) {} }
}
return;
}

res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
});
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
console.log(`BOQ service running on port ${PORT}`);
setInterval(() => { console.log('keep-alive ping'); }, 840000);
});

