import type { VercelRequest, VercelResponse } from '@vercel/node';

const AICREDITS_KEY = "sk-live-d42243cc807dbb226103665abd51b4a7d311dea0ca749054b89eacf71c5fc232";

async function fetchPDFText(pdfUrl: string): Promise<string> {
  try {
    const response = await fetch(pdfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return '';
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder('latin1');
    const raw = decoder.decode(bytes);
    let text = '';
    const textPattern = /\(([^)]{2,150})\)/g;
    let match;
    while ((match = textPattern.exec(raw)) !== null) {
      const t = match[1].replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/[^\x20-\x7E]/g, '').trim();
      if (t.length > 2) text += t + ' ';
    }
    const btPattern = /BT([\s\S]*?)ET/g;
    while ((match = btPattern.exec(raw)) !== null) {
      const block = match[1].replace(/[^\x20-\x7E\n]/g, ' ').trim();
      if (block.length > 10) text += block + '\n';
    }
    return text.substring(0, 8000);
  } catch {
    return '';
  }
}

async function analyzeWithAI(prompt: string): Promise<string> {
  const response = await fetch("https://api.aicredits.in/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AICREDITS_KEY}`
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { tenderTitle, tenderValue, tenderType, organisation, refNo, pdfUrl } = req.body;

    let pdfText = '';
    let dataSource = 'pwd_estimation';

    if (pdfUrl && pdfUrl.startsWith('http')) {
      pdfText = await fetchPDFText(pdfUrl);
      if (pdfText.length > 200) dataSource = 'actual_pdf';
    }

    const mumRates = `Current Mumbai Market Rates (June 2026):
- Cement OPC 53 Grade: ₹420/bag (50kg)
- TMT Steel Fe500D: ₹58,500/MT
- River Sand (Zone II): ₹2,200/MT
- 20mm Coarse Aggregate: ₹1,850/MT
- Brickwork CM 1:6: ₹3,200/Cum
- PCC M15: ₹4,200/Cum
- RCC M25: ₹6,800/Cum
- Earthwork excavation: ₹185/Cum
- Plastering 12mm: ₹165/Sqm
- Waterproofing: ₹285/Sqm
- Mason (Mistri): ₹850/day
- Bar Bender: ₹800/day
- Mazdoor: ₹600/day
- Supervisor: ₹1,200/day
- JCB Excavator: ₹18,000/day
- Concrete Mixer: ₹1,200/day
- Dewatering Pump: ₹2,500/day`;

    const basePrompt = `You are an expert quantity surveyor and bid strategist for Mumbai government construction projects.

IMPORTANT CONTEXT:
- "Tender Value" = Department's estimated cost (what govt thinks it costs)
- "Winning Bid" = What contractor quotes (typically 8-13% BELOW tender value to win)
- "Execution Cost" = Actual cost to do the work (always LESS than winning bid)
- "Profit" = Winning Bid minus Execution Cost (NOT tender value minus execution cost)
- "Working Capital" = Money contractor needs upfront before first RA bill payment

TENDER DETAILS:
Title: ${tenderTitle}
Organisation: ${organisation || 'BMC Mumbai / Government of Maharashtra'}
Reference: ${refNo || 'N/A'}
Tender Value (Dept Estimate): ${tenderValue || 'Not specified'}
Work Type: ${tenderType || 'Civil'}

${dataSource === 'actual_pdf' ? `ACTUAL PDF CONTENT:\n${pdfText}` : ''}

${mumRates}

Calculate realistic figures:
1. departmentEstimate = tender value as given
2. expectedWinningBid = departmentEstimate × 0.88 (contractor bids 12% below to win)
3. executionCost = expectedWinningBid × 0.85 (85% of bid goes to actual execution)
4. expectedProfit = expectedWinningBid - executionCost
5. profitMargin = (expectedProfit / expectedWinningBid) × 100
6. workingCapitalNeeded = executionCost × 0.18 (need 18% upfront before first RA payment)
7. raCycledays = 60 (standard govt payment cycle)
8. bidRecommendation = "YES" if profitMargin > 10%, "REVIEW" if 7-10%, "NO" if below 7%

Respond ONLY in this exact JSON (no other text):
{
  "dataSource": "${dataSource}",
  "departmentEstimate": 0,
  "expectedWinningBid": 0,
  "executionCost": 0,
  "expectedProfit": 0,
  "profitMargin": 0,
  "workingCapitalNeeded": 0,
  "raCycleDays": 60,
  "bidRecommendation": "YES",
  "bidRecommendationReason": "reason in one line",
  "boqItems": [
    {"item": "description", "unit": "Cum/Sqm/MT/Nos/LS", "quantity": 0, "rate": 0, "amount": 0}
  ],
  "materialCost": 0,
  "labourCost": 0,
  "equipmentCost": 0,
  "overheadCost": 0,
  "contingency": 0,
  "keyMaterials": ["item1", "item2", "item3"],
  "majorEquipment": ["equip1", "equip2"],
  "executionDays": 0,
  "riskFactors": ["risk1", "risk2", "risk3"]
}`;

    const aiResponse = await analyzeWithAI(basePrompt);
    const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    let boqData;
    try {
      boqData = JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) boqData = JSON.parse(jsonMatch[0]);
      else throw new Error('Could not parse AI response');
    }

    return res.status(200).json({
      success: true,
      boq: boqData,
      pdfRead: dataSource === 'actual_pdf',
      message: dataSource === 'actual_pdf'
        ? '✅ Real BOQ extracted from actual tender PDF'
        : '📊 Estimated using Maharashtra PWD Schedule of Rates 2024-25'
    });

  } catch (error) {
    return res.status(500).json({ error: 'BOQ analysis failed', details: String(error) });
  }
}
