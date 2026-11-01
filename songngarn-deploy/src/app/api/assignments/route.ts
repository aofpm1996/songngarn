import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId') || undefined;
    const assignments = db.getAssignments(classroomId);
    return NextResponse.json({ success: true, assignments });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      classroomId,
      title,
      description,
      maxScore,
      dueDate,
      isOpen,
      isGroup,
      targetCategory,
      targetBucketId,
      targetBucketName,
      bucketWeight,
      attachments,
    } = body;

    if (!classroomId || !title || maxScore === undefined || !dueDate) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกข้อมูลบังคับ: ชื่องาน, คะแนนเต็ม และกำหนดส่ง' },
        { status: 400 }
      );
    }

    const newAssignment = db.createAssignment({
      classroomId,
      title,
      description: description || '',
      maxScore: Number(maxScore),
      dueDate,
      isOpen: isOpen ?? true,
      isGroup: Boolean(isGroup),
      targetCategory: targetCategory || 'preMidterm',
      targetBucketId: targetBucketId || 'pre_1',
      targetBucketName: targetBucketName || 'ช่องคะแนน',
      bucketWeight: Number(bucketWeight) || 10,
      attachments: attachments || [],
    });

    return NextResponse.json({ success: true, assignment: newAssignment });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
