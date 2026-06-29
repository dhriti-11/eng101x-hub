export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { messages } = req.body;
    const prompt = messages[0].content;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]) {
      throw new Error('No response from Gemini');
    }

    const text = data.candidates[0].content.parts[0].text;

    // Return in same format as Anthropic so index.html needs no changes
    return res.status(200).json({
      content: [{ type: 'text', text: text }]
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

}