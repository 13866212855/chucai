import { NextRequest, NextResponse } from 'next/server';
import { getLLMSettings, saveLLMSettings, resetLLMSettings, DEFAULT_LLM_SETTINGS } from '@/lib/settings';

export async function GET() {
  try {
    const settings = getLLMSettings();
    return NextResponse.json({
      success: true,
      data: settings,
      defaults: DEFAULT_LLM_SETTINGS,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || '获取大模型参数失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'reset') {
      const resetData = resetLLMSettings();
      return NextResponse.json({
        success: true,
        message: '大模型配置已恢复为默认参数',
        data: resetData,
      });
    }

    if (!body.baseUrl || !body.apiKey) {
      return NextResponse.json(
        { success: false, error: '接口地址 (baseUrl) 与密钥 (apiKey) 不能为空' },
        { status: 400 }
      );
    }

    const saved = saveLLMSettings(body);
    return NextResponse.json({
      success: true,
      message: '大模型参数已成功保存并立即生效',
      data: saved,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || '保存大模型参数失败' },
      { status: 500 }
    );
  }
}
