import { NextRequest, NextResponse } from 'next/server';
import { getAllRecords } from '@/lib/db';
import { getLLMSettings } from '@/lib/settings';
import { inferLocallyFromTextAndHistory, HistoryContextItem } from '@/lib/localInfer';

interface InferFilePayload {
  name: string;
  type: string;
  extractedText?: string;
  pageImages?: string[];
  imageDataUrl?: string;
}

interface InferRequestBody {
  files: InferFilePayload[];
  historyRecords?: HistoryContextItem[];
}

function extractJsonFromText(raw: string): any {
  const trimmed = (raw || '').trim();
  if (!trimmed) throw new Error('模型返回内容为空');

  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    // Strip markdown ```json ... ``` fences
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
      return JSON.parse(fenced[1].trim());
    }
    // Extract first {...} block
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('模型输出未能解析为有效 JSON');
  }
}

function formatUpstreamError(status: number, errText: string): string {
  if (status === 403 && errText.includes('unusual activity')) {
    return `HTTP 403：默认 Agnes 密钥已被上游服务临时限制，请前往「管理后台 -> 大模型参数与测试」更换可用的 API Key。`;
  }
  if (status === 401) {
    return `HTTP 401：API Key 无效或未授权，请在「管理后台 -> 大模型参数与测试」检查配置。`;
  }
  return `HTTP ${status}: ${errText.slice(0, 260)}`;
}

