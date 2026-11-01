import { NextResponse } from 'next/server';
import { db, DEFAULT_SCORE_PLAN } from '@/lib/db';

export async function GET() {
  try {
    const classrooms = db.getClassrooms();
    return NextResponse.json({ success: true, classrooms });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, courseCode, gradeLevel, roomLocation, scheduleTime, scorePlan } = body;

    // ส่วนบังคับ: ชื่อชั้นเรียน, รหัสวิชา, ชั้น
    if (!name || !courseCode || !gradeLevel) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกข้อมูลบังคับ: ชื่อชั้นเรียน, รหัสวิชา และระดับชั้น' },
        { status: 400 }
      );
    }

    const created = db.createClassroom({
      name,
      courseCode,
      gradeLevel,
      roomLocation: roomLocation || '',
      scheduleTime: scheduleTime || '',
      scorePlan: scorePlan || DEFAULT_SCORE_PLAN,
    });

    return NextResponse.json({ success: true, classroom: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
