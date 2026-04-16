// OpenRouter AI integration
// Uses google/gemini-2.5-pro - best reasoning model available on OpenRouter
const OPENROUTER_API_KEY = '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';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const BEST_MODEL = 'google/gemini-2.5-pro';

export async function askAI(systemPrompt, userMessage, context = {}) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'KristalBall Military Asset Management',
    },
    body: JSON.stringify({
      model: BEST_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'OpenRouter request failed');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export const AI_SYSTEM_PROMPTS = {
  analyst: `You are a military logistics AI analyst for the KristalBall Asset Management System.
You analyze asset data, identify anomalies, predict shortages, and give concise tactical recommendations.
Always be direct and military-precise. Format key numbers in bold. Max 150 words per response.`,

  anomaly: `You are a military asset anomaly detection system.
Given asset movement data, identify unusual patterns, potential misuse, or inventory discrepancies.
Be specific about which base, equipment, or timeframe shows anomalies. Max 100 words.`,

  recommendation: `You are a logistics optimization AI for military bases.
Suggest optimal asset distribution, reorder points, and transfer recommendations based on current stock levels.
Use data-driven reasoning. Be brief and actionable. Max 120 words.`,
};
