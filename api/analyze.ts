import type { VercelRequest, VercelResponse } from '@vercel/node';

const AICREDITS_KEY = "sk-live-d42243cc807dbb226103665abd51b4a7d311dea0ca749054b89eacf71c5fc232";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt } = req.body;

    const response = await fetch("https://api.aicredits.in/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AICREDITS_KEY}`
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "Analysis unavailable.";
    return res.status(200).json({ result: text });
  } catch (error) {
    return res.status(500).json({ error: 'Analysis failed', details: String(error) });
  }
}
