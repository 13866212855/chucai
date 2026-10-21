'use client';

import React, { useState, useEffect } from 'react';
import { OutingRecord, ApprovalStatus } from '@/types/outing';
import { X, CheckCircle2, XCircle, Archive, AlertCircle, FileText, UserCheck } from 'lucide-react';

interface AdminApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: OutingRecord | null;
  actionType: 'approve' | 'reject' | 'archive';
  onConfirm: (
    recordId: string,
    status: ApprovalStatus,
    approverName: string,
    approverNote: string
  ) => Promise<void>;
}

export function AdminApprovalModal({
  isOpen,
  onClose,
  record,
  actionType,
  onConfirm,
}: AdminApprovalModalProps) {
  const getDefaultNote = (type: 'approve' | 'reject' | 'archive') => {
    if (type === 'approve') return '同意申请，请严格遵守财务差旅标准并注意安全防范。';
    if (type === 'reject') return '预算明细不充分，请补齐行程计划与必要佐证资料后重新提交。';
    return '出差任务已完成，票据核验无误，予以结案归档。';
  };

  const [approverName, setApproverName] = useState('李建华（部门总监）');
  const [approverNote, setApproverNote] = useState(() => getDefaultNote(actionType));
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let targetStatus: ApprovalStatus = '已审批';
      if (actionType === 'reject') targetStatus = '已驳回';
      if (actionType === 'archive') targetStatus = '已归档';

      await onConfirm(record.id, targetStatus, approverName.trim(), approverNote.trim());
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionConfig = () => {
    switch (actionType) {
      case 'approve':
        return {
          title: '审批通过申请',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          headerBg: 'from-emerald-950 via-slate-900 to-emerald-950',
          btnText: '确认审批通过',
          btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
          presetNotes: [
            '同意申请，请严格遵守财务差旅标准并注意安全防范。',
            '审批通过，交付节点明确，祝出差顺利。',
            '符合业务审批要求，同意列支差旅预算。',
          ],
        };
      case 'reject':
        return {
          title: '驳回申请退回修改',
          icon: <XCircle className="w-5 h-5 text-rose-400" />,
          headerBg: 'from-rose-950 via-slate-900 to-rose-950',
          btnText: '确认驳回申请',
          btnClass: 'bg-rose-600 hover:bg-rose-500 text-white',
          presetNotes: [
            '预算明细不充分，请补齐行程计划与必要佐证资料后重新提交。',
            '时间安排与核心研发周期冲突，建议调整出行时间。',
            '同行人员较多且预算超出标准上限，请核减后再报。',
          ],
        };
      case 'archive':
        return {
          title: '审核归档结案',
          icon: <Archive className="w-5 h-5 text-blue-400" />,
          headerBg: 'from-blue-950 via-slate-900 to-blue-950',
          btnText: '确认归档结案',
          btnClass: 'bg-blue-600 hover:bg-blue-500 text-white',
          presetNotes: [
            '出差任务已完成，票据核验无误，予以结案归档。',
            '外出培训总结与结业证书已归档，账务核销完毕。',
          ],
        };
    }
  };

  const config = getActionConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className={`px-5 py-4 bg-gradient-to-r ${config.headerBg} text-white flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            {config.icon}
            <h3 className="text-base font-bold text-white">{config.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-800">
          {/* Target Record Info Summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">{record.title}</span>
              <span className="font-mono text-slate-500 text-[11px]">{record.id}</span>
            </div>
            <p className="text-slate-600">
              申请人：<strong className="text-slate-900">{record.applicantName}</strong>（{record.department || '研发中心'}） ·
              行程：{record.destinations?.join(' ➔ ') || '未设置'} · 预算：¥{record.budget}
            </p>
          </div>

          {/* Approver Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              审批人签名 / 职务
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserCheck className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="请输入审批人员姓名与职务"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Approver Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {actionType === 'reject' ? '驳回原因说明' : '审批意见 / 批复批示'}
            </label>
            <textarea
              rows={3}
              value={approverNote}
              onChange={(e) => setApproverNote(e.target.value)}
              placeholder="请输入具体的审核处理意见或驳回说明..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            />

            {/* Quick preset chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-400 py-0.5">常用评语：</span>
              {config.presetNotes.map((note, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setApproverNote(note)}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                >
                  {note.slice(0, 16)}...
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-lg font-semibold text-xs shadow-sm transition-all disabled:opacity-50 ${config.btnClass}`}
            >
              {isSubmitting ? '正在处理...' : config.btnText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
