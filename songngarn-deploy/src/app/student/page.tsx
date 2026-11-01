'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  GraduationCap,
  LogOut,
  ChevronRight,
  Clock,
  MapPin,
  Sparkles,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Classroom, Student } from '@/lib/types';
import { sortClassrooms } from '@/lib/classroom-sort';

export default function StudentDashboard() {
  const router = useRouter();
  const [studentSession, setStudentSession] = useState<{
    studentId: string;
    profile: Student;
    enrolledClassrooms: Classroom[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('songngarn_student');
    if (!stored) {
      router.push('/');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setStudentSession(parsed);
      // โหลดข้อมูลห้องเรียนล่าสุด
      refreshClassrooms(parsed.studentId);
    } catch (e) {
      router.push('/');
    }
  }, [router]);

  const refreshClassrooms = async (studentId: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (data.success) {
        setStudentSession((prev) =>
          prev
            ? {
                ...prev,
                profile: data.studentProfile,
                enrolledClassrooms: sortClassrooms(data.enrolledClassrooms || []),
              }
            : null
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('songngarn_student');
    router.push('/');
  };

  if (loading && !studentSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูลนักเรียน...</span>
        </div>
      </div>
    );
  }

  const profile = studentSession?.profile;
  const classrooms = studentSession?.enrolledClassrooms || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-slate-900 tracking-tight">songngarn</span>
                <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                  ระบบส่งงานนักเรียน
                </span>
              </div>
              <span className="text-xs text-slate-500">โรงเรียนพัฒนานิคม</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {profile && (
              <div className="flex items-center space-x-3 bg-indigo-50/70 border border-indigo-100 px-3.5 py-1.5 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {profile.fullName?.slice(0, 1) || 'น'}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800">
                    {profile.fullName}
                  </div>
                  <div className="text-[11px] text-indigo-700 font-mono">
                    เลขที่ {profile.rollNumber} • รหัส: <strong>{profile.studentId}</strong>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              title="ออกจากระบบ"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            ห้องเรียนที่คุณลงทะเบียน
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            เลือกห้องเรียนเพื่อตรวจสอบรายการงาน ส่งงานเดี่ยวหรือกลุ่ม และดูคะแนนที่ครูตรวจแล้ว
          </p>
        </div>

        {/* Classroom Cards Grid */}
        {classrooms.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">ไม่พบห้องเรียนที่ลงทะเบียน</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              กรุณาแจ้งครูผู้สอนเพื่อเพิ่มรายชื่อของคุณเข้าสู่ห้องเรียน
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((cls, idx) => {
              const gradients = [
                'from-indigo-600 to-purple-700',
                'from-sky-600 to-blue-700',
                'from-emerald-600 to-teal-700',
                'from-amber-600 to-orange-700',
              ];
              const bannerColor = gradients[idx % gradients.length];

              return (
                <div
                  key={cls.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden flex flex-col justify-between group"
                >
                  <div>
                    {/* Banner */}
                    <div className={`p-6 bg-gradient-to-r ${bannerColor} text-white`}>
                      <span className="inline-block text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full mb-2">
                        {cls.courseCode} • {cls.gradeLevel}
                      </span>
                      <h2 className="text-xl font-bold leading-tight group-hover:underline">
                        {cls.name}
                      </h2>
                      <div className="mt-4 flex items-center space-x-2 text-xs text-white/90">
                        <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
                          ครู
                        </span>
                        <span>{cls.teacherName}</span>
                      </div>
                    </div>

                    {/* Class Details */}
                    <div className="p-5 space-y-2.5 text-xs text-slate-600">
                      {cls.scheduleTime && (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{cls.scheduleTime}</span>
                        </div>
                      )}
                      {cls.roomLocation && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{cls.roomLocation}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Open Classroom Link */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">เข้าสู่ห้องเรียน</span>
                    <Link
                      href={`/student/classroom/${cls.id}`}
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-slate-200 px-4 py-2 rounded-xl shadow-sm transition"
                    >
                      <span>ตรวจสอบงาน & ส่งงาน</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>songngarn (ส่งงาน) • ระบบรับ-ส่งงานออนไลน์ โรงเรียนพัฒนานิคม</p>
      </footer>
    </div>
  );
}
