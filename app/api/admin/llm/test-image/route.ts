import { NextRequest, NextResponse } from 'next/server';
import { testImageModel } from '@/lib/llm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, customConfig } = body;

    const result = await testImageModel(prompt, customConfig);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || '测试图片大模型时发生未捕获异常',
      latencyMs: 0,
      model: 'unknown',
      prompt: '',
    });
  }
}
