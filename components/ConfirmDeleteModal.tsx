'use client';

import React from 'react';
import { OutingRecord } from '@/types/outing';
import { AlertTriangle, Trash2, X, MapPin, ArrowRight } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  record: OutingRecord | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  record,
  onClose,
  onConfirm,
  isDeleting,
}: ConfirmDeleteModalProps) {
  if (!isOpen || !record) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
      >
        {/* Header decoration */}
        <div className="bg-rose-50 border-b border-rose-100 px-5 pt-5 pb-4 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                确认删除此记录？
              </h3>
              <p className="text-xs text-rose-700 font-medium">
                此操作将永久移除且不可撤销
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Details */}
        <div className="p-5 space-y-3.5 text-xs">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm line-clamp-1">
                {record.title}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium shrink-0 ml-2">
                {record.activityType}
              </span>
            </div>

            {/* Route */}
            {record.destinations && record.destinations.length > 0 && (
              <div className="flex items-center flex-wrap gap-1 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-slate-400">路线：</span>
                {record.destinations.map((city, idx) => (
                  <React.Fragment key={idx}>
                    <span className="font-medium text-slate-800">{city}</span>
                    {idx < record.destinations.length - 1 && (
                      <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Sub info */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>申请人：{record.applicantName}</span>
              <span>编号：{record.id}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-slate-500 text-[11px] px-1">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>删除后该记录的相关凭据、审批单据数据将从 SQLite 数据库同步清除。</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5"
          >
            {isDeleting ? (
              <span>正在删除...</span>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>确认删除</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
