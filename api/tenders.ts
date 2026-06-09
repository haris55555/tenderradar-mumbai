import type { VercelRequest, VercelResponse } from '@vercel/node';

const EXCLUDE_KEYWORDS = [
'spare parts', 'spare part', 'battery', 'batteries', 'tyre', 'tyres',
'furniture', 'computer', 'laptop', 'printer', 'stationery', 'paper',
'uniform', 'garment', 'cloth', 'boot', 'shoe',
'catering', 'food', 'canteen', 'refreshment',
'security guard', 'housekeeping', 'sweeping',
'pest control', 'rat', 'cockroach',
'insurance', 'audit', 'legal', 'consultancy',
'software', 'it service', 'website',
'supply of material', 'supply of goods', 'purchase of',
'procurement of goods', 'rate contract for supply',
'ambulance', 'motor vehicle',
'oxygen', 'medicine', 'drug',
'advertisement', 'hording',
'biometric',
'telephone', 'mobile', 'sim card',
'boat', 'vessel', 'motor boat',
'xerox', 'photocopy', 'franking',
'shroud', 'godhari', 'draw sheet',
'laparoscopy', 'reagent', 'forceps',
'ultrasonic suction', 'duodenoscope',
'blood culture', 'autoanalyzer',
'data entry operator',
'nursing college', 'medical college',
'walky talky', 'metal detector',
'umbrella', 'raincoat', 'school bag',
'canvas shoes', 'notebook', 'stationery'
];

const CONSTRUCTION_KEYWORDS = [
'civil work', 'civil works', 'construction of', 'reconstruction of',
'repair of', 'repair and', 'repairing of', 'repairing and',
'road work', 'road works', 'resurfacing', 'bituminous',
'drain', 'drainage', 'sewer', 'sewerage', 'sewage',
'storm water', 'nala', 'stormwater',
'water supply', 'water main', 'water pipe', 'pipeline',
'footpath', 'pavement', 'kerb', 'divider',
'bridge', 'culvert', 'retaining wall',
'building work', 'structural', 'foundation',
'concrete', 'rcc', 'plastering', 'waterproofing',
'manhole', 'chamber', 'gutter',
'pumping station', 'pump house', 'dewatering pump',
'penstock', 'sluice', 'valve pit',
'garden', 'park development', 'playground',
'street light', 'streetlight', 'road light',
'providing and fixing',
'providing fabricated',
'allied work', 'allied works',
'maintenance of road', 'maintenance of drain',
'maintenance of sewer', 'maintenance of building',
'overhauling', 'renovation of',
'demolition', 'dismantling',
'earthwork', 'excavation', 'filling',
'departmental dewatering',
'anti-flooding', 'anti flooding',
'modak sagar', 'vihar lake', 'tulsi lake',
'hydraulic', 'water works',
'lift', 'elevator', 'escalator',
'horticulture', 'tree trimming', 'pruning',
'cemetery', 'crematorium',
'swimming pool',
'fire station',
'staff quarter', 'quarters',
'compound wall', 'boundary wall',
'flooring', 'tiling',
'painting', 'whitewashing',
'electrical work', 'wiring', 'electrification',
'plumbing', 'sanitary work',
'refurbishment', 'upgradation',
'fabrication', 'installation',
'sitc',
'rewinding', 'overhauling of pump',
'desilting', 'cleaning of sewer',
'outfall', 'floodgate', 'penstock gate',
'weighbridge', 'weigh bridge',
'air pollution control',
'solar', 'led light',
'fire alarm', 'fire safety',
'water tank', 'overhead tank',
'municipal', 'ward office',
'maternity home', 'dispensary work',
'laying', 'replacement of',
'rehabilitation', 'improvement of',
'rodding', 'jetting', 'suction',
'induction motor', 'submersible pump',
'mcc panel', 'lt panel', 'ht panel',
'scada', 'telemetry',
'gate valve', 'butterfly valve',
'water treatment', 'filtration',
'chlorination', 'dosing',
];

function isConstructionTender(title: string): boolean {
const t = title.toLowerCase();
const excluded = EXCLUDE_KEYWORDS.some(k => t.includes(k));
if (excluded) return false;
return CONSTRUCTION_KEYWORDS.some(k => t.includes(k));
}

function fixBMCDate(deadline: string): string {
if (!deadline || deadline === 'Check Portal') return deadline;
let fixed = deadline.replace(/(\d{2})\s+(\w+),?\s+(\d{4})\d+/g, (_match, day, month, year) => `${day} ${month}, ${year.substring(0, 4)}`);
fixed = fixed.replace(/(\d{4})\d{4,8}$/, '$1').trim();
return fixed;
}

function cleanDeadline(deadline: string): string {
if (!deadline || deadline === 'Check Portal') return 'Check Portal';
const cleaned = fixBMCDate(deadline);
try {
const date = new Date(cleaned);
if (!isNaN(date.getTime())) {
const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
if (days < 0) return 'Expired';
if (days === 0) return 'Today';
if (days === 1) return 'Tomorrow';
return `${days} days`;
}
} catch {}
return cleaned;
}

