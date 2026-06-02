import type { VercelRequest, VercelResponse } from '@vercel/node';

const APIFY_TOKEN = "apify_api_Jn12wqlpm5VlUAh2Spqkynw8vOdGX22RYrAg";
const BMC_ACTOR_ID = "YrQuEkowkNCLdk4j2"; // BMC scraper
const CPPP_ACTOR_ID = "YrQuEkowkNCLdk4j2"; // Same scraper, different run
const PLAYWRIGHT_ACTOR_ID = "MpRbnNmVAoj5RC1Ma"; // Maharashtra PWD scraper

const CONSTRUCTION_KEYWORDS = [
  'civil', 'construction', 'road', 'highway', 'bridge', 'flyover', 'pavement',
  'sewer', 'sewerage', 'drainage', 'drain', 'sanit', 'toilet', 'water supply',
  'plumb', 'repair', 'renovation', 'building', 'structure', 'foundation',
  'concrete', 'rcc', 'pcc', 'brickwork', 'masonry', 'flooring', 'plastering',
  'waterproof', 'earthwork', 'excavation', 'desilting', 'storm water',
  'underground', 'pipeline', 'culvert', 'retaining wall', 'compound wall',
  'footpath', 'bitumen', 'asphalt', 'tar', 'pothole', 'municipal',
  'ward', 'nala', 'gutter', 'manhole', 'chamber', 'pumping', 'pump',
  'water main', 'water works', 'hydraulic', 'maintenance', 'overhauling',
  'repairing', 'resurfacing', 'reconstruction', 'strengthening'
];

function isRelevantTender(title: string, org: string): boolean {
  const combined = (title + ' ' + org).toLowerCase();
  return CONSTRUCTION_KEYWORDS.some(k => combined.includes(k));
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
      t.includes('pipeline') || t.includes('pump')) return 'Sanitary';
  return 'Civil';
}

function detectPortal(org: string, title: string, existingPortal?: string): string {
  if (existingPortal && existingPortal !== 'PWD Maharashtra') return existingPortal;
  const combined = (org + ' ' + title).toLowerCase();
  if (combined.includes('bmc') || combined.includes('mcgm') || combined.includes('brihanmumbai')) return 'BMC';
  if (combined.includes('mmrda')) return 'MMRDA';
  if (combined.includes('msrdc')) return 'MSRDC';
  if (combined.includes('pwd') || combined.includes('public works')) return 'PWD Maharashtra';
  return 'CPPP';
}

function parseDeadline(deadline: string): string {
  if (!deadline || deadline === 'Check Portal') return 'Check Portal';
  try {
    const date = new Date(deadline);
    if (!isNaN(date.getTime())) {
      const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days < 0) return 'Expired';
      if (days === 0) return 'Today';
      if (days === 1) return 'Tomorrow';
      return `${days} days`;
    }
  } catch {}
  return deadline;
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
      `https://api.apify.com/v2/acts/${actorId}/runs/last/dataset/items?token=${APIFY_TOKEN}&limit=500`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Fetch from both scrapers
    const [bmcData, pwdData] = await Promise.all([
      fetchDataset(BMC_ACTOR_ID),
      fetchDataset(PLAYWRIGHT_ACTOR_ID)
    ]);

    const allData = [...bmcData, ...pwdData];

    if (allData.length === 0) {
      return res.status(200).json({ tenders: [], source: 'sample' });
    }

    const today = new Date();

    const tenders = allData
      .filter((item: ApifyItem) => {
        const title = item.title || '';
        const org = item.organisation || '';
        
        // Filter out garbage data
        if (title.length < 10) return false;
        if (title.toLowerCase().includes('script')) return false;
        if (title.toLowerCase().includes('screen reader')) return false;
        if (title.toLowerCase().includes('javascript')) return false;
        if (title.toLowerCase().includes('digital signature certificate')) return false;
        if (title.toLowerCase().includes('andaman')) return false;
        if (title.toLowerCase().includes('login')) return false;
        
        // Filter expired tenders
        if (item.deadline && item.deadline !== 'Check Portal') {
          const deadlineDate = new Date(item.deadline);
          if (!isNaN(deadlineDate.getTime()) && deadlineDate < today) return false;
        }
        
        // Must be construction related OR from BMC
        return isRelevantTender(title, org) || 
               (item.portal === 'BMC') ||
               org.toLowerCase().includes('bmc') ||
               org.toLowerCase().includes('mcgm');
      })
      .map((item: ApifyItem, i: number) => {
        const title = (item.title || '').substring(0, 200);
        const org = item.organisation || 'Government';
        const deadline = parseDeadline(item.deadline || '');
        const valueText = item.value || 'See Portal';
        let valueNum = 5000000;
        if (valueText.includes('Cr')) valueNum = parseFloat(valueText) * 10000000;
        else if (valueText.includes('L')) valueNum = parseFloat(valueText) * 100000;

        const portal = detectPortal(org, title, item.portal);
        const type = detectType(title);
        const isUrgent = deadline.includes('Today') || deadline.includes('Tomorrow') || 
                        (parseInt(deadline) <= 3 && parseInt(deadline) > 0);

        return {
          id: i + 1,
          portal,
          title,
          type,
          value: valueText,
          emd: valueNum > 5000000 ? `₹${(valueNum * 0.02 / 100000).toFixed(1)} L` : 'See Portal',
          valueNum,
          deadline,
          location: portal === 'BMC' ? 'Mumbai' : 'Maharashtra',
          status: isUrgent ? 'urgent' : 'new',
          organisation: org,
          refNo: item.refNo || '',
          pdfUrl: item.pdfUrl || '',
          tenderUrl: item.url || '',
          summary: `${title}. Organisation: ${org}. Reference: ${item.refNo || 'N/A'}. Deadline: ${deadline}.`,
          docs: ['Registration Certificate', 'ITR (3 years)', 'Experience Certificate', 'GST Registration'],
          risk: detectRisk(valueNum),
        };
      })
      .filter((t, index, self) =>
        index === self.findIndex(other => other.title === t.title)
      )
      .sort((a, b) => {
        // Sort BMC first, then by urgency
        if (a.portal === 'BMC' && b.portal !== 'BMC') return -1;
        if (a.portal !== 'BMC' && b.portal === 'BMC') return 1;
        return 0;
      })
      .slice(0, 200);

    return res.status(200).json({
      tenders,
      source: 'live',
      total: tenders.length,
      bmcCount: tenders.filter(t => t.portal === 'BMC').length,
      pwdCount: tenders.filter(t => t.portal === 'PWD Maharashtra').length,
    });

  } catch (error) {
    return res.status(500).json({ error: String(error), tenders: [], source: 'error' });
  }
}
