'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('请输入管理员账号和登录密码');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        onLoginSuccess(data.user, data.token);
      } else {
        setErrorMessage(data.error || '账号或密码不正确，请核对后重试');
      }
    } catch (err: any) {
      setErrorMessage('登录服务连接失败，请检查网络或刷新页面');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 text-white p-6 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-14 h-14 bg-blue-600/30 border border-blue-400/30 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldCheck className="w-7 h-7 text-blue-300" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">外出事务管理后台</h1>
          <p className="text-xs text-slate-300 mt-1">系统综合管控 · 外出审批处理 · 大模型参数联调</p>
        </div>

        {/* Login Form */}
        <div className="p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                管理员账号
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入管理员账号"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                登录密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入登录密码"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在验证登录凭据...</span>
                </>
              ) : (
                <>
                  <span>安全登录管理后台</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              请妥善保管管理员凭证，非授权人员禁止访问后台系统
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
