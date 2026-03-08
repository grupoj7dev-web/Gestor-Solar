function extractTextFromGeminiResponse(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p?.text || '').join('\n').trim();
  if (!text) throw new Error('Gemini returned empty content');
  return text;
}

function parseJsonFromText(text) {
  const cleaned = text.replace(/```json/gi, '```').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const jsonCandidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(jsonCandidate);
}

async function callGemini(prompt, { expectJson = false } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required');

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 2048,
    },
  };

  if (expectJson) {
    body.generationConfig.responseMimeType = 'application/json';
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Gemini API error (${resp.status}): ${errorText}`);
  }

  const payload = await resp.json();
  const text = extractTextFromGeminiResponse(payload);
  return expectJson ? parseJsonFromText(text) : text;
}

module.exports = {
  callGemini,
};