async function callOpenAICompatibleLLM(
  baseUrl: string,
  apiKey: string,
  model: string,
  temperature: number,
  systemPrompt: string,
  userTextPrompt: string,
  imageUrls: string[]
): Promise<string> {
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const makeRequest = async (useImages: boolean, useJsonMode: boolean) => {
    const userContent: any =
      useImages && imageUrls.length > 0
        ? [
            { type: 'text', text: userTextPrompt },
            ...imageUrls.slice(0, 3).map((url) => ({
              type: 'image_url',
              image_url: { url },
            })),
          ]
        : userTextPrompt;

    const payload: Record<string, any> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: typeof temperature === 'number' ? temperature : 0.3,
    };

    if (useJsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  };

  // Attempt 1: with images (if any) + json_object mode
  let res = await makeRequest(imageUrls.length > 0, true);

  // If rejected due to response_format or image_url incompatibility (400/422), retry gracefully
  if (!res.ok && (res.status === 400 || res.status === 422)) {
    const firstErr = await res.text();
    const hasImageIssue = imageUrls.length > 0 && /image|vision|multimodal|content/i.test(firstErr);
    res = await makeRequest(!hasImageIssue && imageUrls.length > 0, false);
    if (!res.ok && (res.status === 400 || res.status === 422) && imageUrls.length > 0) {
      // Pure text-only final retry
      res = await makeRequest(false, false);
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(formatUpstreamError(res.status, errText));
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('大模型返回内容为空');
  }
  return content;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InferRequestBody;
    const files = Array.isArray(body?.files) ? body.files : [];

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: '请先上传至少一份通知文件、公函或微信截图。' },
        { status: 400 }
      );
    }

    // Load historical records from SQLite
    let dbHistory: HistoryContextItem[] = [];
    try {
      const allRecords = await getAllRecords();
      dbHistory = allRecords.slice(0, 15).map((r) => ({
        applicantName: r.applicantName,
        department: r.department,
        activityType: r.activityType,
        title: r.title,
        destinations: r.destinations,
        startTime: r.startTime,
        endTime: r.endTime,
        durationDays: r.durationDays,
        budget: r.budget,
        budgetBreakdown: r.budgetBreakdown,
        notes: r.notes,
      }));
    } catch (e) {
      console.warn('Failed to load DB history for inference context:', e);
    }

    const clientHistory = Array.isArray(body?.historyRecords) ? body.historyRecords.slice(0, 10) : [];
    const mergedHistory = dbHistory.length > 0 ? dbHistory : clientHistory;

    // Collect text and images from uploaded files
    const docTextBlocks: string[] = [];
    const imageUrls: string[] = [];

    for (const file of files.slice(0, 4)) {
      docTextBlocks.push(`【文件名】${file.name}`);
      if (file.extractedText && file.extractedText.trim()) {
        docTextBlocks.push(`【文件内容】\n${file.extractedText.slice(0, 12000)}`);
      }
      if (Array.isArray(file.pageImages)) {
        for (const img of file.pageImages.slice(0, 2)) {
          if (img && img.startsWith('data:image/')) {
            imageUrls.push(img);
          }
        }
      }
      if (file.imageDataUrl && file.imageDataUrl.startsWith('data:image/')) {
        imageUrls.push(file.imageDataUrl);
      }
    }

    const settings = getLLMSettings();
    const todayStr = new Date().toISOString().slice(0, 10);

    const systemInstruction = `${settings.systemPrompt || '你是一个专业的企业行政与外出事务管理AI助手。'}
请严格按照 JSON 格式返回推断结果，不要输出额外解释性文字。`;

    const userPrompt = `请仔细分析本次上传的通知文件/纪要/图片，并结合用户历史外出记录，智能推断新建外出事务表单最合理的默认填写内容。

当前日期：${todayStr}

【上传文档与文件信息】：
${docTextBlocks.join('\n\n')}

【用户历史外出记录参考（按最近时间排序）】：
${JSON.stringify(mergedHistory, null, 2)}

【严格输出 JSON 字段要求】：
请仅返回一个合法 JSON 对象，必须包含以下字段：
{
  "activityType": "必须是 '出差'、'学习培训'、'其他' 之一（含培训/研修/教研/学习选'学习培训'，会议/考察/验收/报送选'出差'）",
  "title": "活动主题或主要事由，例如：参加2026年“智慧徽师成长计划”系列培训",
  "departure": "出发地，优先沿用历史记录常用出发地（如 '耿棚'）",
  "destination": "主要目的地/具体场所，优先提取文件中的精确地点（如 '颍上县青少年活动中心蒲公英剧场'）",
  "waypoints": ["途经站点，无则为空数组 []"],
  "startTime": "出发/开始时间，严格格式 YYYY-MM-DDTHH:mm（若有签到时间则取签到时间如 2026-11-25T08:00；仅有日期默认 08:30）",
  "endTime": "返回/结束时间，严格格式 YYYY-MM-DDTHH:mm（仅有日期默认 17:30）",
  "durationDays": 1,
  "budgetBreakdown": {
    "transport": 0,
    "accommodation": 0,
    "meals": 0,
    "other": 0
  },
  "applicantName": "申请人姓名（优先沿用历史常用值，若文件指定参会人则提取）",
  "department": "所属部门（优先沿用历史常用值）",
  "notes": "补充说明（提取文号、签到要求、联系人及电话等关键信息）",
  "reasoning": "用1-2句中文简述本次推断依据"
}

特别注意：
1. durationDays 必须是大于等于 1 的正整数（当天往返为 1，绝对不能出现小数）。
2. budgetBreakdown 请结合历史相同/相近目的地与天数的标准进行估算，当天往返住宿费 accommodation 应为 0。`;

    // Call backend-configured LLM (OpenAI-compatible endpoint from /admin)
    try {
      if (!settings.baseUrl || !settings.apiKey || !settings.textModel) {
        throw new Error('后台大模型参数未完整配置，请前往管理后台配置接口地址、密钥与模型名称。');
      }

      const rawReply = await callOpenAICompatibleLLM(
        settings.baseUrl,
        settings.apiKey,
        settings.textModel,
        Math.min(settings.temperature ?? 0.3, 0.5),
        systemInstruction,
        userPrompt,
        imageUrls
      );

      const inferred = extractJsonFromText(rawReply);

      const validTypes = ['出差', '学习培训', '其他'];
      const activityType = validTypes.includes(inferred.activityType) ? inferred.activityType : '出差';
      const durationDays = Math.max(1, Math.round(Number(inferred.durationDays) || 1));

      const destinations: string[] = [];
      if (inferred.departure && String(inferred.departure).trim()) {
        destinations.push(String(inferred.departure).trim());
      } else if (mergedHistory[0]?.destinations?.[0]) {
        destinations.push(mergedHistory[0].destinations[0]);
      } else {
        destinations.push('耿棚');
      }

      if (Array.isArray(inferred.waypoints)) {
        for (const wp of inferred.waypoints) {
          const t = String(wp || '').trim();
          if (t && !destinations.includes(t)) destinations.push(t);
        }
      }

      if (inferred.destination && String(inferred.destination).trim()) {
        const dest = String(inferred.destination).trim();
        if (destinations[destinations.length - 1] !== dest) {
          destinations.push(dest);
        }
      } else if (destinations.length < 2) {
        destinations.push(
          mergedHistory[0]?.destinations?.[mergedHistory[0]?.destinations?.length - 1] || '颍上'
        );
      }

      return NextResponse.json({
        success: true,
        source: 'llm',
        model: settings.textModel,
        data: {
          activityType,
          title: String(inferred.title || '').trim(),
          destinations,
          startTime: String(inferred.startTime || '').trim(),
          endTime: String(inferred.endTime || '').trim(),
          durationDays,
          budgetBreakdown: {
            transport: Math.max(0, Number(inferred.budgetBreakdown?.transport) || 0),
            accommodation: Math.max(0, Number(inferred.budgetBreakdown?.accommodation) || 0),
            meals: Math.max(0, Number(inferred.budgetBreakdown?.meals) || 0),
            other: Math.max(0, Number(inferred.budgetBreakdown?.other) || 0),
          },
          applicantName: String(inferred.applicantName || mergedHistory[0]?.applicantName || '张伟').trim(),
          department: String(inferred.department || mergedHistory[0]?.department || '技术研发中心').trim(),
          notes: String(inferred.notes || '').trim(),
          reasoning: String(
            inferred.reasoning || `已通过后台配置大模型 (${settings.textModel}) 结合历史记录完成智能推断`
          ).trim(),
        },
      });
    } catch (llmErr: any) {
      const llmErrorMsg = llmErr?.message || '后台大模型请求失败';
      console.warn('Configured LLM failed, falling back to local heuristic + history:', llmErrorMsg);

      const fallback = inferLocallyFromTextAndHistory(
        files.map((f) => ({ name: f.name, extractedText: f.extractedText })),
        mergedHistory
      );

      return NextResponse.json({
        success: true,
        source: 'local_fallback',
        model: settings.textModel,
        llmError: llmErrorMsg,
        data: fallback,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/records/infer:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '解析上传文件失败，请重试' },
      { status: 500 }
    );
  }
}
