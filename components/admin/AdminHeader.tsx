'use client';

import React from 'react';
import {
  Briefcase,
  Sliders,
  BarChart3,
  LogOut,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export type AdminTab = 'records' | 'llm' | 'stats';

interface AdminHeaderProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  pendingCount?: number;
}

export function AdminHeader({
  currentTab,
  onTabChange,
  onLogout,
  onRefresh,
  isRefreshing = false,
  pendingCount = 0,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                  外出事务管理系统
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.5 rounded font-medium">
                  管理后台
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                OA 事务流转审批 · Agnes 大模型联调诊断
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => onTabChange('records')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                currentTab === 'records'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>记录处理与审批</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('llm')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                currentTab === 'llm'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>大模型参数与测试</span>
            </button>

            <button
              onClick={() => onTabChange('stats')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                currentTab === 'stats'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>数据概览与统计</span>
            </button>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              title="刷新数据"
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              title="前往前台移动端查看"
              className="hidden md:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>预览前台</span>
            </a>

            <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

            <button
              onClick={onLogout}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
