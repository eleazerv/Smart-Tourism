import 'dotenv/config';


const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';


export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

let turnUsage = null;

export function startTokenTurn() {
  turnUsage = { prompt: 0, completion: 0, total: 0, cached: 0, calls: 0 };
}

export function getTokenTurn() {
  return turnUsage;
}

export async function callDeepseek({ messages, tools, temperature = 0.2 }) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY belum diset di .env');

  const body = {
    model: DEEPSEEK_MODEL,
    messages,
    temperature,
    max_tokens: 1500,

    thinking: { type: 'disabled' },
  };

  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error('GROQ_REQUEST_FAILED'); // nama dipertahankan: chat.Controller.js mengecek string ini persis
    err.status = res.status;
    err.detail = data;
    throw err;
  }

  if (data?.usage) {
    const u = data.usage;
    console.log(
      `[deepseek] panggilan: ${u.prompt_tokens} in + ${u.completion_tokens} out = ${u.total_tokens} total` +
      (u.prompt_cache_hit_tokens ? ` (cache hit: ${u.prompt_cache_hit_tokens})` : '')
    );


    if (turnUsage) {
      turnUsage.prompt += u.prompt_tokens || 0;
      turnUsage.completion += u.completion_tokens || 0;
      turnUsage.total += u.total_tokens || 0;
      turnUsage.cached += u.prompt_cache_hit_tokens || 0;
      turnUsage.calls += 1;
    }
  }

  const rawMessage = data.choices?.[0]?.message ?? null;


  if (rawMessage && !rawMessage.content && !rawMessage.tool_calls) {
    console.log('[deepseek] PESAN KOSONG, cek field lain:', JSON.stringify(rawMessage));
  }

  return rawMessage;
}