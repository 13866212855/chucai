'use client';

import React from 'react';
import { OutingRecord, ActivityType, ApprovalStatus } from '@/types/outing';
import { Calendar, Clock, MapPin, ArrowRight, Paperclip, Camera, FileText, ChevronRight, Edit3, Trash2 } from 'lucide-react';

interface RecordCardProps {
  record: OutingRecord;
  onViewApproval: (record: OutingRecord) => void;
  onEdit: (record: OutingRecord) => void;
  onDelete: (record: OutingRecord) => void;
  onViewDetails?: (record: OutingRecord) => void;
}

export function RecordCard({
  record,
  onViewApproval,
  onEdit,
  onDelete,
  onViewDetails,
}: RecordCardProps) {
  // Activity type styling
  const typeBadgeColors: Record<ActivityType, string> = {
    出差: 'bg-blue-50 text-blue-700 border-blue-200',
    学习培训: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    其他: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  // Status badge styling
  const statusBadgeColors: Record<ApprovalStatus, string> = {
    待审批: 'bg-amber-50 text-amber-700 border-amber-200',
    已审批: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    已归档: 'bg-slate-100 text-slate-700 border-slate-300',
    草稿: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  // Format date range nicely
  const formatDateTime = (dtStr: string) => {
    if (!dtStr) return '';
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return dtStr;
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${mins}`;
  };

  const fileCount = record.files?.length || 0;
  const photoCount = record.photos?.length || 0;

  return (
    <div
      id={`record-card-${record.id}`}
      className="bg-white rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-3.5 mb-3 overflow-hidden"
    >
      {/* Top Header: Type & Status */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center space-x-1.5">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${typeBadgeColors[record.activityType] || 'bg-slate-100 text-slate-700'}`}>
            {record.activityType}
          </span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-500 font-mono">
            {record.id}
          </span>
        </div>

        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusBadgeColors[record.status] || 'bg-slate-100 text-slate-700'}`}>
          {record.status}
        </span>
      </div>

      {/* Title */}
      <h3
        onClick={() => onViewDetails ? onViewDetails(record) : onViewApproval(record)}
        className="text-sm font-bold text-slate-900 line-clamp-2 hover:text-blue-700 cursor-pointer transition-colors mb-2"
      >
        {record.title}
      </h3>

      {/* Multi-stop destinations line */}
      <div className="bg-slate-50 rounded-lg p-2 mb-2.5 flex items-center flex-wrap gap-1 text-xs text-slate-700 border border-slate-100">
        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mr-0.5" />
        <span className="text-slate-500 text-[11px]">行程路线：</span>
        {record.destinations && record.destinations.length > 0 ? (
          record.destinations.map((city, idx) => (
            <React.Fragment key={idx}>
              <span className="font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200/70 text-[11px]">
                {city}
              </span>
              {idx < record.destinations.length - 1 && (
                <ArrowRight className="w-3 h-3 text-slate-400 mx-0.5" />
              )}
            </React.Fragment>
          ))
        ) : (
          <span className="text-slate-400 text-xs">未指定目的地</span>
        )}
      </div>

      {/* Time & Duration & Budget */}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-2.5">
        <div className="flex items-center space-x-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-700 truncate">
            {formatDateTime(record.startTime)} ~ {formatDateTime(record.endTime)}
          </span>
        </div>

        <div className="flex items-center justify-end space-x-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[11px]">
            {record.durationDays} 天
          </span>
          {record.budget > 0 && (
            <span className="text-slate-700 font-semibold font-mono text-[11px]">
              ¥{record.budget.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Attachments & Photos badges */}
      {(fileCount > 0 || photoCount > 0 || record.notes) && (
        <div className="flex items-center space-x-3 text-[11px] text-slate-500 mb-2.5 pt-1">
          {fileCount > 0 && (
            <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              <Paperclip className="w-3 h-3 text-blue-600" />
              <span>{fileCount} 份文件</span>
            </span>
          )}
          {photoCount > 0 && (
            <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              <Camera className="w-3 h-3 text-indigo-600" />
              <span>{photoCount} 张现场照</span>
            </span>
          )}
          {record.notes && (
            <span className="truncate text-slate-400 italic text-[11px]">
              备注: {record.notes}
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            id={`btn-edit-${record.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(record);
            }}
            className="flex items-center space-x-1 text-xs text-slate-700 hover:text-blue-700 bg-slate-100/90 hover:bg-blue-50 active:scale-95 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-all font-medium"
            title="编辑记录"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>编辑</span>
          </button>
          <button
            type="button"
            id={`btn-delete-${record.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(record);
            }}
            className="flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-700 bg-rose-50/80 hover:bg-rose-100 active:scale-95 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-all font-medium"
            title="删除记录"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>删除</span>
          </button>
        </div>

        {/* Generate Official Business Approval Slip */}
        <button
          type="button"
          id={`btn-approval-${record.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onViewApproval(record);
          }}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold border border-blue-200 transition-all active:scale-95"
        >
          <FileText className="w-3.5 h-3.5 text-blue-700" />
          <span>出差审批单</span>
          <ChevronRight className="w-3 h-3 text-blue-500" />
        </button>
      </div>
    </div>
  );
}
