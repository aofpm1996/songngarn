import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseStudentRoster } from '@/lib/excel-helper';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const students = db.getStudents(params.id);
    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const classroom = db.getClassroom(params.id);
    if (!classroom) {
      return NextResponse.json({ success: false, message: 'ไม่พบห้องเรียน' }, { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';

    // กรณีเป็น FormData (อัปโหลดไฟล์ Excel / CSV)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, message: 'ไม่พบไฟล์ที่อัปโหลด' }, { status: 400 });
      }

      const buffer = await file.arrayBuffer();
      const parsed = parseStudentRoster(buffer, file.name);

      if (parsed.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'ไม่พบข้อมูลนักเรียนในไฟล์ กรุณาตรวจสอบหัวคอลัมน์: ชั้น, เลขที่, เลขประจำตัว, ชื่อสกุล',
          },
          { status: 400 }
        );
      }

      const formatted = parsed.map((item) => ({
        studentId: item.studentId,
        classroomId: params.id,
        classRoomName: item.classRoomName || classroom.gradeLevel,
        rollNumber: item.rollNumber,
        fullName: item.fullName,
      }));

      const saved = db.addOrReplaceStudents(params.id, formatted);
      return NextResponse.json({
        success: true,
        count: saved.length,
        students: saved,
        message: `นำเข้ารายชื่อนักเรียนสำเร็จ ${saved.length} คน`,
      });
    }

    // กรณีเป็น JSON (เพิ่มนักเรียนทีละคน หรือดึงจากคลาสอื่น หรือรายการ JSON)
    const body = await request.json();

    // ดึงรายชื่อนักเรียนจากคลาสอื่น (Copy from another classroom)
    if (body.sourceClassroomId) {
      const sourceClassroom = db.getClassroom(body.sourceClassroomId);
      const sourceStudents = db.getStudents(body.sourceClassroomId);
      if (!sourceStudents || sourceStudents.length === 0) {
        return NextResponse.json(
          { success: false, message: 'ห้องเรียนต้นทางไม่มีรายชื่อนักเรียน' },
          { status: 400 }
        );
      }

      const formatted = sourceStudents.map((item) => ({
        studentId: item.studentId,
        classroomId: params.id,
        classRoomName: classroom.gradeLevel || item.classRoomName,
        rollNumber: item.rollNumber,
        fullName: item.fullName,
      }));

      const saved = db.addOrReplaceStudents(params.id, formatted);
      return NextResponse.json({
        success: true,
        count: saved.length,
        students: saved,
        message: `คัดลอกรายชื่อนักเรียน ${saved.length} คน จากห้อง "${sourceClassroom?.courseCode || ''} ${sourceClassroom?.name || ''}" (${sourceClassroom?.gradeLevel || ''}) เรียบร้อยแล้ว`,
      });
    }

    if (Array.isArray(body.students)) {
      const formatted = body.students.map((item: any) => ({
        studentId: String(item.studentId).padStart(5, '0').slice(-5),
        classroomId: params.id,
        classRoomName: item.classRoomName || classroom.gradeLevel,
        rollNumber: Number(item.rollNumber),
        fullName: item.fullName,
      }));
      const saved = db.addOrReplaceStudents(params.id, formatted);
      return NextResponse.json({ success: true, count: saved.length, students: saved });
    }

    // เพิ่มคนเดียว
    const { studentId, rollNumber, fullName, classRoomName } = body;
    if (!studentId || !fullName) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกรหัสประจำตัวและชื่อ-สกุล' },
        { status: 400 }
      );
    }

    const newStudent = db.addSingleStudent(params.id, {
      studentId: String(studentId).padStart(5, '0').slice(-5),
      classroomId: params.id,
      classRoomName: classRoomName || classroom.gradeLevel,
      rollNumber: Number(rollNumber) || 1,
      fullName,
    });

    return NextResponse.json({ success: true, student: newStudent });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const studentDbId = searchParams.get('id');

    if (!studentDbId) {
      return NextResponse.json({ success: false, message: 'ไม่ระบุ ID นักเรียน' }, { status: 400 });
    }

    const success = db.deleteStudent(studentDbId);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
