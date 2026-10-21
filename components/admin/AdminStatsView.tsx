'use client';

import React from 'react';
import { OutingStats } from '@/types/outing';
import {
  TrendingUp,
  MapPin,
  Calendar,
  Wallet,
  CheckCircle2,
  Clock,
  Briefcase,
  GraduationCap,
  Sparkles,
  Database,
  Building,
} from 'lucide-react';

interface AdminStatsViewProps {
  stats: OutingStats | null;
  totalRecordsCount: number;
}

export function AdminStatsView({ stats, totalRecordsCount }: AdminStatsViewProps) {
  if (!stats) {
    return (
      <div className="py-16 text-center text-slate-400">
        <p className="text-sm">正在加载统计概览数据...</p>
      </div>
    );
  }

  const approvalRate =
    stats.totalCount > 0 ? Math.round((stats.approvedCount / stats.totalCount) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* 1. Core KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">累计外出事务总数</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {stats.totalCount}
            </span>
            <span className="text-xs text-slate-500">笔申报</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            本月新增外出：<strong className="text-blue-600">{stats.currentMonthCount}</strong> 笔
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">累计出差执行天数</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {stats.totalDays}
            </span>
            <span className="text-xs text-slate-500">天</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            本月出差天数：<strong className="text-emerald-600">{stats.currentMonthDays}</strong> 天
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">累计申报差旅预算</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              ¥{stats.totalBudget.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">元</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            平均单笔预算：¥
            {stats.totalCount > 0 ? Math.round(stats.totalBudget / stats.totalCount) : 0}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">综合合规批准率</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {approvalRate}%
            </span>
            <span className="text-xs text-emerald-600 font-semibold">达标</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            待审批待办：<strong className="text-amber-600">{stats.pendingCount}</strong> 笔
          </p>
        </div>
      </div>

      {/* 2. Visual Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Destination Ranking */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                出差/外出目的地热门城市排行
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">共覆盖 {stats.cityDistribution?.length || 0} 个城市</span>
          </div>

          <div className="space-y-3">
            {stats.cityDistribution && stats.cityDistribution.length > 0 ? (
              stats.cityDistribution.slice(0, 7).map((item, index) => {
                const maxCount = stats.cityDistribution[0]?.count || 1;
                const percentage = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={item.city} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold ${
                          index === 0
                            ? 'bg-amber-500 text-white'
                            : index === 1
                            ? 'bg-slate-400 text-white'
                            : index === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{item.city}</span>
                      </div>
                      <span className="text-slate-500 font-mono">
                        {item.count} 次到访
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">暂无城市行程数据</p>
            )}
          </div>
        </div>

        {/* Activity Type Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                外出事务类别与天数分布
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">分类核算</span>
          </div>

          <div className="space-y-4">
            {stats.typeDistribution?.map((item) => (
              <div
                key={item.type}
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    item.type === '出差'
                      ? 'bg-blue-100 text-blue-700'
                      : item.type === '学习培训'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {item.type === '出差' ? (
                      <Briefcase className="w-4 h-4" />
                    ) : item.type === '学习培训' ? (
                      <GraduationCap className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{item.type}</h4>
                    <p className="text-[11px] text-slate-400">
                      申报频次：{item.count} 笔
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {item.days}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">累计天数</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. System Architecture Status Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white">
              底层存储与大模型连接状态
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
            双引擎健康
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-white/5 p-3 rounded-lg">
            <span className="text-slate-400 block text-[11px]">数据库引擎</span>
            <strong className="text-white text-sm font-mono mt-0.5 block">
              SQLite (持久化于 /data/outings.sqlite)
            </strong>
          </div>
          <div className="bg-white/5 p-3 rounded-lg">
            <span className="text-slate-400 block text-[11px]">大模型网关</span>
            <strong className="text-white text-sm font-mono mt-0.5 block">
              ApiHub (Agnes-2.5-flash / Agnes-Image-2.1-flash)
            </strong>
          </div>
          <div className="bg-white/5 p-3 rounded-lg">
            <span className="text-slate-400 block text-[11px]">有效业务记录</span>
            <strong className="text-emerald-400 text-sm font-mono mt-0.5 block">
              {totalRecordsCount} 笔数据实时同步
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
