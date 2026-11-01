import {
  Assignment,
  Classroom,
  GradeSummaryBucket,
  ScoreEvaluationPlan,
  Student,
  StudentAssignmentItem,
  StudentAssignmentStatus,
  StudentGradeRow,
  Submission,
} from './types';

/**
 * คำนวณสถานะงานของนักเรียนแต่ละคนตามเงื่อนไขที่กำหนด
 * สถานะ:
 * 1. graded: ส่งแล้วตรวจแล้ว (พร้อมขึ้นคะแนน)
 * 2. submitted: ส่งแล้วรอตรวจ
 * 3. pending: ยังไม่ส่ง (ยังไม่เลยกำหนด)
 * 4. late_allowed: พ้นกำหนดส่งได้อยู่ (ส่งล่าช้าได้)
 * 5. closed: พ้นกำหนดปิดรับงาน
 */
export function getStudentAssignmentStatus(
  assignment: Assignment,
  submission?: Submission
): StudentAssignmentStatus {
  if (submission) {
    if (submission.status === 'graded') {
      return 'graded';
    }
    return 'submitted';
  }

  // ยังไม่ได้ส่ง
  if (!assignment.isOpen) {
    return 'closed';
  }

  const now = new Date();
  const dueDate = new Date(assignment.dueDate);

  if (now > dueDate) {
    return 'late_allowed';
  }

  return 'pending';
}

/**
 * ตัดเกรดตามเกณฑ์มาตรฐานการศึกษาขั้นพื้นฐาน (0 - 4)
 */
export function calculateGradePoint(totalScore: number): { gradePoint: number; gradeText: string } {
  const rounded = Math.round(totalScore);
  if (rounded >= 80) return { gradePoint: 4.0, gradeText: '4' };
  if (rounded >= 75) return { gradePoint: 3.5, gradeText: '3.5' };
  if (rounded >= 70) return { gradePoint: 3.0, gradeText: '3' };
  if (rounded >= 65) return { gradePoint: 2.5, gradeText: '2.5' };
  if (rounded >= 60) return { gradePoint: 2.0, gradeText: '2' };
  if (rounded >= 55) return { gradePoint: 1.5, gradeText: '1.5' };
  if (rounded >= 50) return { gradePoint: 1.0, gradeText: '1' };
  return { gradePoint: 0.0, gradeText: '0' };
}

/**
 * หาการส่งงานของนักเรียน (รองรับทั้งงานเดี่ยวและงานกลุ่ม)
 */
export function findStudentSubmission(
  studentId: string,
  assignmentId: string,
  submissions: Submission[]
): Submission | undefined {
  return submissions.find(
    (s) =>
      s.assignmentId === assignmentId &&
      (s.submitterStudentId === studentId ||
        s.groupMembers?.some((m) => m.studentId === studentId))
  );
}

/**
 * ดึงคะแนนดิบที่นักเรียนได้จากงานชิ้นนั้น (รองรับงานกลุ่ม)
 */
export function getStudentRawScoreForAssignment(
  studentId: string,
  submission?: Submission
): { rawScore: number; isGraded: boolean; isSubmitted: boolean; feedback?: string } {
  if (!submission) {
    return { rawScore: 0, isGraded: false, isSubmitted: false };
  }

  const isSubmitted = true;
  if (submission.status !== 'graded') {
    return { rawScore: 0, isGraded: false, isSubmitted: true };
  }

  // ดึงคะแนนเฉพาะตัว หรือคะแนนที่ให้เท่ากัน
  const memberScoreObj = submission.studentScores?.[studentId];
  if (memberScoreObj && typeof memberScoreObj.score === 'number') {
    return {
      rawScore: memberScoreObj.score,
      isGraded: true,
      isSubmitted: true,
      feedback: memberScoreObj.feedback || submission.generalFeedback,
    };
  }

  // หากไม่มีคะแนนเฉพาะ ให้ดูคะแนนของผู้ส่งหลัก
  const submitterScoreObj = submission.studentScores?.[submission.submitterStudentId];
  if (submitterScoreObj && typeof submitterScoreObj.score === 'number') {
    return {
      rawScore: submitterScoreObj.score,
      isGraded: true,
      isSubmitted: true,
      feedback: submitterScoreObj.feedback || submission.generalFeedback,
    };
  }

  return { rawScore: 0, isGraded: true, isSubmitted: true, feedback: submission.generalFeedback };
}

