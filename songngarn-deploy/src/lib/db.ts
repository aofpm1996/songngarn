import fs from 'fs';
import path from 'path';
import {
  Assignment,
  Classroom,
  ScoreEvaluationPlan,
  Student,
  Submission,
  TeacherUser,
} from './types';
import { sheetsApi } from './sheets-api';
import { sortClassrooms } from './classroom-sort';

interface DatabaseSchema {
  teacher: TeacherUser;
  classrooms: Classroom[];
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
}

const IS_SERVERLESS = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY
);
const DATA_DIR = IS_SERVERLESS ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// ข้อมูลเริ่มต้นของครูปารเมศ มหิเมือง
const DEFAULT_TEACHER: TeacherUser = {
  id: '12004',
  prefix: 'นาย',
  fullName: 'ปารเมศ มหิเมือง',
  department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์',
  position: 'ครู',
  role: 'admin',
};

// แผนวัดประเมินผลมาตรฐาน (รวม 100 คะแนน)
export const DEFAULT_SCORE_PLAN: ScoreEvaluationPlan = {
  preMidterm: {
    buckets: [
      { id: 'pre_1', name: 'ช่องที่ 1: แบบฝึกหัดและใบงาน', maxScore: 10 },
      { id: 'pre_2', name: 'ช่องที่ 2: การทดลองปฏิบัติการ', maxScore: 15 },
    ],
    totalScore: 25,
  },
  midterm: {
    maxScore: 20, // สอบกลางภาค ช่องเดียว
  },
  postMidterm: {
    buckets: [
      { id: 'post_1', name: 'ช่องที่ 1: กิจกรรมสะเต็ม / โครงงาน', maxScore: 15 },
      { id: 'post_2', name: 'ช่องที่ 2: ใบงานและการสืบค้น', maxScore: 10 },
    ],
    totalScore: 25,
  },
  final: {
    maxScore: 30, // สอบปลายภาค ช่องเดียว
  },
  totalScore: 100,
};

