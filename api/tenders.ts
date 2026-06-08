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
'rehabilitation', 'improvement of'
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
if (t.includes('road') || t.includes('highway') || t.includes('bridge') ||
t.includes('flyover') || t.includes('pavement') || t.includes('bitumen') ||
t.includes('asphalt') || t.includes('footpath') || t.includes('resurfacing') ||
t.includes('kerb') || t.includes('divider')) return 'Roads & Infrastructure';
if (t.includes('sewer') || t.includes('drain') || t.includes('sewage') ||
t.includes('nala') || t.includes('storm water') || t.includes('desilting') ||
t.includes('pumping') || t.includes('penstock') || t.includes('anti-flood')) return 'Sewerage';
if (t.includes('sanit') || t.includes('toilet') || t.includes('water supply') ||
t.includes('water main') || t.includes('water pipe') || t.includes('hydraulic') ||
t.includes('pipeline') || t.includes('pump house') || t.includes('valve')) return 'Sanitary';
return 'Civil';
}

function detectRisk(title: string): string {
const t = title.toLowerCase();
if (t.includes('major') || t.includes('construction of') || t.includes('bridge') ||
t.includes('reconstruction')) return 'high';
if (t.includes('repair') || t.includes('maintenance') || t.includes('minor') ||
t.includes('providing and fixing') || t.includes('overhauling')) return 'low';
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

// Find all table rows using a more robust approach
// Split by <tr and process each chunk
const trParts = html.split(/<tr[\s>]/i);

for (let i = 1; i < trParts.length; i++) {
const rowHtml = trParts[i];

// Extract all TD contents
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

// Skip header rows
if (dept === 'Department Name' || dept === '' ) continue;

// Extract first anchor link (the main tender PDF)
const anchorMatch = cell1.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
if (!anchorMatch) continue;

const pdfUrl = anchorMatch[1] || '';
const title = stripHtml(anchorMatch[2]);

if (!title || title.length < 10) continue;

// Fix and parse closing date
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
