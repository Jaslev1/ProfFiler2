export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured. Set ANTHROPIC_API_KEY in Vercel environment variables.' });
  }

  try {
    const { messages, max_tokens } = req.body;

    // Convert OpenAI-style messages to Anthropic format
    const system = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      content: m.content
    }));

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 1400,
        system: system,
        messages: userMessages,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data.error?.message || 'Anthropic API error' });
    }

    // Return in same shape app.js already expects
    const text = data.content?.[0]?.text || '';
    res.status(200).json({ content: [{ type: 'text', text: text }] });

  } catch (err) {
    console.error('API error:', err);
    res.status(502).json({ error: 'Failed to reach API: ' + err.message });
  }
}
