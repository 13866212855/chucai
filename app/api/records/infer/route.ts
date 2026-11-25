import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { getAllRecords } from '@/lib/db';

interface InferFilePayload {
  name: string;
  type: string;
  dataUrl?: string;
  extractedText?: string;
}

interface InferRequestBody {
  files: InferFilePayload[];
  historyRecords?: Array<{
    applicantName?: string;
    department?: string;
    activityType?: string;
    title?: string;
    destinations?: string[];
    startTime?: string;
    endTime?: string;
    durationDays?: number;
    budget?: number;
    budgetBreakdown?: {
      transport?: number;
      accommodation?: number;
      meals?: number;
      other?: number;
    };
    notes?: string;
  }>;
}

const INFER_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    activityType: {
      type: Type.STRING,
      description: '活动类型，必须是 "出差"、"学习培训"、"其他" 之一。',
    },
    title: {
      type: Type.STRING,
      description: '活动主题或主要事由，简明扼要，符合公文/出差报销单填写规范。',
    },
    departure: {
      type: Type.STRING,
      description: '出发地名称，优先沿用历史记录中的常用出发地（如“耿棚”）。',
    },
    destination: {
      type: Type.STRING,
      description: '主要目的地名称，优先从上传的通知/文件中提取精确地点（如“颍上县青少年活动中心蒲公英剧场”或具体单位/城市）。',
    },
    waypoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '途经站点列表，若无途经站点则为空数组。',
    },
    startTime: {
      type: Type.STRING,
      description: '出发或活动开始时间，必须严格使用 YYYY-MM-DDTHH:mm 格式（例如 2026-11-25T08:00）。',
    },
    endTime: {
      type: Type.STRING,
      description: '返回或活动结束时间，必须严格使用 YYYY-MM-DDTHH:mm 格式（例如 2026-11-25T11:40）。',
    },
    durationDays: {
      type: Type.INTEGER,
      description: '外出总天数，必须是大于等于 1 的正整数，当天往返为 1。',
    },
    budgetBreakdown: {
      type: Type.OBJECT,
      properties: {
        transport: { type: Type.NUMBER, description: '城际交通费预估（元）' },
        accommodation: { type: Type.NUMBER, description: '住宿费预估（元），当天往返通常为 0' },
        meals: { type: Type.NUMBER, description: '餐饮/伙食补助预估（元）' },
        other: { type: Type.NUMBER, description: '其他杂费预估（元）' },
      },
      required: ['transport', 'accommodation', 'meals', 'other'],
    },
    applicantName: {
      type: Type.STRING,
      description: '申请人姓名，优先沿用历史记录常用姓名；若文件中明确指定了参会/出差个人则提取该姓名。',
    },
    department: {
      type: Type.STRING,
      description: '所属部门，优先沿用历史记录中的常用部门；若文件中明确指定则提取。',
    },
    notes: {
      type: Type.STRING,
      description: '补充备注说明，汇总通知文号、报到签到时间、联系人及电话等关键辅助信息。',
    },
    reasoning: {
      type: Type.STRING,
      description: '用1-2句中文说明本次智能推断的依据（例如识别了哪份通知的时间地点、参考了历史记录中的出发地与预算标准）。',
    },
  },
  required: [
    'activityType',
    'title',
    'departure',
    'destination',
    'waypoints',
    'startTime',
    'endTime',
    'durationDays',
    'budgetBreakdown',
    'applicantName',
    'department',
    'notes',
    'reasoning',
  ],
};

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return NextResponse.json(
        {
          success: false,
          error: '未检测到有效的 GEMINI_API_KEY，请在 AI Studio 的 Settings > Secrets 面板中配置后重试。',
        },
        { status: 500 }
      );
    }

    const body = (await req.json()) as InferRequestBody;
    const files = Array.isArray(body?.files) ? body.files : [];

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: '请先上传至少一份通知文件、公函或微信截图。' },
        { status: 400 }
      );
    }

    // Fetch historical records from SQLite as ground truth context
    let dbHistory: any[] = [];
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

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // Attach uploaded document contents
    for (const file of files.slice(0, 4)) {
      if (file.extractedText && file.extractedText.trim()) {
        parts.push({
          text: `【上传文档内容 - ${file.name}】\n${file.extractedText.slice(0, 20000)}`,
        });
        continue;
      }

      if (file.dataUrl) {
        const parsed = parseDataUrl(file.dataUrl);
        if (parsed) {
          const supportedInline =
            parsed.mimeType === 'application/pdf' ||
            parsed.mimeType.startsWith('image/');

          if (supportedInline) {
            parts.push({
              text: `【上传文件：${file.name} (${parsed.mimeType})】`,
            });
            parts.push({
              inlineData: {
                mimeType: parsed.mimeType,
                data: parsed.data,
              },
            });
            continue;
          }

          if (parsed.mimeType.startsWith('text/')) {
            try {
              const decoded = Buffer.from(parsed.data, 'base64').toString('utf8');
              parts.push({
                text: `【上传文本文件 - ${file.name}】\n${decoded.slice(0, 20000)}`,
              });
              continue;
            } catch {
              // ignore decode error
            }
          }
        }
      }

      parts.push({
        text: `【上传文件名参考】${file.name}`,
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const promptText = `你是一位经验丰富的行政与财务报账智能助手。请仔细阅读上面用户本次上传的通知公函、截图或文档，并结合用户过往历史外出记录，智能推断出新建外出事务表单最合理的默认填写内容。

当前日期：${todayStr}

【用户历史外出记录参考（按最近时间排序）】：
${JSON.stringify(mergedHistory, null, 2)}

【严格推断规则】：
1. **活动类型 (activityType)**：只能从 "出差"、"学习培训"、"其他" 中三选一。若通知/文件涉及培训、研修、教研、讲座、学习等，优先选 "学习培训"；若涉及会议、验收、考察、汇报、调研等公务出行，选 "出差"。
2. **活动主题/主要事由 (title)**：从通知标题或正文提炼简洁标准的填写内容（如“参加2026年“智慧徽师成长计划”系列培训”或去掉“关于开展……的通知”外壳后的核心事由）。
3. **路线与地点 (departure, destination, waypoints)**：
   - **departure（出发地）**：优先沿用历史记录中最常使用的出发地（例如历史记录中的 "耿棚"），除非文件明确指出从别处集中出发。
   - **destination（目的地）**：必须精准提取本次上传文件中给出的会议/培训/出差具体地点（如“颍上县青少年活动中心蒲公英剧场”或具体城市/学校/机构名）。
4. **时间与天数 (startTime, endTime, durationDays)**：
   - 仔细阅读文件中的会议/培训日期、签到时间与结束时间，严格输出为 \`YYYY-MM-DDTHH:mm\` 格式。
   - 若文件写有签到时间（例如“2026年11月25日8:30-11:40（8:00-8:25签到）”），\`startTime\` 可设为 \`2026-11-25T08:00\`（或合理提前至签到时间），\`endTime\` 设为 \`2026-11-25T11:40\`。
   - 若文件只有日期没有具体时刻，开始默认 \`08:30\`，结束默认 \`17:30\`。
   - **durationDays** 必须是 >= 1 的整数（当天往返就是 1 天，跨天按自然日差+1或整天计，绝不能有小数）。
5. **差旅费用预算 (budgetBreakdown)**：
   - 优先参考历史记录中**相同或相近目的地、相同天数、相同活动类型**的费用标准进行推断。
   - 若为本地/同县当日往返（\`durationDays === 1\`），\`accommodation\`（住宿费）应合理推断为 \`0\`；若历史记录中有单日交通费、伙食补助标准（例如单日伙食补助 50 元，同城/县内交通 50~100 元），请结合历史习惯给出合理预算数值。
   - 若上传文件本身是车票、住宿发票或包含明确费用金额，直接提取该实际金额。
6. **申请人与部门 (applicantName, department)**：
   - 默认沿用历史记录中最新的申请人姓名与部门；若文件中（如回执名单/点名通知）明确写出了具体参会个人姓名或部门，可酌情采纳，否则保持历史常用值。
7. **补充备注 (notes)**：
   - 提取文件文号（如“颖教电函〔2026〕13号”）、签到要求、联系人及电话等实用备忘信息。

请以合法 JSON 返回推断结果。`;

    parts.push({ text: promptText });

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: INFER_RESPONSE_SCHEMA,
      },
    });

    const rawText = (response.text || '').trim();
    if (!rawText) {
      return NextResponse.json(
        { success: false, error: 'AI 模型未返回有效的识别内容，请重试。' },
        { status: 502 }
      );
    }

    const inferred = JSON.parse(rawText);

    // Normalize & validate fields safely
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
        const trimmed = String(wp || '').trim();
        if (trimmed && !destinations.includes(trimmed)) {
          destinations.push(trimmed);
        }
      }
    }

    if (inferred.destination && String(inferred.destination).trim()) {
      const destTrimmed = String(inferred.destination).trim();
      if (destinations[destinations.length - 1] !== destTrimmed) {
        destinations.push(destTrimmed);
      }
    } else if (destinations.length < 2) {
      destinations.push(mergedHistory[0]?.destinations?.[mergedHistory[0]?.destinations?.length - 1] || '颍上');
    }

    const normalized = {
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
      applicantName: String(inferred.applicantName || '').trim(),
      department: String(inferred.department || '').trim(),
      notes: String(inferred.notes || '').trim(),
      reasoning: String(inferred.reasoning || '已结合上传文件与历史记录自动推断表单内容').trim(),
    };

    return NextResponse.json({ success: true, data: normalized });
  } catch (error: any) {
    console.error('Error inferring outing details from uploaded files:', error);
    const msg = error?.message || '智能识别文件失败，请检查网络或文件格式后重试';
    return NextResponse.json(
      { success: false, error: msg },
      { status: error?.status || 500 }
    );
  }
}
