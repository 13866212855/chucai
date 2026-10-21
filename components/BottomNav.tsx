'use client';

import React from 'react';
import { Home, FileText, BarChart3, User, PlusCircle } from 'lucide-react';

export type TabType = 'home' | 'records' | 'stats' | 'profile';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onNewRecord: () => void;
  pendingCount?: number;
}

export function BottomNav({
  currentTab,
  onChangeTab,
  onNewRecord,
  pendingCount = 0,
}: BottomNavProps) {
  const tabs = [
    { id: 'home' as TabType, label: '工作台', icon: Home },
    { id: 'records' as TabType, label: '外出记录', icon: FileText, badge: pendingCount > 0 ? pendingCount : null },
    { id: 'stats' as TabType, label: '统计分析', icon: BarChart3 },
    { id: 'profile' as TabType, label: '个人中心', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="max-w-md mx-auto px-3 py-1 flex items-center justify-around">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 min-w-[64px] min-h-[48px] rounded-lg transition-colors ${
                isActive ? 'text-blue-700 font-semibold' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-blue-700' : 'text-slate-500'}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center leading-none ring-1 ring-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'text-blue-700 font-medium' : 'text-slate-500'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0.5 w-6 h-0.5 bg-blue-700 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