/**
 * คำนวณคะแนนภาพรวมของห้องเรียนและสัดส่วนคะแนนตามแผนวัดผล
 * ตัวอย่าง: ช่องคะแนนที่ 1 ตั้งใจเก็บ 10 คะแนน มีงาน 2 ชิ้น ชิ้นละ 20 เต็ม 40
 * นักเรียนได้ 34/40 จะถูกแปลงเป็น (34/40) * 10 = 8.5 คะแนน
 */
export function calculateClassroomGradeSummary(
  classroom: Classroom,
  students: Student[],
  assignments: Assignment[],
  submissions: Submission[]
): StudentGradeRow[] {
  const plan = classroom.scorePlan;

  // เรียงนักเรียนตามเลขที่
  const sortedStudents = [...students].sort((a, b) => a.rollNumber - b.rollNumber);

  return sortedStudents.map((student) => {
    const assignmentScores: StudentGradeRow['assignmentScores'] = {};
    const bucketScores: Record<string, GradeSummaryBucket> = {};

    // 1. ดึงคะแนนดิบของนักเรียนแต่ละงาน
    for (const assn of assignments) {
      const sub = findStudentSubmission(student.studentId, assn.id, submissions);
      const scoreInfo = getStudentRawScoreForAssignment(student.studentId, sub);
      assignmentScores[assn.id] = {
        rawScore: scoreInfo.rawScore,
        maxScore: assn.maxScore,
        isSubmitted: scoreInfo.isSubmitted,
        isGraded: scoreInfo.isGraded,
      };
    }

    // 2. คำนวณช่องคะแนน "ก่อนกลางภาค"
    let preMidtermTotal = 0;
    for (const b of plan.preMidterm.buckets) {
      const assnsInBucket = assignments.filter(
        (a) => a.targetCategory === 'preMidterm' && a.targetBucketId === b.id
      );
      const totalRawMax = assnsInBucket.reduce((sum, a) => sum + (a.maxScore || 0), 0);
      const studentRawSum = assnsInBucket.reduce((sum, a) => {
        return sum + (assignmentScores[a.id]?.rawScore || 0);
      }, 0);

      const scaledScore =
        totalRawMax > 0
          ? Math.round((studentRawSum / totalRawMax) * b.maxScore)
          : 0;

      bucketScores[b.id] = {
        bucketId: b.id,
        bucketName: b.name,
        category: 'preMidterm',
        targetWeight: b.maxScore,
        totalRawMax,
        studentRawSum,
        scaledScore,
        assignmentCount: assnsInBucket.length,
      };

      preMidtermTotal += scaledScore;
    }

    // 3. คำนวณช่องคะแนน "กลางภาค" (ช่องเดียว)
    const midtermAssns = assignments.filter((a) => a.targetCategory === 'midterm');
    const midtermRawMax = midtermAssns.reduce((sum, a) => sum + (a.maxScore || 0), 0);
    const midtermRawSum = midtermAssns.reduce((sum, a) => {
      return sum + (assignmentScores[a.id]?.rawScore || 0);
    }, 0);
    const midtermScaled =
      midtermRawMax > 0
        ? Math.round((midtermRawSum / midtermRawMax) * plan.midterm.maxScore)
        : 0;

    bucketScores['midterm'] = {
      bucketId: 'midterm',
      bucketName: 'สอบกลางภาค',
      category: 'midterm',
      targetWeight: plan.midterm.maxScore,
      totalRawMax: midtermRawMax,
      studentRawSum: midtermRawSum,
      scaledScore: midtermScaled,
      assignmentCount: midtermAssns.length,
    };
    const midtermScore = midtermScaled;

    // 4. คำนวณช่องคะแนน "หลังกลางภาค"
    let postMidtermTotal = 0;
    for (const b of plan.postMidterm.buckets) {
      const assnsInBucket = assignments.filter(
        (a) => a.targetCategory === 'postMidterm' && a.targetBucketId === b.id
      );
      const totalRawMax = assnsInBucket.reduce((sum, a) => sum + (a.maxScore || 0), 0);
      const studentRawSum = assnsInBucket.reduce((sum, a) => {
        return sum + (assignmentScores[a.id]?.rawScore || 0);
      }, 0);

      const scaledScore =
        totalRawMax > 0
          ? Math.round((studentRawSum / totalRawMax) * b.maxScore)
          : 0;

      bucketScores[b.id] = {
        bucketId: b.id,
        bucketName: b.name,
        category: 'postMidterm',
        targetWeight: b.maxScore,
        totalRawMax,
        studentRawSum,
        scaledScore,
        assignmentCount: assnsInBucket.length,
      };

      postMidtermTotal += scaledScore;
    }

    // 5. คำนวณช่องคะแนน "ปลายภาค" (ช่องเดียว)
    const finalAssns = assignments.filter((a) => a.targetCategory === 'final');
    const finalRawMax = finalAssns.reduce((sum, a) => sum + (a.maxScore || 0), 0);
    const finalRawSum = finalAssns.reduce((sum, a) => {
      return sum + (assignmentScores[a.id]?.rawScore || 0);
    }, 0);
    const finalScaled =
      finalRawMax > 0
        ? Math.round((finalRawSum / finalRawMax) * plan.final.maxScore)
        : 0;

    bucketScores['final'] = {
      bucketId: 'final',
      bucketName: 'สอบปลายภาค',
      category: 'final',
      targetWeight: plan.final.maxScore,
      totalRawMax: finalRawMax,
      studentRawSum: finalRawSum,
      scaledScore: finalScaled,
      assignmentCount: finalAssns.length,
    };
    const finalScore = finalScaled;

    // 6. คะแนนรวม 100 คะแนน (จำนวนเต็ม)
    const totalScore = Math.round(preMidtermTotal + midtermScore + postMidtermTotal + finalScore);
    const { gradePoint, gradeText } = calculateGradePoint(totalScore);

    return {
      student,
      assignmentScores,
      bucketScores,
      preMidtermTotal: Math.round(preMidtermTotal),
      midtermScore: Math.round(midtermScore),
      postMidtermTotal: Math.round(postMidtermTotal),
      finalScore: Math.round(finalScore),
      totalScore,
      gradePoint,
      gradeText,
    };
  });
}

/**
 * สร้างรายการงานของนักเรียนพร้อมสถานะสำหรับการแสดงผลในมุมมองนักเรียน
 */
export function getStudentAssignmentsView(
  studentId: string,
  assignments: Assignment[],
  submissions: Submission[]
): StudentAssignmentItem[] {
  return assignments.map((assignment) => {
    const submission = findStudentSubmission(studentId, assignment.id, submissions);
    const studentStatus = getStudentAssignmentStatus(assignment, submission);

    let myScore: number | undefined;
    let myFeedback: string | undefined;

    if (submission && submission.status === 'graded') {
      const scoreObj = submission.studentScores?.[studentId] || submission.studentScores?.[submission.submitterStudentId];
      if (scoreObj) {
        myScore = scoreObj.score;
        myFeedback = scoreObj.feedback || submission.generalFeedback;
      }
    }

    return {
      assignment,
      submission,
      studentStatus,
      myScore,
      myFeedback,
      isLateSubmission: submission?.isLate,
    };
  });
}
