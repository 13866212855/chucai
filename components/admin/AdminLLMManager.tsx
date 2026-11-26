'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  Key,
  Globe,
  Bot,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
  Download,
  Info,
} from 'lucide-react';
import { LLMSettings } from '@/lib/settings';

export function AdminLLMManager() {
  // Settings Form State
  const [settings, setSettings] = useState<LLMSettings>({
    baseUrl: 'https://apihub.agnes-ai.com/v1',
    apiKey: 'sk-vWM7RHG5n7bljBNi3GgHfygxqiKlUYrPWZLLSUByIGm4BiM9',
    textModel: 'Agnes-2.5-flash',
    imageModel: 'Agnes-Image-2.1-flash',
    temperature: 0.7,
    systemPrompt: '你是一个专业的企业行政与外出事务管理AI助手，能够高效协助审核、总结外出行程及预算合理性。',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saveSuccessTip, setSaveSuccessTip] = useState<string | null>(null);
  const [saveErrorTip, setSaveErrorTip] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const PROVIDER_PRESETS = [
    {
      label: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      textModel: 'deepseek-chat',
      imageModel: 'dall-e-3',
    },
    {
      label: '通义千问 (阿里云)',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      textModel: 'qwen-plus',
      imageModel: 'wanx2.1-t2i-turbo',
    },
    {
      label: '硅基流动 SiliconFlow',
      baseUrl: 'https://api.siliconflow.cn/v1',
      textModel: 'Qwen/Qwen2.5-72B-Instruct',
      imageModel: 'black-forest-labs/FLUX.1-schnell',
    },
    {
      label: '智谱 GLM (通用)',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      textModel: 'glm-4-flash',
      imageModel: 'cogview-3-flash',
    },
    {
      label: '智谱 Coding 套餐',
      baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
      textModel: 'glm-4.7',
      imageModel: 'cogview-3-flash',
    },
    {
      label: 'OpenAI 官方',
      baseUrl: 'https://api.openai.com/v1',
      textModel: 'gpt-4o-mini',
      imageModel: 'dall-e-3',
    },
    {
      label: 'ApiHub Agnes',
      baseUrl: 'https://apihub.agnes-ai.com/v1',
      textModel: 'Agnes-2.5-flash',
      imageModel: 'Agnes-Image-2.1-flash',
    },
  ];

  // Text Model Test State
  const [textPrompt, setTextPrompt] = useState(
    '作为企业行政主管，请列举员工外出差旅审批时最重要的3项合规审查要点。'
  );
  const [isTestingText, setIsTestingText] = useState(false);
  const [textTestResult, setTextTestResult] = useState<any>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Image Model Test State
  const [imagePrompt, setImagePrompt] = useState(
    '现代企业出差差旅事务管理与无纸化审批移动端插画，商务科技极简风格，蓝白基调'
  );
  const [isTestingImage, setIsTestingImage] = useState(false);
  const [imageTestResult, setImageTestResult] = useState<any>(null);

  // Fetch initial settings
  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/llm/settings');
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
      }
    } catch (err) {
      console.error('Failed to load LLM settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/admin/llm/settings');
        const data = await res.json();
        if (isMounted && data.success && data.data) {
          const loaded = { ...data.data };
          if (loaded.imageModel && loaded.imageModel.startsWith('sk-')) {
            loaded.imageModel = 'Agnes-Image-2.1-flash';
          }
          setSettings(loaded);
        }
      } catch (err) {
        console.error('Failed to load LLM settings:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessTip(null);
    setSaveErrorTip(null);

    if (settings.imageModel.trim().startsWith('sk-')) {
      setSaveErrorTip('「图片模型名称」误填成了 sk- 开头的密钥（可能被浏览器自动填充覆盖），请改为模型名如 Agnes-Image-2.1-flash 或 dall-e-3');
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/llm/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessTip('大模型参数已持久化保存成功！');
        setTimeout(() => setSaveSuccessTip(null), 3000);
      } else {
        setSaveErrorTip(data.error || '保存参数失败');
      }
    } catch (err: any) {
      setSaveErrorTip('网络异常，无法保存大模型参数');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults (inline two-step confirm without window.confirm)
  const handleResetDefaults = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }

    setConfirmReset(false);
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/llm/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
        setSaveSuccessTip('已恢复为系统默认参数！');
        setTimeout(() => setSaveSuccessTip(null), 3000);
      }
    } catch {
      setSaveErrorTip('重置默认参数失败');
    } finally {
      setIsSaving(false);
    }
  };

  // Run Text Test
  const handleTestText = async () => {
    if (!textPrompt.trim()) return;
    setIsTestingText(true);
    setTextTestResult(null);

    try {
      const res = await fetch('/api/admin/llm/test-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textPrompt.trim(),
          customConfig: settings,
        }),
      });
      const rawText = await res.text();
      try {
        const result = JSON.parse(rawText);
        setTextTestResult(result);
      } catch {
        setTextTestResult({
          success: false,
          model: settings.textModel,
          error: `接口返回非 JSON 内容 (HTTP ${res.status}): ${rawText.slice(0, 180)}`,
          latencyMs: 0,
        });
      }
    } catch (err: any) {
      setTextTestResult({
        success: false,
        model: settings.textModel,
        error: err?.message || '发起测试请求失败',
        latencyMs: 0,
      });
    } finally {
      setIsTestingText(false);
    }
  };

  // Run Image Test
  const handleTestImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsTestingImage(true);
    setImageTestResult(null);

    try {
      const res = await fetch('/api/admin/llm/test-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          customConfig: settings,
        }),
      });
      const rawText = await res.text();
      try {
        const result = JSON.parse(rawText);
        setImageTestResult(result);
      } catch {
        setImageTestResult({
          success: false,
          model: settings.imageModel,
          prompt: imagePrompt,
          error: `接口返回非 JSON 内容 (HTTP ${res.status}): ${rawText.slice(0, 180)}`,
          latencyMs: 0,
        });
      }
    } catch (err: any) {
      setImageTestResult({
        success: false,
        model: settings.imageModel,
        prompt: imagePrompt,
        error: err?.message || '发起图片测试请求失败',
        latencyMs: 0,
      });
    } finally {
      setIsTestingImage(false);
    }
  };

  // Copy text result
  const handleCopyText = () => {
    if (textTestResult?.response) {
      navigator.clipboard.writeText(textTestResult.response);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Model Parameters Configuration Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                大模型接口与核心参数配置（前台智能填表同步使用此模型）
              </h2>
              <p className="text-[11px] text-slate-300">
                支持任何 OpenAI 兼容协议接口（DeepSeek / 通义千问 / 硅基流动 / 智谱 / ApiHub Agnes 等），保存后即时生效
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isSaving}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              confirmReset
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{confirmReset ? '再次点击确认重置' : '恢复默认值'}</span>
          </button>
        </div>

        <form onSubmit={handleSaveSettings} autoComplete="off" className="p-5 space-y-4 text-xs">
          {/* Upstream Default Key Notice & Quick Provider Presets */}
          <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>接口说明：</strong>
                若测试默认 <code className="bg-amber-100 px-1 rounded">sk-vWM7...</code> 密钥出现{' '}
                <code className="bg-amber-100 px-1 rounded">HTTP 403 (unusual activity)</code>
                ，表示该公共试用密钥已被 AgnesAI 上游风控限制，请在下方一键切换服务商并填入您自己的 API Key 后点击「保存大模型参数配置」。
                <span className="text-amber-700">
                  （注：即使暂未更换可用密钥，前台“一键智能回填”也会自动启用本地规则 + 历史记录兜底填表。）
                </span>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-amber-200/70">
              <span className="text-[11px] font-semibold text-amber-800 mr-1">常用服务商快速预设:</span>
              {PROVIDER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setSettings((prev) => ({
                      ...prev,
                      baseUrl: preset.baseUrl,
                      textModel: preset.textModel,
                      imageModel: preset.imageModel,
                    }));
                    setSaveSuccessTip(`已套用「${preset.label}」接口地址与模型名，请填写对应的 API Key 后保存。`);
                    setTimeout(() => setSaveSuccessTip(null), 4000);
                  }}
                  className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 text-amber-900 border border-amber-300/80 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {saveSuccessTip && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessTip}</span>
            </div>
          )}

          {saveErrorTip && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveErrorTip}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Base URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>API 接口地址 (Base URL)</span>
              </label>
              <input
                type="url"
                name="llm_base_url"
                autoComplete="off"
                value={settings.baseUrl}
                onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                placeholder="例如：https://apihub.agnes-ai.com/v1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                OpenAI 兼容协议基础端点，默认为 https://apihub.agnes-ai.com/v1
              </span>
            </div>

            {/* API Key */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span>API 访问密钥 (API Key)</span>
                </label>
                {settings.apiKey === 'sk-vWM7RHG5n7bljBNi3GgHfygxqiKlUYrPWZLLSUByIGm4BiM9' && (
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, apiKey: '' })}
                    className="text-[10px] text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded font-medium cursor-pointer"
                  >
                    默认试用 Key 已失效 · 点击清空以填写新 Key
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  name="llm_api_key"
                  autoComplete="new-password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="请粘贴您自己的 sk-... 密钥"
                  className={`w-full pl-3 pr-10 py-2 border rounded-lg text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white ${
                    settings.apiKey === 'sk-vWM7RHG5n7bljBNi3GgHfygxqiKlUYrPWZLLSUByIGm4BiM9'
                      ? 'bg-rose-50/50 border-rose-300'
                      : 'bg-slate-50 border-slate-300'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                鉴权 Token，请填写您自己账号申请的可用密钥并点击保存
              </span>
            </div>

            {/* Text Model */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-indigo-600" />
                  <span>文本模型名称 (Text Model)</span>
                </label>
                {/^gml[-_]/i.test(settings.textModel.trim()) && (
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        textModel: settings.textModel.trim().replace(/^gml/i, 'glm'),
                      })
                    }
                    className="text-[10px] text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded font-medium cursor-pointer"
                  >
                    拼写疑似有误（gml→glm）· 点击一键修正
                  </button>
                )}
              </div>
              <input
                type="text"
                name="llm_text_model"
                autoComplete="off"
                value={settings.textModel}
                onChange={(e) => setSettings({ ...settings, textModel: e.target.value })}
                placeholder="例如：glm-4.7 或 deepseek-chat"
                className={`w-full px-3 py-2 border rounded-lg text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white ${
                  /^gml[-_]/i.test(settings.textModel.trim())
                    ? 'bg-rose-50/50 border-rose-300'
                    : 'bg-slate-50 border-slate-300'
                }`}
                required
              />
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="text-[10px] text-slate-400">快速设置:</span>
                {['glm-4.7', 'glm-4.5', 'glm-5', 'glm-4-flash', 'deepseek-chat', 'gpt-4o-mini'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSettings({ ...settings, textModel: m })}
                    className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Model */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>图片模型名称 (Image Model)</span>
                </label>
                {settings.imageModel.startsWith('sk-') ? (
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, imageModel: 'cogview-3-flash' })}
                    className="text-[10px] text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded font-medium cursor-pointer"
                  >
                    误填成密钥，点击恢复默认模型名
                  </button>
                ) : (
                  /^(glm-[345]|gml-|deepseek)/i.test(settings.imageModel.trim()) && (
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, imageModel: 'cogview-3-flash' })}
                      className="text-[10px] text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded font-medium cursor-pointer"
                    >
                      当前为文本模型 · 点击切为生图模型 cogview-3-flash
                    </button>
                  )
                )}
              </div>
              <input
                type="text"
                name="llm_image_model"
                autoComplete="off"
                value={settings.imageModel}
                onChange={(e) => setSettings({ ...settings, imageModel: e.target.value })}
                placeholder="例如：cogview-3-flash 或 dall-e-3"
                className={`w-full px-3 py-2 border rounded-lg text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white ${
                  settings.imageModel.startsWith('sk-') ||
                  /^(glm-[345]|gml-|deepseek)/i.test(settings.imageModel.trim())
                    ? 'bg-amber-50/60 border-amber-300'
                    : 'bg-slate-50 border-slate-300'
                }`}
                required
              />
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="text-[10px] text-slate-400">快速设置:</span>
                {['cogview-3-flash', 'cogview-4', 'dall-e-3', 'Agnes-Image-2.1-flash'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSettings({ ...settings, imageModel: m })}
                    className="text-[10px] text-purple-600 hover:underline cursor-pointer"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Temperature & System Prompt */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                生成随机度 Temperature ({settings.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1.2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) =>
                  setSettings({ ...settings, temperature: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>严谨 (0.0)</span>
                <span>平衡 (0.7)</span>
                <span>创意 (1.2)</span>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                默认系统提示词 (System Prompt)
              </label>
              <input
                type="text"
                value={settings.systemPrompt || ''}
                onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                placeholder="设定大模型的基础人设与业务规范..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              * 修改后请点击保存，配置将写入服务器 SQLite / 本地配置文件永久生效
            </span>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>正在保存...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>保存大模型参数配置</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Interactive Testing Panels (Text & Image) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel A: Text Model Testing */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-blue-300" />
              <h3 className="text-xs sm:text-sm font-bold text-white">
                文本大模型测试 · {settings.textModel}
              </h3>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30">
              /chat/completions
            </span>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col text-xs">
            {/* Presets */}
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-[11px] text-slate-400">快捷用例:</span>
              {[
                '审核外出差旅审批3项原则',
                '为3名研发去深圳拟定行程总结',
                '分析差旅预算超额的合规建议',
              ].map((text, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTextPrompt(text)}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                >
                  {text}
                </button>
              ))}
            </div>

            {/* Prompt Input */}
            <div>
              <textarea
                rows={3}
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder="请输入用于测试大模型文本生成的 Prompt 提示词..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
              />
            </div>

            {/* Trigger Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleTestText}
                disabled={isTestingText}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {isTestingText ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>正在请求 Agnes 文本模型...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>发送测试请求</span>
                  </>
                )}
              </button>
            </div>

            {/* Results Display */}
            <div className="mt-2 flex-1 min-h-[160px] bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
              {textTestResult ? (
                <div className="space-y-2">
                  {/* Status header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-[11px]">
                    <div className="flex items-center space-x-2">
                      {textTestResult.success ? (
                        <span className="flex items-center text-emerald-700 font-semibold gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          请求成功 (200 OK)
                        </span>
                      ) : (
                        <span className="flex items-center text-rose-700 font-semibold gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          请求失败
                        </span>
                      )}
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {textTestResult.latencyMs}ms
                      </span>
                    </div>

                    {textTestResult.response && (
                      <button
                        type="button"
                        onClick={handleCopyText}
                        className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedText ? '已复制' : '复制回复'}</span>
                      </button>
                    )}
                  </div>

                  {/* Content body */}
                  {textTestResult.success ? (
                    <div className="text-slate-800 text-xs whitespace-pre-wrap leading-relaxed">
                      {textTestResult.response}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
                      {textTestResult.error}
                    </div>
                  )}

                  {/* Usage / Token counters */}
                  {textTestResult.tokens?.totalTokens !== undefined && (
                    <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
                      Token 统计：提示 {textTestResult.tokens.promptTokens || 0} + 生成{' '}
                      {textTestResult.tokens.completionTokens || 0} = 共计{' '}
                      {textTestResult.tokens.totalTokens} Tokens
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                  <Bot className="w-8 h-8 text-slate-300 mb-1" />
                  <p className="text-xs">点击上方按钮测试 {settings.textModel} 连通性与回复质量</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel B: Image Model Testing */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-purple-300" />
              <h3 className="text-xs sm:text-sm font-bold text-white">
                图片大模型测试 · {settings.imageModel}
              </h3>
            </div>
            <span className="text-[10px] bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/30">
              /images/generations
            </span>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col text-xs">
            {/* Presets */}
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-[11px] text-slate-400">快捷画图:</span>
              {[
                '现代企业外出差旅商务封面',
                '无纸化OA审批流程图解插画',
                '高铁出差旅行科技矢量图',
              ].map((text, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setImagePrompt(text)}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                >
                  {text}
                </button>
              ))}
            </div>

            {/* Prompt Input */}
            <div>
              <textarea
                rows={3}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="请输入图片生成 Prompt 描述词..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white resize-none"
              />
            </div>

            {/* Trigger Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleTestImage}
                disabled={isTestingImage}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {isTestingImage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>正在请求 Agnes 绘图模型...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>生成测试图片</span>
                  </>
                )}
              </button>
            </div>

            {/* Results Display */}
            <div className="mt-2 flex-1 min-h-[160px] bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
              {imageTestResult ? (
                <div className="space-y-3">
                  {/* Status header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-[11px]">
                    <div className="flex items-center space-x-2">
                      {imageTestResult.success ? (
                        <span className="flex items-center text-emerald-700 font-semibold gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          生成成功
                        </span>
                      ) : (
                        <span className="flex items-center text-rose-700 font-semibold gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          生成失败
                        </span>
                      )}
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {imageTestResult.latencyMs}ms
                      </span>
                    </div>

                    {imageTestResult.imageUrl && (
                      <a
                        href={imageTestResult.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-600 hover:text-purple-800 flex items-center gap-1 text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>查看大图</span>
                      </a>
                    )}
                  </div>

                  {/* Image render */}
                  {imageTestResult.success && imageTestResult.imageUrl ? (
                    <div className="relative group overflow-hidden rounded-xl border border-slate-200 bg-black/5 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageTestResult.imageUrl}
                        alt="Agnes 绘图结果"
                        className="max-h-72 w-auto object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
                      {imageTestResult.error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                  <ImageIcon className="w-8 h-8 text-slate-300 mb-1" />
                  <p className="text-xs">点击上方按钮测试 {settings.imageModel} 图片生成能力</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
