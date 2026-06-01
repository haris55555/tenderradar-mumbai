import type { VercelRequest, VercelResponse } from '@vercel/node';

const AICREDITS_KEY = "sk-live-d42243cc807dbb226103665abd51b4a7d311dea0ca749054b89eacf71c5fc232";

async function fetchTenderPage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    return await response.text();
  } catch {
    return '';
  }
}

function extractPDFLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const patterns = [
    /href=["']([^"']*\.pdf[^"']*)/gi,
    /href=["']([^"']*boq[^"']*)/gi,
    /href=["']([^"']*document[^"']*)/gi,
    /href=["']([^"']*tender[^"']*download[^"']*)/gi,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let link = match[1];
      if (!link.startsWith('http')) {
        try {
          link = new URL(link, baseUrl).href;
        } catch {
          continue;
        }
      }
      if (!links.includes(link)) links.push(link);
    }
  });
  
  return links.slice(0, 3);
}

async function fetchPDFText(pdfUrl: string): Promise<string> {
  try {
    const response = await fetch(pdfUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Extract text from PDF binary
    let text = '';
    const decoder = new TextDecoder('latin1');
    const raw = decoder.decode(bytes);
    
    // Extract readable text between PDF stream markers
    const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamPattern.exec(raw)) !== null) {
      const cleaned = match[1]
        .replace(/[^\x20-\x7E\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned.length > 50) text += cleaned + '\n';
    }
    
    // Also extract text objects
    const textPattern = /\(([^)]{3,200})\)/g;
    while ((match = textPattern.exec(raw)) !== null) {
      const t = match[1].replace(/[^\x20-\x7E]/g, '').trim();
      if (t.length > 3) text += t + ' ';
    }
    
    return text.substring(0, 5000);
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
    const { tenderTitle, tenderValue, tenderType, organisation, refNo, tenderUrl } = req.body;

    let pdfText = '';
    let pdfFound = false;

    // Step 1: Try to fetch actual BOQ PDF if URL provided
    if (tenderUrl) {
      const html = await fetchTenderPage(tenderUrl);
      if (html) {
        const pdfLinks = extractPDFLinks(html, tenderUrl);
        for (const pdfLink of pdfLinks) {
          const text = await fetchPDFText(pdfLink);
          if (text.length > 200) {
            pdfText = text;
            pdfFound = true;
            break;
          }
        }
      }
    }

    // Step 2: Build AI prompt
    let prompt = '';
    
    if (pdfFound && pdfText) {
      prompt = `You are an expert quantity surveyor. Extract BOQ data from this actual tender PDF text and calculate real costs using Mumbai market rates.

TENDER DETAILS:
Title: ${tenderTitle}
Organisation: ${organisation}
Type: ${tenderType}

ACTUAL PDF TEXT FROM TENDER:
${pdfText}

Extract real BOQ line items from the PDF text above. Use these current Mumbai market rates:
- Cement OPC 53: ₹420/bag (50kg)
- TMT Steel Fe500: ₹58,500/MT
- River Sand: ₹2,200/MT  
- 20mm Aggregate: ₹1,850/MT
- Brickwork CM 1:6: ₹3,200/Cum
- PCC M15: ₹4,200/Cum
- RCC M25: ₹6,800/Cum
- Earthwork excavation: ₹185/Cum
- Plastering 12mm: ₹165/Sqm
- Mason (Mistri): ₹850/day
- Mazdoor: ₹600/day
- JCB Excavator: ₹18,000/day
- Concrete Mixer: ₹1,200/day

If PDF text contains BOQ items with quantities — use those exact quantities.
If PDF text is unclear — estimate based on tender type and value.

Respond ONLY in this exact JSON format:
{
  "dataSource": "actual_pdf",
  "boqItems": [
    {"item": "item name", "unit": "unit", "quantity": 0, "rate": 0, "amount": 0}
  ],
  "materialCost": 0,
  "labourCost": 0,
  "equipmentCost": 0,
  "overheadCost": 0,
  "contingency": 0,
  "totalCost": 0,
  "tenderValue": 0,
  "profitMargin": 0,
  "estimatedProfit": 0,
  "keyMaterials": ["material1", "material2"],
  "majorEquipment": ["equip1", "equip2"],
  "executionDays": 0,
  "riskFactors": ["risk1", "risk2", "risk3"]
}`;
    } else {
      // No PDF found — use PWD Schedule of Rates estimation
      prompt = `You are an expert quantity surveyor for Mumbai construction projects.

TENDER DETAILS:
Title: ${tenderTitle}
Organisation: ${organisation || 'Government of Maharashtra'}
Reference: ${refNo || 'N/A'}
Tender Value: ${tenderValue || 'Not specified'}
Work Type: ${tenderType || 'Civil'}

No BOQ PDF was accessible. Provide a detailed estimation based on:
1. Maharashtra PWD Schedule of Rates 2024-25
2. Current Mumbai market rates
3. Similar past projects in Maharashtra

Current Mumbai market rates:
- Cement OPC 53: ₹420/bag (50kg)
- TMT Steel Fe500: ₹58,500/MT
- River Sand: ₹2,200/MT
- 20mm Aggregate: ₹1,850/MT
- Brickwork CM 1:6: ₹3,200/Cum
- PCC M15: ₹4,200/Cum
- RCC M25: ₹6,800/Cum
- Earthwork excavation: ₹185/Cum
- Plastering 12mm: ₹165/Sqm
- Mason (Mistri): ₹850/day
- Mazdoor: ₹600/day
- JCB Excavator: ₹18,000/day

Respond ONLY in this exact JSON format:
{
  "dataSource": "pwd_estimation",
  "boqItems": [
    {"item": "item name", "unit": "unit", "quantity": 0, "rate": 0, "amount": 0}
  ],
  "materialCost": 0,
  "labourCost": 0,
  "equipmentCost": 0,
  "overheadCost": 0,
  "contingency": 0,
  "totalCost": 0,
  "tenderValue": 0,
  "profitMargin": 0,
  "estimatedProfit": 0,
  "keyMaterials": ["material1", "material2"],
  "majorEquipment": ["equip1", "equip2"],
  "executionDays": 0,
  "riskFactors": ["risk1", "risk2", "risk3"]
}`;
    }

    const aiResponse = await analyzeWithAI(prompt);
    const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let boqData;
    try {
      boqData = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON from response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        boqData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response');
      }
    }

    return res.status(200).json({ 
      success: true, 
      boq: boqData,
      pdfFound,
      message: pdfFound ? 'Real BOQ data extracted from tender PDF' : 'Estimated based on PWD Schedule of Rates 2024-25'
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'BOQ analysis failed', 
      details: String(error) 
    });
  }
}
