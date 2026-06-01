import type { VercelRequest, VercelResponse } from '@vercel/node';

const AICREDITS_KEY = "sk-live-d42243cc807dbb226103665abd51b4a7d311dea0ca749054b89eacf71c5fc232";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { tenderTitle, tenderValue, tenderType, organisation, refNo } = req.body;

    const prompt = `You are an expert quantity surveyor and cost estimator for Mumbai construction projects.

A contractor needs BOQ (Bill of Quantities) analysis for this government tender:

Tender: ${tenderTitle}
Organisation: ${organisation || 'Government of Maharashtra'}
Reference: ${refNo || 'N/A'}
Tender Value: ${tenderValue || 'Not specified'}
Work Type: ${tenderType || 'Civil'}

Based on the tender title and type, provide a detailed BOQ estimation following Maharashtra PWD Schedule of Rates 2024-25.

Respond ONLY in this exact JSON format with no other text:
{
  "boqItems": [
    {"item": "Earthwork excavation", "unit": "Cum", "quantity": 500, "rate": 185, "amount": 92500},
    {"item": "PCC M15 grade", "unit": "Cum", "quantity": 120, "rate": 4200, "amount": 504000},
    {"item": "RCC M25 grade", "unit": "Cum", "quantity": 85, "rate": 6800, "amount": 578000},
    {"item": "TMT Steel Fe500", "unit": "MT", "quantity": 12, "rate": 58500, "amount": 702000},
    {"item": "Brickwork CM 1:6", "unit": "Cum", "quantity": 45, "rate": 3200, "amount": 144000},
    {"item": "Plastering 12mm", "unit": "Sqm", "quantity": 800, "rate": 165, "amount": 132000},
    {"item": "Flooring vitrified", "unit": "Sqm", "quantity": 350, "rate": 850, "amount": 297500},
    {"item": "Painting two coats", "unit": "Sqm", "quantity": 600, "rate": 85, "amount": 51000}
  ],
  "materialCost": 2501000,
  "labourCost": 875000,
  "equipmentCost": 312000,
  "overheadCost": 187500,
  "contingency": 125000,
  "totalCost": 4000500,
  "profitMargin": 18,
  "estimatedProfit": 720090,
  "keyMaterials": ["Cement OPC 53 Grade", "TMT Steel Fe500", "Coarse Aggregate 20mm", "Fine Sand"],
  "majorEquipment": ["JCB Excavator", "Concrete Mixer", "Vibrator", "Compactor"],
  "executionDays": 180,
  "riskFactors": ["Urban area work requires traffic management", "Monsoon season may delay work", "Utility shifting may cause delays"]
}

Make realistic estimates based on the tender value and work type. All amounts in INR.`;

    const response = await fetch("https://api.aicredits.in/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AICREDITS_KEY}`
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    
    // Clean and parse JSON
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const boqData = JSON.parse(cleaned);
    
    return res.status(200).json({ success: true, boq: boqData });
  } catch (error) {
    return res.status(500).json({ error: 'BOQ analysis failed', details: String(error) });
  }
}
