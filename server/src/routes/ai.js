import { Router } from 'express';
import { z } from 'zod';
import config from '../config.js';
import { ApiError, apiLimiter, asyncHandler, validate } from '../middleware.js';

export const aiRouter = Router();

/**
 * AI Business Assistant.
 * - API keys live ONLY on the server.
 * - If no LLM provider is configured the endpoint returns 503 `ai_unavailable`
 *   so the UI can show an honest "not configured" message plus a labelled
 *   Demo Assistant. We never pretend a real model is answering.
 * - The system prompt forbids inventing financial figures: factual questions
 *   must be answered from connected data or declined honestly.
 */

const SYSTEM_PROMPT = `You are VyaparAI, a business assistant for Indian small businesses (shopkeepers, retailers, MSMEs).
Answer in the user's language (English, Hindi, Bhojpuri, Awadhi or Urdu).
Rules:
- Never invent sales, profit, invoice or stock figures. If business data is not connected for this account, say so plainly and suggest what to record.
- Amounts are in Indian Rupees (₹).
- Keep answers short, practical and friendly for non-technical shop owners.`;

function buildMessages(body) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const item of Array.isArray(body.history) ? body.history.slice(-10) : []) {
    if (item?.role === 'user' || item?.role === 'assistant') {
      messages.push({ role: item.role, content: String(item.content).slice(0, 2000) });
    }
  }
  messages.push({ role: 'user', content: body.message });
  return messages;
}

async function callOpenAI(messages) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.providers.ai.key}`,
    },
    body: JSON.stringify({ model: config.providers.ai.model || 'gpt-4o-mini', messages, max_tokens: 500 }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new ApiError(502, 'ai_provider_error', 'AI provider error');
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(messages) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.providers.ai.key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.providers.ai.model || 'claude-3-5-haiku-latest',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: messages.filter((message) => message.role !== 'system'),
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new ApiError(502, 'ai_provider_error', 'AI provider error');
  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

aiRouter.post(
  '/chat',
  apiLimiter,
  asyncHandler(async (req, res) => {
    if (!config.providers.ai.configured) {
      throw new ApiError(503, 'ai_unavailable', 'AI provider is not configured');
    }

    const body = validate(
      req,
      z.object({
        message: z.string().trim().min(1).max(2000),
        history: z
          .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
          .max(20)
          .optional(),
      }),
    );

    const messages = buildMessages(body);
    const reply =
      config.providers.ai.provider === 'anthropic' ? await callAnthropic(messages) : await callOpenAI(messages);

    res.json({ reply, provider: config.providers.ai.provider });
  }),
);

export default aiRouter;
