/**
 * myusellm — 统一大模型 APIHub 配置与客户端工具
 */

export const LLM_CONFIG = {
  baseURL: process.env.OPENAI_BASE_URL || 'https://apihub.agnes-ai.com/v1',
  apiKey: process.env.OPENAI_API_KEY || 'sk-GUdpKQNIwwJSZQ5mYyrMnuCJBOjSbB73c2N6NcnNfk5LoKyq',
  defaultModel: 'gpt-4o-mini',
};

export async function requestLLM(messages: Array<{ role: string; content: string }>, options: { model?: string; temperature?: number } = {}) {
  const model = options.model || LLM_CONFIG.defaultModel;
  const res = await fetch(`${LLM_CONFIG.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LLM_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM API request failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
