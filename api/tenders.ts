import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const APIFY_TOKEN = "apify_api_Jn12wqlpm5VlUAh2Spqkynw8vOdGX22RYrAg";
    const ACTOR_ID = "YrQuEkowkNCLdk4j2";
    
    const response = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs/last/dataset/items?token=${APIFY_TOKEN}&limit=100`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (!response.ok) {
      return res.status(200).json({ tenders: [], source: 'sample' });
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return res.status(200).json({ tenders: [], source: 'sample' });
    }

    const tenders = data
      .filter((item: Record<string, string>) => 
        item.title && 
        item.title.length > 10 &&
        !item.title.toLowerCase().includes('script') &&
        !item.title.toLowerCase().includes('search')
      )
      .slice(0, 100)
      .map((item: Record<string, string>, i: number) => {
        const valueText = item.value || '';
        let valueNum = 5000000;
        if (valueText.includes('Cr')) valueNum = parseFloat(valueText) * 10000000;
        else if (valueText.includes('L')) valueNum = parseFloat(valueText) * 100000;
        
        const t = (item.title || '').toLowerCase();
        let type = 'Civil';
        if (t.includes('road') || t.includes('bridge') || t.includes('highway') || t.includes('pavement')) type = 'Roads & Infrastructure';
        else if (t.includes('sewer') || t.includes('drain') || t.includes('sewage')) type = 'Sewerage';
        else if (t.includes('sanit') || t.includes('toilet') || t.includes('water supply')) type = 'Sanitary';

        const org = (item.organisation || '').toLowerCase();
        let portal = 'CPPP';
        if (org.includes('bmc') || org.includes('brihanmumbai') || org.includes('mumbai municipal')) portal = 'BMC';
        else if (org.includes('mmrda')) portal = 'MMRDA';
        else if (org.includes('msrdc')) portal = 'MSRDC';
        else if (org.includes('pwd') || org.includes('public works')) portal = 'PWD Maharashtra';
        else if (org.includes('gem')) portal = 'GeM';

        return {
          id: i + 1,
          portal,
          title: item.title?.substring(0, 200) || 'Government Tender',
          type,
          value: valueText || 'See Portal',
          emd: valueNum ? `₹${(valueNum * 0.02 / 100000).toFixed(1)} L` : 'See Portal',
          valueNum: valueNum || 5000000,
          deadline: item.deadline || 'Check Portal',
          location: 'Maharashtra',
          status: 'new',
          organisation: item.organisation || 'Government',
          refNo: item.refNo || '',
          summary: `${item.title}. Organisation: ${item.organisation || 'Government'}. Deadline: ${item.deadline || 'Check portal'}.`,
          docs: ['Registration Certificate', 'ITR (3 years)', 'Experience Certificate', 'GST Registration'],
          risk: valueNum < 5000000 ? 'low' : valueNum < 20000000 ? 'medium' : 'high',
        };
      });

    return res.status(200).json({ tenders, source: 'live' });
  } catch (error) {
    return res.status(500).json({ error: String(error), tenders: [], source: 'error' });
  }
}
