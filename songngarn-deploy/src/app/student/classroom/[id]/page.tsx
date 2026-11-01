'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Users,
  ExternalLink,
  X,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Percent,
  Award,
} from 'lucide-react';
import {
  Assignment,
  AssignmentAttachment,
  Classroom,
  Student,
  StudentAssignmentItem,
  StudentAssignmentStatus,
  StudentGradeRow,
  Submission,
} from '@/lib/types';
import { getStudentAssignmentsView } from '@/lib/grade-calculator';

export default function StudentClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;

  const [studentSession, setStudentSession] = useState<{
    studentId: string;
    profile: Student;
  } | null>(null);

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [classroomStudents, setClassroomStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradeRow, setGradeRow] = useState<StudentGradeRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab
  const [activeTab, setActiveTab] = useState<'assignments' | 'grades'>('assignments');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Submit Modal
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form Fields
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [studentComment, setStudentComment] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [newMemberIdInput, setNewMemberIdInput] = useState('');
  const [memberLookupError, setMemberLookupError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('songngarn_student');
    if (!stored) {
      router.push('/');
      return;
    }
    const parsed = JSON.parse(stored);
    setStudentSession(parsed);
    loadData(parsed.studentId);
  }, [classroomId, router]);

  const loadData = async (studentId: string) => {
    try {
      setLoading(true);

      // โหลดห้องเรียน
      const resCls = await fetch(`/api/classrooms/${classroomId}`);
      const dataCls = await resCls.json();
      if (!dataCls.success) {
        router.push('/student');
        return;
      }
      setClassroom(dataCls.classroom);

      // โหลดรายชื่อนักเรียนในห้องทั้งหมด (เพื่อตรวจสอบชื่อเพื่อนในกลุ่ม)
      const resStds = await fetch(`/api/classrooms/${classroomId}/students`);
      const dataStds = await resStds.json();
      if (dataStds.success) {
        setClassroomStudents(dataStds.students);
      }

      // โหลดงาน
      const resAssn = await fetch(`/api/assignments?classroomId=${classroomId}`);
      const dataAssn = await resAssn.json();
      if (dataAssn.success) {
        setAssignments(dataAssn.assignments);
      }

      // โหลดการส่งงาน
      const resSub = await fetch(`/api/submissions?classroomId=${classroomId}`);
      const dataSub = await resSub.json();
      if (dataSub.success) {
        setSubmissions(dataSub.submissions);
      }

      // โหลดคะแนนรวมของนักเรียน
      const resGrades = await fetch(`/api/classrooms/${classroomId}/grades`);
      const dataGrades = await resGrades.json();
      if (dataGrades.success && Array.isArray(dataGrades.gradeSummary)) {
        const found = dataGrades.gradeSummary.find(
          (r: StudentGradeRow) => r.student.studentId === studentId
        );
        if (found) setGradeRow(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // เปิด Modal ส่งงาน
  const openSubmitModal = (assignment: Assignment, existingSubmission?: Submission) => {
    setSelectedAssignment(assignment);
    setSubmitError('');
    setSubmitSuccess(false);

    if (existingSubmission) {
      setAttachments(existingSubmission.attachments || []);
      setStudentComment(existingSubmission.studentComment || '');
      if (existingSubmission.isGroup && existingSubmission.groupMembers) {
        setGroupMemberIds(
          existingSubmission.groupMembers
            .map((m) => m.studentId)
            .filter((id) => id !== studentSession?.studentId)
        );
      } else {
        setGroupMemberIds([]);
      }
    } else {
      setAttachments([]);
      setStudentComment('');
      setGroupMemberIds([]);
    }

    setNewMemberIdInput('');
    setMemberLookupError('');
    setShowSubmitModal(true);
  };

  // เพิ่มเพื่อนในกลุ่มด้วยรหัสประจำตัว 5 หลัก
  const handleAddGroupMember = () => {
    const cleanId = newMemberIdInput.trim();
    if (!cleanId) return;

    if (cleanId === studentSession?.studentId) {
      setMemberLookupError('คุณเป็นผู้ส่งหลักอยู่แล้ว ไม่ต้องกรอกรหัสตนเองซ้ำ');
      return;
    }

    if (groupMemberIds.includes(cleanId)) {
      setMemberLookupError('รหัสนี้มีอยู่ในรายชื่อกลุ่มแล้ว');
      return;
    }

    // ตรวจสอบว่ามีนักเรียนคนนี้อยู่ในห้องเรียนจริงหรือไม่
    const matched = classroomStudents.find((s) => s.studentId === cleanId);
    if (!matched) {
      setMemberLookupError(`ไม่พบรหัส ${cleanId} ในห้องเรียนนี้ กรุณาตรวจสอบรหัส 5 หลัก`);
      return;
    }

    setGroupMemberIds([...groupMemberIds, cleanId]);
    setNewMemberIdInput('');
    setMemberLookupError('');
  };

  const removeGroupMember = (id: string) => {
    setGroupMemberIds(groupMemberIds.filter((item) => item !== id));
  };

  // อัปโหลดไฟล์ภาพ / PDF
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAttachments((prev) => [...prev, data.file]);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    }
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    setAttachments((prev) => [
      ...prev,
      {
        name: linkTitle.trim() || linkInput.trim(),
        url: linkInput.trim(),
        type: 'link',
      },
    ]);
    setLinkInput('');
    setLinkTitle('');
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // ส่งงานไปยังเซิร์ฟเวอร์
  const handleSubmitWork = async () => {
    if (!selectedAssignment || !studentSession) return;

    if (attachments.length === 0 && !studentComment.trim()) {
      setSubmitError('กรุณาแนบไฟล์ รูปภาพ ลิงก์ หรือกรอกข้อความเพื่อส่งงาน');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          classroomId,
          submitterStudentId: studentSession.studentId,
          isGroup: selectedAssignment.isGroup,
          groupMemberStudentIds: [studentSession.studentId, ...groupMemberIds],
          attachments,
          studentComment: studentComment.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSubmitSuccess(true);
        // แสดงพลุความสำเร็จ (Confetti)
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {}

        setTimeout(() => {
          setShowSubmitModal(false);
          loadData(studentSession.studentId);
        }, 1500);
      } else {
        setSubmitError(data.message || 'ส่งงานไม่สำเร็จ');
      }
    } catch (err: any) {
      setSubmitError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !classroom || !studentSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500 font-medium">กำลังโหลดห้องเรียน...</span>
        </div>
      </div>
    );
  }

  // คำนวณรายการงานพร้อมสถานะสำหรับนักเรียนคนนี้
  const assignmentItems: StudentAssignmentItem[] = getStudentAssignmentsView(
    studentSession.studentId,
    assignments,
    submissions
  );

  // กรองตามฟิลเตอร์สถานะ
  const filteredItems = assignmentItems.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.studentStatus === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/student"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="กลับหน้ารวมวิชา"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {classroom.courseCode} {classroom.name}
                </span>
                <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                  {classroom.gradeLevel}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                {classroom.teacherName} • {classroom.roomLocation || 'ห้องเรียน'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800">
                {studentSession.profile.fullName}
              </div>
              <div className="text-[11px] font-mono text-indigo-700 font-bold">
                เลขที่ {studentSession.profile.rollNumber} • รหัส {studentSession.studentId}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Classroom Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                  {classroom.courseCode}
                </span>
                <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                  {classroom.gradeLevel}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
                {classroom.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/90">
                {classroom.scheduleTime && (
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-white/70" />
                    <span>{classroom.scheduleTime}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-white/70" />
                  <span>ครูผู้สอน: {classroom.teacherName}</span>
                </div>
              </div>
            </div>

            {/* Quick Grade Summary Badge */}
            {gradeRow && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center space-x-4 self-start md:self-auto">
                <div>
                  <span className="text-[11px] text-indigo-200 block">คะแนนรวมปัจจุบัน</span>
                  <span className="text-2xl font-extrabold text-white">
                    {gradeRow.totalScore}
                  </span>
                  <span className="text-xs text-indigo-200 font-normal"> / 100</span>
                </div>
                <div className="border-l border-white/20 pl-4">
                  <span className="text-[11px] text-indigo-200 block">เกรดเฉลี่ย</span>
                  <span className="text-2xl font-extrabold text-emerald-400">
                    {gradeRow.gradeText}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-2 border-t border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-3.5 px-4 font-semibold text-xs sm:text-sm border-b-2 flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'assignments'
                ? 'border-white text-white'
                : 'border-transparent text-white/70 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ตรวจสอบรายการงาน ({assignments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('grades')}
            className={`py-3.5 px-4 font-semibold text-xs sm:text-sm border-b-2 flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'grades'
                ? 'border-white text-white'
                : 'border-transparent text-white/70 hover:text-white'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>ผลการเรียนและคะแนนรวม</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* ================= TAB 1: ALL ASSIGNMENTS ================= */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            {/* Status Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap gap-1.5 shadow-sm">
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'pending', label: 'ยังไม่ส่ง' },
                { id: 'submitted', label: 'ส่งแล้วรอตรวจ' },
                { id: 'graded', label: 'ตรวจแล้ว (มีคะแนน)' },
                { id: 'late_allowed', label: 'พ้นกำหนดส่งได้อยู่' },
                { id: 'closed', label: 'พ้นกำหนดปิดรับงาน' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition ${
                    statusFilter === f.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Assignments List */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">ไม่มีงานในสถานะนี้</h3>
                <p className="text-xs text-slate-500 mt-1">ลองเลือกตัวกรอง "ทั้งหมด" เพื่อดูงานทุกชิ้น</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const { assignment, submission, studentStatus, myScore, myFeedback } = item;
                  const isPastDue = new Date() > new Date(assignment.dueDate);

                  // Render badge according to user requirements
                  const renderStatusBadge = () => {
                    switch (studentStatus) {
                      case 'graded':
                        return (
                          <div className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>ตรวจแล้ว: {myScore ?? 0} / {assignment.maxScore} คะแนน</span>
                          </div>
                        );
                      case 'submitted':
                        return (
                          <div className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-800 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span>ส่งแล้วรอตรวจ</span>
                          </div>
                        );
                      case 'late_allowed':
                        return (
                          <div className="inline-flex items-center space-x-1.5 bg-orange-50 text-orange-800 border border-orange-300 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            <span>พ้นกำหนดส่งได้อยู่ (ส่งล่าช้า)</span>
                          </div>
                        );
                      case 'closed':
                        return (
                          <div className="inline-flex items-center space-x-1.5 bg-rose-50 text-rose-800 border border-rose-300 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                            <Lock className="w-4 h-4 text-rose-600" />
                            <span>พ้นกำหนดปิดรับงาน</span>
                          </div>
                        );
                      default:
                        return (
                          <div className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span>ยังไม่ส่ง</span>
                          </div>
                        );
                    }
                  };

                  return (
                    <div
                      key={assignment.id}
                      className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {renderStatusBadge()}

                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                assignment.isGroup
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {assignment.isGroup ? 'งานกลุ่ม' : 'งานเดี่ยว'}
                            </span>

                            <span className="text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-0.5 rounded-full">
                              {assignment.targetBucketName}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-slate-900 pt-1">
                            {assignment.title}
                          </h3>

                          {assignment.description && (
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                              {assignment.description}
                            </p>
                          )}
                        </div>

                        {/* Button Action */}
                        <div className="shrink-0 pt-2 sm:pt-0">
                          {studentStatus === 'closed' ? (
                            <button
                              disabled
                              className="w-full sm:w-auto bg-slate-100 text-slate-400 font-semibold text-xs px-4 py-2.5 rounded-xl cursor-not-allowed border border-slate-200 flex items-center justify-center space-x-1"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>ปิดรับงานแล้ว</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openSubmitModal(assignment, submission)}
                              className={`w-full sm:w-auto font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 ${
                                studentStatus === 'graded'
                                  ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                                  : studentStatus === 'submitted'
                                  ? 'bg-white hover:bg-amber-50 text-amber-800 border border-amber-300'
                                  : studentStatus === 'late_allowed'
                                  ? 'bg-orange-600 hover:bg-orange-500 text-white'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                              }`}
                            >
                              <Upload className="w-4 h-4" />
                              <span>
                                {studentStatus === 'graded'
                                  ? 'ดูงานที่ส่ง / ส่งใหม่'
                                  : studentStatus === 'submitted'
                                  ? 'แก้ไขการส่งงาน'
                                  : studentStatus === 'late_allowed'
                                  ? 'ส่งงานล่าช้า'
                                  : 'กดส่งงาน'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Due date info */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <span className="font-semibold text-slate-700">
                          คะแนนเต็ม: {assignment.maxScore} คะแนน
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            กำหนดส่ง:{' '}
                            {new Date(assignment.dueDate).toLocaleString('th-TH', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </span>
                      </div>

                      {/* If Graded: Show Feedback Box */}
                      {studentStatus === 'graded' && myFeedback && (
                        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-xs space-y-1">
                          <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>คำแนะนำจากคุณครู:</span>
                          </div>
                          <p className="text-emerald-950 leading-relaxed">{myFeedback}</p>
                        </div>
                      )}

                      {/* If Submitted: Show submitted files preview */}
                      {submission && submission.attachments && submission.attachments.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                          <span className="text-[11px] font-bold text-slate-500 block">
                            ไฟล์ที่คุณส่งแล้ว:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {submission.attachments.map((att, i) => (
                              <a
                                key={i}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition shadow-sm"
                              >
                                {att.type === 'image' ? (
                                  <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                                ) : att.type === 'pdf' ? (
                                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                                ) : (
                                  <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                                )}
                                <span className="truncate max-w-[160px]">{att.name}</span>
                              </a>
                            ))}
                          </div>

                          {submission.isGroup && submission.groupMembers && (
                            <div className="text-[11px] text-indigo-700 pt-1">
                              <strong>เพื่อนร่วมกลุ่ม:</strong>{' '}
                              {submission.groupMembers
                                .map((m) => `${m.fullName} (${m.studentId})`)
                                .join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: GRADE REPORT ================= */}
        {activeTab === 'grades' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                รายงานผลคะแนนและสัดส่วนการประเมิน
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                คะแนนคำนวณตามแผนวัดผลของโรงเรียน (เต็ม 100 คะแนน)
              </p>
            </div>

            {/* Total Score Overview Card */}
            {gradeRow && (
              <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider block mb-1">
                    คะแนนรวมทั้งหมด
                  </span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl sm:text-5xl font-extrabold">{gradeRow.totalScore}</span>
                    <span className="text-sm text-indigo-200 font-medium">/ 100 คะแนน</span>
                  </div>
                  <p className="text-xs text-indigo-100 mt-2">
                    {studentSession.profile.fullName} • เลขที่ {studentSession.profile.rollNumber} • รหัส {studentSession.studentId}
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center min-w-[140px]">
                  <span className="text-xs font-medium text-indigo-200 block mb-1">
                    ระดับผลการเรียน
                  </span>
                  <span className="text-4xl font-extrabold text-emerald-300">
                    {gradeRow.gradeText}
                  </span>
                  <span className="block text-[11px] text-white/80 mt-1">เกรดที่ได้</span>
                </div>
              </div>
            )}

            {/* Breakdown Cards Grid */}
            {gradeRow && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. ก่อนกลางภาค */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">
                      1. ก่อนกลางภาค ({gradeRow.preMidtermTotal} / {classroom.scorePlan.preMidterm.totalScore} คะแนน)
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {classroom.scorePlan.preMidterm.buckets.map((b) => {
                      const bData = gradeRow.bucketScores[b.id];
                      return (
                        <div key={b.id} className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span>{b.name}</span>
                            <span className="text-sky-700">
                              {bData?.scaledScore ?? 0} / {b.maxScore} คะแนน
                            </span>
                          </div>
                          {bData?.totalRawMax > 0 && (
                            <div className="text-[11px] text-slate-500">
                              (คะแนนดิบสะสม: {bData.studentRawSum} / {bData.totalRawMax})
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. กลางภาค */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-800">2. สอบกลางภาค</h3>
                  <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">คะแนนสอบกลางภาค</span>
                    <span className="font-extrabold text-indigo-700 text-sm">
                      {gradeRow.midtermScore} / {classroom.scorePlan.midterm.maxScore} คะแนน
                    </span>
                  </div>
                </div>

                {/* 3. หลังกลางภาค */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">
                      3. หลังกลางภาค ({gradeRow.postMidtermTotal} / {classroom.scorePlan.postMidterm.totalScore} คะแนน)
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {classroom.scorePlan.postMidterm.buckets.map((b) => {
                      const bData = gradeRow.bucketScores[b.id];
                      return (
                        <div key={b.id} className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span>{b.name}</span>
                            <span className="text-purple-700">
                              {bData?.scaledScore ?? 0} / {b.maxScore} คะแนน
                            </span>
                          </div>
                          {bData?.totalRawMax > 0 && (
                            <div className="text-[11px] text-slate-500">
                              (คะแนนดิบสะสม: {bData.studentRawSum} / {bData.totalRawMax})
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. ปลายภาค */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-800">4. สอบปลายภาค</h3>
                  <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">คะแนนสอบปลายภาค</span>
                    <span className="font-extrabold text-indigo-700 text-sm">
                      {gradeRow.finalScore} / {classroom.scorePlan.final.maxScore} คะแนน
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ================= MODAL: ส่งงาน ================= */}
      {showSubmitModal && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
              <div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  {selectedAssignment.isGroup ? 'ส่งงานกลุ่ม' : 'ส่งงานเดี่ยว'}
                </span>
                <h3 className="text-lg font-bold mt-1">{selectedAssignment.title}</h3>
                <p className="text-xs text-indigo-100">
                  คะแนนเต็ม {selectedAssignment.maxScore} คะแนน
                </p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {submitError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  <span className="font-bold">ส่งงานสำเร็จเรียบร้อยแล้ว! 🎉</span>
                </div>
              )}

              {/* Requirement 7: สมาชิกกลุ่ม (สำหรับงานกลุ่ม) */}
              {selectedAssignment.isGroup && (
                <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-indigo-950 flex items-center space-x-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>กรอกรหัสประจำตัวเพื่อนในกลุ่มทุกคน (5 หลัก)</span>
                    </span>
                    <p className="text-[11px] text-indigo-800 mt-0.5">
                      เพื่อให้คุณครูสามารถให้คะแนนเพื่อนทุกคนในกลุ่มได้พร้อมกันในครั้งเดียว
                    </p>
                  </div>

                  {/* Input เพิ่มรหัสเพื่อน */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      maxLength={5}
                      value={newMemberIdInput}
                      onChange={(e) => {
                        setNewMemberIdInput(e.target.value.replace(/\D/g, ''));
                        setMemberLookupError('');
                      }}
                      placeholder="รหัส 5 หลัก เช่น 54002"
                      className="flex-1 bg-white border border-indigo-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddGroupMember}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition shrink-0"
                    >
                      + เพิ่มเพื่อน
                    </button>
                  </div>

                  {memberLookupError && (
                    <div className="text-[11px] text-rose-600 font-medium">
                      {memberLookupError}
                    </div>
                  )}

                  {/* รายชื่อสมาชิกในกลุ่ม */}
                  <div className="space-y-1.5 pt-1">
                    {/* ผู้ส่งหลัก */}
                    <div className="bg-white border border-indigo-200 p-2 rounded-xl text-xs flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          ผู้ส่ง
                        </span>
                        <span className="font-bold text-slate-800">
                          {studentSession.profile.fullName}
                        </span>
                      </div>
                      <span className="font-mono text-slate-500 font-bold">
                        {studentSession.studentId}
                      </span>
                    </div>

                    {/* เพื่อนที่เพิ่มเข้ามา */}
                    {groupMemberIds.map((mId) => {
                      const matched = classroomStudents.find((s) => s.studentId === mId);
                      return (
                        <div
                          key={mId}
                          className="bg-white border border-slate-200 p-2 rounded-xl text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              สมาชิก
                            </span>
                            <span className="font-bold text-slate-800">
                              {matched ? matched.fullName : `รหัส ${mId}`}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-slate-500 font-bold">{mId}</span>
                            <button
                              type="button"
                              onClick={() => removeGroupMember(mId)}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Requirement 6: แนบเอกสาร (รูปภาพ, PDF, ลิงก์) */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  แนบไฟล์งาน / ลิงก์ (รูปภาพ, PDF, Canva, Google Drive)
                </label>

                {/* Upload Buttons */}
                <div className="flex flex-wrap gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>แนบรูปภาพ หรือ ไฟล์ PDF</span>
                  </button>
                </div>

                {/* Input แนบลิงก์ */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="วางลิงก์ผลงาน เช่น Google Drive, Canva, Docs..."
                    className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition shrink-0"
                  >
                    เพิ่มลิงก์
                  </button>
                </div>

                {/* รายการสิ่งที่แนบแล้ว */}
                {attachments.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-slate-500 block">
                      รายการที่แนบแล้ว ({attachments.length}):
                    </span>
                    {attachments.map((att, i) => (
                      <div
                        key={i}
                        className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {att.type === 'image' ? (
                            <ImageIcon className="w-4 h-4 text-sky-500 shrink-0" />
                          ) : att.type === 'pdf' ? (
                            <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                          ) : (
                            <ExternalLink className="w-4 h-4 text-indigo-500 shrink-0" />
                          )}
                          <span className="font-medium text-slate-800 truncate">{att.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(i)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ข้อความเพิ่มเติมถึงครู */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  ข้อความบันทึกถึงคุณครู (ถ้ามี)
                </label>
                <textarea
                  rows={2}
                  value={studentComment}
                  onChange={(e) => setStudentComment(e.target.value)}
                  placeholder="เช่น ส่งงานใบงานที่ 1 เรียบร้อยครับ / กลุ่มของผมทำหัวข้อที่ 2..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-4 py-2"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitWork}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{submitting ? 'กำลังส่งงาน...' : 'ยืนยันการส่งงาน'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
