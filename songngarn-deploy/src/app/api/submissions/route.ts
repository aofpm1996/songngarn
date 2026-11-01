import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SubmissionGroupMember } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId') || undefined;
    const classroomId = searchParams.get('classroomId') || undefined;

    const submissions = db.getSubmissions(assignmentId, classroomId);
    return NextResponse.json({ success: true, submissions });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      assignmentId,
      classroomId,
      submitterStudentId,
      isGroup,
      groupMemberStudentIds, // string[]
      attachments,
      studentComment,
    } = body;

    if (!assignmentId || !classroomId || !submitterStudentId) {
      return NextResponse.json(
        { success: false, message: 'ข้อมูลไม่ครบถ้วน กรุณาระบุงานและรหัสประจำตัวผู้ส่ง' },
        { status: 400 }
      );
    }

    const assignment = db.getAssignment(assignmentId);
    if (!assignment) {
      return NextResponse.json({ success: false, message: 'ไม่พบงานที่ระบุ' }, { status: 404 });
    }

    // ตรวจสอบว่าครูปิดรับงานแล้วหรือไม่
    if (!assignment.isOpen) {
      return NextResponse.json(
        { success: false, message: 'งานนี้ปิดรับการส่งแล้ว ไม่สามารถส่งงานได้' },
        { status: 403 }
      );
    }

    // ดึงข้อมูลนักเรียนทั้งหมดในห้องเพื่อตรวจสอบชื่อและเลขที่
    const classroomStudents = db.getStudents(classroomId);
    const submitter = classroomStudents.find((s) => s.studentId === submitterStudentId.trim());

    if (!submitter) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบข้อมูลนักเรียนผู้ส่งในห้องเรียนนี้' },
        { status: 404 }
      );
    }

    // จัดการสมาชิกกลุ่ม
    const validGroupMembers: SubmissionGroupMember[] = [
      {
        studentId: submitter.studentId,
        fullName: submitter.fullName,
        rollNumber: submitter.rollNumber,
      },
    ];

    if (isGroup && Array.isArray(groupMemberStudentIds)) {
      for (const mId of groupMemberStudentIds) {
        const cleanMId = String(mId).trim();
        if (cleanMId && cleanMId !== submitter.studentId) {
          const matchedStudent = classroomStudents.find((s) => s.studentId === cleanMId);
          if (matchedStudent) {
            // ป้องกันสมาชิกซ้ำ
            if (!validGroupMembers.some((g) => g.studentId === matchedStudent.studentId)) {
              validGroupMembers.push({
                studentId: matchedStudent.studentId,
                fullName: matchedStudent.fullName,
                rollNumber: matchedStudent.rollNumber,
              });
            }
          }
        }
      }
    }

    // ตรวจสอบความล่าช้า
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const isLate = now > dueDate;

    const saved = db.saveSubmission({
      assignmentId,
      classroomId,
      submitterStudentId: submitter.studentId,
      submitterName: submitter.fullName,
      isGroup: Boolean(isGroup),
      groupMembers: validGroupMembers,
      attachments: attachments || [],
      studentComment: studentComment || '',
      submittedAt: now.toISOString(),
      isLate,
    });

    return NextResponse.json({
      success: true,
      submission: saved,
      message: isLate ? 'ส่งงานสำเร็จ (ส่งล่าช้า)' : 'ส่งงานสำเร็จตามกำหนดเรียบร้อย',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
