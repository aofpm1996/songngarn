'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  ExternalLink,
  Save,
  Check,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Search,
  CheckCircle2,
  Image as ImageIcon,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { Assignment, Classroom, Student, Submission } from '@/lib/types';

export default function AssignmentGradingPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const assignmentId = params.assignmentId as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'graded'>('all');

  // Grading form state
  const [masterScore, setMasterScore] = useState<number | string>('');
  const [memberScores, setMemberScores] = useState<Record<string, { score: number | string; feedback: string }>>({});
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [classroomId, assignmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // โหลดงาน
      const resAssn = await fetch(`/api/assignments/${assignmentId}`);
      const dataAssn = await resAssn.json();
      if (!dataAssn.success) {
        router.push(`/teacher/classroom/${classroomId}`);
        return;
      }
      setAssignment(dataAssn.assignment);
      setClassroom(dataAssn.classroom);

      // โหลดนักเรียน
      const resStd = await fetch(`/api/classrooms/${classroomId}/students`);
      const dataStd = await resStd.json();
      if (dataStd.success) setStudents(dataStd.students);

      // โหลดการส่งงาน
      const resSub = await fetch(`/api/submissions?assignmentId=${assignmentId}`);
      const dataSub = await resSub.json();
      if (dataSub.success) {
        const subs: Submission[] = dataSub.submissions || [];
        setSubmissions(subs);
        if (subs.length > 0 && !selectedSub) {
          selectSubmission(subs[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectSubmission = (sub: Submission) => {
    setSelectedSub(sub);
    setSaveSuccess(false);

    // เตรียมฟอร์มให้คะแนน
    const initialScores: Record<string, { score: number | string; feedback: string }> = {};

    if (sub.isGroup && sub.groupMembers && sub.groupMembers.length > 0) {
      // ดึงคะแนนเดิมถ้ามี
      let firstScore: number | string = '';
      sub.groupMembers.forEach((m) => {
        const existing = sub.studentScores?.[m.studentId];
        initialScores[m.studentId] = {
          score: existing !== undefined ? existing.score : '',
          feedback: existing?.feedback || '',
        };
        if (firstScore === '' && existing !== undefined) {
          firstScore = existing.score;
        }
      });
      setMasterScore(firstScore);
    } else {
      // งานเดี่ยว
      const existing = sub.studentScores?.[sub.submitterStudentId];
      initialScores[sub.submitterStudentId] = {
        score: existing !== undefined ? existing.score : '',
        feedback: existing?.feedback || '',
      };
      setMasterScore(existing !== undefined ? existing.score : '');
    }

    setMemberScores(initialScores);
    setGeneralFeedback(sub.generalFeedback || '');
  };

  // ปุ่มกด: ให้คะแนนทุกคนเท่ากัน
  const applyMasterScoreToAll = () => {
    if (masterScore === '') return;
    const num = Math.round(Number(masterScore));
    const updated: Record<string, { score: number | string; feedback: string }> = {};

    if (selectedSub?.groupMembers) {
      selectedSub.groupMembers.forEach((m) => {
        updated[m.studentId] = {
          score: num,
          feedback: memberScores[m.studentId]?.feedback || '',
        };
      });
    } else if (selectedSub) {
      updated[selectedSub.submitterStudentId] = {
        score: num,
        feedback: memberScores[selectedSub.submitterStudentId]?.feedback || '',
      };
    }
    setMemberScores(updated);
  };

  const handleSaveGrade = async () => {
    if (!selectedSub) return;
    setSavingGrade(true);
    setSaveSuccess(false);

    try {
      const formattedScores: Record<string, { score: number; feedback?: string }> = {};

      for (const [sId, val] of Object.entries(memberScores)) {
        if (val.score !== '') {
          formattedScores[sId] = {
            score: Math.round(Number(val.score)),
            feedback: val.feedback,
          };
        }
      }

      const res = await fetch(`/api/submissions/${selectedSub.id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentScores: formattedScores,
          generalFeedback: generalFeedback.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSaveSuccess(true);
        // ปรับปรุงรายการใน state
        setSubmissions((prev) =>
          prev.map((s) => (s.id === selectedSub.id ? data.submission : s))
        );
        setSelectedSub(data.submission);
      } else {
        alert(data.message || 'บันทึกคะแนนไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกคะแนน');
    } finally {
      setSavingGrade(false);
    }
  };

  // สลับสถานะเปิด/ปิดรับงาน
  const toggleAssignmentStatus = async () => {
    if (!assignment) return;
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: !assignment.isOpen }),
      });
      const data = await res.json();
      if (data.success) {
        setAssignment(data.assignment);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด');
    }
  };

  if (loading || !assignment || !classroom) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูลการตรวจงาน...</span>
        </div>
      </div>
    );
  }

  // ฟิลเตอร์รายการส่งงาน
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.submitterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.submitterStudentId.includes(searchQuery) ||
      sub.groupMembers?.some(
        (m) =>
          m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.studentId.includes(searchQuery)
      );

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') return sub.status === 'submitted';
    if (statusFilter === 'graded') return sub.status === 'graded';
    return true;
  });

  const gradedCount = submissions.filter((s) => s.status === 'graded').length;
  const lateCount = submissions.filter((s) => s.isLate).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href={`/teacher/classroom/${classroomId}`}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="กลับห้องเรียน"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-slate-900 tracking-tight">
                  ตรวจงาน: {assignment.title}
                </span>
                <span className="text-xs bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded-full">
                  เต็ม {assignment.maxScore} คะแนน
                </span>
              </div>
              <span className="text-xs text-slate-500">
                {classroom.courseCode} {classroom.name} • {classroom.gradeLevel}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleAssignmentStatus}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 transition ${
                assignment.isOpen
                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {assignment.isOpen ? (
                <>
                  <ToggleRight className="w-4 h-4 text-amber-600" />
                  <span>เปิดรับงานอยู่ (คลิกปิด)</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-slate-400" />
                  <span>ปิดรับงานแล้ว (คลิกเปิด)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Stats Bar */}
      <div className="bg-slate-100/80 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-4">
            <span className="text-slate-600">
              ส่งแล้ว:{' '}
              <strong className="text-slate-900 font-bold">{submissions.length}</strong> รายการ
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-emerald-700 font-medium">
              ตรวจแล้ว: <strong>{gradedCount}</strong> รายการ
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-amber-700 font-medium">
              รอตรวจ: <strong>{submissions.length - gradedCount}</strong> รายการ
            </span>
            {lateCount > 0 && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-rose-600 font-medium">
                  ส่งล่าช้า: <strong>{lateCount}</strong> รายการ
                </span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2 text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>ช่องคะแนน: <strong>{assignment.targetBucketName}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col lg:flex-row gap-6">
        {/* Left Column: Submissions List */}
        <div className="w-full lg:w-96 shrink-0 space-y-4">
          {/* Search & Filter */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ หรือรหัส..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center space-x-1 pt-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`flex-1 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`flex-1 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                รอตรวจ
              </button>
              <button
                onClick={() => setStatusFilter('graded')}
                className={`flex-1 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'graded'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ตรวจแล้ว
              </button>
            </div>
          </div>

          {/* List Cards */}
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 p-4">
                <span className="text-xs text-slate-500">ไม่พบรายการส่งงานที่ตรงกับเงื่อนไข</span>
              </div>
            ) : (
              filteredSubmissions.map((sub) => {
                const isSelected = selectedSub?.id === sub.id;
                const isGraded = sub.status === 'graded';

                return (
                  <div
                    key={sub.id}
                    onClick={() => selectSubmission(sub)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition text-left space-y-1.5 ${
                      isSelected
                        ? 'bg-sky-50/80 border-sky-400 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-sky-800">
                          {sub.submitterStudentId}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {sub.submitterName}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isGraded
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isGraded ? 'ตรวจแล้ว' : 'รอตรวจ'}
                      </span>
                    </div>

                    {sub.isGroup && sub.groupMembers && (
                      <div className="text-[11px] text-indigo-700 flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>กลุ่ม {sub.groupMembers.length} คน</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>{new Date(sub.submittedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                      {sub.isLate && (
                        <span className="text-rose-600 font-bold bg-rose-50 px-1.5 rounded">
                          ส่งล่าช้า
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Submission Details & Grading */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          {!selectedSub ? (
            <div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs text-center">
              <div>
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <span>คลิกเลือกรายการส่งงานทางด้านซ้ายเพื่อดูไฟล์และให้คะแนน</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Header of selected submission */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedSub.submitterName}
                    </h2>
                    <span className="font-mono text-xs bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-md">
                      {selectedSub.submitterStudentId}
                    </span>
                    {selectedSub.isLate && (
                      <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                        ส่งล่าช้า
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    ส่งเมื่อ:{' '}
                    {new Date(selectedSub.submittedAt).toLocaleString('th-TH', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      selectedSub.status === 'graded'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {selectedSub.status === 'graded' ? 'ตรวจแล้ว' : 'รอตรวจ'}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* หากเป็นงานกลุ่ม แสดงรายชื่อสมาชิกทั้งหมด */}
                {selectedSub.isGroup && selectedSub.groupMembers && (
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>สมาชิกในกลุ่ม ({selectedSub.groupMembers.length} คน):</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {selectedSub.groupMembers.map((m) => (
                        <div
                          key={m.studentId}
                          className="bg-white border border-indigo-100 p-2 rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-900 mr-2">เลขที่ {m.rollNumber}</span>
                            <span>{m.fullName}</span>
                          </div>
                          <span className="font-mono text-[11px] text-indigo-700 font-bold">
                            {m.studentId}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ข้อความแนบจากนักเรียน */}
                {selectedSub.studentComment && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
                    <span className="text-[11px] text-slate-500 font-bold block mb-1">
                      บันทึกจากนักเรียน:
                    </span>
                    <p className="text-slate-800 leading-relaxed">{selectedSub.studentComment}</p>
                  </div>
                )}

                {/* ไฟล์แนบ และ ลิงก์ */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    เอกสารและไฟล์ที่ส่ง ({selectedSub.attachments?.length || 0} รายการ)
                  </h3>

                  {(!selectedSub.attachments || selectedSub.attachments.length === 0) ? (
                    <div className="text-xs text-slate-400 italic">ไม่มีไฟล์แนบ</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedSub.attachments.map((att, i) => (
                        <div
                          key={i}
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col justify-between space-y-2 hover:border-sky-300 transition"
                        >
                          <div className="flex items-center space-x-2">
                            {att.type === 'image' ? (
                              <ImageIcon className="w-5 h-5 text-sky-600 shrink-0" />
                            ) : att.type === 'pdf' ? (
                              <FileText className="w-5 h-5 text-rose-600 shrink-0" />
                            ) : (
                              <ExternalLink className="w-5 h-5 text-indigo-600 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-slate-800 truncate" title={att.name}>
                              {att.name}
                            </span>
                          </div>

                          {/* รูปภาพ Thumbnail Preview */}
                          {att.type === 'image' && (
                            <div className="rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-100 flex items-center justify-center">
                              <img
                                src={att.url}
                                alt={att.name}
                                className="object-cover max-h-48 w-full hover:scale-105 transition duration-300"
                              />
                            </div>
                          )}

                          <div className="pt-1 flex justify-end">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-sm"
                            >
                              <span>เปิดดูไฟล์ / ลิงก์</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ================= GRADING SECTION ================= */}
                <div className="pt-6 border-t border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        ให้คะแนนและคำแนะนำ (คะแนนเต็ม {assignment.maxScore} คะแนน)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        คะแนนดิบจะถูกทอนสัดส่วนไปยังช่อง "{assignment.targetBucketName}" โดยอัตโนมัติ
                      </p>
                    </div>

                    {saveSuccess && (
                      <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>บันทึกคะแนนเรียบร้อย</span>
                      </span>
                    )}
                  </div>

                  {/* For Group: ปุ่มให้คะแนนทุกคนเท่ากัน */}
                  {selectedSub.isGroup && selectedSub.groupMembers && (
                    <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-sky-950 block">
                          คะแนนหลักสำหรับทั้งกลุ่ม
                        </span>
                        <span className="text-[11px] text-sky-800">
                          กดปุ่มเพื่อให้คะแนนนี้กับเพื่อนทุกคนในกลุ่มในคลิกเดียว
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min={0}
                          max={assignment.maxScore}
                          step={1}
                          value={masterScore}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMasterScore(val === '' ? '' : Math.round(Number(val)));
                          }}
                          placeholder="คะแนน"
                          className="w-20 text-center font-bold text-xs bg-white border border-sky-300 rounded-xl px-2 py-2 outline-none"
                        />
                        <button
                          type="button"
                          onClick={applyMasterScoreToAll}
                          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition"
                        >
                          ให้คะแนนทุกคนเท่ากัน
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Individual rows for each member / or single student */}
                  <div className="space-y-3">
                    {(selectedSub.isGroup && selectedSub.groupMembers?.length
                      ? selectedSub.groupMembers
                      : [
                          {
                            studentId: selectedSub.submitterStudentId,
                            fullName: selectedSub.submitterName,
                            rollNumber: 1,
                          },
                        ]
                    ).map((m) => (
                      <div
                        key={m.studentId}
                        className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                            {m.rollNumber}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{m.fullName}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              รหัส: {m.studentId}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="ข้อเสนอแนะเฉพาะคน"
                            value={memberScores[m.studentId]?.feedback || ''}
                            onChange={(e) => {
                              setMemberScores({
                                ...memberScores,
                                [m.studentId]: {
                                  score: memberScores[m.studentId]?.score ?? '',
                                  feedback: e.target.value,
                                },
                              });
                            }}
                            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none w-48 sm:w-64"
                          />
                          <div className="flex items-center space-x-1 shrink-0">
                            <input
                              type="number"
                              min={0}
                              max={assignment.maxScore}
                              step={1}
                              value={memberScores[m.studentId]?.score ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMemberScores({
                                  ...memberScores,
                                  [m.studentId]: {
                                    score: val === '' ? '' : Math.round(Number(val)),
                                    feedback: memberScores[m.studentId]?.feedback || '',
                                  },
                                });
                              }}
                              className="w-16 text-center text-xs font-bold border border-slate-200 rounded-xl px-2 py-2 bg-white outline-none focus:border-sky-500"
                            />
                            <span className="text-xs text-slate-500 font-bold">
                              / {assignment.maxScore}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ข้อเสนอแนะทั่วไปของงาน */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ข้อคิดเห็น / คำแนะนำจากครู (ส่งถึงทุกคนในงานนี้)
                    </label>
                    <textarea
                      rows={2}
                      value={generalFeedback}
                      onChange={(e) => setGeneralFeedback(e.target.value)}
                      placeholder="คำแนะนำเพิ่มเติม เช่น ทำได้ดีมาก หรือสิ่งที่ต้องแก้ไข..."
                      className="w-full text-xs border border-slate-200 rounded-xl p-3 outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom save bar */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  ระบบจะบันทึกคะแนนและแจ้งเตือนในหน้านักเรียนทันที
                </span>
                <button
                  type="button"
                  disabled={savingGrade}
                  onClick={handleSaveGrade}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingGrade ? 'กำลังบันทึกคะแนน...' : 'บันทึกคะแนน'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
