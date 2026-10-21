import { NextRequest, NextResponse } from 'next/server';
import { batchUpdateStatus, batchDeleteRecords } from '@/lib/db';
import { ApprovalStatus } from '@/types/outing';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ids, approverName, approverNote } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '请选择至少一条记录进行操作' },
        { status: 400 }
      );
    }

    if (action === 'delete') {
      const count = await batchDeleteRecords(ids);
      return NextResponse.json({
        success: true,
        message: `成功删除 ${count} 条外出记录`,
        count,
      });
    }

    let targetStatus: ApprovalStatus | null = null;
    if (action === 'approve') targetStatus = '已审批';
    else if (action === 'reject') targetStatus = '已驳回';
    else if (action === 'archive') targetStatus = '已归档';
    else if (action === 'pending') targetStatus = '待审批';

    if (!targetStatus) {
      return NextResponse.json(
        { success: false, error: '不支持的操作类型' },
        { status: 400 }
      );
    }

    const count = await batchUpdateStatus(
      ids,
      targetStatus,
      approverName || '系统管理员',
      approverNote
    );

    return NextResponse.json({
      success: true,
      message: `成功处理 ${count} 条记录，状态变更为【${targetStatus}】`,
      count,
    });
  } catch (error: any) {
    console.error('Batch action error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '批量处理失败' },
      { status: 500 }
    );
  }
}
