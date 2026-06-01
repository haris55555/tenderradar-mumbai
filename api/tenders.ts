import type { VercelRequest, VercelResponse } from '@vercel/node';

const APIFY_TOKEN = "apify_api_Jn12wqlpm5VlUAh2Spqkynw8vOdGX22RYrAg";
const CHEERIO_ACTOR_ID = "YrQuEkowkNCLdk4j2"; // CPPP scraper
const PLAYWRIGHT_ACTOR_ID = "MpRbnNmVAoj5RC1Ma"; // Maharashtra scraper

const CONSTRUCTION_KEYWORDS = [
  'civil', 'construction', 'road', 'highway', 'bridge', 'flyover', 'pavement',
  'sewer', 'sewerage', 'drainage', 'drain', 'sanit', 'toilet', 'water supply',
  'plumb', 'repair', 'renovation', 'building', 'structure', 'foundation',
  'concrete', 'rcc', 'pcc', 'brickwork', 'masonry', 'flooring', 'plastering',
  'waterproof', 'earthwork', 'excavation', 'desilting', 'storm water',
  'underground', 'pipeline', 'culvert', 'retaining wall', 'compound wall',
  'footpath', 'pavement', 'bitumen', 'asphalt', 'tar', 'pothole',
  'municipal', 'ward', 'nala', 'gutter', 'manhole', 'chamber'
];

const MUMBAI_KEYWORDS = [
  'mumbai', 'bmc', 'mcgm', 'brihanmumbai', 'thane', 'navi mumbai',
  'andheri', 'bandra', 'kurla', 'dharavi', 'worli', 'dadar', 'borivali',
  'malad', 'goregaon', 'kandivali', 'mulund', 'ghatkopar', 'vikhroli',
  'chembur', 'sion', 'matunga', 'mahim', 'parel', 'colaba', 'fort',
  'wadala', 'mankhurd', 'trombay', 'versova', 'juhu', 'santacruz',
  'vile parle', 'jogeshwari', 'dahisar', 'mira road', 'bhayander',
  'vasai', 'virar', 'panvel', 'belapur', 'kharghar', 'airoli',
  'maharashtra', 'mmrda', 'msrdc', 'pwd', 'mhada'
];

function isConstructionTender(title: string): boolean {
  const t = title.toLowerCase();
  return CONSTRUCTION_KEYWORDS.some(keyword => t.includes(keyword));
}

function isMumbaiTender(title: string, org: string): boolean {
  const combined = (title + ' ' + org).toLowerCase();
  return MUMBAI_KEYWORDS.some(keyword => combined.includes(keyword));
}

function detectType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('road') || t.includes('highway') || t.includes('bridge') || 
      t.includes('flyover') || t.includes('pavement') || t.includes('bitumen') ||
      t.includes('asphalt') || t.includes('footpath')) return 'Roads & Infrastructure';
  if (t.includes('sewer') || t.includes('drain') || t.includes('sewage') || 
      t.includes('nala') || t.includes('storm water') || t.includes('desilting')) return 'Sewerage';
  if (t.includes('sanit') || t.includes('toilet') || t.includes('water supply') || 
      t.includes('plumb') || t.includes('pipeline') || t.includes('water main')) return 'Sanitary';
  return 'Civil';
}

function detectPortal(org: string, title: string): string {
  const combined = (org + ' ' + title).toLowerCase();
  if (combined.includes('bmc') || combined.includes('mcgm') || combined.includes('brihanmumbai') || combined.includes('municipal corporation of greater mumbai')) return 'BMC';
  if (combined.includes('mmrda')) return 'MMRDA';
  if (combined.includes('msrdc')) return 'MSRDC';
  if (combined.includes('pwd') || combined.includes('public works')) return 'PWD Maharashtra';
  if (combined.includes('gem')) return 'GeM';
  return 'CPPP';
}

