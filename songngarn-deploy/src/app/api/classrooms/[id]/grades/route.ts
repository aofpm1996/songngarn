import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateClassroomGradeSummary } from '@/lib/grade-calculator';
import { generateGradebookExcel } from '@/lib/excel-helper';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const classroom = db.getClassroom(params.id);
    if (!classroom) {
      return NextResponse.json({ success: false, message: 'ไม่พบห้องเรียน' }, { status: 404 });
    }

    const students = db.getStudents(params.id);
    const assignments = db.getAssignments(params.id);
    const submissions = db.getSubmissions(undefined, params.id);

    const gradeSummary = calculateClassroomGradeSummary(
      classroom,
      students,
      assignments,
      submissions
    );

    return NextResponse.json({
      success: true,
      classroom,
      students,
      assignments,
      gradeSummary,
    });
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

    const students = db.getStudents(params.id);
    const assignments = db.getAssignments(params.id);
    const submissions = db.getSubmissions(undefined, params.id);

    const gradeSummary = calculateClassroomGradeSummary(
      classroom,
      students,
      assignments,
      submissions
    );

    const excelBytes = generateGradebookExcel(classroom, gradeSummary, assignments);
    const safeFilename = encodeURIComponent(
      `คะแนน_${classroom.courseCode}_${classroom.gradeLevel}.xlsx`
    );

    return new NextResponse(Buffer.from(excelBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