function getInitialDatabase(): DatabaseSchema {
  const sampleClassroomId = 'cls_chem_401';

  // ตัวอย่างห้องเรียนเริ่มต้น เพื่อให้พร้อมใช้งานทันที
  const sampleClassroom: Classroom = {
    id: sampleClassroomId,
    name: 'วิทยาศาสตร์กายภาพ (เคมี)',
    courseCode: 'ว31101',
    gradeLevel: 'ม.4/1',
    roomLocation: 'ห้องปฏิบัติการวิทยาศาสตร์ 324',
    scheduleTime: 'วันพุธ คาบ 3-4 (10:10 - 11:50 น.)',
    teacherId: DEFAULT_TEACHER.id,
    teacherName: `${DEFAULT_TEACHER.prefix}${DEFAULT_TEACHER.fullName}`,
    scorePlan: DEFAULT_SCORE_PLAN,
    createdAt: new Date().toISOString(),
  };

  // ตัวอย่างนักเรียน 5 คน
  const sampleStudents: Student[] = [
    {
      id: 'std_1',
      studentId: '54001',
      classroomId: sampleClassroomId,
      classRoomName: 'ม.4/1',
      rollNumber: 1,
      fullName: 'นายกิตติศักดิ์ เจริญพร',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'std_2',
      studentId: '54002',
      classroomId: sampleClassroomId,
      classRoomName: 'ม.4/1',
      rollNumber: 2,
      fullName: 'นางสาวจิราภรณ์ วงศ์สว่าง',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'std_3',
      studentId: '54003',
      classroomId: sampleClassroomId,
      classRoomName: 'ม.4/1',
      rollNumber: 3,
      fullName: 'นายณัฐวุฒิ สิทธิชัย',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'std_4',
      studentId: '54004',
      classroomId: sampleClassroomId,
      classRoomName: 'ม.4/1',
      rollNumber: 4,
      fullName: 'นางสาวธนพร พรหมมา',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'std_5',
      studentId: '54005',
      classroomId: sampleClassroomId,
      classRoomName: 'ม.4/1',
      rollNumber: 5,
      fullName: 'นายพงศกร สุวรรณรัตน์',
      createdAt: new Date().toISOString(),
    },
  ];

  // ตัวอย่างงานในห้องเรียน
  const sampleAssignments: Assignment[] = [
    {
      id: 'assn_1',
      classroomId: sampleClassroomId,
      title: 'ใบงานที่ 1: ตารางธาตุและการจัดเรียงอิเล็กตรอน',
      description: 'ให้นักเรียนดาวน์โหลดแบบฝึกหัด หรือทำใส่สมุดแล้วถ่ายรูป หรือส่งเป็นไฟล์ PDF แนบมาในระบบ',
      maxScore: 20,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isOpen: true,
      isGroup: false,
      targetCategory: 'preMidterm',
      targetBucketId: 'pre_1',
      targetBucketName: 'ช่องที่ 1: แบบฝึกหัดและใบงาน',
      bucketWeight: 10,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'assn_2',
      classroomId: sampleClassroomId,
      title: 'ปฏิบัติการทดลองที่ 1: การแพร่ของสารและการเปลี่ยนแปลงสถานะ',
      description: 'งานกลุ่ม 2-3 คน บันทึกผลการทดลอง วิดีโอสั้น หรือรายงานผล พร้อมแนบลิงก์หรือไฟล์งาน',
      maxScore: 20,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      isOpen: true,
      isGroup: true,
      targetCategory: 'preMidterm',
      targetBucketId: 'pre_2',
      targetBucketName: 'ช่องที่ 2: การทดลองปฏิบัติการ',
      bucketWeight: 15,
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    teacher: DEFAULT_TEACHER,
    classrooms: [sampleClassroom],
    students: sampleStudents,
    assignments: sampleAssignments,
    submissions: [],
  };
}

// ตรวจสอบและสร้างไฟล์ db.json
function ensureDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      // หากรันบน Serverless (Vercel) ให้คัดลอกไฟล์ที่ bundle มากับโปรเจกต์ (process.cwd()/data/db.json) มายัง /tmp ก่อน
      const bundledDbFile = path.join(process.cwd(), 'data', 'db.json');
      if (IS_SERVERLESS && fs.existsSync(bundledDbFile)) {
        try {
          const bundledContent = fs.readFileSync(bundledDbFile, 'utf-8');
          fs.writeFileSync(DB_FILE, bundledContent, 'utf-8');
          return JSON.parse(bundledContent) as DatabaseSchema;
        } catch {
          // fallback ไปยัง getInitialDatabase() หากมีปัญหาในการอ่าน
        }
      }
      const initial = getInitialDatabase();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data) as DatabaseSchema;
  } catch (error) {
    console.error('Error reading database file, resetting:', error);
    const initial = getInitialDatabase();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch {}
    return initial;
  }
}

// บันทึกข้อมูลลงไฟล์อย่างปลอดภัย
function saveDatabase(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error('Error saving database file:', error);
    throw error;
  }
}

// --- Data Operations (Dual-Mode: Local JSON + Google Sheets Async Sync) ---

