'use client';

import React, { useState } from 'react';
import {
  User,
  Building,
  Database,
  FileText,
  Save,
  Trash2,
  Download,
  RefreshCw,
  CheckCircle2,
  Shield,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { OutingRecord } from '@/types/outing';

interface ProfileViewProps {
  draft: OutingRecord | null;
  onRestoreDraft: (draft: OutingRecord) => void;
  onClearDraft: () => void;
  recordCount: number;
}

export function ProfileView({
  draft,
  onRestoreDraft,
  onClearDraft,
  recordCount,
}: ProfileViewProps) {
  const [userName, setUserName] = useState('张伟');
  const [userDept, setUserDept] = useState('技术研发中心');
  const [userTitle, setUserTitle] = useState('高级架构师 / 研发组长');
  const [savedTip, setSavedTip] = useState(false);

  const handleSaveProfile = () => {
    localStorage.setItem('user_profile_name', userName);
    localStorage.setItem('user_profile_dept', userDept);
    setSavedTip(true);
    setTimeout(() => setSavedTip(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* User Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-700/50">
        <div className="flex items-center space-x-3.5 mb-3">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-inner ring-2 ring-blue-400/40">
            张
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white">{userName}</h2>
              <span className="text-[10px] bg-blue-500/30 text-blue-200 border border-blue-400/30 px-1.5 py-0.2 rounded font-medium">
                正式员工
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">{userDept} · {userTitle}</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">工号：EMP-89204 · OA 认证用户</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-2 rounded-lg text-slate-300">
            <span className="text-[10px] text-slate-400 block">历史外出记录</span>
            <strong className="text-white text-sm font-mono">{recordCount}</strong> 笔
          </div>
          <div className="bg-white/5 p-2 rounded-lg text-slate-300">
            <span className="text-[10px] text-slate-400 block">报销凭据归档</span>
            <strong className="text-emerald-400 text-sm font-mono">100%</strong> 达标
          </div>
        </div>
      </div>

      {/* Drafts Manager */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <Save className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-slate-800">草稿箱管理</h3>
          </div>
          {draft && (
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              有待恢复草稿
            </span>
          )}
        </div>

        {draft ? (
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-amber-950">
                  {draft.title || '（未命名草稿）'}
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  目的地：{draft.destinations?.join(' ➔ ') || '未设置'} · 预算 ¥{draft.budget || 0}
                </p>
                <p className="text-[10px] text-amber-600/90 mt-0.5">
                  最近暂存时间：{draft.updatedAt ? new Date(draft.updatedAt).toLocaleTimeString() : '刚刚'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={onClearDraft}
                className="text-xs text-rose-600 hover:text-rose-800 px-2 py-1"
              >
                清空草稿
              </button>
              <button
                type="button"
                onClick={() => onRestoreDraft(draft)}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1 rounded-md shadow-2xs"
              >
                恢复并继续填写
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
            草稿箱为空，新建记录时点击【暂存草稿】可随时保存未完成内容
          </p>
        )}
      </div>

      {/* SQLite Database Engine Status */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-1.5">
            <Database className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800">底层 SQLite 数据库状态</h3>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            运行正常
          </span>
        </div>

        <div className="text-xs space-y-1.5 text-slate-600">
          <div className="flex items-center justify-between py-0.5">
            <span className="text-slate-500">存储引擎：</span>
            <span className="font-mono text-slate-800 font-medium">SQLite3 (WASM / Node.js)</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-slate-500">持久化文件：</span>
            <span className="font-mono text-slate-800 font-medium">./data/outings.sqlite</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-slate-500">数据主表：</span>
            <span className="font-mono text-slate-800 font-medium">outings (包含多段行程、附件及审批字段)</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-slate-500">当前总记录数：</span>
            <span className="font-mono text-blue-800 font-bold">{recordCount} 条有效记录</span>
          </div>
        </div>
      </div>

      {/* Guide & Help */}
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 space-y-2">
        <div className="flex items-center space-x-1.5 text-slate-800 font-semibold">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          <span>外出事务管理使用指南</span>
        </div>
        <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500">
          <li><strong>快速新建</strong>：仅需 3 步（行程路线 ➔ 时间预算 ➔ 上传凭据）即可快速生成一条完整外出记录。</li>
          <li><strong>多段行程</strong>：支持按顺序添加多个中转城市，自动在审批单上绘制连贯行程路线。</li>
          <li><strong>一键生成审批单</strong>：符合企事业单位标准《公务出差审批单》格式，支持直接导出 PDF 并下载至手机或电脑。</li>
          <li><strong>凭证与归档</strong>：随时拍照记录现场及上传任务公函，报账时有据可查。</li>
        </ul>
      </div>
    </div>
  );
}
