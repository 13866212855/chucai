'use client';

import React from 'react';
import { OutingRecord } from '@/types/outing';
import { RecordCard } from './RecordCard';
import { Calendar, CircleDot } from 'lucide-react';

interface RecordTimelineProps {
  records: OutingRecord[];
  onViewApproval: (record: OutingRecord) => void;
  onEdit: (record: OutingRecord) => void;
  onDelete: (record: OutingRecord) => void;
}

export function RecordTimeline({
  records,
  onViewApproval,
  onEdit,
  onDelete,
}: RecordTimelineProps) {
  // Group records by month (YYYY-MM)
  const groupedByMonth = React.useMemo(() => {
    const map = new Map<string, OutingRecord[]>();
    records.forEach((rec) => {
      const monthKey = rec.startTime.slice(0, 7) || '未知月份';
      if (!map.has(monthKey)) {
        map.set(monthKey, []);
      }
      map.get(monthKey)!.push(rec);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [records]);

  if (records.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400">
        <p className="text-sm">暂无外出记录</p>
      </div>
    );
  }

  const formatMonthTitle = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    if (!month) return monthKey;
    return `${year} 年 ${parseInt(month, 10)} 月`;
  };

  return (
    <div className="relative pl-4 space-y-6">
      {/* Continuous vertical timeline guide */}
      <div className="absolute left-[7px] top-2 bottom-4 w-0.5 bg-blue-200/80" />

      {groupedByMonth.map(([monthKey, list]) => (
        <div key={monthKey} className="relative">
          {/* Month Marker */}
          <div className="flex items-center space-x-2 -ml-4 mb-3">
            <div className="w-4 h-4 rounded-full bg-blue-600 ring-4 ring-blue-100 flex items-center justify-center z-10">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            <div className="bg-blue-900 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-sm">
              {formatMonthTitle(monthKey)}
            </div>
            <span className="text-[11px] text-slate-500">
              共 {list.length} 次外出 · 累计 {list.reduce((sum, r) => sum + r.durationDays, 0)} 天
            </span>
          </div>

          {/* Records within the month */}
          <div className="space-y-3 pl-1">
            {list.map((rec) => (
              <div key={rec.id} className="relative">
                <RecordCard
                  record={rec}
                  onViewApproval={onViewApproval}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
