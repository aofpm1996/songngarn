export interface ScoreBucket {
  id: string;
  name: string;
  maxScore: number; // คะแนนที่ตั้งใจเก็บสำหรับช่องนี้ (เช่น 10 คะแนน)
}

export interface ScoreEvaluationPlan {
  preMidterm: {
    buckets: ScoreBucket[];
    totalScore: number;
  };
  midterm: {
    maxScore: number; // ช่องเดียว (เช่น 20 คะแนน)
  };
  postMidterm: {
    buckets: ScoreBucket[];
    totalScore: number;
  };
  final: {
    maxScore: number; // ช่องเดียว (เช่น 30 คะแนน)
  };
  totalScore: number; // รวม 100 คะแนน
}

export interface TeacherUser {
  id: string; // "12004"
  prefix: string; // "นาย"
  fullName: string; // "ปารเมศ มหิเมือง"
  department: string; // "กลุ่มสาระการเรียนรู้วิทยาศาสตร์"
  position: string; // "ครู"
  role: 'admin' | 'teacher';
}

export interface Classroom {
  id: string;
  name: string; // เช่น "วิทยาศาสตร์กายภาพ 1"
  courseCode: string; // เช่น "ว31101"
  gradeLevel: string; // เช่น "ม.4/1"
  roomLocation?: string; // เช่น "ห้อง 324"
  scheduleTime?: string; // เช่น "วันจันทร์ คาบ 1-2 (08:30 - 10:10)"
  teacherId: string;
  teacherName: string;
  scorePlan: ScoreEvaluationPlan;
  createdAt: string;
  studentCount?: number;
}

export interface Student {
  id: string;
  studentId: string; // รหัสประจำตัว 5 หลัก เช่น "54321" (ใช้เข้าสู่ระบบ)
  classroomId: string;
  classRoomName: string; // ชั้น เช่น "ม.4/1"
  rollNumber: number; // เลขที่
  fullName: string; // ชื่อสกุล
  createdAt: string;
}

export interface AssignmentAttachment {
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'link';
  size?: number;
}

export interface Assignment {
  id: string;
  classroomId: string;
  title: string;
  description?: string;
  maxScore: number; // คะแนนเต็มของงานนี้
  dueDate: string; // ISO String
  isOpen: boolean; // ปิด/เปิดรับงาน
  isGroup: boolean; // งานกลุ่ม หรืองานเดี่ยว
  targetCategory: 'preMidterm' | 'midterm' | 'postMidterm' | 'final';
  targetBucketId: string; // ID ของ ScoreBucket หรือ "midterm" / "final"
  targetBucketName: string; // ชื่อช่องคะแนน
  bucketWeight: number; // คะแนนสัดส่วนของช่องนี้
  attachments?: AssignmentAttachment[];
  createdAt: string;
}

export interface SubmissionGroupMember {
  studentId: string; // รหัส 5 หลัก
  fullName: string;
  rollNumber: number;
}

export interface Submission {
  id: string;
  assignmentId: string;
  classroomId: string;
  submitterStudentId: string; // รหัสผู้กดส่ง
  submitterName: string;
  isGroup: boolean;
  groupMembers: SubmissionGroupMember[];
  attachments: AssignmentAttachment[];
  studentComment?: string;
  submittedAt: string;
  isLate: boolean; // ส่งช้ากว่ากำหนดหรือไม่
  status: 'submitted' | 'graded'; // ส่งแล้วรอตรวจ | ส่งแล้วตรวจแล้ว
  studentScores: Record<string, {
    score: number;
    feedback?: string;
    gradedAt?: string;
  }>;
  generalFeedback?: string;
  gradedAt?: string;
  gradedBy?: string;
}

export type StudentAssignmentStatus = 
  | 'graded'              // ส่งแล้วตรวจแล้ว (พร้อมขึ้นคะแนน)
  | 'submitted'           // ส่งแล้วรอตรวจ
  | 'late_allowed'        // พ้นกำหนดส่งได้อยู่ (ส่งล่าช้าได้)
  | 'closed'              // พ้นกำหนดปิดรับงาน
  | 'pending';            // ยังไม่ส่ง (ยังอยู่ในเวลา)

export interface StudentAssignmentItem {
  assignment: Assignment;
  submission?: Submission;
  studentStatus: StudentAssignmentStatus;
  myScore?: number;
  myFeedback?: string;
  isLateSubmission?: boolean;
}

export interface GradeSummaryBucket {
  bucketId: string;
  bucketName: string;
  category: 'preMidterm' | 'midterm' | 'postMidterm' | 'final';
  targetWeight: number; // คะแนนสัดส่วนเต็มของช่องนี้ (เช่น 10)
  totalRawMax: number; // รวมคะแนนเต็มของงานทั้งหมดที่อยู่ในช่องนี้ (เช่น 40)
  studentRawSum: number; // คะแนนดิบที่นักเรียนได้ (เช่น 34)
  scaledScore: number; // คำนวณเป็นสัดส่วน (34/40 * 10 = 8.5)
  assignmentCount: number;
}

export interface StudentGradeRow {
  student: Student;
  assignmentScores: Record<string, {
    rawScore: number;
    maxScore: number;
    isSubmitted: boolean;
    isGraded: boolean;
  }>;
  bucketScores: Record<string, GradeSummaryBucket>;
  preMidtermTotal: number;
  midtermScore: number;
  postMidtermTotal: number;
  finalScore: number;
  totalScore: number; // รวม 100
  gradePoint: number; // 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0
  gradeText: string;
}
