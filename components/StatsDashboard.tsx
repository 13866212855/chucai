'use client';

import React from 'react';
import { OutingStats } from '@/types/outing';
import {
  Calendar,
  Clock,
  MapPin,
  TrendingUp,
  Award,
  Wallet,
  CheckCircle,
  FileCheck,
  Building2,
  PieChart,
} from 'lucide-react';

interface StatsDashboardProps {
  stats: OutingStats | null;
  isLoading?: boolean;
}

export function StatsDashboard({ stats, isLoading = false }: StatsDashboardProps) {
  if (isLoading || !stats) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 bg-slate-200 rounded-xl" />
          <div className="h-20 bg-slate-200 rounded-xl" />
          <div className="h-20 bg-slate-200 rounded-xl" />
          <div className="h-20 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-44 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  // Max city count for percentage calculation
  const maxCityCount = Math.max(...(stats.cityDistribution?.map((c) => c.count) || [1]), 1);

  return (
    <div className="space-y-4">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Metric 1: Monthly Count */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-3 rounded-xl shadow-sm border border-blue-800/40 relative overflow-hidden">
          <div className="flex items-center justify-between text-blue-200 mb-1">
            <span className="text-[11px] font-medium">本月外出次数</span>
            <Calendar className="w-3.5 h-3.5 text-blue-300" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold font-mono tracking-tight">{stats.currentMonthCount}</span>
            <span className="text-xs text-blue-200">次</span>
          </div>
          <p className="text-[10px] text-blue-300/80 mt-1">
            累计历史共 {stats.totalCount} 次外出
          </p>
        </div>

        {/* Metric 2: Total Outing Days */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-850 text-white p-3 rounded-xl shadow-sm border border-slate-700/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-[11px] font-medium">累计出差总天数</span>
            <Clock className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-blue-400">{stats.totalDays}</span>
            <span className="text-xs text-slate-300">天</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            本月外出 {stats.currentMonthDays} 天
          </p>
        </div>

        {/* Metric 3: Total Budget */}
        <div className="bg-white p-3 rounded-xl shadow-2xs border border-slate-200/90 text-slate-800">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium">累计差旅预算</span>
            <Wallet className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-xl font-bold font-mono text-slate-900">
              ¥{(stats.totalBudget || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">平均单次 ¥{stats.totalCount > 0 ? Math.round(stats.totalBudget / stats.totalCount) : 0}</p>
        </div>

        {/* Metric 4: Approvals summary */}
        <div className="bg-white p-3 rounded-xl shadow-2xs border border-slate-200/90 text-slate-800">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium">审批状态概览</span>
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex items-center space-x-2 my-0.5">
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 font-bold px-1.5 py-0.5 rounded">
              {stats.pendingCount} 待审
            </span>
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-1.5 py-0.5 rounded">
              {stats.approvedCount} 已批
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">均可一键生成审批单</p>
        </div>
      </div>

      {/* City Distribution (城市分布排行) */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-1.5">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800">目的地城市分布排行</h3>
          </div>
          <span className="text-[11px] text-slate-400">覆盖 {stats.cityDistribution.length} 个主要城市</span>
        </div>

        {stats.cityDistribution.length > 0 ? (
          <div className="space-y-2.5">
            {stats.cityDistribution.slice(0, 6).map((item, idx) => {
              const percent = Math.round((item.count / maxCityCount) * 100);
              return (
                <div key={item.city} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5">
                      <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center ${
                        idx === 0
                          ? 'bg-amber-500 text-white'
                          : idx === 1
                          ? 'bg-slate-400 text-white'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{item.city}</span>
                    </div>
                    <span className="text-slate-600 font-mono font-medium text-[11px]">
                      {item.count} 次
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percent, 8)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-400">暂无城市分布数据</div>
        )}
      </div>

      {/* Activity Type Breakdown */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-1.5">
            <PieChart className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800">活动类型占比与时长</h3>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {stats.typeDistribution.map((item) => (
            <div
              key={item.type}
              className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center"
            >
              <span className="text-[11px] font-medium text-slate-600 block mb-1">
                {item.type}
              </span>
              <div className="text-base font-bold text-blue-900 font-mono">
                {item.count} <span className="text-[10px] font-normal text-slate-500">次</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                累计 {item.days} 天
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trend List */}
      {stats.monthlyTrend && stats.monthlyTrend.length > 0 && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-800">近月出差频次趋势</h3>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.monthlyTrend.map((m) => (
              <div key={m.month} className="py-2 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">{m.month}</span>
                <div className="flex items-center space-x-3">
                  <span className="text-slate-600">
                    <strong className="text-blue-800">{m.count}</strong> 次
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600 font-mono">
                    <strong className="text-indigo-800">{m.days}</strong> 天
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