function isExpired(deadline: string): boolean {
if (!deadline) return false;
const cleaned = fixBMCDate(deadline);
try {
const date = new Date(cleaned);
if (!isNaN(date.getTime())) return date < new Date();
} catch {}
return false;
}

function detectType(title: string): string {
const t = title.toLowerCase();

// Roads & Infrastructure — check first as most specific
if (t.includes('road') || t.includes('highway') || t.includes('bridge') ||
t.includes('flyover') || t.includes('pavement') || t.includes('bitumen') ||
t.includes('asphalt') || t.includes('footpath') || t.includes('resurfacing') ||
t.includes('kerb') || t.includes('divider') || t.includes('traffic signal') ||
t.includes('street light') || t.includes('streetlight') || t.includes('road light') ||
t.includes('culvert') || t.includes('retaining wall') || t.includes('rub ')) {
return 'Roads & Infrastructure';
}

// Sewerage — sewer, drain, storm water
if (t.includes('sewer') || t.includes('sewage') || t.includes('sewerage') ||
t.includes('nala') || t.includes('storm water') || t.includes('stormwater') ||
t.includes('desilting') || t.includes('penstock') || t.includes('anti-flood') ||
t.includes('anti flooding') || t.includes('outfall') || t.includes('floodgate') ||
t.includes('drain') || t.includes('drainage') || t.includes('manhole') ||
t.includes('rodding') || t.includes('jetting machine') || t.includes('suction machine') ||
t.includes('pumping station') || t.includes('main sewer') || t.includes('swd')) {
return 'Sewerage';
}

// Water Supply / Sanitary
if (t.includes('water supply') || t.includes('water main') || t.includes('water pipe') ||
t.includes('water mains') || t.includes('hydraulic') || t.includes('pipeline') ||
t.includes('pump house') || t.includes('valve') || t.includes('water tank') ||
t.includes('overhead tank') || t.includes('water treatment') || t.includes('bhandup') ||
t.includes('modak sagar') || t.includes('vihar') || t.includes('tulsi') ||
t.includes('panjrapur') || t.includes('pise') || t.includes('water works') ||
t.includes('chlorin') || t.includes('dosing') || t.includes('filtration') ||
t.includes('booster pump') || t.includes('submersible pump') || t.includes('induction motor') ||
t.includes('mcc panel') || t.includes('scrapper') || t.includes('settling') ||
t.includes('pretreator') || t.includes('providing, laying') || t.includes('laying/replacement') ||
t.includes('dia. water') || t.includes('water main') || t.includes('laying of') ||
t.includes('sluice valve') || t.includes('butterfly valve') || t.includes('gate valve') ||
t.includes('scada') || t.includes('telemetry') || t.includes('he-c-ws') ||
t.includes('he-c-ww') || t.includes('water supply improvement')) {
return 'Sanitary';
}

// Electrical & Mechanical
if (t.includes('electrical') || t.includes('electrification') || t.includes('wiring') ||
t.includes('lt panel') || t.includes('ht panel') || t.includes('dg set') ||
t.includes('generator') || t.includes('transformer') || t.includes('substation') ||
t.includes('rewinding') || t.includes('motor') || t.includes('pump set') ||
t.includes('air conditioning') || t.includes(' ac ') || t.includes('hvac') ||
t.includes('lift') || t.includes('elevator') || t.includes('escalator') ||
t.includes('fire alarm') || t.includes('fire safety') || t.includes('sprinkler') ||
t.includes('cctv') || t.includes('solar') || t.includes('led') ||
t.includes('air pollution control') || t.includes('apc system') ||
t.includes('sitc') || t.includes('weigh bridge') || t.includes('weighbridge')) {
return 'Electrical & Mechanical';
}

// Building & Civil Works
if (t.includes('building') || t.includes('construction') || t.includes('rcc') ||
t.includes('concrete') || t.includes('plastering') || t.includes('waterproofing') ||
t.includes('flooring') || t.includes('tiling') || t.includes('painting') ||
t.includes('compound wall') || t.includes('boundary wall') || t.includes('refurbishment') ||
t.includes('renovation') || t.includes('repair') || t.includes('maintenance') ||
t.includes('cemetery') || t.includes('crematorium') || t.includes('hospital work') ||
t.includes('ward office') || t.includes('maternity home') || t.includes('fire station') ||
t.includes('staff quarter') || t.includes('swimming pool') || t.includes('garden') ||
t.includes('park') || t.includes('playground') || t.includes('earthwork') ||
t.includes('excavation') || t.includes('demolition') || t.includes('dismantling') ||
t.includes('fabrication') || t.includes('installation') || t.includes('shed')) {
return 'Civil';
}

return 'Civil';
}

