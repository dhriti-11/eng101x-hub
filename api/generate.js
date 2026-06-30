export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in environment variables' });
    }

    const { messages } = req.body;
    if (!messages || !messages[0] || !messages[0].content) {
      return res.status(400).json({ error: 'Invalid request body — missing messages[0].content' });
    }

    const prompt = messages[0].content;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 1000
          }
        })
      }
    );

    const data = await geminiRes.json();

    // If Gemini itself returned an error (bad request, quota, etc.)
    if (!geminiRes.ok) {
      return res.status(502).json({
        error: 'Gemini API returned an error',
        status: geminiRes.status,
        details: data
      });
    }

    // If response was blocked by safety filters or has no candidates
    if (!data.candidates || data.candidates.length === 0) {
      return res.status(502).json({
        error: 'Gemini returned no candidates (possibly blocked by safety filters)',
        details: data
      });
    }

    const candidate = data.candidates[0];

    if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
      return res.status(502).json({
        error: 'Gemini candidate has no content.parts',
        details: candidate
      });
    }

    const text = candidate.content.parts[0].text;

    return res.status(200).json({
      content: [{ type: 'text', text: text }]
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Function crashed',
      message: err.message,
      stack: err.stack
    });
  }

}