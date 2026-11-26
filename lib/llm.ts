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

function normalizeBaseUrl(rawUrl: string): string {
  return (rawUrl || '')
    .trim()
    .replace(/\/+(chat\/completions|images\/generations)\/?$/i, '')
    .replace(/\/+$/, '');
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
  const baseUrl = normalizeBaseUrl(settings.baseUrl);
  const apiKey = settings.apiKey.trim();

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

  const baseUrl = normalizeBaseUrl(settings.baseUrl);
  const apiKey = settings.apiKey.trim();
  const model = settings.textModel.trim();

  try {
    if (!baseUrl || !apiKey || !model) {
      return {
        success: false,
        model: model || '未填写',
        error: '请先完整填写 API 接口地址、API Key 和文本模型名称后再测试。',
        latencyMs: 0,
      };
    }

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
      let hint = '';
      if (res.status === 403 && errText.includes('unusual activity')) {
        hint = '\n\n💡 诊断提示：当前预设的 ApiHub Agnes 默认体验密钥已被上游平台风控临时限制（403）。请在上方更换为您自己的 API 接口地址与密钥（如 DeepSeek、通义千问、硅基流动或新的 Agnes Key）并点击“保存大模型参数配置”即可恢复正常。';
      } else if (res.status === 401) {
        hint = '\n\n💡 诊断提示：API Key 无效或已过期（401），请检查密钥是否填写正确。';
      } else if (res.status === 404) {
        hint = '\n\n💡 诊断提示：接口地址或模型名称不存在（404），请确认 Base URL 末尾是否包含 /v1 以及模型名称是否正确。';
      } else if (errText.includes('1211') || errText.includes('模型不存在') || /model.*not.*(found|exist)/i.test(errText)) {
        if (/^gml[-_]/i.test(model)) {
          hint = `\n\n💡 诊断提示：模型名称拼写有误！您填写的是 "${model}"（gml），智谱模型正确前缀应为 "glm-"（例如：glm-4.7、glm-4.5、glm-5）。请修改后保存重试。`;
        } else if (baseUrl.includes('bigmodel.cn/api/coding')) {
          hint = `\n\n💡 诊断提示：智谱 Coding 专属端点 (/api/coding/paas/v4) 不识别 "${model}"，请尝试使用套餐支持的模型代码：glm-4.7、glm-4.5 或 glm-5。`;
        } else {
          hint = `\n\n💡 诊断提示：当前服务商不支持模型名称 "${model}"，请核对控制台文档中的准确模型代码。`;
        }
      }
      return {
        success: false,
        model,
        error: `HTTP ${res.status}: ${errText.slice(0, 500)}${hint}`,
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

  let effectiveBaseUrl = normalizeBaseUrl(settings.baseUrl);
  const apiKey = settings.apiKey.trim();
  let effectiveModel = settings.imageModel.trim();

  // 智谱 Coding Plan (/api/coding/paas/v4) 仅提供代码/文本接口，图片生成自动切换至智谱通用端点 (/api/paas/v4)
  const isZhipuCoding = effectiveBaseUrl.includes('open.bigmodel.cn/api/coding');
  if (isZhipuCoding) {
    effectiveBaseUrl = effectiveBaseUrl.replace('/api/coding/paas/v4', '/api/paas/v4');
  }

  // 若智谱环境下图片模型误填为文本对话模型（如 glm-4.7 / glm-5.4 / gml-5.4），自动回退为免费生图模型 cogview-3-flash
  const isZhipu = effectiveBaseUrl.includes('open.bigmodel.cn');
  if (isZhipu && /^(glm-[345]|gml-|deepseek)/i.test(effectiveModel)) {
    effectiveModel = 'cogview-3-flash';
  }

  try {
    if (!effectiveBaseUrl || !apiKey || !effectiveModel) {
      return {
        success: false,
        model: effectiveModel || '未填写',
        prompt,
        error: '请先完整填写 API 接口地址、API Key 和图片模型名称后再测试。',
        latencyMs: 0,
      };
    }

    const res = await fetch(`${effectiveBaseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: effectiveModel,
        prompt: prompt || '现代企业科技感外出出差移动端看板图标插画，极简商务科技矢量风格',
        n: 1,
        size: '1024x1024',
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      let hint = '';
      if (res.status === 403 && errText.includes('unusual activity')) {
        hint = '\n\n💡 诊断提示：当前预设的 ApiHub Agnes 默认体验密钥已被上游平台风控临时限制（403），请在上方更换您自己的 API 密钥后保存重试。';
      } else if (res.status === 401) {
        hint = '\n\n💡 诊断提示：API Key 无效或已过期（401），请检查密钥配置。';
      } else if (errText.includes('1113') || errText.includes('余额不足') || errText.includes('资源包')) {
        hint = '\n\n💡 诊断提示：已为您自动通过智谱通用端点调用 cogview-3-flash，但当前智谱账号仅开通了 Coding 文本套餐、通用账户余额/免费资源包未激活（错误码 1113）。如需使用生图功能请在智谱控制台开通/领取通用资源包；前台“一键智能回填”仅使用文本大模型，不受影响。';
      } else if (isZhipuCoding) {
        hint = `\n\n💡 诊断提示：已自动尝试通过智谱通用端点 (${effectiveBaseUrl}) 调用 ${effectiveModel}，但未通过。可能当前 Coding Plan 专属密钥不支持通用生图接口（前台智能填表仅使用文本大模型，已可正常使用）。`;
      } else if (errText.includes('1211') || errText.includes('模型不存在') || /model.*not.*(found|exist)/i.test(errText)) {
        hint = `\n\n💡 诊断提示：图片模型名称 "${effectiveModel}" 不存在或不是绘图模型（例如智谱生图模型为 cogview-3-flash / cogview-4，OpenAI 为 dall-e-3）。`;
      }
      return {
        success: false,
        model: effectiveModel,
        prompt,
        error: `HTTP ${res.status}: ${errText.slice(0, 500)}${hint}`,
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
        model: effectiveModel,
        prompt,
        error: `响应未包含有效图片 URL: ${JSON.stringify(data).slice(0, 200)}`,
        latencyMs,
      };
    }

    return {
      success: true,
      model: effectiveModel,
      imageUrl,
      prompt,
      latencyMs,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      model: effectiveModel,
      prompt,
      error: error?.message || '图片生成接口调用失败',
      latencyMs,
    };
  }
}
