'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { OutingRecord, OutingStats } from '@/types/outing';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminHeader, AdminTab } from '@/components/admin/AdminHeader';
import { AdminRecordsManager } from '@/components/admin/AdminRecordsManager';
import { AdminLLMManager } from '@/components/admin/AdminLLMManager';
import { AdminStatsView } from '@/components/admin/AdminStatsView';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<AdminTab>('records');

  // Business Data
  const [records, setRecords] = useState<OutingRecord[]>([]);
  const [stats, setStats] = useState<OutingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Global Admin Toast
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch all records
  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRecords(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch records:', err);
      showToast('获取外出记录失败，请检查服务状态', 'error');
    }
  }, []);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchRecords(), fetchStats()]);
    setIsRefreshing(false);
  }, [fetchRecords, fetchStats]);

  // Check login state and load initial data
  useEffect(() => {
    let isMounted = true;

    const initAuthAndData = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : null;

      if (!token) {
        if (isMounted) setIsAuthenticated(false);
        return;
      }

      if (userStr && isMounted) {
        try {
          setAdminUser(JSON.parse(userStr));
        } catch {
          // ignore
        }
      }
      if (isMounted) setIsAuthenticated(true);

      // Fetch records & stats
      try {
        const [recordsRes, statsRes] = await Promise.all([
          fetch('/api/records').then((r) => r.json()),
          fetch('/api/stats').then((r) => r.json()),
        ]);

        if (isMounted) {
          if (recordsRes.success && Array.isArray(recordsRes.data)) {
            setRecords(recordsRes.data);
          }
          if (statsRes.success && statsRes.data) {
            setStats(statsRes.data);
          }
        }
      } catch (err) {
        console.error('Failed to load initial admin data:', err);
      }
    };

    initAuthAndData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Login Success
  const handleLoginSuccess = async (user: any, token: string) => {
    setAdminUser(user);
    setIsAuthenticated(true);
    showToast('管理员登录成功，欢迎进入外出事务管理控制台');
    await refreshAll();
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } catch {
      // ignore
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  // Update a single record
  const handleUpdateRecord = async (id: string, data: Partial<OutingRecord>) => {
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        showToast('记录状态与审批信息已更新');
        await refreshAll();
        return true;
      } else {
        showToast(result.error || '更新失败', 'error');
        return false;
      }
    } catch (err: any) {
      showToast('网络请求异常，更新失败', 'error');
      return false;
    }
  };

  // Delete a single record
  const handleDeleteRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        showToast('该外出记录已从 SQLite 数据库彻底删除');
        await refreshAll();
        return true;
      } else {
        showToast(result.error || '删除失败', 'error');
        return false;
      }
    } catch (err) {
      showToast('删除操作异常', 'error');
      return false;
    }
  };

  // Batch action
  const handleBatchAction = async (action: string, ids: string[]) => {
    try {
      const res = await fetch('/api/admin/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids }),
      });
      const result = await res.json();
      if (result.success) {
        showToast(result.message || '批量操作已完成');
        await refreshAll();
        return true;
      } else {
        showToast(result.error || '批量操作失败', 'error');
        return false;
      }
    } catch (err) {
      showToast('批量操作请求异常', 'error');
      return false;
    }
  };

  // Loading initial authentication check
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 text-white">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-xs text-slate-400">正在验证管理员访问权限...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login Page
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  const pendingCount = records.filter((r) => r.status === '待审批').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* 1. Admin Header */}
      <AdminHeader
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onLogout={handleLogout}
        onRefresh={refreshAll}
        isRefreshing={isRefreshing}
        pendingCount={pendingCount}
      />

      {/* 2. Global Toast Message */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-semibold border ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 3. Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentTab === 'records' && (
          <AdminRecordsManager
            records={records}
            onRefresh={refreshAll}
            onUpdateRecord={handleUpdateRecord}
            onDeleteRecord={handleDeleteRecord}
            onBatchAction={handleBatchAction}
          />
        )}

        {currentTab === 'llm' && <AdminLLMManager />}

        {currentTab === 'stats' && (
          <AdminStatsView stats={stats} totalRecordsCount={records.length} />
        )}
      </main>

      {/* 4. Admin Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-[11px] text-slate-400">
        外出事务综合管理平台 · 后台控制系统 · SQLite 数据持久化与大模型智能联动
      </footer>
    </div>
  );
}
