import type { VercelRequest, VercelResponse } from '@vercel/node';

const AICREDITS_KEY = "sk-live-d42243cc807dbb226103665abd51b4a7d311dea0ca749054b89eacf71c5fc232";

async function fetchPageHTML(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return '';
    const html = await response.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 5000);
  } catch { return ''; }
}

function parseValueToNumber(valueText: string): number {
  if (!valueText) return 0;
  const v = valueText.toString().toLowerCase().replace(/,/g, '');
  
  // Extract number
  const numMatch = v.match(/[\d.]+/);
  if (!numMatch) return 0;
  const num = parseFloat(numMatch[0]);
  
  // Determine unit
  if (v.includes('cr') || v.includes('crore')) return Math.round(num * 10000000);
  if (v.includes('lac') || v.includes('lakh') || v.includes(' l')) return Math.round(num * 100000);
  
  // If number is very small (likely in lakhs or crores without unit)
  if (num < 500) return Math.round(num * 100000); // Assume lakhs
  if (num < 10000) return Math.round(num * 1000); // Assume thousands
  
  return Math.round(num);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { tenderUrl, pdfUrl, refNo, title } = req.body;

    let pageText = '';
    if (tenderUrl) pageText = await fetchPageHTML(tenderUrl);
    if (pageText.length < 200 && pdfUrl) {
      pageText = await fetchPageHTML(pdfUrl.replace('.pdf', ''));
    }

    const prompt = `You are extracting financial data from a BMC Mumbai government tender page.

TENDER: ${title}
REF: ${refNo}

PAGE CONTENT:
${pageText || 'Not accessible'}

Extract tender value and EMD. BMC tender typical ranges:
- Lift/elevator work: ₹20-50 Lakh
- Storm water/sewer: ₹30-80 Lakh  
- Road repair: ₹20-50 Lakh
- Pump/motor work: ₹50 Lakh - 2 Crore
- Civil repair: ₹10-40 Lakh
- New construction: ₹50 Lakh - 5 Crore

IMPORTANT: Return values in RUPEES (not lakhs). If tender value is 25 lakhs, return 2500000.

Respond ONLY in JSON:
{
  "tenderValue": 2500000,
  "tenderValueText": "₹25.0 L",
  "emd": 50000,
  "emdText": "₹50 K",
  "workDescription": "brief description",
  "dataSource": "estimated",
  "confidence": "medium"
}`;

    const response = await fetch("https://api.aicredits.in/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AICREDITS_KEY}`
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let result;
    try {
      result = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}');
    } catch {
      result = null;
    }

    if (!result || !result.tenderValue) {
      return res.status(200).json({
        tenderValue: 0,
        tenderValueText: 'See Portal',
        emd: 0,
        emdText: 'See Portal',
        dataSource: 'failed',
        confidence: 'low'
      });
    }

    // Ensure value is in rupees not lakhs
    let tenderValue = result.tenderValue;
    if (tenderValue < 10000 && tenderValue > 0) {
      tenderValue = tenderValue * 100000; // Convert lakhs to rupees
    }

    // Ensure EMD is reasonable (typically 2% of tender value)
    let emd = result.emd || 0;
    if (emd < 1000 && emd > 0) emd = emd * 100000;
    if (!emd || emd < 1000) emd = Math.round(tenderValue * 0.02);

    // Format display text
    const formatValue = (n: number) => {
      if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
      if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + ' L';
      if (n >= 1000) return '₹' + (n / 1000).toFixed(0) + 'K';
      return '₹' + n;
    };

    return res.status(200).json({
      tenderValue,
      tenderValueText: formatValue(tenderValue),
      emd,
      emdText: formatValue(emd),
      workDescription: result.workDescription || '',
      dataSource: result.dataSource || 'estimated',
      confidence: result.confidence || 'medium'
    });

  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
}
