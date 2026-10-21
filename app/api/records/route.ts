import { NextRequest, NextResponse } from 'next/server';
import { getAllRecords, createRecord, getDraftRecord } from '@/lib/db';
import { OutingFilterParams } from '@/types/outing';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const draftOnly = searchParams.get('draft') === 'true';

    if (draftOnly) {
      const draft = await getDraftRecord();
      return NextResponse.json({ success: true, data: draft });
    }

    const filters: OutingFilterParams = {
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      keyword: searchParams.get('keyword') || undefined,
      city: searchParams.get('city') || undefined,
      month: searchParams.get('month') || undefined,
    };

    const records = await getAllRecords(filters);
    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error('Error fetching outing records:', error);
    return NextResponse.json({ success: false, error: error?.message || '获取外出记录失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title && !body.isDraft) {
      return NextResponse.json({ success: false, error: '活动主题不能为空' }, { status: 400 });
    }

    const record = await createRecord(body);
    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error('Error creating outing record:', error);
    return NextResponse.json({ success: false, error: error?.message || '保存外出记录失败' }, { status: 500 });
  }
}
