import fs from 'fs';
import path from 'path';

export interface LLMSettings {
  baseUrl: string;
  apiKey: string;
  textModel: string;
  imageModel: string;
  temperature: number;
  systemPrompt?: string;
  updatedAt?: string;
}

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  baseUrl: 'https://apihub.agnes-ai.com/v1',
  apiKey: 'sk-vWM7RHG5n7bljBNi3GgHfygxqiKlUYrPWZLLSUByIGm4BiM9',
  textModel: 'Agnes-2.5-flash',
  imageModel: 'Agnes-Image-2.1-flash',
  temperature: 0.7,
  systemPrompt: '你是一个专业的企业行政与外出事务管理AI助手，能够高效协助审核、总结外出行程及预算合理性。',
  updatedAt: new Date().toISOString(),
};

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'llm_settings.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getLLMSettings(): LLMSettings {
  try {
    ensureDataDir();
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        ...DEFAULT_LLM_SETTINGS,
        ...parsed,
      };
    }
  } catch (error) {
    console.error('Failed to read LLM settings file:', error);
  }
  return { ...DEFAULT_LLM_SETTINGS };
}

export function saveLLMSettings(settings: Partial<LLMSettings>): LLMSettings {
  try {
    ensureDataDir();
    const current = getLLMSettings();
    const updated: LLMSettings = {
      ...current,
      ...settings,
      baseUrl: (settings.baseUrl || current.baseUrl).trim(),
      apiKey: (settings.apiKey || current.apiKey).trim(),
      textModel: (settings.textModel || current.textModel).trim(),
      imageModel: (settings.imageModel || current.imageModel).trim(),
      temperature: typeof settings.temperature === 'number' ? settings.temperature : current.temperature,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (error) {
    console.error('Failed to save LLM settings:', error);
    throw new Error('保存大模型参数失败');
  }
}

export function resetLLMSettings(): LLMSettings {
  try {
    ensureDataDir();
    const fresh: LLMSettings = {
      ...DEFAULT_LLM_SETTINGS,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(fresh, null, 2), 'utf-8');
    return fresh;
  } catch (error) {
    console.error('Failed to reset LLM settings:', error);
    throw new Error('重置大模型参数失败');
  }
}
