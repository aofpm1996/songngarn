'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  Plus,
  Users,
  FileText,
  Upload,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  Trash2,
  Edit,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  CheckCircle2,
  X,
  FileCheck,
  Percent,
  Copy,
} from 'lucide-react';
import {
  Assignment,
  Classroom,
  ScoreBucket,
  ScoreEvaluationPlan,
  Student,
  StudentGradeRow,
  Submission,
} from '@/lib/types';
import { sortClassrooms } from '@/lib/classroom-sort';

export default function ClassroomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradeRows, setGradeRows] = useState<StudentGradeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ดึงรายชื่อนักเรียนจากคลาสอื่น
  const [showCopyStudentsModal, setShowCopyStudentsModal] = useState(false);
  const [otherClassrooms, setOtherClassrooms] = useState<Classroom[]>([]);
  const [selectedSourceClassroomId, setSelectedSourceClassroomId] = useState('');
  const [copyingStudents, setCopyingStudents] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [copyError, setCopyError] = useState('');
  const [previewStudents, setPreviewStudents] = useState<Student[]>([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'assignments' | 'students' | 'grades' | 'plan'>('assignments');

  // Modal: สร้างงานใหม่
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assnTitle, setAssnTitle] = useState('');
  const [assnDesc, setAssnDesc] = useState('');
  const [assnMaxScore, setAssnMaxScore] = useState<number>(20);
  const [assnDueDate, setAssnDueDate] = useState<string>('');
  const [assnIsGroup, setAssnIsGroup] = useState<boolean>(false);
  const [assnTargetCategory, setAssnTargetCategory] = useState<'preMidterm' | 'midterm' | 'postMidterm' | 'final'>('preMidterm');
  const [assnTargetBucketId, setAssnTargetBucketId] = useState<string>('');
  const [assnAttachments, setAssnAttachments] = useState<Array<{ name: string; url: string; type: 'image' | 'pdf' | 'link' }>>([]);
  const [linkInput, setLinkInput] = useState('');
  const [linkName, setLinkName] = useState('');
  const [assnSubmitting, setAssnSubmitting] = useState(false);
  const [assnError, setAssnError] = useState('');

  // Modal: อัปโหลดรายชื่อนักเรียน Excel / CSV
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingRoster, setUploadingRoster] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Modal: เพิ่มนักเรียนคนเดียว
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [singleStudentId, setSingleStudentId] = useState('');
  const [singleRoll, setSingleRoll] = useState('');
  const [singleName, setSingleName] = useState('');

  // Tab: ปรับสัดส่วนคะแนน
  const [editingPlan, setEditingPlan] = useState<ScoreEvaluationPlan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planMessage, setPlanMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadClassroomData();
  }, [classroomId]);

  const loadClassroomData = async () => {
    try {
      setLoading(true);
      // โหลดข้อมูลห้องเรียน
      const resCls = await fetch(`/api/classrooms/${classroomId}`);
      const dataCls = await resCls.json();
      if (!dataCls.success) {
        router.push('/teacher');
        return;
      }
      setClassroom(dataCls.classroom);
      setEditingPlan(JSON.parse(JSON.stringify(dataCls.classroom.scorePlan)));

      // โหลดรายชื่อนักเรียน
      const resStd = await fetch(`/api/classrooms/${classroomId}/students`);
      const dataStd = await resStd.json();
      if (dataStd.success) {
        setStudents(dataStd.students || []);
      }

      // โหลดงาน
      const resAssn = await fetch(`/api/assignments?classroomId=${classroomId}`);
      const dataAssn = await resAssn.json();
      if (dataAssn.success) {
        setAssignments(dataAssn.assignments || []);
      }

      // โหลดการส่งงาน
      const resSub = await fetch(`/api/submissions?classroomId=${classroomId}`);
      const dataSub = await resSub.json();
      if (dataSub.success) {
        setSubmissions(dataSub.submissions || []);
      }

      // โหลดคลาสเรียนอื่นที่มีนักเรียนอยู่แล้ว เพื่อใช้ดึงรายชื่อ
      const resAllCls = await fetch('/api/classrooms');
      const dataAllCls = await resAllCls.json();
      if (dataAllCls.success) {
        const others = sortClassrooms(
          (dataAllCls.classrooms || []).filter(
            (c: Classroom) => c.id !== classroomId && (c.studentCount || 0) > 0
          )
        );
        setOtherClassrooms(others);
      }

      // โหลดตารางคะแนนรวม
      loadGrades();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadGrades = async () => {
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/grades`);
      const data = await res.json();
      if (data.success) {
        setGradeRows(data.gradeSummary || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ดึงรายการ Bucket ที่มีทั้งหมดในห้องเรียนนี้
  const getAvailableBuckets = () => {
    if (!classroom?.scorePlan) return [];
    const list: Array<{ id: string; name: string; category: 'preMidterm' | 'midterm' | 'postMidterm' | 'final'; weight: number }> = [];

    classroom.scorePlan.preMidterm.buckets.forEach((b) => {
      list.push({ id: b.id, name: `ก่อนกลางภาค: ${b.name} (เต็ม ${b.maxScore} คะแนน)`, category: 'preMidterm', weight: b.maxScore });
    });

    list.push({
      id: 'midterm',
      name: `สอบกลางภาค (เต็ม ${classroom.scorePlan.midterm.maxScore} คะแนน)`,
      category: 'midterm',
      weight: classroom.scorePlan.midterm.maxScore,
    });

    classroom.scorePlan.postMidterm.buckets.forEach((b) => {
      list.push({ id: b.id, name: `หลังกลางภาค: ${b.name} (เต็ม ${b.maxScore} คะแนน)`, category: 'postMidterm', weight: b.maxScore });
    });

    list.push({
      id: 'final',
      name: `สอบปลายภาค (เต็ม ${classroom.scorePlan.final.maxScore} คะแนน)`,
      category: 'final',
      weight: classroom.scorePlan.final.maxScore,
    });

    return list;
  };

  // เปิด Modal สร้างงาน
  const openCreateAssignment = () => {
    const buckets = getAvailableBuckets();
    const firstBucket = buckets[0];
    setAssnTitle('');
    setAssnDesc('');
    setAssnMaxScore(20);
    // กำหนดส่งเป็นอีก 7 วันเวลา 23:59
    const defaultDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    defaultDue.setHours(23, 59, 0, 0);
    setAssnDueDate(defaultDue.toISOString().slice(0, 16));
    setAssnIsGroup(false);
    setAssnTargetCategory(firstBucket ? firstBucket.category : 'preMidterm');
    setAssnTargetBucketId(firstBucket ? firstBucket.id : 'pre_1');
    setAssnAttachments([]);
    setAssnError('');
    setShowAssignmentModal(true);
  };

  const handleCreateAssignment = async () => {
    if (!assnTitle.trim() || !assnDueDate || assnMaxScore <= 0) {
      setAssnError('กรุณากรอกชื่องาน คะแนนเต็ม และกำหนดส่งให้ครบถ้วน');
      return;
    }

    setAssnSubmitting(true);
    setAssnError('');

    const buckets = getAvailableBuckets();
    const selectedBucket = buckets.find((b) => b.id === assnTargetBucketId) || buckets[0];

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          title: assnTitle.trim(),
          description: assnDesc.trim(),
          maxScore: Number(assnMaxScore),
          dueDate: new Date(assnDueDate).toISOString(),
          isOpen: true,
          isGroup: assnIsGroup,
          targetCategory: selectedBucket.category,
          targetBucketId: selectedBucket.id,
          targetBucketName: selectedBucket.name,
          bucketWeight: selectedBucket.weight,
          attachments: assnAttachments,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAssignmentModal(false);
        loadClassroomData();
      } else {
        setAssnError(data.message || 'เกิดข้อผิดพลาดในการสร้างงาน');
      }
    } catch (err: any) {
      setAssnError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setAssnSubmitting(false);
    }
  };

  // สลับสถานะเปิด/ปิดรับงาน (Toggle Open/Close)
  const toggleAssignmentStatus = async (assignment: Assignment, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: !assignment.isOpen }),
      });
      const data = await res.json();
      if (data.success) {
        setAssignments((prev) =>
          prev.map((a) => (a.id === assignment.id ? { ...a, isOpen: !a.isOpen } : a))
        );
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะรับงาน');
    }
  };

  // ลบงาน
  const handleDeleteAssignment = async (assignmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('ยืนยันลบงานนี้? ข้อมูลการส่งงานของนักเรียนทั้งหมดจะถูกลบไปด้วย')) return;

    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadClassroomData();
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบงาน');
    }
  };

  // อัปโหลดไฟล์งานแนบของครู
  const handleTeacherFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setAssnAttachments((prev) => [...prev, data.file]);
      }
    } catch (err) {
      alert('อัปโหลดไฟล์ไม่สำเร็จ');
    }
  };

  const addLinkAttachment = () => {
    if (!linkInput.trim()) return;
    setAssnAttachments((prev) => [
      ...prev,
      {
        name: linkName.trim() || linkInput.trim(),
        url: linkInput.trim(),
        type: 'link',
      },
    ]);
    setLinkInput('');
    setLinkName('');
  };

  // อัปโหลดไฟล์รายชื่อนักเรียน Excel / CSV
  const handleUploadRoster = async () => {
    if (!uploadFile) {
      setUploadError('กรุณาเลือกไฟล์ Excel (.xlsx) หรือ CSV');
      return;
    }

    setUploadingRoster(true);
    setUploadError('');
    setUploadMessage('');

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await fetch(`/api/classrooms/${classroomId}/students`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setUploadMessage(data.message || `นำเข้ารายชื่อสำเร็จ ${data.count} คน`);
        setTimeout(() => {
          setShowRosterModal(false);
          setUploadFile(null);
          setUploadMessage('');
          loadClassroomData();
        }, 1200);
      } else {
        setUploadError(data.message || 'ไม่สามารถนำเข้าไฟล์ได้');
      }
    } catch (err: any) {
      setUploadError('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setUploadingRoster(false);
    }
  };

  // เพิ่มนักเรียนคนเดียว
  const handleAddSingleStudent = async () => {
    if (!singleStudentId.trim() || !singleName.trim()) {
      alert('กรุณากรอกรหัสประจำตัวและชื่อ-สกุล');
      return;
    }

    try {
      const res = await fetch(`/api/classrooms/${classroomId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: singleStudentId.trim(),
          rollNumber: Number(singleRoll) || students.length + 1,
          fullName: singleName.trim(),
          classRoomName: classroom?.gradeLevel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddStudentModal(false);
        setSingleStudentId('');
        setSingleRoll('');
        setSingleName('');
        loadClassroomData();
      } else {
        alert(data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเพิ่มนักเรียน');
    }
  };

  // ลบนักเรียนคนเดียว
  const handleDeleteStudent = async (studentDbId: string) => {
    if (!confirm('ยืนยันลบนักเรียนคนนี้ออกจากห้อง?')) return;
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/students?id=${studentDbId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadClassroomData();
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด');
    }
  };

  // จัดการการดึงรายชื่อนักเรียนจากคลาสอื่น
  const openCopyStudentsModal = () => {
    setShowRosterModal(false);
    setShowCopyStudentsModal(true);
    setCopyError('');
    setCopyMessage('');

    // ค้นหาห้องที่มี gradeLevel เดียวกันเป็นค่าแนะนำอันดับแรก
    const matched = otherClassrooms.find(
      (c) => classroom && c.gradeLevel.trim().toLowerCase() === classroom.gradeLevel.trim().toLowerCase()
    );
    const initialId = matched ? matched.id : (otherClassrooms[0]?.id || '');
    setSelectedSourceClassroomId(initialId);
    if (initialId) {
      fetchPreviewStudents(initialId);
    } else {
      setPreviewStudents([]);
    }
  };

  const handleSelectSourceClassroom = (sourceId: string) => {
    setSelectedSourceClassroomId(sourceId);
    if (sourceId) {
      fetchPreviewStudents(sourceId);
    } else {
      setPreviewStudents([]);
    }
  };

  const fetchPreviewStudents = async (sourceId: string) => {
    try {
      const res = await fetch(`/api/classrooms/${sourceId}/students`);
      const data = await res.json();
      if (data.success) {
        setPreviewStudents(data.students || []);
      }
    } catch (err) {
      console.error('Failed to preview students:', err);
    }
  };

  const handleConfirmCopyStudents = async () => {
    if (!selectedSourceClassroomId) {
      setCopyError('กรุณาเลือกคลาสเรียนต้นทาง');
      return;
    }

    setCopyingStudents(true);
    setCopyError('');
    setCopyMessage('');

    try {
      const res = await fetch(`/api/classrooms/${classroomId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceClassroomId: selectedSourceClassroomId }),
      });
      const data = await res.json();

      if (data.success) {
        setCopyMessage(data.message || `ดึงรายชื่อสำเร็จ ${data.count} คน`);
        setTimeout(() => {
          setShowCopyStudentsModal(false);
          setCopyMessage('');
          loadClassroomData();
        }, 1200);
      } else {
        setCopyError(data.message || 'ไม่สามารถดึงรายชื่อได้');
      }
    } catch (err: any) {
      setCopyError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setCopyingStudents(false);
    }
  };

  // ดาวน์โหลดรายงานคะแนน Excel
  const handleDownloadExcel = async () => {
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/grades`, {
        method: 'POST',
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `คะแนน_${classroom?.courseCode}_${classroom?.gradeLevel}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('ไม่สามารถดาวน์โหลดไฟล์ Excel ได้');
    }
  };

  // ปรับบันทึกสัดส่วนคะแนนใหม่
  const handleSaveScorePlan = async () => {
    if (!editingPlan) return;
    setSavingPlan(true);
    setPlanMessage('');

    try {
      const res = await fetch(`/api/classrooms/${classroomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scorePlan: editingPlan }),
      });
      const data = await res.json();
      if (data.success) {
        setClassroom(data.classroom);
        setPlanMessage('บันทึกการปรับสัดส่วนคะแนนสำเร็จ และคำนวณคะแนนใหม่เรียบร้อย!');
        loadGrades();
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกสัดส่วนคะแนน');
    } finally {
      setSavingPlan(false);
    }
  };

  if (loading || !classroom) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูลห้องเรียน...</span>
        </div>
      </div>
    );
  }

  const availableBuckets = getAvailableBuckets();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/teacher"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="กลับหน้ารายการห้องเรียน"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-slate-900 tracking-tight">
                  {classroom.courseCode} {classroom.name}
                </span>
                <span className="text-xs bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded-full">
                  {classroom.gradeLevel}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                {classroom.teacherName} • {classroom.roomLocation || 'ห้องเรียน'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadExcel}
              className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลด Excel</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Classroom Banner */}
      <div className="bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-800 text-white">
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
                {classroom.roomLocation && (
                  <div className="flex items-center space-x-1.5">
                    <BookOpen className="w-4 h-4 text-white/70" />
                    <span>{classroom.roomLocation}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-white/70" />
                  <span>{students.length} นักเรียน</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={openCreateAssignment}
                className="bg-white hover:bg-sky-50 text-sky-800 font-semibold px-4 py-2.5 rounded-xl shadow-lg transition flex items-center space-x-1.5 text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4 text-sky-600" />
                <span>+ สั่งงานใหม่</span>
              </button>
              <button
                onClick={openCopyStudentsModal}
                className="bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400/40 text-white font-medium px-4 py-2.5 rounded-xl backdrop-blur-sm transition flex items-center space-x-1.5 text-xs sm:text-sm shadow-md shadow-emerald-950/20"
              >
                <Copy className="w-4 h-4 text-emerald-200" />
                <span>ดึงรายชื่อจากคลาสอื่น</span>
              </button>
              <button
                onClick={() => setShowRosterModal(true)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium px-4 py-2.5 rounded-xl backdrop-blur-sm transition flex items-center space-x-1.5 text-xs sm:text-sm"
              >
                <Upload className="w-4 h-4" />
                <span>อัปโหลดรายชื่อ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-3.5 px-4 font-semibold text-xs sm:text-sm border-b-2 flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'assignments'
                ? 'border-white text-white'
                : 'border-transparent text-white/70 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>งานและภาระงาน ({assignments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`py-3.5 px-4 font-semibold text-xs sm:text-sm border-b-2 flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'students'
                ? 'border-white text-white'
                : 'border-transparent text-white/70 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>รายชื่อนักเรียน ({students.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('grades');
              loadGrades();
            }}
            className={`py-3.5 px-4 font-semibold text-xs sm:text-sm border-b-2 flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'grades'
                ? 'border-white text-white'
                : 'border-transparent text-white/70 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ตารางคะแนนรวมและตัดเกรด</span>
          </button>

          <button
            onClick={() => setActiveTab('plan')}
            className={`py-3.5 px-4 font-semibold text-xs sm:text-sm border-b-2 flex items-center space-x-2 whitespace-nowrap transition ${
              activeTab === 'plan'
                ? 'border-white text-white'
                : 'border-transparent text-white/70 hover:text-white'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>ปรับสัดส่วนคะแนน</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* ================= TAB 1: ASSIGNMENTS ================= */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">รายการงานในชั้นเรียน</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ตรวจงาน ให้คะแนนกลุ่ม/เดี่ยว และเปิด-ปิดรับการส่งได้ตามต้องการ
                </p>
              </div>
              <button
                onClick={openCreateAssignment}
                className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2 rounded-xl shadow-sm text-xs flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>สร้างงานใหม่</span>
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">ยังไม่มีงานในห้องเรียนนี้</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  สร้างงานให้นักเรียนส่ง พร้อมผูกกับช่องคะแนนตามแผนวัดผลเพื่อคำนวณคะแนนอัตโนมัติ
                </p>
                <button
                  onClick={openCreateAssignment}
                  className="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow"
                >
                  สร้างงานแรก
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {assignments.map((assn) => {
                  const subsForAssn = submissions.filter((s) => s.assignmentId === assn.id);
                  const gradedCount = subsForAssn.filter((s) => s.status === 'graded').length;
                  const isPastDue = new Date() > new Date(assn.dueDate);

                  return (
                    <div
                      key={assn.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Badges */}
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              assn.isGroup
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {assn.isGroup ? 'งานกลุ่ม' : 'งานเดี่ยว'}
                          </span>

                          <span className="text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-0.5 rounded-full">
                            {assn.targetBucketName}
                          </span>

                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              assn.isOpen
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {assn.isOpen ? 'เปิดรับงาน' : 'ปิดรับงานแล้ว'}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900">{assn.title}</h3>
                        {assn.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{assn.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                          <span className="font-semibold text-slate-700">
                            คะแนนเต็ม: {assn.maxScore} คะแนน
                          </span>
                          <span
                            className={`flex items-center space-x-1 ${
                              isPastDue ? 'text-rose-600 font-semibold' : 'text-slate-500'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              กำหนดส่ง: {new Date(assn.dueDate).toLocaleString('th-TH', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            {isPastDue && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded">(เลยกำหนด)</span>}
                          </span>
                        </div>
                      </div>

                      {/* Right action controls */}
                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {/* Submissions count badge */}
                        <div className="text-right text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                          <div className="font-bold text-slate-800">
                            ส่งแล้ว: {subsForAssn.length} รายการ
                          </div>
                          <div className="text-[11px] text-slate-500">
                            ตรวจแล้ว: {gradedCount} / {subsForAssn.length}
                          </div>
                        </div>

                        {/* Open/Close toggle button */}
                        <button
                          onClick={(e) => toggleAssignmentStatus(assn, e)}
                          className={`text-xs font-semibold px-3 py-2 rounded-xl border flex items-center space-x-1.5 transition ${
                            assn.isOpen
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={assn.isOpen ? 'คลิกเพื่อปิดรับงาน' : 'คลิกเพื่อเปิดรับงานอีกครั้ง'}
                        >
                          {assn.isOpen ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-amber-600" />
                              <span>ปิดรับงาน</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                              <span>เปิดรับงาน</span>
                            </>
                          )}
                        </button>

                        {/* Check submissions button */}
                        <Link
                          href={`/teacher/classroom/${classroomId}/assignment/${assn.id}`}
                          className="bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs px-4 py-2 rounded-xl shadow-sm flex items-center space-x-1.5 transition"
                        >
                          <FileCheck className="w-4 h-4" />
                          <span>ตรวจงาน ({subsForAssn.length})</span>
                        </Link>

                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDeleteAssignment(assn.id, e)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          title="ลบงาน"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: STUDENTS ================= */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  รายชื่อนักเรียน ({students.length} คน)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  เลขประจำตัวนักเรียน 5 หลักจะใช้เป็นรหัสเข้าสู่ระบบเพื่อส่งงาน
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={openCopyStudentsModal}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 py-2 rounded-xl shadow-sm text-xs flex items-center space-x-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>ดึงรายชื่อจากคลาสอื่น</span>
                </button>
                <a
                  href={`/api/classrooms/${classroomId}/template`}
                  download="student_roster_template.csv"
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>โหลดตัวอย่างไฟล์ CSV</span>
                </a>
                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มรายคน</span>
                </button>
                <button
                  onClick={() => setShowRosterModal(true)}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2 rounded-xl shadow-sm text-xs flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>อัปโหลด Excel / CSV</span>
                </button>
              </div>
            </div>

            {students.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">ยังไม่มีรายชื่อนักเรียนในห้องนี้</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    คุณครูสามารถดึงรายชื่อจากห้องเรียนอื่นที่สอนอยู่ หรืออัปโหลดไฟล์ Excel / CSV ได้ทันที
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={openCopyStudentsModal}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm text-xs flex items-center space-x-2 transition"
                  >
                    <Copy className="w-4 h-4" />
                    <span>ดึงรายชื่อจากคลาสอื่น (ไม่ต้องอัปโหลดซ้ำ)</span>
                  </button>
                  <button
                    onClick={() => setShowRosterModal(true)}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>อัปโหลดไฟล์ Excel / CSV</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 w-16 text-center">เลขที่</th>
                        <th className="py-3 px-4 w-32 font-mono">เลขประจำตัว (Login)</th>
                        <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                        <th className="py-3 px-4 w-28 text-center">ชั้น</th>
                        <th className="py-3 px-4 w-24 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {students.map((std) => (
                        <tr key={std.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 text-center font-bold text-slate-900">
                            {std.rollNumber}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-sky-700">
                            {std.studentId}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {std.fullName}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-600">
                              {std.classRoomName || classroom.gradeLevel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeleteStudent(std.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                              title="ลบนักเรียน"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: GRADE MATRIX ================= */}
        {activeTab === 'grades' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  ตารางคะแนนรวมและตัดเกรด (ตามแผนวัดผล 100 คะแนน)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ระบบทอนและคำนวณสัดส่วนคะแนนอัตโนมัติ พร้อมส่งออกเป็นไฟล์ Excel สำหรับกรอกระบบโรงเรียน
                </p>
              </div>

              <button
                onClick={handleDownloadExcel}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl shadow-sm text-xs flex items-center space-x-1.5 self-start"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด Excel (.xlsx)</span>
              </button>
            </div>

            {/* Matrix Table */}
            {gradeRows.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500">ยังไม่มีข้อมูลคะแนน หรือยังไม่มีนักเรียนในห้องนี้</span>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[70vh]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-800 text-white sticky top-0 z-10 text-[11px]">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center border-r border-slate-700">ที่</th>
                        <th className="py-3 px-3 w-20 font-mono border-r border-slate-700">รหัส</th>
                        <th className="py-3 px-4 min-w-[160px] border-r border-slate-700">ชื่อ - สกุล</th>

                        {/* ก่อนกลางภาค Buckets */}
                        {classroom.scorePlan.preMidterm.buckets.map((b) => (
                          <th key={b.id} className="py-3 px-3 text-center border-r border-slate-700 bg-sky-950 min-w-[90px]">
                            <div className="font-bold">{b.name}</div>
                            <div className="text-[10px] text-sky-300">เต็ม {b.maxScore}</div>
                          </th>
                        ))}
                        <th className="py-3 px-3 text-center border-r border-slate-700 bg-sky-900 min-w-[70px]">
                          <div>รวมก่อนกลาง</div>
                          <div className="text-[10px] text-sky-200">เต็ม {classroom.scorePlan.preMidterm.totalScore}</div>
                        </th>

                        {/* กลางภาค */}
                        <th className="py-3 px-3 text-center border-r border-slate-700 bg-indigo-950 min-w-[80px]">
                          <div>สอบกลางภาค</div>
                          <div className="text-[10px] text-indigo-300">เต็ม {classroom.scorePlan.midterm.maxScore}</div>
                        </th>

                        {/* หลังกลางภาค Buckets */}
                        {classroom.scorePlan.postMidterm.buckets.map((b) => (
                          <th key={b.id} className="py-3 px-3 text-center border-r border-slate-700 bg-purple-950 min-w-[90px]">
                            <div className="font-bold">{b.name}</div>
                            <div className="text-[10px] text-purple-300">เต็ม {b.maxScore}</div>
                          </th>
                        ))}
                        <th className="py-3 px-3 text-center border-r border-slate-700 bg-purple-900 min-w-[70px]">
                          <div>รวมหลังกลาง</div>
                          <div className="text-[10px] text-purple-200">เต็ม {classroom.scorePlan.postMidterm.totalScore}</div>
                        </th>

                        {/* ปลายภาค */}
                        <th className="py-3 px-3 text-center border-r border-slate-700 bg-indigo-950 min-w-[80px]">
                          <div>สอบปลายภาค</div>
                          <div className="text-[10px] text-indigo-300">เต็ม {classroom.scorePlan.final.maxScore}</div>
                        </th>

                        {/* คะแนนรวม 100 และ เกรด */}
                        <th className="py-3 px-3 text-center border-r border-slate-700 bg-emerald-950 min-w-[70px]">
                          <div>รวม 100</div>
                          <div className="text-[10px] text-emerald-300">คะแนน</div>
                        </th>
                        <th className="py-3 px-3 text-center bg-emerald-900 min-w-[60px]">
                          <div>เกรด</div>
                          <div className="text-[10px] text-emerald-300">(0-4)</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {gradeRows.map((row) => (
                        <tr key={row.student.id} className="hover:bg-sky-50/50 transition">
                          <td className="py-2.5 px-3 text-center font-bold border-r border-slate-200">
                            {row.student.rollNumber}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-sky-800 font-semibold border-r border-slate-200">
                            {row.student.studentId}
                          </td>
                          <td className="py-2.5 px-4 font-medium border-r border-slate-200">
                            {row.student.fullName}
                          </td>

                          {/* ก่อนกลางภาค แต่ละช่อง */}
                          {classroom.scorePlan.preMidterm.buckets.map((b) => (
                            <td key={b.id} className="py-2.5 px-3 text-center border-r border-slate-200 bg-sky-50/20">
                              <span className="font-semibold text-slate-900">
                                {row.bucketScores[b.id]?.scaledScore ?? 0}
                              </span>
                              {row.bucketScores[b.id]?.totalRawMax > 0 && (
                                <div className="text-[10px] text-slate-400">
                                  ({row.bucketScores[b.id]?.studentRawSum}/{row.bucketScores[b.id]?.totalRawMax})
                                </div>
                              )}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-center font-bold text-sky-700 bg-sky-50/60 border-r border-slate-200">
                            {row.preMidtermTotal}
                          </td>

                          {/* กลางภาค */}
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-900 bg-indigo-50/20 border-r border-slate-200">
                            {row.midtermScore}
                          </td>

                          {/* หลังกลางภาค แต่ละช่อง */}
                          {classroom.scorePlan.postMidterm.buckets.map((b) => (
                            <td key={b.id} className="py-2.5 px-3 text-center border-r border-slate-200 bg-purple-50/20">
                              <span className="font-semibold text-slate-900">
                                {row.bucketScores[b.id]?.scaledScore ?? 0}
                              </span>
                              {row.bucketScores[b.id]?.totalRawMax > 0 && (
                                <div className="text-[10px] text-slate-400">
                                  ({row.bucketScores[b.id]?.studentRawSum}/{row.bucketScores[b.id]?.totalRawMax})
                                </div>
                              )}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-center font-bold text-purple-700 bg-purple-50/60 border-r border-slate-200">
                            {row.postMidtermTotal}
                          </td>

                          {/* ปลายภาค */}
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-900 bg-indigo-50/20 border-r border-slate-200">
                            {row.finalScore}
                          </td>

                          {/* รวม 100 และ เกรด */}
                          <td className="py-2.5 px-3 text-center font-extrabold text-emerald-800 bg-emerald-50/60 border-r border-slate-200">
                            {row.totalScore}
                          </td>
                          <td className="py-2.5 px-3 text-center font-extrabold text-white bg-emerald-700">
                            {row.gradeText}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: ADJUST SCORE PLAN ================= */}
        {activeTab === 'plan' && editingPlan && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  ปรับสัดส่วนคะแนนตามแผนวัดผล
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  เมื่อปรับปรุงสัดส่วนคะแนน ระบบจะคำนวณคะแนนใหม่ของนักเรียนทุกคนทันที
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveScorePlan}
                disabled={savingPlan}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl shadow text-xs flex items-center space-x-1.5"
              >
                <span>{savingPlan ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>

            {planMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{planMessage}</span>
              </div>
            )}

            {/* Plan Editor */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              {/* ก่อนกลางภาค */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">
                    1. ก่อนกลางภาค (ปัจจุบันรวม {editingPlan.preMidterm.buckets.reduce((s, b) => s + (Number(b.maxScore) || 0), 0)} คะแนน)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...editingPlan };
                      updated.preMidterm.buckets.push({
                        id: `pre_${Date.now()}`,
                        name: `ช่องที่ ${updated.preMidterm.buckets.length + 1}: ชิ้นงาน`,
                        maxScore: 10,
                      });
                      setEditingPlan(updated);
                    }}
                    className="text-xs font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg"
                  >
                    + เพิ่มช่อง
                  </button>
                </div>

                <div className="space-y-2">
                  {editingPlan.preMidterm.buckets.map((b, idx) => (
                    <div key={b.id} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={b.name}
                        onChange={(e) => {
                          const updated = { ...editingPlan };
                          updated.preMidterm.buckets[idx].name = e.target.value;
                          setEditingPlan(updated);
                        }}
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none"
                      />
                      <input
                        type="number"
                        value={b.maxScore}
                        onChange={(e) => {
                          const updated = { ...editingPlan };
                          updated.preMidterm.buckets[idx].maxScore = Number(e.target.value);
                          updated.preMidterm.totalScore = updated.preMidterm.buckets.reduce((s, x) => s + (Number(x.maxScore) || 0), 0);
                          setEditingPlan(updated);
                        }}
                        className="w-20 text-xs text-center font-bold border border-slate-200 rounded-lg px-2 py-2"
                      />
                      <span className="text-xs text-slate-500">คะแนน</span>
                      {editingPlan.preMidterm.buckets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...editingPlan };
                            updated.preMidterm.buckets = updated.preMidterm.buckets.filter((_, i) => i !== idx);
                            updated.preMidterm.totalScore = updated.preMidterm.buckets.reduce((s, x) => s + (Number(x.maxScore) || 0), 0);
                            setEditingPlan(updated);
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* กลางภาค */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">2. กลางภาค (ช่องเดียว)</h3>
                  <span className="text-xs text-slate-400">คะแนนสอบกลางภาค</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={editingPlan.midterm.maxScore}
                    onChange={(e) => {
                      const updated = { ...editingPlan };
                      updated.midterm.maxScore = Number(e.target.value);
                      setEditingPlan(updated);
                    }}
                    className="w-20 text-xs text-center font-bold border border-slate-200 rounded-lg px-2 py-2"
                  />
                  <span className="text-xs text-slate-500">คะแนน</span>
                </div>
              </div>

              {/* หลังกลางภาค */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">
                    3. หลังกลางภาค (ปัจจุบันรวม {editingPlan.postMidterm.buckets.reduce((s, b) => s + (Number(b.maxScore) || 0), 0)} คะแนน)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...editingPlan };
                      updated.postMidterm.buckets.push({
                        id: `post_${Date.now()}`,
                        name: `ช่องที่ ${updated.postMidterm.buckets.length + 1}: ชิ้นงาน`,
                        maxScore: 10,
                      });
                      setEditingPlan(updated);
                    }}
                    className="text-xs font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg"
                  >
                    + เพิ่มช่อง
                  </button>
                </div>

                <div className="space-y-2">
                  {editingPlan.postMidterm.buckets.map((b, idx) => (
                    <div key={b.id} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={b.name}
                        onChange={(e) => {
                          const updated = { ...editingPlan };
                          updated.postMidterm.buckets[idx].name = e.target.value;
                          setEditingPlan(updated);
                        }}
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none"
                      />
                      <input
                        type="number"
                        value={b.maxScore}
                        onChange={(e) => {
                          const updated = { ...editingPlan };
                          updated.postMidterm.buckets[idx].maxScore = Number(e.target.value);
                          updated.postMidterm.totalScore = updated.postMidterm.buckets.reduce((s, x) => s + (Number(x.maxScore) || 0), 0);
                          setEditingPlan(updated);
                        }}
                        className="w-20 text-xs text-center font-bold border border-slate-200 rounded-lg px-2 py-2"
                      />
                      <span className="text-xs text-slate-500">คะแนน</span>
                      {editingPlan.postMidterm.buckets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...editingPlan };
                            updated.postMidterm.buckets = updated.postMidterm.buckets.filter((_, i) => i !== idx);
                            updated.postMidterm.totalScore = updated.postMidterm.buckets.reduce((s, x) => s + (Number(x.maxScore) || 0), 0);
                            setEditingPlan(updated);
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ปลายภาค */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">4. ปลายภาค (ช่องเดียว)</h3>
                  <span className="text-xs text-slate-400">คะแนนสอบปลายภาค</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={editingPlan.final.maxScore}
                    onChange={(e) => {
                      const updated = { ...editingPlan };
                      updated.final.maxScore = Number(e.target.value);
                      setEditingPlan(updated);
                    }}
                    className="w-20 text-xs text-center font-bold border border-slate-200 rounded-lg px-2 py-2"
                  />
                  <span className="text-xs text-slate-500">คะแนน</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL: สร้างงานใหม่ ================= */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">สร้างงานใหม่ในชั้นเรียน</h3>
                <p className="text-xs text-sky-100 mt-0.5">{classroom.courseCode} • {classroom.name}</p>
              </div>
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {assnError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{assnError}</span>
                </div>
              )}

              {/* ชื่องาน */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่องาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={assnTitle}
                  onChange={(e) => setAssnTitle(e.target.value)}
                  placeholder="เช่น ใบงานที่ 2 การจำแนกสารบริสุทธิ์"
                  className="w-full border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-4 py-2.5 text-sm outline-none"
                />
              </div>

              {/* คะแนนเต็ม & กำหนดส่ง */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    คะแนนเต็มของงานนี้ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={assnMaxScore}
                    onChange={(e) => setAssnMaxScore(Number(e.target.value))}
                    className="w-full border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-4 py-2 text-sm outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    กำหนดส่งวันสุดท้าย <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={assnDueDate}
                    onChange={(e) => setAssnDueDate(e.target.value)}
                    className="w-full border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-4 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              {/* ประเภทงาน: เดี่ยว / กลุ่ม */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ประเภทการส่งงาน</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAssnIsGroup(false)}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                      !assnIsGroup
                        ? 'bg-sky-50 border-sky-400 text-sky-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>งานเดี่ยว (ส่งรายบุคคล)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssnIsGroup(true)}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                      assnIsGroup
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>งานกลุ่ม (กรอกรหัสเพื่อน)</span>
                  </button>
                </div>
              </div>

              {/* เลือกว่างานนี้เป็นช่องคะแนนไหน */}
              <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  <label className="block text-xs font-bold text-sky-950">
                    เลือกช่องคะแนนตามแผนวัดประเมินผล <span className="text-rose-500">*</span>
                  </label>
                </div>
                <select
                  value={assnTargetBucketId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setAssnTargetBucketId(selId);
                    const b = availableBuckets.find((x) => x.id === selId);
                    if (b) setAssnTargetCategory(b.category);
                  }}
                  className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  {availableBuckets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-sky-800/80 leading-relaxed">
                  💡 หากในช่องนี้มีงานหลายชิ้น เช่น มี 2 งาน งานละ 20 คะแนน (รวม 40) แต่ช่องนี้ตั้งใจเก็บ 10 คะแนน 
                  ระบบจะคำนวณทอนสัดส่วนให้กลายเป็นเต็ม 10 ให้อัตโนมัติทันที
                </p>
              </div>

              {/* รายละเอียดคำชี้แจง */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รายละเอียด / คำชี้แจง (ถ้ามี)
                </label>
                <textarea
                  rows={3}
                  value={assnDesc}
                  onChange={(e) => setAssnDesc(e.target.value)}
                  placeholder="อธิบายคำสั่ง รูปแบบการส่ง หรือขั้นตอนการทำงาน..."
                  className="w-full border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-4 py-2.5 text-xs outline-none"
                />
              </div>

              {/* เอกสารแนบ หรือ ลิงก์ที่ครูต้องการให้ */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  แนบใบงาน / ลิงก์ให้นักเรียน (ไม่บังคับ)
                </label>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleTeacherFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl transition flex items-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>แนบไฟล์ PDF หรือรูปภาพ</span>
                  </button>
                </div>

                {/* เพิ่มลิงก์ภายนอก */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="วางลิงก์ เช่น Google Drive, Canva, Docs..."
                    className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  />
                  <button
                    type="button"
                    onClick={addLinkAttachment}
                    className="text-xs bg-sky-600 text-white font-semibold px-3 py-2 rounded-xl hover:bg-sky-500"
                  >
                    เพิ่มลิงก์
                  </button>
                </div>

                {/* รายการแนบ */}
                {assnAttachments.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {assnAttachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg"
                      >
                        <span className="truncate max-w-xs">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => setAssnAttachments(assnAttachments.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAssignmentModal(false)}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-4 py-2"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={assnSubmitting}
                onClick={handleCreateAssignment}
                className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow transition"
              >
                {assnSubmitting ? 'กำลังบันทึก...' : 'สร้างและเผยแพร่งาน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: อัปโหลดรายชื่อนักเรียน ================= */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">อัปโหลดรายชื่อนักเรียน</h3>
                <p className="text-xs text-sky-100 mt-0.5">รองรับไฟล์ Excel (.xlsx) และ CSV</p>
              </div>
              <button
                onClick={() => setShowRosterModal(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-xs text-sky-900 space-y-2">
                <div className="font-bold">📋 หัวคอลัมน์ที่ระบบรองรับในไฟล์:</div>
                <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                  <span className="bg-white border border-sky-200 px-2 py-0.5 rounded">ชั้น</span>
                  <span className="bg-white border border-sky-200 px-2 py-0.5 rounded">เลขที่</span>
                  <span className="bg-white border border-sky-200 px-2 py-0.5 rounded">เลขประจำตัว</span>
                  <span className="bg-white border border-sky-200 px-2 py-0.5 rounded">ชื่อสกุล</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  *เลขประจำตัว 5 หลัก จะใช้เป็นรหัสผ่านเข้าสู่ระบบของนักเรียน
                </p>
              </div>

              {/* หรือดึงรายชื่อจากคลาสอื่น */}
              {otherClassrooms.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center space-x-2 text-emerald-950">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold block">มีรายชื่อในคลาสอื่นอยู่แล้ว?</span>
                      <span className="text-[11px] text-emerald-800">
                        ดึงรายชื่อจากวิชาอื่นเข้ามาได้ทันที ไม่ต้องอัปโหลดซ้ำ
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openCopyStudentsModal}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition ml-2"
                  >
                    ดึงรายชื่อ
                  </button>
                </div>
              )}

              {/* Upload Drop area */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-sky-500 transition cursor-pointer relative bg-slate-50/50">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="text-xs font-semibold text-slate-700">
                  {uploadFile ? uploadFile.name : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">.xlsx, .xls, .csv</div>
              </div>

              {uploadError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadMessage && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{uploadMessage}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <a
                href={`/api/classrooms/${classroomId}/template`}
                download="student_template.csv"
                className="text-xs font-semibold text-sky-700 hover:underline flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดไฟล์ตัวอย่าง</span>
              </a>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRosterModal(false)}
                  className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-3 py-2"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={uploadingRoster || !uploadFile}
                  onClick={handleUploadRoster}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow disabled:opacity-50"
                >
                  {uploadingRoster ? 'กำลังนำเข้า...' : 'นำเข้ารายชื่อ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: เพิ่มนักเรียนคนเดียว ================= */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">เพิ่มนักเรียนรายคน</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่</label>
                <input
                  type="number"
                  value={singleRoll}
                  onChange={(e) => setSingleRoll(e.target.value)}
                  placeholder="เช่น 1"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลขประจำตัว 5 หลัก (Login) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={singleStudentId}
                  onChange={(e) => setSingleStudentId(e.target.value.replace(/\D/g, ''))}
                  placeholder="เช่น 54001"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  placeholder="เช่น นายกิตติศักดิ์ เจริญพร"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                className="text-slate-500 text-xs px-3 py-2 font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAddSingleStudent}
                className="bg-sky-600 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ดึงรายชื่อนักเรียนจากคลาสอื่น ================= */}
      {showCopyStudentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Copy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">ดึงรายชื่อนักเรียนจากคลาสอื่น</h3>
                  <p className="text-xs text-emerald-100">
                    นำเข้ารายชื่อจากวิชาอื่นที่มีอยู่แล้วโดยไม่ต้องอัปโหลดไฟล์ซ้ำ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCopyStudentsModal(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {otherClassrooms.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200 p-6">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">ไม่พบคลาสเรียนอื่นที่มีรายชื่อนักเรียน</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    คุณครูสามารถอัปโหลดไฟล์ Excel / CSV ในห้องนี้ได้โดยตรงครับ
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      เลือกคลาสเรียนต้นทางที่ต้องการดึงรายชื่อ:
                    </label>
                    <select
                      value={selectedSourceClassroomId}
                      onChange={(e) => handleSelectSourceClassroom(e.target.value)}
                      className="w-full bg-white border border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-xs font-semibold rounded-xl px-3.5 py-3 outline-none shadow-sm cursor-pointer"
                    >
                      <option value="" disabled>-- คลิกเพื่อเลือกห้องเรียนต้นทาง --</option>
                      {otherClassrooms.map((c) => {
                        const isSameGrade = classroom && c.gradeLevel.trim().toLowerCase() === classroom.gradeLevel.trim().toLowerCase();
                        return (
                          <option key={c.id} value={c.id}>
                            {isSameGrade ? '⭐ (ห้องเดียวกัน) ' : ''}
                            {c.courseCode} {c.name} ({c.gradeLevel}) • มีนักเรียน {c.studentCount} คน
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Smart Match Banner */}
                  {(() => {
                    const matched = otherClassrooms.find(
                      (c) => classroom && c.gradeLevel.trim().toLowerCase() === classroom.gradeLevel.trim().toLowerCase()
                    );
                    if (!matched) return null;
                    return (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-start space-x-2">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">แนะนำสำหรับห้อง {classroom?.gradeLevel}:</span>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            พบวิชา <strong>{matched.courseCode} {matched.name}</strong> เป็นนักเรียนระดับชั้นเดียวกัน ({matched.studentCount} คน)
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Preview of Students */}
                  {previewStudents.length > 0 && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                      <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>ตัวอย่างรายชื่อที่จะนำเข้า ({previewStudents.length} คน)</span>
                        <span className="text-[11px] font-normal text-slate-500">เรียงตามเลขที่</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {previewStudents.slice(0, 10).map((s) => (
                          <div key={s.id} className="p-2.5 px-3 flex items-center justify-between bg-white hover:bg-slate-50">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                                {s.rollNumber}
                              </span>
                              <span className="font-medium text-slate-800">{s.fullName}</span>
                            </div>
                            <span className="font-mono text-[11px] text-slate-500 font-semibold">{s.studentId}</span>
                          </div>
                        ))}
                        {previewStudents.length > 10 && (
                          <div className="p-2 text-center text-[11px] text-slate-500 bg-slate-50">
                            ... และอีก {previewStudents.length - 10} คน
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {copyError && (
                    <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{copyError}</span>
                    </div>
                  )}

                  {copyMessage && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{copyMessage}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowCopyStudentsModal(false)}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-4 py-2"
              >
                ยกเลิก
              </button>
              {otherClassrooms.length > 0 && (
                <button
                  type="button"
                  disabled={copyingStudents || !selectedSourceClassroomId}
                  onClick={handleConfirmCopyStudents}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow transition flex items-center space-x-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>
                    {copyingStudents
                      ? 'กำลังดึงรายชื่อ...'
                      : `ยืนยันดึงรายชื่อ ${previewStudents.length > 0 ? `(${previewStudents.length} คน)` : ''}`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
