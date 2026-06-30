export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY is missing in environment variables' });
    }

    const { messages } = req.body;
    if (!messages || !messages[0] || !messages[0].content) {
      return res.status(400).json({ error: 'Invalid request body — missing messages[0].content' });
    }

    const prompt = messages[0].content;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 1000
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      return res.status(502).json({
        error: 'Groq API returned an error',
        status: groqRes.status,
        details: data
      });
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return res.status(502).json({
        error: 'Groq returned an unexpected response shape',
        details: data
      });
    }

    const text = data.choices[0].message.content;

    // Returned in the same shape your index.html already expects
    return res.status(200).json({
      content: [{ type: 'text', text: text }]
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Function crashed',
      message: err.message
    });
  }

}