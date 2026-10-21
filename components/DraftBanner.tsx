'use client';

import React from 'react';
import { Save, ChevronRight, X } from 'lucide-react';
import { OutingRecord } from '@/types/outing';

interface DraftBannerProps {
  draft: OutingRecord | null;
  onRestore: (draft: OutingRecord) => void;
  onDismiss: () => void;
}

export function DraftBanner({ draft, onRestore, onDismiss }: DraftBannerProps) {
  if (!draft) return null;

  return (
    <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3 mb-3 flex items-center justify-between text-xs text-amber-900 shadow-2xs animate-in slide-in-from-top-2">
      <div className="flex items-center space-x-2.5 truncate mr-2">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
          <Save className="w-3.5 h-3.5" />
        </div>
        <div className="truncate">
          <p className="font-bold truncate text-[11px]">
            检测到未保存的外出草稿：{draft.title || '未命名草稿'}
          </p>
          <p className="text-[10px] text-amber-700 truncate">
            {draft.destinations?.join(' ➔ ') || '行程未定'} · 点击可快速恢复填写
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 shrink-0">
        <button
          onClick={() => onRestore(draft)}
          className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-semibold px-2.5 py-1 rounded-md text-[11px] shadow-2xs transition-all flex items-center gap-0.5"
        >
          <span>恢复草稿</span>
          <ChevronRight className="w-3 h-3" />
        </button>
        <button
          onClick={onDismiss}
          className="text-amber-500 hover:text-amber-800 p-1"
          title="忽略"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
