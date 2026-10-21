'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  OutingRecord,
  OutingStats,
  OutingFilterParams,
  ActivityType,
  ApprovalStatus,
} from '@/types/outing';
import { Navbar } from '@/components/Navbar';
import { BottomNav, TabType } from '@/components/BottomNav';
import { RecordCard } from '@/components/RecordCard';
import { RecordTimeline } from '@/components/RecordTimeline';
import { RecordFormModal } from '@/components/RecordFormModal';
import { ApprovalSlipModal } from '@/components/ApprovalSlipModal';
import { RecordDetailModal } from '@/components/RecordDetailModal';
import { StatsDashboard } from '@/components/StatsDashboard';
import { ProfileView } from '@/components/ProfileView';
import { DraftBanner } from '@/components/DraftBanner';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  List,
  GitCommit,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Database,
  Building,
} from 'lucide-react';

const emptySubscribe = () => () => {};

function useClientCurrentDate() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => {
      try {
        return new Date().toLocaleDateString('zh-CN', {
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        });
      } catch {
        return '';
      }
    },
    () => ''
  );
}

export default function OutingApp() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [records, setRecords] = useState<OutingRecord[]>([]);
  const [stats, setStats] = useState<OutingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Search and Filter States (for Records Tab)
  const [keyword, setKeyword] = useState('');
  const [selectedType, setSelectedType] = useState<string>('全部');
  const [selectedStatus, setSelectedStatus] = useState<string>('全部');
  const [viewMode, setViewMode] = useState<'card' | 'timeline'>('card');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<OutingRecord | null>(null);

  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [selectedApprovalRecord, setSelectedApprovalRecord] = useState<OutingRecord | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<OutingRecord | null>(null);

  // Draft state
  const [draft, setDraft] = useState<OutingRecord | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(true);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hydration-safe client date
  const todayFormatted = useClientCurrentDate();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch all records
  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRecords(data.data);
      }
    } catch (err) {
      console.error('Failed to load records from SQLite:', err);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  // Fetch draft
  const fetchDraft = async () => {
    try {
      // First check local storage
      const localDraft = localStorage.getItem('outing_draft');
      if (localDraft) {
        try {
          const parsed = JSON.parse(localDraft);
          setDraft(parsed);
          return;
        } catch {
          // ignore
        }
      }

      // Check server sqlite draft
      const res = await fetch('/api/records?draft=true');
      const data = await res.json();
      if (data.success && data.data) {
        setDraft(data.data);
      }
    } catch (err) {
      console.warn('Draft check error:', err);
    }
  };

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([fetchRecords(), fetchStats(), fetchDraft()]);
      setIsLoading(false);
    };
    loadAll();
  }, []);

  // Save new or updated record
  const handleSaveRecord = async (formData: Partial<OutingRecord>) => {
    const isEdit = Boolean(formData.id);
    const url = isEdit ? `/api/records/${formData.id}` : '/api/records';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || '保存失败');
    }

    // Clear draft if it was saved
    localStorage.removeItem('outing_draft');
    setDraft(null);

    // Persist as last filled form data for subsequent convenient creations
    try {
      localStorage.setItem(
        'outing_last_form_data',
        JSON.stringify({
          applicantName: formData.applicantName,
          department: formData.department,
          activityType: formData.activityType,
          title: formData.title,
          destinations: formData.destinations,
          startTime: formData.startTime,
          endTime: formData.endTime,
          durationDays: formData.durationDays,
          budgetBreakdown: formData.budgetBreakdown,
          status: formData.status,
          notes: formData.notes,
        })
      );
    } catch {
      // ignore
    }

    // Refresh data
    await Promise.all([fetchRecords(), fetchStats()]);

    showToast(isEdit ? '外出记录更新成功！' : '新建外出事务记录成功！');

    // Auto open approval slip for the newly created record
    if (!isEdit && result.data) {
      setSelectedApprovalRecord(result.data);
      setIsApprovalOpen(true);
    }
  };

  // Save Draft locally and remotely
  const handleAutoSaveDraft = (draftData: Partial<OutingRecord>) => {
    try {
      localStorage.setItem('outing_draft', JSON.stringify(draftData));
      setDraft(draftData as OutingRecord);
      setShowDraftBanner(true);
    } catch (e) {
      console.error('Save draft error:', e);
    }
  };

  // Restore Draft
  const handleRestoreDraft = (d: OutingRecord) => {
    setFormInitialData(d);
    setIsFormOpen(true);
    setShowDraftBanner(false);
  };

  // Clear Draft
  const handleClearDraft = () => {
    localStorage.removeItem('outing_draft');
    setDraft(null);
    setShowDraftBanner(false);
    showToast('草稿已清除');
  };

  // Delete modal state
  const [recordToDelete, setRecordToDelete] = useState<OutingRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete Record trigger (opens custom in-app modal instead of browser confirm)
  const handleRequestDelete = (record: OutingRecord) => {
    setRecordToDelete(record);
  };

  // Confirm and perform actual deletion
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    const id = recordToDelete.id;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
        fetchStats();
        showToast('已成功从数据库删除该记录！');
        setRecordToDelete(null);
      } else {
        showToast(data.error || '删除失败，请重试');
      }
    } catch {
      showToast('网络连接异常，删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit action
  const handleEditRecord = (record: OutingRecord) => {
    setFormInitialData(record);
    setIsFormOpen(true);
  };

  // View Approval Slip action
  const handleOpenApproval = (record: OutingRecord) => {
    setSelectedApprovalRecord(record);
    setIsApprovalOpen(true);
  };

  // View Details action
  const handleOpenDetail = (record: OutingRecord) => {
    setSelectedDetailRecord(record);
    setIsDetailOpen(true);
  };

  // Filter records in memory
  const filteredRecords = React.useMemo(() => {
    return records.filter((rec) => {
      // Type filter
      if (selectedType !== '全部' && rec.activityType !== selectedType) {
        return false;
      }
      // Status filter
      if (selectedStatus !== '全部' && rec.status !== selectedStatus) {
        return false;
      }
      // Keyword search
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const titleMatch = rec.title.toLowerCase().includes(kw);
        const destMatch = rec.destinations?.some((d) => d.toLowerCase().includes(kw));
        const applicantMatch = rec.applicantName?.toLowerCase().includes(kw);
        const noteMatch = rec.notes?.toLowerCase().includes(kw);
        if (!titleMatch && !destMatch && !applicantMatch && !noteMatch) {
          return false;
        }
      }
      return true;
    });
  }, [records, selectedType, selectedStatus, keyword]);

  const pendingApprovalsCount = records.filter((r) => r.status === '待审批').length;

  return (
    <div className="min-h-screen bg-slate-900/5 sm:bg-slate-200 flex justify-center selection:bg-blue-600 selection:text-white font-sans">
      {/* Mobile Screen Shell Frame */}
      <main
        id="app-container"
        className="w-full max-w-md min-h-screen bg-slate-100 flex flex-col shadow-2xl relative pb-20 border-x border-slate-200/80"
      >
        {/* Top App Bar */}
        <Navbar
          onNewRecord={() => {
            setFormInitialData(null);
            setIsFormOpen(true);
          }}
          pendingCount={pendingApprovalsCount}
        />

        {/* Global Toast Alert */}
        {toastMessage && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg backdrop-blur-xs flex items-center gap-1.5 animate-in fade-in slide-in-from-top-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: 工作台 / 首页 */}
        {currentTab === 'home' && (
          <div className="p-4 space-y-4">
            {/* Draft Banner if present */}
            {draft && showDraftBanner && (
              <DraftBanner
                draft={draft}
                onRestore={handleRestoreDraft}
                onDismiss={() => setShowDraftBanner(false)}
              />
            )}

            {/* Quick Hero Banner with Quick Actions */}
            <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-blue-200">
                      欢迎回来，张伟
                    </span>
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-blue-100">
                      技术中心
                    </span>
                  </div>
                  <span
                    className="text-[11px] text-blue-200 font-mono min-h-[16px] inline-block"
                    suppressHydrationWarning
                  >
                    {todayFormatted}
                  </span>
                </div>

                <h2 className="text-lg font-bold tracking-tight text-white mb-1">
                  外出事务与出差审批
                </h2>
                <p className="text-xs text-blue-200/90 leading-relaxed mb-3">
                  轻松记录出差、培训全流程，支持多段行程与附件凭据，一键生成标准公务审批单。
                </p>

                {/* Primary CTA Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    id="btn-quick-create"
                    onClick={() => {
                      setFormInitialData(null);
                      setIsFormOpen(true);
                    }}
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all border border-blue-400/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span>快速新建外出</span>
                  </button>

                  <button
                    id="btn-view-records"
                    onClick={() => setCurrentTab('records')}
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition-all border border-white/20"
                  >
                    <FileText className="w-4 h-4 text-blue-300" />
                    <span>查看历史记录</span>
                  </button>
                </div>
              </div>

              {/* Decorative background glow */}
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
            </div>

            {/* Quick Metrics Bar */}
            {stats && (
              <div className="grid grid-cols-3 gap-2">
                <div
                  onClick={() => setCurrentTab('stats')}
                  className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs text-center cursor-pointer hover:border-blue-300 transition-colors"
                >
                  <span className="text-[10px] text-slate-500 block mb-0.5">本月外出</span>
                  <div className="text-lg font-bold font-mono text-slate-900">
                    {stats.currentMonthCount} <span className="text-[10px] font-normal text-slate-500">次</span>
                  </div>
                  <span className="text-[10px] text-blue-600 font-medium">{stats.currentMonthDays} 天</span>
                </div>

                <div
                  onClick={() => setCurrentTab('records')}
                  className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs text-center cursor-pointer hover:border-blue-300 transition-colors"
                >
                  <span className="text-[10px] text-slate-500 block mb-0.5">待审批单据</span>
                  <div className="text-lg font-bold font-mono text-amber-600">
                    {stats.pendingCount} <span className="text-[10px] font-normal text-slate-500">单</span>
                  </div>
                  <span className="text-[10px] text-amber-600/80">点击处理</span>
                </div>

                <div
                  onClick={() => setCurrentTab('stats')}
                  className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs text-center cursor-pointer hover:border-blue-300 transition-colors"
                >
                  <span className="text-[10px] text-slate-500 block mb-0.5">累计总天数</span>
                  <div className="text-lg font-bold font-mono text-indigo-700">
                    {stats.totalDays} <span className="text-[10px] font-normal text-slate-500">天</span>
                  </div>
                  <span className="text-[10px] text-slate-400">总共 {stats.totalCount} 笔</span>
                </div>
              </div>
            )}

            {/* Quick Pending Approvals Alert if any */}
            {pendingApprovalsCount > 0 && (
              <div
                onClick={() => {
                  setSelectedStatus('待审批');
                  setCurrentTab('records');
                }}
                className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900 cursor-pointer shadow-2xs hover:bg-amber-100/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[11px]">有 {pendingApprovalsCount} 笔外出记录处于待审批状态</p>
                    <p className="text-[10px] text-amber-700">可一键导出《公务出差审批单》提交领导签批</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600" />
              </div>
            )}

            {/* Recent Outings Section */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-blue-700" />
                  <h3 className="text-xs font-bold text-slate-800">最近外出事务记录</h3>
                </div>
                <button
                  onClick={() => setCurrentTab('records')}
                  className="text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-0.5"
                >
                  <span>查看全部 ({records.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-28 bg-white rounded-xl border border-slate-200" />
                  <div className="h-28 bg-white rounded-xl border border-slate-200" />
                </div>
              ) : records.length > 0 ? (
                <div className="space-y-2.5">
                  {records.slice(0, 3).map((rec) => (
                    <RecordCard
                      key={rec.id}
                      record={rec}
                      onViewApproval={handleOpenApproval}
                      onEdit={handleEditRecord}
                      onDelete={handleRequestDelete}
                      onViewDetails={handleOpenDetail}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                  <p>暂无外出事务记录</p>
                  <button
                    onClick={() => {
                      setFormInitialData(null);
                      setIsFormOpen(true);
                    }}
                    className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                  >
                    立即创建第一笔
                  </button>
                </div>
              )}
            </div>

            {/* Quick 3-Step Guide Card */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 text-xs text-slate-700 shadow-2xs">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  3 步快速完成外出与报账管理
                </span>
                <span className="text-[10px] text-blue-600 font-medium">高效合规</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[10px] mb-1">
                    1
                  </span>
                  <p className="font-semibold text-slate-800">记录行程</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">支持多段目的地</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[10px] mb-1">
                    2
                  </span>
                  <p className="font-semibold text-slate-800">留存凭据</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">通知与现场照片</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[10px] mb-1">
                    3
                  </span>
                  <p className="font-semibold text-slate-800">一键导出</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">出差审批单 PDF</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: 外出记录列表 (含时间轴与卡片切换，全字段搜索与筛选) */}
        {currentTab === 'records' && (
          <div className="p-4 space-y-3">
            {/* Search Input Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索活动主题、目的地、申请人或备注..."
                className="w-full text-xs pl-9 pr-8 py-2 bg-white rounded-xl border border-slate-200 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
              />
              {keyword && (
                <button
                  onClick={() => setKeyword('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills (Activity Types) */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {(['全部', '出差', '学习培训', '其他'] as (ActivityType | '全部')[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedType === type
                      ? 'bg-blue-700 text-white shadow-xs font-semibold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {type}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-300 mx-1 shrink-0" />

              {/* Status Pills */}
              {(['全部', '待审批', '已审批', '已归档'] as (ApprovalStatus | '全部')[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedStatus === status
                      ? 'bg-slate-800 text-white shadow-xs font-semibold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* View Mode Switcher and Result Summary */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 px-1">
              <span>
                找到 <strong className="text-slate-900 font-mono">{filteredRecords.length}</strong> 条记录
              </span>

              <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                    viewMode === 'card'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="卡片列表视图"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>卡片</span>
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="时间轴视图"
                >
                  <GitCommit className="w-3.5 h-3.5" />
                  <span>时间轴</span>
                </button>
              </div>
            </div>

            {/* Record List Container */}
            {isLoading ? (
              <div className="space-y-3 animate-pulse pt-2">
                <div className="h-32 bg-white rounded-xl border border-slate-200" />
                <div className="h-32 bg-white rounded-xl border border-slate-200" />
              </div>
            ) : filteredRecords.length > 0 ? (
              viewMode === 'card' ? (
                <div className="space-y-2.5">
                  {filteredRecords.map((rec) => (
                    <RecordCard
                      key={rec.id}
                      record={rec}
                      onViewApproval={handleOpenApproval}
                      onEdit={handleEditRecord}
                      onDelete={handleRequestDelete}
                      onViewDetails={handleOpenDetail}
                    />
                  ))}
                </div>
              ) : (
                <div className="pt-2">
                  <RecordTimeline
                    records={filteredRecords}
                    onViewApproval={handleOpenApproval}
                    onEdit={handleEditRecord}
                    onDelete={handleRequestDelete}
                  />
                </div>
              )
            ) : (
              <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-400 space-y-3">
                <FileText className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs">未找到符合筛选条件的外出记录</p>
                <button
                  onClick={() => {
                    setKeyword('');
                    setSelectedType('全部');
                    setSelectedStatus('全部');
                  }}
                  className="px-3 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium"
                >
                  重置筛选条件
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: 统计分析 (月度次数、总天数、城市分布等) */}
        {currentTab === 'stats' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-700" />
                <span>外出事务数据与报账统计</span>
              </h2>
              <button
                onClick={fetchStats}
                className="text-xs text-slate-500 hover:text-blue-700 flex items-center gap-1"
                title="刷新统计"
              >
                <RefreshCw className="w-3 h-3" />
                <span>刷新</span>
              </button>
            </div>

            <StatsDashboard stats={stats} isLoading={isLoading} />
          </div>
        )}

        {/* Tab 4: 个人中心与 SQLite 管理 */}
        {currentTab === 'profile' && (
          <div className="p-4">
            <ProfileView
              draft={draft}
              onRestoreDraft={handleRestoreDraft}
              onClearDraft={handleClearDraft}
              recordCount={records.length}
            />
          </div>
        )}

        {/* Bottom Floating Navigation */}
        <BottomNav
          currentTab={currentTab}
          onChangeTab={setCurrentTab}
          onNewRecord={() => {
            setFormInitialData(null);
            setIsFormOpen(true);
          }}
          pendingCount={pendingApprovalsCount}
        />

        {/* Modals */}
        {/* 1. 3-Step Create/Edit Record Modal */}
        <RecordFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveRecord}
          initialData={formInitialData}
          latestRecord={records.length > 0 ? records[0] : null}
          onAutoSaveDraft={handleAutoSaveDraft}
        />

        {/* 2. Official Approval Slip & PDF Generator Modal */}
        <ApprovalSlipModal
          isOpen={isApprovalOpen}
          onClose={() => setIsApprovalOpen(false)}
          record={selectedApprovalRecord}
        />

        {/* 3. Record Details Modal */}
        <RecordDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          record={selectedDetailRecord}
          onOpenApproval={handleOpenApproval}
          onEdit={handleEditRecord}
          onDelete={handleRequestDelete}
        />

        {/* 4. In-App Delete Confirmation Modal (Iframe-Safe) */}
        <ConfirmDeleteModal
          isOpen={Boolean(recordToDelete)}
          record={recordToDelete}
          onClose={() => {
            if (!isDeleting) setRecordToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      </main>
    </div>
  );
}
