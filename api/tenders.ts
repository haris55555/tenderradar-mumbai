import type { VercelRequest, VercelResponse } from '@vercel/node';

const APIFY_TOKEN = "apify_api_Jn12wqlpm5VlUAh2Spqkynw8vOdGX22RYrAg";
const BMC_ACTOR_ID = "YrQuEkowkNCLdk4j2";

const EXCLUDE_KEYWORDS = [
  'spare parts', 'vehicle', 'furniture', 'computer', 'uniform', 'stationery',
  'printing', 'catering', 'security guard', 'housekeeping', 'pest control',
  'insurance', 'audit', 'consultancy', 'software', 'hardware', 'electrical fittings',
  'supply of material', 'purchase of', 'procurement of', 'screen reader'
];

const INCLUDE_KEYWORDS = [
  'civil', 'construction', 'road', 'highway', 'bridge', 'flyover', 'pavement',
  'sewer', 'sewerage', 'drainage', 'drain', 'sanit', 'toilet', 'water supply',
  'plumb', 'repair', 'renovation', 'building', 'structure', 'foundation',
  'concrete', 'rcc', 'pcc', 'brickwork', 'masonry', 'flooring', 'plastering',
  'waterproof', 'earthwork', 'excavation', 'desilting', 'storm water',
  'pipeline', 'culvert', 'retaining wall', 'compound wall', 'footpath',
  'bitumen', 'asphalt', 'tar', 'pothole', 'nala', 'gutter', 'manhole',
  'pumping station', 'pump house', 'water works', 'hydraulic', 'overhauling',
  'resurfacing', 'reconstruction', 'strengthening', 'providing and fixing',
  'providing fabricated', 'departmental', 'allied work', 'maintenance of'
];

function isValidTender(title: string, org: string): boolean {
  const combined = (title + ' ' + org).toLowerCase();
  const hasExclude = EXCLUDE_KEYWORDS.some(k => combined.includes(k));
  if (hasExclude) return false;
  const hasInclude = INCLUDE_KEYWORDS.some(k => combined.includes(k));
  return hasInclude || org.toLowerCase().includes('bmc') || org.toLowerCase().includes('mcgm');
}

function detectType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('road') || t.includes('highway') || t.includes('bridge') ||
      t.includes('flyover') || t.includes('pavement') || t.includes('bitumen') ||
      t.includes('asphalt') || t.includes('footpath') || t.includes('resurfacing')) return 'Roads & Infrastructure';
  if (t.includes('sewer') || t.includes('drain') || t.includes('sewage') ||
      t.includes('nala') || t.includes('storm water') || t.includes('desilting') ||
      t.includes('pumping station') || t.includes('penstock')) return 'Sewerage';
  if (t.includes('sanit') || t.includes('toilet') || t.includes('water supply') ||
      t.includes('water main') || t.includes('water works') || t.includes('hydraulic') ||
      t.includes('pipeline') || t.includes('pump house')) return 'Sanitary';
  return 'Civil';
}

function cleanDeadline(deadline: string): string {
  if (!deadline || deadline === 'Check Portal') return 'Check Portal';
  // Fix BMC date format "30 March, 202620260330" — remove trailing 8 digits
  const cleaned = deadline.replace(/(\d{4})\d{6,8}$/, '$1').trim();
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

function detectRisk(valueNum: number): string {
  if (valueNum < 5000000) return 'low';
  if (valueNum < 20000000) return 'medium';
  return 'high';
}

interface ApifyItem {
  title?: string;
  organisation?: string;
  deadline?: string;
  value?: string;
  portal?: string;
  pdfUrl?: string;
  refNo?: string;
  url?: string;
}

async function fetchDataset(actorId: string): Promise<ApifyItem[]> {
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs/last/dataset/items?token=${APIFY_TOKEN}&limit=200`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Fetch ONLY from BMC scraper — clean data only
    const bmcData = await fetchDataset(BMC_ACTOR_ID);

    if (bmcData.length === 0) {
      return res.status(200).json({ tenders: [], source: 'sample' });
    }

    const today = new Date();

    const tenders = bmcData
      .filter((item: ApifyItem) => {
        const title = item.title || '';
        const org = item.organisation || '';

        if (title.length < 10) return false;
        if (!isValidTender(title, org)) return false;

        // Filter expired tenders
        if (item.deadline) {
          const deadlineClean = item.deadline.replace(/(\d{4})\d{6,8}$/, '$1').trim();
          const deadlineDate = new Date(deadlineClean);
          const deadlineClean2 = item.deadline.replace(/(\d{4})\d{6,8}$/, "$1").trim();
          const deadlineDate = new Date(deadlineClean2);
          if (!isNaN(deadlineDate.getTime()) && deadlineDate < today) return false;
        }

        return true;
      })
      .map((item: ApifyItem, i: number) => {
        const title = (item.title || '').substring(0, 200);
        const org = item.organisation || 'BMC Mumbai';
        const deadline = cleanDeadline(item.deadline || '');
        const type = detectType(title);
        const isUrgent = deadline === 'Today' || deadline === 'Tomorrow' ||
          (deadline.includes(' days') && parseInt(deadline) <= 3);

        // Estimate value based on work type for display
        let estimatedValue = 5000000;
        const t = title.toLowerCase();
        if (t.includes('storm water') || t.includes('sewerage')) estimatedValue = 5000000;
        else if (t.includes('road') || t.includes('footpath')) estimatedValue = 3000000;
        else if (t.includes('pump') || t.includes('pumping')) estimatedValue = 10000000;
        else if (t.includes('construction') || t.includes('building')) estimatedValue = 8000000;

        return {
          id: i + 1,
          portal: 'BMC',
          title,
          type,
          value: 'See Portal',
          emd: 'See Portal',
          valueNum: estimatedValue,
          deadline,
          location: 'Mumbai',
          status: isUrgent ? 'urgent' : 'new',
          organisation: org,
          refNo: item.refNo || '',
          pdfUrl: item.pdfUrl || '',
          tenderUrl: item.url || '',
          summary: `${title}. Organisation: ${org}. Reference: ${item.refNo || 'N/A'}. Deadline: ${deadline}.`,
          docs: ['Registration Certificate', 'ITR (3 years)', 'Experience Certificate', 'GST Registration'],
          risk: detectRisk(estimatedValue),
        };
      })
      .filter((t, index, self) =>
        index === self.findIndex(other => other.title === t.title)
      )
      .filter(t => t.deadline !== 'Expired')
      .slice(0, 100);

    return res.status(200).json({
      tenders,
      source: 'live',
      total: tenders.length,
      bmcCount: tenders.length,
      pwdCount: 0,
    });

  } catch (error) {
    return res.status(500).json({ error: String(error), tenders: [], source: 'error' });
  }
}
