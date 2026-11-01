import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { studentScores, generalFeedback } = body;

    if (!studentScores || typeof studentScores !== 'object') {
      return NextResponse.json(
        { success: false, message: 'กรุณาระบุคะแนนที่ต้องการบันทึก' },
        { status: 400 }
      );
    }

    const updated = db.gradeSubmission(params.id, studentScores, generalFeedback);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'ไม่พบรายการส่งงาน' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      submission: updated,
      message: 'บันทึกคะแนนเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
