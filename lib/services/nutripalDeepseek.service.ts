/**
 * NutriPal — DeepSeek Chat API (OpenAI-compatible).
 * Requires EXPO_PUBLIC_DEEPSEEK_API_KEY in environment.
 */

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

const SYSTEM_PROMPT = `You are NutriPal, ZoomCart's nutrition assistant (DeepSeek-powered).

Scope — ONLY answer questions about:
• Nutrition and balanced eating
• Diets and dietary patterns (e.g. Mediterranean, DASH, plant-forward, allergies/intolerances when framed as nutrition)
• Healthy meal habits, portions, hydration, meal timing
• What to buy at the supermarket to support a given diet or goal — give practical shopping lists with food categories and examples

Out of scope — politely refuse (one short sentence) and invite the user to ask about nutrition, meals, or grocery shopping for their diet. Do not give medical diagnoses or replace a clinician; suggest consulting professionals for medical conditions.

Tone: warm, concise, actionable. When listing groceries, use bullet points grouped by aisle or category when helpful.`;

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

function getApiKey(): string {
  const k =
    typeof process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY === 'string'
      ? process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY.trim()
      : '';
  return k;
}

export function isNutriPalConfigured(): boolean {
  return getApiKey().length > 0;
}

/** Extract API error message from JSON bodies (OpenAI-compatible shape). */
function extractDeepSeekErrorMessage(rawText: string): string {
  try {
    const j = JSON.parse(rawText) as {
      error?: { message?: string; code?: string };
      message?: string;
    };
    if (j?.error?.message) return j.error.message;
    if (typeof j?.message === 'string') return j.message;
  } catch {
    /* ignore */
  }
  return rawText.trim() || 'Unknown error';
}

/**
 * Turns DeepSeek HTTP failures into clear copy for in-app alerts.
 * "Insufficient balance" is returned by DeepSeek when the account has no API credits — not an app bug.
 */
function formatDeepSeekFailure(status: number, rawText: string): string {
  const detail = extractDeepSeekErrorMessage(rawText);
  const lower = detail.toLowerCase();

  if (lower.includes('insufficient balance')) {
    return [
      'Your DeepSeek account has no API credits left.',
      'NutriPal sends each message through DeepSeek\'s paid API using your key.',
      'Top up or enable billing in the DeepSeek developer console, then try again.',
    ].join(' ');
  }

  if (
    status === 401 ||
    lower.includes('invalid api key') ||
    lower.includes('incorrect api key') ||
    lower.includes('authentication')
  ) {
    return 'DeepSeek rejected this API key. Check EXPO_PUBLIC_DEEPSEEK_API_KEY in .env and restart Expo.';
  }

  if (lower.includes('rate limit') || status === 429) {
    return 'DeepSeek rate limit reached. Wait a moment and try again.';
  }

  return detail || `Request failed (${status}).`;
}

/**
 * @param priorTurns completed user/assistant pairs (no system message)
 * @param userMessage the new user message
 */
export async function sendNutriPalMessage(
  priorTurns: ChatTurn[],
  userMessage: string,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('NutriPal is not configured. Add EXPO_PUBLIC_DEEPSEEK_API_KEY to your .env file.');
  }

  const trimmed = userMessage.trim();
  if (!trimmed) throw new Error('Message is empty.');

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...priorTurns.map((t) => ({ role: t.role, content: t.content })),
    { role: 'user', content: trimmed },
  ];

  const res = await fetch(DEEPSEEK_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.55,
      max_tokens: 2048,
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(formatDeepSeekFailure(res.status, rawText));
  }

  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = JSON.parse(rawText) as typeof data;
  } catch {
    throw new Error('Invalid response from NutriPal.');
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('No reply from NutriPal.');

  return content;
}
