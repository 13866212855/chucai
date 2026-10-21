'use client';

import React, { useState, useMemo } from 'react';
import {
  OutingRecord,
  ApprovalStatus,
  ActivityType,
} from '@/types/outing';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Archive,
  Trash2,
  FileText,
  Eye,
  Edit3,
  Download,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  CheckSquare,
  Square,
  FileSpreadsheet,
} from 'lucide-react';
import { AdminApprovalModal } from './AdminApprovalModal';
import { ApprovalSlipModal } from '@/components/ApprovalSlipModal';
import { RecordDetailModal } from '@/components/RecordDetailModal';
import { RecordFormModal } from '@/components/RecordFormModal';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';

interface AdminRecordsManagerProps {
  records: OutingRecord[];
  onRefresh: () => void;
  onUpdateRecord: (id: string, data: Partial<OutingRecord>) => Promise<boolean>;
  onDeleteRecord: (id: string) => Promise<boolean>;
  onBatchAction: (action: string, ids: string[]) => Promise<boolean>;
}

export function AdminRecordsManager({
  records,
  onRefresh,
  onUpdateRecord,
  onDeleteRecord,
  onBatchAction,
}: AdminRecordsManagerProps) {
  // Search and filter states
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('全部');
  const [typeFilter, setTypeFilter] = useState<string>('全部');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [approvalModalState, setApprovalModalState] = useState<{
    isOpen: boolean;
    record: OutingRecord | null;
    actionType: 'approve' | 'reject' | 'archive';
  }>({
    isOpen: false,
    record: null,
    actionType: 'approve',
  });

  const [detailRecord, setDetailRecord] = useState<OutingRecord | null>(null);
  const [slipRecord, setSlipRecord] = useState<OutingRecord | null>(null);
  const [editRecord, setEditRecord] = useState<OutingRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OutingRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status summaries
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let archived = 0;
    let totalBudget = 0;

    records.forEach((r) => {
      if (r.status === '待审批') pending++;
      else if (r.status === '已审批') approved++;
      else if (r.status === '已驳回') rejected++;
      else if (r.status === '已归档') archived++;
      totalBudget += r.budget || 0;
    });

    return { total: records.length, pending, approved, rejected, archived, totalBudget };
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter !== '全部' && r.status !== statusFilter) return false;
      if (typeFilter !== '全部' && r.activityType !== typeFilter) return false;
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const inTitle = r.title?.toLowerCase().includes(kw);
        const inApplicant = r.applicantName?.toLowerCase().includes(kw);
        const inDept = r.department?.toLowerCase().includes(kw);
        const inDest = r.destinations?.some((d) => d.toLowerCase().includes(kw));
        const inNotes = r.notes?.toLowerCase().includes(kw);
        const inNo = r.approvalNo?.toLowerCase().includes(kw);
        if (!inTitle && !inApplicant && !inDept && !inDest && !inNotes && !inNo) return false;
      }
      return true;
    });
  }, [records, statusFilter, typeFilter, keyword]);

  // Handle multi-select
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Batch action handlers
  const handleBatch = async (action: 'approve' | 'reject' | 'archive' | 'delete') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (action === 'delete') {
      if (!confirm(`确定要彻底删除所选的 ${ids.length} 笔外出记录吗？此操作不可撤销。`)) {
        return;
      }
    }

    const success = await onBatchAction(action, ids);
    if (success) {
      setSelectedIds(new Set());
    }
  };

  // Export records to CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('当前没有可导出的记录');
      return;
    }

    const headers = [
      '记录编号',
      '审批单号',
      '申请人',
      '部门',
      '外出类别',
      '活动主题',
      '行程路线',
      '开始时间',
      '结束时间',
      '出差天数',
      '预算总额(元)',
      '交通费',
      '住宿费',
      '餐饮补助',
      '其他杂费',
      '当前状态',
      '审批人员',
      '审批批示',
      '创建时间',
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.approvalNo || '',
      r.applicantName,
      r.department || '',
      r.activityType,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${(r.destinations || []).join(' -> ')}"`,
      r.startTime,
      r.endTime,
      r.durationDays,
      r.budget || 0,
      r.budgetBreakdown?.transport || 0,
      r.budgetBreakdown?.accommodation || 0,
      r.budgetBreakdown?.meals || 0,
      r.budgetBreakdown?.other || 0,
      r.status,
      r.approverName || '',
      `"${(r.approverNote || '').replace(/"/g, '""')}"`,
      r.createdAt,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `外出事务管理明细报表_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status badge helper
  const renderStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case '待审批':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            待审批
          </span>
        );
      case '已审批':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            已审批
          </span>
        );
      case '已归档':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Archive className="w-3 h-3 text-slate-500" />
            已归档
          </span>
        );
      case '已驳回':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" />
            已驳回
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Top Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setStatusFilter('全部')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === '全部'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] text-slate-500 block font-medium">全部记录</span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-bold text-slate-900 font-mono">{stats.total}</span>
            <span className="text-xs text-slate-400">笔</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('待审批')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === '待审批'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] text-amber-600 block font-medium flex items-center justify-between">
            <span>待处理审批</span>
            {stats.pending > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-bold text-amber-700 font-mono">{stats.pending}</span>
            <span className="text-xs text-slate-400">笔待办</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('已审批')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === '已审批'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] text-emerald-600 block font-medium">已批准执行</span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-bold text-emerald-700 font-mono">{stats.approved}</span>
            <span className="text-xs text-slate-400">笔通过</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('已驳回')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === '已驳回'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] text-rose-600 block font-medium">已驳回退回</span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-bold text-rose-700 font-mono">{stats.rejected}</span>
            <span className="text-xs text-slate-400">笔不符</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('已归档')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === '已归档'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] text-slate-500 block font-medium">已归档结案</span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-bold text-slate-800 font-mono">{stats.archived}</span>
            <span className="text-xs text-slate-400">笔结案</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border bg-gradient-to-br from-blue-900 to-indigo-900 text-white border-blue-800 shadow-xs">
          <span className="text-[11px] text-blue-200 block font-medium">申报预算总额</span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-bold text-white font-mono">
              ¥{stats.totalBudget.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Actions Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索申请人、主题、目的地、部门、单号..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Select */}
            <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-400 px-1 text-[11px]">状态:</span>
              {['全部', '待审批', '已审批', '已驳回', '已归档'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Type Select */}
            <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-400 px-1 text-[11px]">类型:</span>
              {['全部', '出差', '学习培训', '其他'].map((tp) => (
                <button
                  key={tp}
                  onClick={() => setTypeFilter(tp)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    typeFilter === tp
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tp}
                </button>
              ))}
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>导出表格</span>
            </button>
          </div>
        </div>

        {/* Batch Operations Bar (active when rows selected) */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg animate-in fade-in duration-150">
            <div className="flex items-center space-x-2 text-xs text-blue-900">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <span>
                已选中 <strong>{selectedIds.size}</strong> 笔记录
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-blue-600 hover:underline ml-2"
              >
                取消选择
              </button>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => handleBatch('approve')}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-2xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>批量通过</span>
              </button>
              <button
                onClick={() => handleBatch('reject')}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-2xs transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>批量驳回</span>
              </button>
              <button
                onClick={() => handleBatch('archive')}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium shadow-2xs transition-colors cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>批量归档</span>
              </button>
              <button
                onClick={() => handleBatch('delete')}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-medium transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>批量删除</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size > 0 && selectedIds.size === filteredRecords.length
                    }
                    onChange={handleToggleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 min-w-[140px]">编号 / 申请时间</th>
                <th className="py-3 px-3 min-w-[130px]">申请人 / 部门</th>
                <th className="py-3 px-3 min-w-[90px]">类别</th>
                <th className="py-3 px-3 min-w-[220px]">活动主题 & 行程路线</th>
                <th className="py-3 px-3 min-w-[140px]">出行时间 / 天数</th>
                <th className="py-3 px-3 min-w-[90px]">预算金额</th>
                <th className="py-3 px-3 min-w-[90px]">状态</th>
                <th className="py-3 px-3 min-w-[150px]">审批信息</th>
                <th className="py-3 px-3 min-w-[170px] text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <p className="text-sm">未找到符合条件的外出记录</p>
                    <p className="text-xs text-slate-400 mt-1">
                      可尝试更换筛选状态或清空搜索关键词
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isSelected = selectedIds.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(r.id)}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* ID & Date */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-medium text-slate-900 block">
                          {r.id}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {r.createdAt ? r.createdAt.slice(0, 10) : '-'}
                        </span>
                      </td>

                      {/* Applicant & Dept */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">
                          {r.applicantName}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {r.department || '未设定部门'}
                        </span>
                      </td>

                      {/* Activity Type */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            r.activityType === '出差'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : r.activityType === '学习培训'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {r.activityType}
                        </span>
                      </td>

                      {/* Title & Destinations */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 block line-clamp-1">
                          {r.title}
                        </span>
                        <div className="flex items-center flex-wrap gap-1 mt-1 text-[11px] text-slate-500">
                          <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>{r.destinations?.join(' ➔ ') || '本地'}</span>
                        </div>
                      </td>

                      {/* Time & Duration */}
                      <td className="py-3 px-3">
                        <span className="text-slate-800 block text-[11px]">
                          {r.startTime?.replace('T', ' ')}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          共 <strong className="text-blue-600">{r.durationDays}</strong> 天
                        </span>
                      </td>

                      {/* Budget */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          ¥{r.budget || 0}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">{renderStatusBadge(r.status)}</td>

                      {/* Approval Info */}
                      <td className="py-3 px-3">
                        {r.status === '待审批' ? (
                          <span className="text-amber-600 text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            等待后台审批
                          </span>
                        ) : (
                          <div className="text-[11px]">
                            <span className="font-medium text-slate-800 block">
                              {r.approverName || '管理员'}
                            </span>
                            <span className="text-slate-400 line-clamp-1" title={r.approverNote}>
                              {r.approverNote || '无批语'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Operations */}
                      <td className="py-3 px-3 text-right space-x-1">
                        {/* Quick Approval / Rejection Trigger */}
                        {r.status === '待审批' && (
                          <>
                            <button
                              onClick={() =>
                                setApprovalModalState({
                                  isOpen: true,
                                  record: r,
                                  actionType: 'approve',
                                })
                              }
                              title="审批通过"
                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-[11px] border border-emerald-200 transition-colors"
                            >
                              通过
                            </button>
                            <button
                              onClick={() =>
                                setApprovalModalState({
                                  isOpen: true,
                                  record: r,
                                  actionType: 'reject',
                                })
                              }
                              title="驳回修改"
                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-[11px] border border-rose-200 transition-colors"
                            >
                              驳回
                            </button>
                          </>
                        )}

                        {r.status === '已审批' && (
                          <button
                            onClick={() =>
                              setApprovalModalState({
                                isOpen: true,
                                record: r,
                                actionType: 'archive',
                              })
                            }
                            title="审核结案并归档"
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] border border-slate-300 transition-colors"
                          >
                            归档
                          </button>
                        )}

                        {/* Approval Slip Modal */}
                        <button
                          onClick={() => setSlipRecord(r)}
                          title="查看/打印审批单"
                          className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-[11px] border border-blue-200 transition-colors"
                        >
                          审批单
                        </button>

                        {/* View Details */}
                        <button
                          onClick={() => setDetailRecord(r)}
                          title="查看完整明细"
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors inline-block align-middle"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Record */}
                        <button
                          onClick={() => setEditRecord(r)}
                          title="编辑修改内容"
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors inline-block align-middle"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(r)}
                          title="删除记录"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-block align-middle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            显示 <strong>{filteredRecords.length}</strong> 笔外出记录（共计 {records.length} 笔）
          </span>
          <span className="text-[11px]">
            * 审核通过后将自动生成标准 OA 出差审批单编号
          </span>
        </div>
      </div>

      {/* Connected Modals */}
      <AdminApprovalModal
        isOpen={approvalModalState.isOpen}
        onClose={() =>
          setApprovalModalState({ isOpen: false, record: null, actionType: 'approve' })
        }
        record={approvalModalState.record}
        actionType={approvalModalState.actionType}
        onConfirm={async (id, status, approverName, approverNote) => {
          await onUpdateRecord(id, {
            status,
            approverName,
            approverNote,
            approvalDate: new Date().toISOString().slice(0, 10),
          });
        }}
      />

      {slipRecord && (
        <ApprovalSlipModal
          isOpen={Boolean(slipRecord)}
          onClose={() => setSlipRecord(null)}
          record={slipRecord}
        />
      )}

      {detailRecord && (
        <RecordDetailModal
          isOpen={Boolean(detailRecord)}
          onClose={() => setDetailRecord(null)}
          record={detailRecord}
          onOpenApproval={(rec) => {
            setDetailRecord(null);
            setSlipRecord(rec);
          }}
          onEdit={(rec) => {
            setDetailRecord(null);
            setEditRecord(rec);
          }}
          onDelete={(rec) => {
            setDetailRecord(null);
            setDeleteTarget(rec);
          }}
        />
      )}

      {editRecord && (
        <RecordFormModal
          isOpen={Boolean(editRecord)}
          onClose={() => setEditRecord(null)}
          initialData={editRecord}
          onSave={async (data) => {
            if (editRecord.id) {
              await onUpdateRecord(editRecord.id, data);
            }
            setEditRecord(null);
            onRefresh();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          isOpen={Boolean(deleteTarget)}
          record={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
          onConfirm={async () => {
            setIsDeleting(true);
            try {
              await onDeleteRecord(deleteTarget.id);
              setDeleteTarget(null);
            } finally {
              setIsDeleting(false);
            }
          }}
        />
      )}
    </div>
  );
}
