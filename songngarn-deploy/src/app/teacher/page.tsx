'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Users,
  Calendar,
  MapPin,
  FileText,
  Sliders,
  Sparkles,
  Trash2,
  ExternalLink,
  LogOut,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Database,
  RefreshCw,
  Copy,
  Check,
  X,
  Cloud,
} from 'lucide-react';
import { Classroom, ScoreBucket, ScoreEvaluationPlan } from '@/lib/types';
import { DEFAULT_SCORE_PLAN } from '@/lib/db';
import { sortClassrooms } from '@/lib/classroom-sort';

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  // Google Sheets Integration State
  const [sheetsInfo, setSheetsInfo] = useState<{ isEnabled: boolean; maskedUrl: string; pingResult: any } | null>(null);
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [syncResult, setSyncResult] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [copiedPlanNotification, setCopiedPlanNotification] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [roomLocation, setRoomLocation] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Score Plan State
  const [preBuckets, setPreBuckets] = useState<ScoreBucket[]>([
    { id: 'pre_1', name: 'ช่องที่ 1: แบบฝึกหัดและใบงาน', maxScore: 10 },
    { id: 'pre_2', name: 'ช่องที่ 2: การทดลองปฏิบัติการ', maxScore: 15 },
  ]);
  const [midtermScore, setMidtermScore] = useState<number>(20);
  const [postBuckets, setPostBuckets] = useState<ScoreBucket[]>([
    { id: 'post_1', name: 'ช่องที่ 1: กิจกรรมสะเต็ม / โครงงาน', maxScore: 15 },
    { id: 'post_2', name: 'ช่องที่ 2: การสืบค้นและรายงาน', maxScore: 10 },
  ]);
  const [finalScore, setFinalScore] = useState<number>(30);

  // คำนวณคะแนนรวมตามสัดส่วน
  const preTotal = preBuckets.reduce((sum, b) => sum + (Number(b.maxScore) || 0), 0);
  const postTotal = postBuckets.reduce((sum, b) => sum + (Number(b.maxScore) || 0), 0);
  const totalScorePlan = preTotal + Number(midtermScore) + postTotal + Number(finalScore);

  useEffect(() => {
    // โหลด session ครู
    const stored = localStorage.getItem('songngarn_teacher');
    if (!stored) {
      router.push('/');
      return;
    }
    setTeacher(JSON.parse(stored));
    loadClassrooms();
    checkSheetsStatus();
  }, [router]);

  const loadClassrooms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/classrooms');
      const data = await res.json();
      if (data.success) {
        setClassrooms(sortClassrooms(data.classrooms || []));
      }
    } catch (err) {
      console.error('Failed to load classrooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkSheetsStatus = async () => {
    try {
      const res = await fetch('/api/google-sheets');
      const data = await res.json();
      setSheetsInfo(data);
    } catch (err) {}
  };

  const handleSyncWithSheets = async () => {
    try {
      setSyncingSheets(true);
      setSyncResult('');
      const res = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PULL_FROM_SHEETS' }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult('ซิงก์ข้อมูลจาก Google Sheets สำเร็จเรียบร้อย!');
        loadClassrooms();
      } else {
        setSyncResult(data.message || 'ซิงก์ไม่สำเร็จ');
      }
    } catch (err) {
      setSyncResult('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSyncingSheets(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('songngarn_teacher');
    router.push('/');
  };

  // จัดการช่องคะแนนก่อนกลางภาค
  const addPreBucket = () => {
    const nextNum = preBuckets.length + 1;
    setPreBuckets([
      ...preBuckets,
      { id: `pre_${Date.now()}`, name: `ช่องที่ ${nextNum}: งาน/ชิ้นงาน`, maxScore: 10 },
    ]);
  };

  const removePreBucket = (index: number) => {
    if (preBuckets.length <= 1) return;
    setPreBuckets(preBuckets.filter((_, i) => i !== index));
  };

  const updatePreBucket = (index: number, field: 'name' | 'maxScore', value: any) => {
    const updated = [...preBuckets];
    updated[index] = { ...updated[index], [field]: field === 'maxScore' ? Number(value) : value };
    setPreBuckets(updated);
  };

  // จัดการช่องคะแนนหลังกลางภาค
  const addPostBucket = () => {
    const nextNum = postBuckets.length + 1;
    setPostBuckets([
      ...postBuckets,
      { id: `post_${Date.now()}`, name: `ช่องที่ ${nextNum}: งาน/ชิ้นงาน`, maxScore: 10 },
    ]);
  };

  const removePostBucket = (index: number) => {
    if (postBuckets.length <= 1) return;
    setPostBuckets(postBuckets.filter((_, i) => i !== index));
  };

  const updatePostBucket = (index: number, field: 'name' | 'maxScore', value: any) => {
    const updated = [...postBuckets];
    updated[index] = { ...updated[index], [field]: field === 'maxScore' ? Number(value) : value };
    setPostBuckets(updated);
  };

  // ดึงสัดส่วนคะแนนจากห้องเรียนเดิม
  const applyScorePlanFromClassroom = (targetClass: Classroom) => {
    if (!targetClass?.scorePlan) return;
    const plan = targetClass.scorePlan;

    if (plan.preMidterm?.buckets) {
      setPreBuckets(JSON.parse(JSON.stringify(plan.preMidterm.buckets)));
    }
    if (typeof plan.midterm?.maxScore === 'number') {
      setMidtermScore(plan.midterm.maxScore);
    }
    if (plan.postMidterm?.buckets) {
      setPostBuckets(JSON.parse(JSON.stringify(plan.postMidterm.buckets)));
    }
    if (typeof plan.final?.maxScore === 'number') {
      setFinalScore(plan.final.maxScore);
    }

    if (!name.trim() && targetClass.name) {
      setName(targetClass.name);
    }

    setCopiedPlanNotification(
      `ดึงสัดส่วนคะแนนจากวิชา "${targetClass.courseCode} ${targetClass.name} (${targetClass.gradeLevel})" เรียบร้อยแล้ว`
    );
    setTimeout(() => setCopiedPlanNotification(''), 4500);
  };

  const handleCreateClassroom = async () => {
    if (!name.trim() || !courseCode.trim() || !gradeLevel.trim()) {
      setCreateError('กรุณากรอกข้อมูลบังคับ: ชื่อชั้นเรียน, รหัสวิชา และระดับชั้น');
      setCreateStep(1);
      return;
    }

    setSubmitting(true);
    setCreateError('');

    const scorePlan: ScoreEvaluationPlan = {
      preMidterm: {
        buckets: preBuckets,
        totalScore: preTotal,
      },
      midterm: {
        maxScore: Number(midtermScore) || 20,
      },
      postMidterm: {
        buckets: postBuckets,
        totalScore: postTotal,
      },
      final: {
        maxScore: Number(finalScore) || 30,
      },
      totalScore: totalScorePlan,
    };

    try {
      const res = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          courseCode: courseCode.trim(),
          gradeLevel: gradeLevel.trim(),
          roomLocation: roomLocation.trim(),
          scheduleTime: scheduleTime.trim(),
          scorePlan,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setShowCreateModal(false);
        resetForm();
        loadClassrooms();
      } else {
        setCreateError(data.message || 'เกิดข้อผิดพลาดในการสร้างห้องเรียน');
      }
    } catch (err: any) {
      setCreateError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCourseCode('');
    setGradeLevel('');
    setRoomLocation('');
    setScheduleTime('');
    setCreateStep(1);
    setCreateError('');
    setCopiedPlanNotification('');
    setPreBuckets([
      { id: 'pre_1', name: 'ช่องที่ 1: แบบฝึกหัดและใบงาน', maxScore: 10 },
      { id: 'pre_2', name: 'ช่องที่ 2: การทดลองปฏิบัติการ', maxScore: 15 },
    ]);
    setMidtermScore(20);
    setPostBuckets([
      { id: 'post_1', name: 'ช่องที่ 1: กิจกรรมสะเต็ม / โครงงาน', maxScore: 15 },
      { id: 'post_2', name: 'ช่องที่ 2: การสืบค้นและรายงาน', maxScore: 10 },
    ]);
    setFinalScore(30);
  };

  const handleDeleteClassroom = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('ยืนยันที่จะลบห้องเรียนนี้? ข้อมูลนักเรียน งาน และคะแนนทั้งหมดในห้องนี้จะถูกลบ')) {
      return;
    }

    try {
      const res = await fetch(`/api/classrooms/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadClassrooms();
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบห้องเรียน');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-slate-900 tracking-tight">songngarn</span>
                <span className="text-xs bg-sky-100 text-sky-700 font-semibold px-2 py-0.5 rounded-full">
                  ระบบครูผู้สอน
                </span>
              </div>
              <span className="text-xs text-slate-500">โรงเรียนพัฒนานิคม • กลุ่มสาระการเรียนรู้วิทยาศาสตร์</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Google Sheets / Drive Status Pill */}
            <button
              onClick={() => setShowSheetsModal(true)}
              className={`hidden sm:inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                sheetsInfo?.isEnabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className={`w-4 h-4 ${sheetsInfo?.isEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{sheetsInfo?.isEnabled ? 'Google Sheets: เชื่อมต่อแล้ว' : 'ตั้งค่า Google Sheets/Drive'}</span>
            </button>

            {teacher && (
              <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {teacher.fullName?.slice(0, 2) || 'ปม'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                    <span>{teacher.prefix}{teacher.fullName}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    รหัส {teacher.id} • {teacher.position} (แอดมิน)
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              title="ออกจากระบบ"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ชั้นเรียนทั้งหมด
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              จัดการห้องเรียน ตรวจงานนักเรียน และบริหารจัดการสัดส่วนคะแนนวัดผล
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSheetsModal(true)}
              className="sm:hidden inline-flex items-center space-x-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Google Sheets</span>
            </button>

            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white font-medium px-5 py-2.5 rounded-xl shadow-md shadow-sky-600/20 transition-smooth hover:shadow-lg hover:shadow-sky-600/30 text-sm"
            >
              <Plus className="w-5 h-5" />
              <span>สร้างชั้นเรียนใหม่</span>
            </button>
          </div>
        </div>

        {/* Classroom Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse p-6" />
            ))}
          </div>
        ) : classrooms.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">ยังไม่มีชั้นเรียนในระบบ</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              เริ่มต้นด้วยการสร้างชั้นเรียนแรกของคุณครู เพื่อให้นักเรียนสามารถส่งงานและดูผลคะแนนได้
            </p>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2.5 rounded-xl shadow"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างชั้นเรียนแรก</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((cls, idx) => {
              const colorGradients = [
                'from-sky-600 to-blue-700',
                'from-indigo-600 to-purple-700',
                'from-emerald-600 to-teal-700',
                'from-amber-600 to-orange-700',
                'from-rose-600 to-pink-700',
              ];
              const bannerColor = colorGradients[idx % colorGradients.length];

              return (
                <div
                  key={cls.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden flex flex-col justify-between group"
                >
                  <div>
                    {/* Banner */}
                    <div className={`p-6 bg-gradient-to-r ${bannerColor} text-white relative`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-block text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full mb-2">
                            {cls.courseCode} • {cls.gradeLevel}
                          </span>
                          <h2 className="text-xl font-bold leading-tight group-hover:underline">
                            {cls.name}
                          </h2>
                        </div>
                        <button
                          onClick={(e) => handleDeleteClassroom(cls.id, e)}
                          className="p-1.5 text-white/70 hover:text-white hover:bg-black/20 rounded-lg transition"
                          title="ลบชั้นเรียน"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center space-x-2 text-xs text-white/90">
                        <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
                          ปม
                        </span>
                        <span>{cls.teacherName}</span>
                      </div>
                    </div>

                    {/* Class Info */}
                    <div className="p-5 space-y-3 text-xs text-slate-600">
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
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-700">
                          {cls.studentCount ?? 0} นักเรียนในชั้น
                        </span>
                      </div>

                      {/* Score Plan Pill */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>แผนสัดส่วนคะแนน:</span>
                        <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                          ก่อน {cls.scorePlan?.preMidterm?.totalScore || 25} | กลาง {cls.scorePlan?.midterm?.maxScore || 20} | หลัง {cls.scorePlan?.postMidterm?.totalScore || 25} | ปลาย {cls.scorePlan?.final?.maxScore || 30}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Link Footer */}
                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">เข้าสู่ห้องเรียน</span>
                    <Link
                      href={`/teacher/classroom/${cls.id}`}
                      className="inline-flex items-center space-x-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-white hover:bg-sky-50 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-sm transition"
                    >
                      <span>เปิดห้องเรียน</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ================= MODAL: ตั้งค่า Google Sheets & Drive ================= */}
      {showSheetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">เชื่อมต่อ Google Sheets & Google Drive</h3>
                  <p className="text-xs text-emerald-100">บันทึกคะแนนใน Sheets และเก็บไฟล์ใน Drive ฟรี 100%</p>
                </div>
              </div>
              <button
                onClick={() => setShowSheetsModal(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Connection Status Card */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                sheetsInfo?.isEnabled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${sheetsInfo?.isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <div>
                    <div className="font-bold text-sm">
                      {sheetsInfo?.isEnabled ? 'สถานะ: เชื่อมต่อ Google Sheets & Drive สำเร็จ' : 'สถานะ: กำลังใช้งานระบบ Local Database'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {sheetsInfo?.isEnabled
                        ? `URL: ${sheetsInfo.maskedUrl}`
                        : 'ยังไม่ได้ตั้งค่า GOOGLE_SCRIPT_URL (ระบบจะบันทึกในไฟล์เครื่องโดยอัตโนมัติ)'}
                    </div>
                  </div>
                </div>

                {sheetsInfo?.isEnabled && (
                  <button
                    onClick={handleSyncWithSheets}
                    disabled={syncingSheets}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm flex items-center space-x-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingSheets ? 'animate-spin' : ''}`} />
                    <span>{syncingSheets ? 'กำลังซิงก์...' : 'ซิงก์ข้อมูล'}</span>
                  </button>
                )}
              </div>

              {syncResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium">
                  {syncResult}
                </div>
              )}

              {/* Step-by-step Setup Guide */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>3 ขั้นตอนง่ายๆ ในการเชื่อมต่อ Google Sheets ของครู:</span>
                </h4>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <span className="font-bold text-slate-800 block">สร้าง Google Sheet ใหม่</span>
                      <span className="text-slate-500 text-[11px]">
                        เปิด <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-sky-600 underline">sheets.new</a> ตั้งชื่อไฟล์ว่า "songngarn_database"
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <span className="font-bold text-slate-800 block">เปิด Apps Script แล้ววางโค้ด</span>
                      <span className="text-slate-500 text-[11px] block mb-1.5">
                        ใน Google Sheet ไปที่เมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong> แล้วนำโค้ดจากไฟล์ <code>google-apps-script/Code.gs</code> ไปวางแทนที่โค้ดเดิมทั้งหมด
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <span className="font-bold text-slate-800 block">Deploy เป็น Web App</span>
                      <span className="text-slate-500 text-[11px]">
                        กดปุ่มสีน้ำเงิน <strong>"ทำให้ใช้งานได้" (Deploy) &gt; "การทำให้ใช้งานได้รายการใหม่" (New Deployment)</strong> เลือกประเภท "เว็บแอป", ตั้งค่า "ผู้มีสิทธิ์เข้าถึง: ทุกคน (Anyone)" แล้วกด Deploy จะได้รับ URL เว็บแอป
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-amber-900 text-[11px] leading-relaxed">
                  💡 <strong>การใส่ URL ในระบบ:</strong> นำ URL เว็บแอปที่ได้ ไปใส่ในไฟล์ <code>.env.local</code> โดยตั้งชื่อว่า:
                  <div className="bg-white border border-amber-300 p-2 rounded-lg font-mono text-[10px] my-1 text-slate-800 select-all">
                    GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/xxxx/exec
                  </div>
                  (หรือนำไปกรอกใน Environment Variables บน Vercel เมื่อนำขึ้นออนไลน์)
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSheetsModal(false)}
                className="bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl hover:bg-slate-700 shadow"
              >
                เข้าใจแล้ว / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: สร้างชั้นเรียนใหม่ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-sky-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">สร้างชั้นเรียนใหม่</h3>
                  <p className="text-xs text-sky-100 mt-1">
                    กำหนดข้อมูลวิชาและสัดส่วนคะแนนตามแผนวัดผลการเรียนรู้ของโรงเรียน
                  </p>
                </div>
                <div className="flex items-center space-x-1 bg-white/20 p-1 rounded-xl text-xs font-medium">
                  <button
                    onClick={() => setCreateStep(1)}
                    className={`px-3 py-1 rounded-lg transition ${
                      createStep === 1 ? 'bg-white text-sky-700 font-bold shadow-sm' : 'text-white'
                    }`}
                  >
                    1. ข้อมูลวิชา
                  </button>
                  <button
                    onClick={() => setCreateStep(2)}
                    className={`px-3 py-1 rounded-lg transition ${
                      createStep === 2 ? 'bg-white text-sky-700 font-bold shadow-sm' : 'text-white'
                    }`}
                  >
                    2. สัดส่วนคะแนน
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {createError && (
                <div className="mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {createStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-sky-50 border border-sky-100 rounded-2xl p-3.5 text-xs text-sky-800 flex items-start space-x-2">
                    <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <span>
                      ช่องที่มีเครื่องหมาย <span className="text-rose-500 font-bold">*</span> เป็นข้อมูลบังคับ 
                      เพื่อให้ระบบจัดหมวดหมู่งานและรายงานคะแนนได้อย่างถูกต้อง
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ชื่อชั้นเรียน / ชื่อรายวิชา <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="เช่น วิทยาศาสตร์กายภาพ (เคมี)"
                      className="w-full border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-4 py-2.5 text-sm outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        รหัสวิชา <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        placeholder="เช่น ว31101"
                        className="w-full border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-4 py-2.5 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ชั้น / ห้องเรียน <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                        placeholder="เช่น ม.4/1"
                        className="w-full border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-4 py-2.5 text-sm outline-none"
                      />
                    </div>
                  </div>

                  {/* ตรวจจับและแนะนำดึงสัดส่วนคะแนนจากวิชาเดียวกัน */}
                  {(() => {
                    const matchingCourses = classrooms.filter(
                      (c) =>
                        courseCode.trim() !== '' &&
                        c.courseCode.trim().toLowerCase() === courseCode.trim().toLowerCase()
                    );
                    if (matchingCourses.length === 0) return null;

                    return (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 space-y-2.5 animate-in fade-in duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 text-amber-950 font-bold text-xs">
                            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>พบวิชาเดียวกันที่เคยสร้างไว้: {matchingCourses[0].courseCode} {matchingCourses[0].name}</span>
                          </div>
                          <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full shrink-0 self-start sm:self-auto">
                            {matchingCourses.length} ห้องเรียนเดิม
                          </span>
                        </div>

                        <p className="text-[11px] text-amber-900/80">
                          สัดส่วนคะแนนเดิม: ก่อนกลาง {matchingCourses[0].scorePlan?.preMidterm?.totalScore || 25} | กลาง {matchingCourses[0].scorePlan?.midterm?.maxScore || 20} | หลังกลาง {matchingCourses[0].scorePlan?.postMidterm?.totalScore || 25} | ปลาย {matchingCourses[0].scorePlan?.final?.maxScore || 30}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => applyScorePlanFromClassroom(matchingCourses[0])}
                            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition flex items-center space-x-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>ดึงสัดส่วนคะแนนจากห้อง {matchingCourses[0].gradeLevel} มาใช้</span>
                          </button>

                          {matchingCourses.length > 1 && (
                            <select
                              onChange={(e) => {
                                const target = matchingCourses.find((c) => c.id === e.target.value);
                                if (target) applyScorePlanFromClassroom(target);
                              }}
                              defaultValue=""
                              className="bg-white border border-amber-300 text-amber-900 text-xs font-semibold rounded-xl px-2.5 py-1.5 outline-none"
                            >
                              <option value="" disabled>เลือกห้องเรียนอื่น...</option>
                              {matchingCourses.map((c) => (
                                <option key={c.id} value={c.id}>
                                  ห้อง {c.gradeLevel}
                                </option>
                              ))}
                            </select>
                          )}

                          <span className="text-[11px] text-amber-800 italic ml-auto">หรือพิมพ์กำหนดเอง</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        สถานที่เรียน (ไม่บังคับ)
                      </label>
                      <input
                        type="text"
                        value={roomLocation}
                        onChange={(e) => setRoomLocation(e.target.value)}
                        placeholder="เช่น ห้องปฏิบัติการวิทยาศาสตร์ 324"
                        className="w-full border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-4 py-2.5 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        เวลาเรียน (ไม่บังคับ)
                      </label>
                      <input
                        type="text"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        placeholder="เช่น วันพุธ คาบ 3-4 (10:10 - 11:50)"
                        className="w-full border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-4 py-2.5 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCreateStep(2)}
                      className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-5 py-2.5 rounded-xl shadow flex items-center space-x-1.5 text-sm"
                    >
                      <span>ถัดไป: ตั้งค่าสัดส่วนคะแนน</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {createStep === 2 && (
                <div className="space-y-6">
                  {/* กล่องเลือกดึงสัดส่วนคะแนนจากวิชาเดิม หรือกำหนดเอง */}
                  <div className="bg-gradient-to-br from-slate-50 to-sky-50/50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                        <span>เลือกวิธีกำหนดสัดส่วนคะแนน</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        คุณครูสามารถเลือกดึงสัดส่วนคะแนนจากวิชาเดิมที่เคยสร้างไว้เพื่อความรวดเร็ว หรือเลื่อนลงไปพิมพ์กำหนดตัวเลขแต่ละช่องด้านล่างได้เอง
                      </p>
                    </div>

                    {classrooms.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          คัดลอกสัดส่วนจากห้องเรียนเดิม:
                        </label>
                        <select
                          onChange={(e) => {
                            const target = classrooms.find((c) => c.id === e.target.value);
                            if (target) {
                              applyScorePlanFromClassroom(target);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                          className="w-full bg-white border border-sky-300 text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm cursor-pointer hover:border-sky-400 transition"
                        >
                          <option value="" disabled>
                            📋 คลิกเพื่อเลือกวิชาที่ต้องการดึงสัดส่วนคะแนน...
                          </option>
                          {classrooms.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.courseCode} {c.name} ({c.gradeLevel}) • ก่อนกลาง {c.scorePlan?.preMidterm?.totalScore || 25} | กลาง {c.scorePlan?.midterm?.maxScore || 20} | หลังกลาง {c.scorePlan?.postMidterm?.totalScore || 25} | ปลาย {c.scorePlan?.final?.maxScore || 30}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {copiedPlanNotification && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold">{copiedPlanNotification}</span>
                      </div>
                    )}
                  </div>

                  {/* Total points summary card */}
                  <div
                    className={`p-4 rounded-2xl border flex items-center justify-between ${
                      totalScorePlan === 100
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Sliders className="w-5 h-5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">
                          สัดส่วนคะแนนรวม 4 ส่วน:{' '}
                          <span className="text-base font-extrabold">{totalScorePlan}</span> / 100 คะแนน
                        </div>
                        <div className="text-[11px] opacity-80">
                          {totalScorePlan === 100
                            ? 'สัดส่วนคะแนนถูกต้องครบ 100 คะแนนเรียบร้อย'
                            : 'แนะนำให้ผลรวมของทั้ง 4 ส่วนเท่ากับ 100 คะแนนเพื่อความถูกต้องในการตัดเกรด'}
                        </div>
                      </div>
                    </div>
                    {totalScorePlan === 100 && (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    )}
                  </div>

                  {/* ส่วนที่ 1: ก่อนกลางภาค */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          1. ก่อนกลางภาค (คะแนนรวม: {preTotal} คะแนน)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          ปรับจำนวนช่องคะแนนเก็บได้ตามแผนวัดผล
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addPreBucket}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-700 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มช่อง</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {preBuckets.map((bucket, idx) => (
                        <div
                          key={bucket.id}
                          className="flex items-center space-x-2 bg-white p-2.5 rounded-xl border border-slate-200/80"
                        >
                          <input
                            type="text"
                            value={bucket.name}
                            onChange={(e) => updatePreBucket(idx, 'name', e.target.value)}
                            placeholder="ชื่อช่องคะแนน"
                            className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-sky-500"
                          />
                          <div className="flex items-center space-x-1 shrink-0">
                            <span className="text-[11px] text-slate-500">เก็บ:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={bucket.maxScore}
                              onChange={(e) => updatePreBucket(idx, 'maxScore', e.target.value)}
                              className="w-16 text-xs text-center font-bold border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-sky-500"
                            />
                            <span className="text-[11px] text-slate-500">คะแนน</span>
                          </div>
                          {preBuckets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePreBucket(idx)}
                              className="text-slate-400 hover:text-rose-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ส่วนที่ 2: กลางภาค (ช่องเดียว) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">2. กลางภาค (ช่องเดียว)</h4>
                      <p className="text-[11px] text-slate-500">คะแนนสอบกลางภาคมาตรฐาน 1 ช่อง</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-slate-600 font-medium">คะแนนเต็ม:</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={midtermScore}
                        onChange={(e) => setMidtermScore(Number(e.target.value))}
                        className="w-20 text-xs text-center font-bold border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-sky-500 bg-white"
                      />
                      <span className="text-xs text-slate-500">คะแนน</span>
                    </div>
                  </div>

                  {/* ส่วนที่ 3: หลังกลางภาค */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          3. หลังกลางภาค (คะแนนรวม: {postTotal} คะแนน)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          ปรับจำนวนช่องคะแนนเก็บหลังกลางภาคได้
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addPostBucket}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-700 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มช่อง</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {postBuckets.map((bucket, idx) => (
                        <div
                          key={bucket.id}
                          className="flex items-center space-x-2 bg-white p-2.5 rounded-xl border border-slate-200/80"
                        >
                          <input
                            type="text"
                            value={bucket.name}
                            onChange={(e) => updatePostBucket(idx, 'name', e.target.value)}
                            placeholder="ชื่อช่องคะแนน"
                            className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-sky-500"
                          />
                          <div className="flex items-center space-x-1 shrink-0">
                            <span className="text-[11px] text-slate-500">เก็บ:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={bucket.maxScore}
                              onChange={(e) => updatePostBucket(idx, 'maxScore', e.target.value)}
                              className="w-16 text-xs text-center font-bold border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-sky-500"
                            />
                            <span className="text-[11px] text-slate-500">คะแนน</span>
                          </div>
                          {postBuckets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePostBucket(idx)}
                              className="text-slate-400 hover:text-rose-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ส่วนที่ 4: ปลายภาค (ช่องเดียว) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">4. ปลายภาค (ช่องเดียว)</h4>
                      <p className="text-[11px] text-slate-500">คะแนนสอบปลายภาคมาตรฐาน 1 ช่อง</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-slate-600 font-medium">คะแนนเต็ม:</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={finalScore}
                        onChange={(e) => setFinalScore(Number(e.target.value))}
                        className="w-20 text-xs text-center font-bold border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-sky-500 bg-white"
                      />
                      <span className="text-xs text-slate-500">คะแนน</span>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCreateStep(1)}
                      className="text-slate-600 hover:text-slate-900 text-xs font-semibold px-4 py-2"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleCreateClassroom}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-xl shadow flex items-center space-x-2 text-sm"
                    >
                      <span>{submitting ? 'กำลังสร้างห้องเรียน...' : 'บันทึกและสร้างห้องเรียน'}</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-slate-800 text-xs font-medium px-4 py-2"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