function detectRisk(title: string): string {
const t = title.toLowerCase();
if (t.includes('construction of') || t.includes('bridge') ||
t.includes('reconstruction') || t.includes('major') ||
t.includes('new construction') || t.includes('large diameter') ||
t.includes('900 mm') || t.includes('1200mm') || t.includes('750mm')) return 'high';
if (t.includes('repair') || t.includes('maintenance') || t.includes('minor') ||
t.includes('providing and fixing') || t.includes('overhauling') ||
t.includes('annual maintenance') || t.includes('servicing') ||
t.includes('cleaning') || t.includes('desilting')) return 'low';
return 'medium';
}

function stripHtml(html: string): string {
return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

let cachedTenders: any[] = [];
let cacheTime = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000;

async function fetchBMCTenders(): Promise<any[]> {
try {
const res = await fetch(
'https://portal.mcgm.gov.in/irj/portal/anonymous/qletenders_new?guest_user=english',
{
headers: {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Language': 'en-US,en;q=0.5',
'Referer': 'https://portal.mcgm.gov.in/',
},
signal: AbortSignal.timeout(15000),
}
);

if (!res.ok) return [];
const html = await res.text();
const tenders: any[] = [];
const today = new Date();

const trParts = html.split(/<tr[\s>]/i);

for (let i = 1; i < trParts.length; i++) {
const rowHtml = trParts[i];
const tdMatches: string[] = [];
const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
let tdMatch;
while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
tdMatches.push(tdMatch[1]);
}

if (tdMatches.length < 4) continue;

const dept = stripHtml(tdMatches[0]);
const cell1 = tdMatches[1];
const bidNo = stripHtml(tdMatches[2]);
const closingRaw = stripHtml(tdMatches[3]);

if (dept === 'Department Name' || dept === '') continue;

const anchorMatch = cell1.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
if (!anchorMatch) continue;

const pdfUrl = anchorMatch[1] || '';
const title = stripHtml(anchorMatch[2]);

if (!title || title.length < 10) continue;

const closingDate = closingRaw.replace(/\d{8}$/, '').trim();
const closingDateObj = new Date(closingDate);

if (isNaN(closingDateObj.getTime())) continue;
if (closingDateObj <= today) continue;

const fullPdfUrl = pdfUrl.startsWith('http')
? pdfUrl
: pdfUrl.startsWith('/')
? 'https://portal.mcgm.gov.in' + pdfUrl
: '';

tenders.push({
title: title.substring(0, 200),
organisation: ('BMC - ' + dept).substring(0, 100),
deadline: closingDate,
value: 'See Portal',
portal: 'BMC',
refNo: bidNo,
pdfUrl: fullPdfUrl,
url: 'https://portal.mcgm.gov.in/irj/portal/anonymous/qletenders_new?guest_user=english',
});
}

return tenders;
} catch (error) {
console.error('BMC fetch error:', error);
return [];
}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') return res.status(200).end();

try {
const now = Date.now();
if (cachedTenders.length > 0 && (now - cacheTime) < CACHE_DURATION) {
return res.status(200).json({
tenders: cachedTenders,
source: 'cache',
total: cachedTenders.length,
bmcCount: cachedTenders.length,
pwdCount: 0,
});
}

const rawTenders = await fetchBMCTenders();

const tenders = rawTenders
.filter(item => {
if (!isConstructionTender(item.title)) return false;
if (isExpired(item.deadline)) return false;
return true;
})
.map((item, i) => {
const title = item.title;
const org = item.organisation || 'BMC Mumbai';
const deadline = cleanDeadline(item.deadline || '');
const type = detectType(title);
const isUrgent = deadline === 'Today' || deadline === 'Tomorrow' ||
(deadline.includes(' days') && parseInt(deadline) <= 3);
return {
id: i + 1,
portal: 'BMC',
title,
type,
value: 'See Portal',
emd: 'See Portal',
valueNum: 5000000,
deadline,
location: 'Mumbai',
status: isUrgent ? 'urgent' : 'new',
organisation: org,
refNo: item.refNo || '',
pdfUrl: item.pdfUrl || '',
tenderUrl: item.url || '',
summary: `${title}. Organisation: ${org}. Reference: ${item.refNo || 'N/A'}. Deadline: ${deadline}.`,
docs: ['Registration Certificate', 'ITR (3 years)', 'Experience Certificate', 'GST Registration'],
risk: detectRisk(title),
};
})
.filter((t, index, self) => index === self.findIndex(other => other.title === t.title))
.filter(t => t.deadline !== 'Expired')
.slice(0, 100);

if (tenders.length > 0) {
cachedTenders = tenders;
cacheTime = now;
}

return res.status(200).json({
tenders: tenders.length > 0 ? tenders : cachedTenders,
source: 'live',
total: tenders.length,
bmcCount: tenders.length,
pwdCount: 0,
});

} catch (error) {
if (cachedTenders.length > 0) {
return res.status(200).json({
tenders: cachedTenders,
source: 'cache',
total: cachedTenders.length,
bmcCount: cachedTenders.length,
pwdCount: 0,
});
}
return res.status(500).json({ error: String(error), tenders: [], source: 'error' });
}
}