export const db = {
  // ครูผู้สอน
  getTeacher(): TeacherUser {
    const data = ensureDatabase();
    return data.teacher || DEFAULT_TEACHER;
  },

  // ห้องเรียน (เรียงลำดับตามระดับชั้นและห้องเรียนเสมอ เช่น ม.4/1, ม.4/3, ม.5/10, ม.5/11)
  getClassrooms(): Classroom[] {
    const data = ensureDatabase();
    const mapped = data.classrooms.map((c) => ({
      ...c,
      studentCount: data.students.filter((s) => s.classroomId === c.id).length,
    }));
    return sortClassrooms(mapped);
  },

  getClassroom(id: string): Classroom | null {
    const data = ensureDatabase();
    const c = data.classrooms.find((item) => item.id === id);
    if (!c) return null;
    return {
      ...c,
      studentCount: data.students.filter((s) => s.classroomId === c.id).length,
    };
  },

  createClassroom(input: Omit<Classroom, 'id' | 'createdAt' | 'teacherId' | 'teacherName'>): Classroom {
    const data = ensureDatabase();
    const teacher = data.teacher || DEFAULT_TEACHER;
    const newClassroom: Classroom = {
      ...input,
      id: `cls_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      teacherId: teacher.id,
      teacherName: `${teacher.prefix}${teacher.fullName}`,
      createdAt: new Date().toISOString(),
    };
    data.classrooms.unshift(newClassroom);
    saveDatabase(data);

    // Sync ไปยัง Google Sheets
    if (sheetsApi.isEnabled()) {
      sheetsApi.postAction('SAVE_CLASSROOM', { data: newClassroom }).catch((e) => {
        console.error('Failed to sync new classroom to Google Sheets:', e);
      });
    }

    return newClassroom;
  },

  updateClassroom(id: string, updates: Partial<Classroom>): Classroom | null {
    const data = ensureDatabase();
    const index = data.classrooms.findIndex((c) => c.id === id);
    if (index === -1) return null;
    data.classrooms[index] = { ...data.classrooms[index], ...updates };
    saveDatabase(data);

    // Sync ไปยัง Google Sheets
    if (sheetsApi.isEnabled()) {
      sheetsApi.postAction('UPDATE_CLASSROOM', { id, updates }).catch((e) => {
        console.error('Failed to sync updated classroom to Google Sheets:', e);
      });
    }

    return data.classrooms[index];
  },

  deleteClassroom(id: string): boolean {
    const data = ensureDatabase();
    data.classrooms = data.classrooms.filter((c) => c.id !== id);
    data.students = data.students.filter((s) => s.classroomId !== id);
    data.assignments = data.assignments.filter((a) => a.classroomId !== id);
    data.submissions = data.submissions.filter((sub) => sub.classroomId !== id);
    saveDatabase(data);

    // Sync ไปยัง Google Sheets
    if (sheetsApi.isEnabled()) {
      sheetsApi.postAction('DELETE_CLASSROOM', { id }).catch((e) => {
        console.error('Failed to sync deleted classroom to Google Sheets:', e);
      });
    }

    return true;
  },

  // นักเรียน
  getStudents(classroomId?: string): Student[] {
    const data = ensureDatabase();
    if (classroomId) {
      return data.students
        .filter((s) => s.classroomId === classroomId)
        .sort((a, b) => a.rollNumber - b.rollNumber);
    }
    return data.students;
  },

  getStudentByStudentId(studentId: string): Student[] {
    const data = ensureDatabase();
    return data.students.filter((s) => s.studentId === studentId.trim());
  },

  addOrReplaceStudents(classroomId: string, studentsList: Omit<Student, 'id' | 'createdAt'>[]): Student[] {
    const data = ensureDatabase();
    // นำนักเรียนเดิมของห้องนี้ออก (หากเป็นการ upload ใหม่)
    data.students = data.students.filter((s) => s.classroomId !== classroomId);

    const now = new Date().toISOString();
    const newStudents: Student[] = studentsList.map((item, index) => ({
      ...item,
      id: `std_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
    }));

    data.students.push(...newStudents);
    saveDatabase(data);

    // Sync ไปยัง Google Sheets
    if (sheetsApi.isEnabled()) {
      sheetsApi.postAction('SAVE_STUDENTS', { classroomId, students: newStudents }).catch((e) => {
        console.error('Failed to sync students roster to Google Sheets:', e);
      });
    }

    return newStudents.sort((a, b) => a.rollNumber - b.rollNumber);
  },

  addSingleStudent(classroomId: string, student: Omit<Student, 'id' | 'createdAt'>): Student {
    const data = ensureDatabase();
    const newStudent: Student = {
      ...student,
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    data.students.push(newStudent);
    saveDatabase(data);

    // Sync ไปยัง Google Sheets
    if (sheetsApi.isEnabled()) {
      sheetsApi.postAction('ADD_STUDENT', { data: newStudent }).catch((e) => {
        console.error('Failed to sync student to Google Sheets:', e);
      });
    }

    return newStudent;
  },

  deleteStudent(id: string): boolean {
    const data = ensureDatabase();
    data.students = data.students.filter((s) => s.id !== id);
    saveDatabase(data);

    // Sync ไปยัง Google Sheets
    if (sheetsApi.isEnabled()) {
      sheetsApi.postAction('DELETE_STUDENT', { id }).catch((e) => {
        console.error('Failed to sync deleted student to Google Sheets:', e);
      });
    }

    return true;
  },

  // การบ้าน / งาน
  getAssignments(classroomId?: string): Assignment[] {
    const data = ensureDatabase();
    if (classroomId) {
      return data.assignments
        .filter((a) => a.classroomId === classroomId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return data.assignments;
  },

  getAssignment(id: string): Assignment | null {
    const data = ensureDatabase();
    return data.assignments.find((a) => a.id === id) || null;
  },

  createAssignment(input: Omit<Assignment, 'id' | 'createdAt'>): Assignment {
    const data = ensureDatabase();
    const newAssignment: Assignment = {
      ...input,
      id: `assn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    data.assignments.unshift(newAssignment);
    saveDatabase(data);

    // Sync ไปยัง Google Sheets
    if (sheetsApi.isEnabled()) {
      sheetsApi.postAction('SAVE_ASSIGNMENT', { data: newAssignment }).catch((e) => {
        console.error('Failed to sync assignment to Google Sheets:', e);
      });
    }

    return newAssignment;
  },

  updateAssignment(id: string, updates: Partial<Assignment>): Assignment | null {
    const data = ensureDatabase();
    const index = data.assignments.findIndex((a) => a.id === id);
    if (index === -1) return null;
    data.assignments[index] = { ...data.assignments[index], ...updates };
    saveDatabase(data);

    // Sync ไปยัง Google Sheets
    if (sheetsApi.isEnabled()) {
      sheetsApi.postAction('UPDATE_ASSIGNMENT', { id, updates }).catch((e) => {
        console.error('Failed to sync updated assignment to Google Sheets:', e);
      });
    }

    return data.assignments[index];
  },

  deleteAssignment(id: string): boolean {
    const data = ensureDatabase();
    data.assignments = data.assignments.filter((a) => a.id !== id);
    data.submissions = data.submissions.filter((s) => s.assignmentId !== id);
    saveDatabase(data);

    // Sync ไปยัง Google Sheets
    if (sheetsApi.isEnabled()) {
      sheetsApi.postAction('DELETE_ASSIGNMENT', { id }).catch((e) => {
        console.error('Failed to sync deleted assignment to Google Sheets:', e);
      });
    }

    return true;
  },

  // การส่งงาน
  getSubmissions(assignmentId?: string, classroomId?: string): Submission[] {
    const data = ensureDatabase();
    let res = data.submissions;
    if (classroomId) {
      res = res.filter((s) => s.classroomId === classroomId);
    }
    if (assignmentId) {
      res = res.filter((s) => s.assignmentId === assignmentId);
    }
    return res;
  },

  getSubmission(id: string): Submission | null {
    const data = ensureDatabase();
    return data.submissions.find((s) => s.id === id) || null;
  },

  saveSubmission(input: Omit<Submission, 'id' | 'status' | 'studentScores'>): Submission {
    const data = ensureDatabase();
    const assignment = data.assignments.find((a) => a.id === input.assignmentId);

    // ตรวจสอบว่าส่งล่าช้าหรือไม่
    let isLate = input.isLate;
    if (assignment) {
      const now = new Date();
      const dueDate = new Date(assignment.dueDate);
      if (now > dueDate) {
        isLate = true;
      }
    }

    // ตรวจสอบว่าเคยส่งงานนี้ไปแล้วหรือไม่ (ถ้าเคยส่ง ให้ปรับปรุงรายการเดิม)
    const existingIndex = data.submissions.findIndex(
      (s) =>
        s.assignmentId === input.assignmentId &&
        (s.submitterStudentId === input.submitterStudentId ||
          s.groupMembers?.some((m) => m.studentId === input.submitterStudentId))
    );

    let resultSubmission: Submission;

    if (existingIndex !== -1) {
      const existing = data.submissions[existingIndex];
      const updated: Submission = {
        ...existing,
        ...input,
        isLate,
        status: existing.status === 'graded' ? 'submitted' : existing.status,
        submittedAt: new Date().toISOString(),
      };
      data.submissions[existingIndex] = updated;
      saveDatabase(data);
      resultSubmission = updated;
    } else {
      const newSub: Submission = {
        ...input,
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        status: 'submitted',
        isLate,
        studentScores: {},
        submittedAt: new Date().toISOString(),
      };
      data.submissions.unshift(newSub);
      saveDatabase(data);
      resultSubmission = newSub;
    }

    // Sync ไปยัง Google Sheets
    if (sheetsApi.isEnabled()) {
      sheetsApi.postAction('SAVE_SUBMISSION', { data: resultSubmission }).catch((e) => {
        console.error('Failed to sync submission to Google Sheets:', e);
      });
    }

    return resultSubmission;
  },

  gradeSubmission(
    submissionId: string,
    studentScores: Record<string, { score: number; feedback?: string }>,
    generalFeedback?: string
  ): Submission | null {
    const data = ensureDatabase();
    const index = data.submissions.findIndex((s) => s.id === submissionId);
    if (index === -1) return null;

    const current = data.submissions[index];
    const now = new Date().toISOString();

    const formattedScores: Submission['studentScores'] = {};
    for (const [sId, val] of Object.entries(studentScores)) {
      formattedScores[sId] = {
        score: Math.round(Number(val.score)),
        feedback: val.feedback || '',
        gradedAt: now,
      };
    }

    const updated: Submission = {
      ...current,
      status: 'graded',
      studentScores: formattedScores,
      generalFeedback: generalFeedback ?? current.generalFeedback,
      gradedAt: now,
      gradedBy: `${data.teacher.prefix}${data.teacher.fullName}`,
    };

    data.submissions[index] = updated;
    saveDatabase(data);

    // Sync ไปยัง Google Sheets
    if (sheetsApi.isEnabled()) {
      sheetsApi.postAction('GRADE_SUBMISSION', {
        id: submissionId,
        studentScores: formattedScores,
        generalFeedback,
        gradedBy: updated.gradedBy,
      }).catch((e) => {
        console.error('Failed to sync grading to Google Sheets:', e);
      });
    }

    return updated;
  },

  // ดึงข้อมูลทั้งหมดจาก Google Sheets มาอัปเดตลงใน Local Cache
  syncFromGoogleSheets(allData: {
    classrooms: Classroom[];
    students: Student[];
    assignments: Assignment[];
    submissions: Submission[];
  }) {
    const data = ensureDatabase();
    if (Array.isArray(allData.classrooms) && allData.classrooms.length > 0) {
      data.classrooms = allData.classrooms;
    }
    if (Array.isArray(allData.students) && allData.students.length > 0) {
      data.students = allData.students;
    }
    if (Array.isArray(allData.assignments) && allData.assignments.length > 0) {
      data.assignments = allData.assignments;
    }
    if (Array.isArray(allData.submissions)) {
      data.submissions = allData.submissions;
    }
    saveDatabase(data);
  },
};
