import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { studentId } = await request.json();
    const cleanId = String(studentId || '').trim();

    if (!cleanId) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกรหัสประจำตัวนักเรียน 5 หลัก' },
        { status: 400 }
      );
    }

    const students = db.getStudentByStudentId(cleanId);
    if (!students || students.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `ไม่พบข้อมูลนักเรียนรหัส ${cleanId} ในระบบ กรุณาตรวจสอบรหัสหรือติดต่อครูผู้สอน`,
        },
        { status: 404 }
      );
    }

    // ดึงห้องเรียนทั้งหมดที่นักเรียนคนนี้มีรายชื่ออยู่
    const allClassrooms = db.getClassrooms();
    const enrolledClassrooms = allClassrooms.filter((c) =>
      students.some((s) => s.classroomId === c.id)
    );

    return NextResponse.json({
      success: true,
      studentId: cleanId,
      studentProfile: students[0],
      enrolledClassrooms,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
