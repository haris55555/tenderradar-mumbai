import type { VercelRequest, VercelResponse } from '@vercel/node';

const EXCLUDE_KEYWORDS = [
'spare parts', 'spare part', 'battery', 'batteries', 'vehicle', 'tyre', 'tyres',
'furniture', 'computer', 'laptop', 'printer', 'stationery', 'paper',
'uniform', 'garment', 'cloth', 'boot', 'shoe',
'catering', 'food', 'canteen', 'refreshment',
'security guard', 'housekeeping', 'sweeping',
'pest control', 'rat', 'cockroach',
'insurance', 'audit', 'legal', 'consultancy',
'software', 'hardware', 'it service', 'website',
'supply of material', 'supply of goods', 'purchase of',
'procurement of goods', 'rate contract for supply',
'ambulance', 'fire brigade vehicle', 'motor vehicle',
'medical equipment', 'oxygen', 'medicine',
'advertisement', 'printing', 'hording',
'cctv', 'camera', 'biometric',
'generator set', 'ups', 'inverter',
'air conditioner', 'ac unit', 'refrigerator',
'telephone', 'mobile', 'sim card',
'boat', 'vessel', 'motor boat'
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
'providing and fixing of safety railing',
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
'hydraulic', 'water works department'
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

// Simple in-memory cache
let cachedTenders: any[] = [];
let cacheTime = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

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

// Parse tender table from HTML
const tenders: any[] = [];
const today = new Date();

// Match table rows with tender data
const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
const rows = html.match(rowRegex) || [];

for (const row of rows) {
// Skip header rows
if (row.includes('<th') || row.includes('Department Name') || row.includes('Tender Description')) continue;

const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
const cells: string[] = [];
let cellMatch;
while ((cellMatch = cellRegex.exec(row)) !== null) {
cells.push(cellMatch[1]);
}

if (cells.length < 3) continue;

// Extract title from anchor tag
const titleMatch = cells[1]?.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
if (!titleMatch) continue;

const pdfUrl = titleMatch[1] || '';
const title = titleMatch[2].replace(/<[^>]*>/g, '').trim();

if (!title || title.length < 10) continue;

// Extract department
const dept = cells[0].replace(/<[^>]*>/g, '').trim();

// Extract bid number
const bidNo = cells[2] ? cells[2].replace(/<[^>]*>/g, '').trim() : '';

// Extract closing date
const closingRaw = cells[3] ? cells[3].replace(/<[^>]*>/g, '').trim() : '';
const closingDate = closingRaw.replace(/\d{8}$/, '').trim();

// Parse and validate date
const closingDateObj = new Date(closingDate);
if (isNaN(closingDateObj.getTime())) continue;
if (closingDateObj <= today) continue;

// Build full PDF URL
const fullPdfUrl = pdfUrl.startsWith('http')
? pdfUrl
: 'https://portal.mcgm.gov.in' + pdfUrl;

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
// Use cache if fresh
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

// Fetch fresh data
const rawTenders = await fetchBMCTenders();

const tenders = rawTenders
.filter(item => {
// if (!isConstructionTender(item.title)) return false;
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

// Update cache
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
// Return cached data on error
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
