import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const classroom = db.getClassroom(params.id);
    if (!classroom) {
      return NextResponse.json({ success: false, message: 'ไม่พบห้องเรียน' }, { status: 404 });
    }
    return NextResponse.json({ success: true, classroom });
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
    const updated = db.updateClassroom(params.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'ไม่พบห้องเรียน' }, { status: 404 });
    }
    return NextResponse.json({ success: true, classroom: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const success = db.deleteClassroom(params.id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
