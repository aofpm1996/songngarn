import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { sheetsApi } from '@/lib/sheets-api';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const classroomName = (formData.get('classroomName') as string) || '';
    const assignmentTitle = (formData.get('assignmentTitle') as string) || '';

    if (!file) {
      return NextResponse.json({ success: false, message: 'ไม่พบไฟล์' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const fileType = isImage ? 'image' : isPdf ? 'pdf' : 'link';

    // 1. หากเปิดใช้งาน Google Sheets & Google Drive
    if (sheetsApi.isEnabled()) {
      try {
        const base64Data = buffer.toString('base64');
        const mimeType = file.type || (isPdf ? 'application/pdf' : 'image/jpeg');

        const driveFile = await sheetsApi.uploadFileToDrive({
          base64Data,
          fileName: file.name,
          mimeType,
          classroomName,
          assignmentTitle,
        });

        if (driveFile) {
          return NextResponse.json({
            success: true,
            storage: 'google_drive',
            file: {
              name: driveFile.name || file.name,
              url: driveFile.url,
              previewUrl: driveFile.previewUrl,
              type: fileType,
              size: file.size,
            },
          });
        }
      } catch (driveErr) {
        console.error('Google Drive upload failed, falling back to local:', driveErr);
      }
    }

    // 2. กรณี Local Storage (หรือเป็น Fallback)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.name) || '';
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, safeName);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      storage: 'local',
      file: {
        name: file.name,
        url: `/uploads/${safeName}`,
        type: fileType,
        size: file.size,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
