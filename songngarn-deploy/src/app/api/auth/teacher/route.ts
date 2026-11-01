import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { teacherId, password } = await request.json();
    const currentTeacher = db.getTeacher();

    // รหัสประจำตัวครูปารเมศคือ 12004
    if (teacherId === currentTeacher.id || teacherId === '12004') {
      return NextResponse.json({
        success: true,
        user: currentTeacher,
      });
    }

    return NextResponse.json(
      { success: false, message: 'รหัสประจำตัวครูไม่ถูกต้อง (สำหรับทดสอบใช้: 12004)' },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
