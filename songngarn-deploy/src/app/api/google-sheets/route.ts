import { NextResponse } from 'next/server';
import { sheetsApi } from '@/lib/sheets-api';
import { db } from '@/lib/db';

export async function GET() {
  const isEnabled = sheetsApi.isEnabled();
  const rawUrl = sheetsApi.getUrl();
  const maskedUrl = rawUrl
    ? `${rawUrl.slice(0, 30)}...${rawUrl.slice(-10)}`
    : '';

  let pingResult = { success: false, message: 'ไม่ได้เปิดใช้งาน' };
  if (isEnabled) {
    pingResult = await sheetsApi.ping();
  }

  return NextResponse.json({
    isEnabled,
    maskedUrl,
    pingResult,
  });
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === 'PING') {
      const pingResult = await sheetsApi.ping();
      return NextResponse.json(pingResult);
    }

    if (action === 'PULL_FROM_SHEETS') {
      if (!sheetsApi.isEnabled()) {
        return NextResponse.json(
          { success: false, message: 'ยังไม่ได้ตั้งค่า GOOGLE_SCRIPT_URL' },
          { status: 400 }
        );
      }

      const allData = await sheetsApi.getAllData();
      if (!allData) {
        return NextResponse.json(
          { success: false, message: 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้' },
          { status: 500 }
        );
      }

      // นำข้อมูลที่ดึงได้มาบันทึกอัปเดตลงใน db.json
      db.syncFromGoogleSheets(allData);

      return NextResponse.json({
        success: true,
        message: 'ดึงข้อมูลจาก Google Sheets สำเร็จเรียบร้อย',
        data: allData,
      });
    }

    return NextResponse.json({ success: false, message: 'Action ไม่ถูกต้อง' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
