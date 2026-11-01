import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const assignment = db.getAssignment(params.id);
    if (!assignment) {
      return NextResponse.json({ success: false, message: 'ไม่พบงานที่ระบุ' }, { status: 404 });
    }
    const classroom = db.getClassroom(assignment.classroomId);
    return NextResponse.json({ success: true, assignment, classroom });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = db.updateAssignment(params.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'ไม่พบงานที่ต้องการแก้ไข' }, { status: 404 });
    }
    return NextResponse.json({ success: true, assignment: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const success = db.deleteAssignment(params.id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
