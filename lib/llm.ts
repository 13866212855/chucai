import { getLLMSettings, LLMSettings } from './settings';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TextTestResult {
  success: boolean;
  model: string;
  response?: string;
  error?: string;
  latencyMs: number;
  tokens?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface ImageTestResult {
  success: boolean;
  model: string;
  imageUrl?: string;
  error?: string;
  latencyMs: number;
  prompt: string;
}

/**
 * 统一大模型文本生成请求 (OpenAI 兼容协议)
 */
export async function requestLLM(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    customConfig?: Partial<LLMSettings>;
  } = {}
) {
  const settings = {
    ...getLLMSettings(),
    ...options.customConfig,
  };

  const model = options.model || settings.textModel;
  const baseUrl = settings.baseUrl.replace(/\/+$/, '');
  const apiKey = settings.apiKey;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? settings.temperature,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM 接口请求失败 (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * 测试文本大模型连通性与回复效果
 */
export async function testTextModel(
  prompt: string,
  customConfig?: Partial<LLMSettings>
): Promise<TextTestResult> {
  const startTime = Date.now();
  const settings = {
    ...getLLMSettings(),
    ...customConfig,
  };

  const baseUrl = settings.baseUrl.replace(/\/+$/, '');
  const apiKey = settings.apiKey;
  const model = settings.textModel;

  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: settings.systemPrompt || '你是一个专业的外出事务管理智能助手。',
      },
      {
        role: 'user',
        content: prompt || '请测试并简短回答：作为外出审批管理员，审核差旅事项最重要的三项原则是什么？',
      },
    ];

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: settings.temperature ?? 0.7,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        model,
        error: `HTTP ${res.status}: ${errText.slice(0, 500)}`,
        latencyMs,
      };
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || '（大模型返回了空内容）';
    const usage = data.usage;

    return {
      success: true,
      model,
      response: reply,
      latencyMs,
      tokens: {
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
      },
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      model,
      error: error?.message || '网络连接超时或连接被重置',
      latencyMs,
    };
  }
}

/**
 * 测试图片大模型生成能力 (OpenAI /images/generations 格式)
 */
export async function testImageModel(
  prompt: string,
  customConfig?: Partial<LLMSettings>
): Promise<ImageTestResult> {
  const startTime = Date.now();
  const settings = {
    ...getLLMSettings(),
    ...customConfig,
  };

  const baseUrl = settings.baseUrl.replace(/\/+$/, '');
  const apiKey = settings.apiKey;
  const model = settings.imageModel;

  try {
    const res = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt: prompt || '现代企业科技感外出出差移动端看板图标插画，极简商务科技矢量风格',
        n: 1,
        size: '1024x1024',
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        model,
        prompt,
        error: `HTTP ${res.status}: ${errText.slice(0, 500)}`,
        latencyMs,
      };
    }

    const data = await res.json();
    let imageUrl = '';

    if (Array.isArray(data.data) && data.data.length > 0) {
      const item = data.data[0];
      if (item.url) {
        imageUrl = item.url;
      } else if (item.b64_json) {
        imageUrl = `data:image/png;base64,${item.b64_json}`;
      }
    }

    if (!imageUrl) {
      return {
        success: false,
        model,
        prompt,
        error: `响应未包含有效图片 URL: ${JSON.stringify(data).slice(0, 200)}`,
        latencyMs,
      };
    }

    return {
      success: true,
      model,
      imageUrl,
      prompt,
      latencyMs,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      model,
      prompt,
      error: error?.message || '图片生成接口调用失败',
      latencyMs,
    };
  }
}
