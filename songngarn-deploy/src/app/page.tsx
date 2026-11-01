'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = loginId.trim();
    if (!cleanId) {
      setErrorMessage('กรุณากรอกรหัสประจำตัว');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cleanId }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.role === 'teacher') {
          localStorage.setItem('songngarn_teacher', JSON.stringify(data.user));
          router.push('/teacher');
        } else if (data.role === 'student') {
          localStorage.setItem(
            'songngarn_student',
            JSON.stringify({
              studentId: data.studentId,
              profile: data.studentProfile,
              enrolledClassrooms: data.enrolledClassrooms,
            })
          );
          router.push('/student');
        }
      } else {
        setErrorMessage(data.message || 'ไม่พบรหัสประจำตัวนี้ในระบบ');
      }
    } catch (err: any) {
      setErrorMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-between relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header Bar */}
      <header className="relative z-10 w-full py-6 px-4 sm:px-8 flex justify-center">
        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-white/[0.04] border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>โรงเรียนพัฒนานิคม • กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี</span>
        </div>
      </header>

      {/* Main Single Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/50">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-sky-500/25">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-sky-100 to-sky-300 bg-clip-text text-transparent">
              songngarn
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              ระบบส่งงานและวัดผลการเรียนรู้
            </p>
          </div>

          {/* Login Form (Single Input) */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="loginId"
                className="block text-xs font-semibold text-slate-300 mb-2 text-center"
              >
                รหัสประจำตัว
              </label>
              <input
                id="loginId"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                autoFocus
                value={loginId}
                onChange={(e) => {
                  setLoginId(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="กรอกรหัสประจำตัว"
                className="w-full bg-black/40 border border-white/15 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20 text-center font-mono text-2xl tracking-widest text-white placeholder-slate-600 rounded-2xl py-3.5 px-4 outline-none transition shadow-inner"
              />
            </div>

            {errorMessage && (
              <div className="text-xs text-rose-300 bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 rounded-xl flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !loginId.trim()}
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-2xl shadow-lg shadow-sky-500/20 transition duration-200 flex items-center justify-center space-x-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <span>เข้าสู่ระบบ</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 py-5 text-center text-xs text-slate-500 border-t border-white/5">
        songngarn (ส่งงาน) © โรงเรียนพัฒนานิคม
      </footer>
    </div>
  );
}
