'use client';

import React from 'react';
import { Briefcase, Plus, Database, Sparkles } from 'lucide-react';

interface NavbarProps {
  onNewRecord: () => void;
  pendingCount?: number;
}

export function Navbar({ onNewRecord, pendingCount = 0 }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-md">
      {/* Top Mobile Status Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
            <Briefcase className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-bold tracking-tight text-white">外出事务管理</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/20 font-medium">
                H5 移动端
              </span>
            </div>
            <p className="text-[11px] text-slate-300 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              张伟 · 技术研发中心 · SQLite 已就绪
            </p>
          </div>
        </div>

        {/* Quick New Outing Action */}
        <button
          id="btn-quick-new-nav"
          onClick={onNewRecord}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-medium shadow-sm transition-all border border-blue-400/30"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建外出</span>
        </button>
      </div>
    </header>
  );
}
