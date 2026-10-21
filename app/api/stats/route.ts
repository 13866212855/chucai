import { NextResponse } from 'next/server';
import { getStats } from '@/lib/db';

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error getting stats:', error);
    return NextResponse.json({ success: false, error: error?.message || '获取统计数据失败' }, { status: 500 });
  }
}
