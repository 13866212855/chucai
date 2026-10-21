'use client';

import React, { useState } from 'react';
import { OutingRecord } from '@/types/outing';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Wallet,
  Paperclip,
  Camera,
  FileText,
  ArrowRight,
  Edit3,
  Trash2,
  FileCheck,
  Download,
  Eye,
} from 'lucide-react';

interface RecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: OutingRecord | null;
  onOpenApproval: (record: OutingRecord) => void;
  onEdit: (record: OutingRecord) => void;
  onDelete: (record: OutingRecord) => void;
}

export function RecordDetailModal({
  isOpen,
  onClose,
  record,
  onOpenApproval,
  onEdit,
  onDelete,
}: RecordDetailModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const formatDateTime = (dtStr: string) => {
    if (!dtStr) return '-';
    return dtStr.replace('T', ' ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-blue-600/40 text-blue-200 border border-blue-400/30 font-semibold px-2 py-0.5 rounded-full">
              {record.activityType}
            </span>
            <span className="text-xs font-mono text-slate-300">{record.id}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-800">
          {/* Title & Status */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {record.title}
              </h2>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                record.status === '已审批'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : record.status === '已归档'
                  ? 'bg-slate-100 text-slate-700 border border-slate-300'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {record.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              申请人：{record.applicantName} · {record.department || '技术研发中心'}
            </p>
          </div>

          {/* Route Section */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-1.5 text-slate-500 mb-2 font-medium">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>多段行程路线</span>
            </div>
            <div className="flex items-center flex-wrap gap-1.5">
              {record.destinations && record.destinations.length > 0 ? (
                record.destinations.map((city, idx) => (
                  <React.Fragment key={idx}>
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-semibold text-slate-900 shadow-2xs">
                      {city}
                    </span>
                    {idx < record.destinations.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </React.Fragment>
                ))
              ) : (
                <span className="text-slate-400">未设置</span>
              )}
            </div>
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100">
              <div className="flex items-center space-x-1.5 text-blue-800 mb-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-[11px]">行程时间区间</span>
              </div>
              <p className="font-mono text-slate-800 text-[11px]">
                {formatDateTime(record.startTime)}
                <br />至 {formatDateTime(record.endTime)}
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center space-x-1.5 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-[11px]">核算天数</span>
              </div>
              <div className="text-xl font-bold font-mono text-blue-900">
                {record.durationDays} <span className="text-xs font-normal text-slate-500">天</span>
              </div>
            </div>
          </div>

          {/* Budget Breakdown */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-slate-700 font-semibold">
                <Wallet className="w-3.5 h-3.5 text-amber-600" />
                <span>差旅费用预算</span>
              </div>
              <span className="font-bold font-mono text-blue-900 text-sm">
                总计 ¥{record.budget?.toLocaleString() || 0}
              </span>
            </div>

            {record.budgetBreakdown && (
              <div className="grid grid-cols-4 gap-1.5 text-center pt-1 border-t border-slate-200/80 text-[11px]">
                <div className="bg-white p-1 rounded border border-slate-200">
                  <div className="text-slate-400">交通费</div>
                  <div className="font-mono font-medium">¥{record.budgetBreakdown.transport || 0}</div>
                </div>
                <div className="bg-white p-1 rounded border border-slate-200">
                  <div className="text-slate-400">住宿费</div>
                  <div className="font-mono font-medium">¥{record.budgetBreakdown.accommodation || 0}</div>
                </div>
                <div className="bg-white p-1 rounded border border-slate-200">
                  <div className="text-slate-400">餐饮补助</div>
                  <div className="font-mono font-medium">¥{record.budgetBreakdown.meals || 0}</div>
                </div>
                <div className="bg-white p-1 rounded border border-slate-200">
                  <div className="text-slate-400">其他杂费</div>
                  <div className="font-mono font-medium">¥{record.budgetBreakdown.other || 0}</div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {record.notes && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-700 block mb-1">补充说明：</span>
              <p className="text-slate-600 leading-relaxed">{record.notes}</p>
            </div>
          )}

          {/* Attached Notification Files */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                <span>相关批复公函及通知文件 ({record.files?.length || 0})</span>
              </span>
            </div>
            {record.files && record.files.length > 0 ? (
              <div className="space-y-1.5">
                {record.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate font-medium text-slate-800">{file.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    {file.dataUrl && (
                      <a
                        href={file.dataUrl}
                        download={file.name}
                        className="text-blue-600 hover:text-blue-800 text-[11px] font-medium shrink-0 ml-2"
                      >
                        下载
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-200 text-center">
                暂未随附文件
              </p>
            )}
          </div>

          {/* Scene Photos */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                <span>现场工作与场景照片 ({record.photos?.length || 0})</span>
              </span>
            </div>
            {record.photos && record.photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {record.photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo.dataUrl)}
                    className="aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 relative group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-200 text-center">
                暂未上传现场照片
              </p>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onEdit(record);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1 font-medium"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>修改</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(record);
              }}
              className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-95 flex items-center gap-1 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除</span>
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenApproval(record);
            }}
            className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center gap-1.5 shadow-sm"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>生成出差审批单</span>
          </button>
        </div>

        {/* Big photo modal */}
        {selectedPhoto && (
          <div
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-sm max-h-[85vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto}
                alt="大图"
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
