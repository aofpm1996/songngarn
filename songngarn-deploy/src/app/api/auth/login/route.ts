import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    const cleanId = String(id || '').trim();

    if (!cleanId) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกรหัสประจำตัว' },
        { status: 400 }
      );
    }

    // 1. ตรวจสอบรหัสครูผู้สอน
    const teacher = db.getTeacher();
    if (cleanId === teacher.id) {
      return NextResponse.json({
        success: true,
        role: 'teacher',
        user: teacher,
      });
    }

    // 2. ตรวจสอบรหัสนักเรียน (5 หลัก หรือตามที่บันทึกในระบบ)
    const students = db.getStudentByStudentId(cleanId);
    if (students && students.length > 0) {
      const allClassrooms = db.getClassrooms();
      const enrolledClassrooms = allClassrooms.filter((c) =>
        students.some((s) => s.classroomId === c.id)
      );

      return NextResponse.json({
        success: true,
        role: 'student',
        studentId: cleanId,
        studentProfile: students[0],
        enrolledClassrooms,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: 'ไม่พบรหัสประจำตัวนี้ในระบบ กรุณาตรวจสอบอีกครั้ง',
      },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