function extractDeadlineFromTitle(title: string): string {
  // Extract date from formats like "Closes: 2026-06-06T17:00:00" or "06-Jun-2026"
  const patterns = [
    /Closes?:?\s*(\d{4}-\d{2}-\d{2})/i,
    /Closing:?\s*(\d{4}-\d{2}-\d{2})/i,
    /(\d{2}[-\/]\w{3}[-\/]\d{4})/,
    /(\d{2}[-\/]\d{2}[-\/]\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const dateStr = match[1];
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (days > 0) return `${days} days`;
          if (days === 0) return 'Today';
          return 'Expired';
        }
      } catch {
        return dateStr;
      }
    }
  }
  return 'Check Portal';
}

function cleanTitle(title: string): string {
  // Remove date and reference info from end of title
  return title
    .replace(/\[.*?\]/g, '')
    .replace(/Closes?:.*$/i, '')
    .replace(/Closing:.*$/i, '')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
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
  url?: string;
  refNo?: string;
}

async function fetchFromApify(actorId: string): Promise<ApifyItem[]> {
  try {
    const response = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs/last/dataset/items?token=${APIFY_TOKEN}&limit=500`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) return [];
    const data = await response.json();
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
    // Fetch from both scrapers simultaneously
    const [cpppData, maharashtraData] = await Promise.all([
      fetchFromApify(CHEERIO_ACTOR_ID),
      fetchFromApify(PLAYWRIGHT_ACTOR_ID)
    ]);

    const allData = [...cpppData, ...maharashtraData];

    if (allData.length === 0) {
      return res.status(200).json({ tenders: [], source: 'sample' });
    }

    const tenders = allData
      .filter((item: ApifyItem) => {
        const title = item.title || '';
        const org = item.organisation || '';
        return (
          title.length > 10 &&
          !title.toLowerCase().includes('script') &&
          !title.toLowerCase().includes('screen reader') &&
          !title.toLowerCase().includes('javascript') &&
          !title.toLowerCase().includes('digital signature certificate') &&
          !title.toLowerCase().includes('login') &&
          !title.toLowerCase().includes('register') &&
          (isConstructionTender(title) || isMumbaiTender(title, org))
        );
      })
      .map((item: ApifyItem, i: number) => {
        const rawTitle = item.title || '';
        const title = cleanTitle(rawTitle);
        const org = item.organisation || 'Government';
        const deadline = item.deadline && item.deadline !== 'Check Portal' 
          ? item.deadline 
          : extractDeadlineFromTitle(rawTitle);
        
        const valueText = item.value || '';
        let valueNum = 5000000;
        if (valueText.includes('Cr')) valueNum = parseFloat(valueText) * 10000000;
        else if (valueText.includes('L')) valueNum = parseFloat(valueText) * 100000;

        const portal = item.portal || detectPortal(org, title);
        const type = detectType(title);

        return {
          id: i + 1,
          portal,
          title,
          type,
          value: valueText || 'See Portal',
          emd: valueNum > 0 ? `₹${(valueNum * 0.02 / 100000).toFixed(1)} L` : 'See Portal',
          valueNum: valueNum || 5000000,
          deadline,
          location: isMumbaiTender(title, org) ? 'Mumbai' : 'Maharashtra',
          status: deadline.includes('Today') || (parseInt(deadline) <= 3) ? 'urgent' : 'new',
          organisation: org,
          refNo: item.refNo || '',
          tenderUrl: item.url || '',
          summary: `${title}. Organisation: ${org}. Deadline: ${deadline}.`,
          docs: ['Registration Certificate', 'ITR (3 years)', 'Experience Certificate', 'GST Registration'],
          risk: detectRisk(valueNum),
        };
      })
      .filter((t, index, self) => 
        // Remove duplicates by title
        index === self.findIndex(other => other.title === t.title)
      )
      .slice(0, 200);

    return res.status(200).json({ 
      tenders, 
      source: 'live',
      total: tenders.length,
      cpppCount: cpppData.length,
      maharashtraCount: maharashtraData.length
    });

  } catch (error) {
    return res.status(500).json({ 
      error: String(error), 
      tenders: [], 
      source: 'error' 
    });
  }
}
