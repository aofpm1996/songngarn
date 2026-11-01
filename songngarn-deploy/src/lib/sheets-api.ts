/**
 * Client for Google Apps Script Web App (Google Sheets & Google Drive Backend)
 */

export interface GoogleDriveUploadedFile {
  name: string;
  url: string;
  previewUrl: string;
  id: string;
  type: 'image' | 'pdf' | 'link';
}

function getScriptUrl(): string {
  return (
    process.env.GOOGLE_SCRIPT_URL ||
    process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL ||
    ''
  ).trim();
}

export const sheetsApi = {
  isEnabled(): boolean {
    const url = getScriptUrl();
    return Boolean(url && url.startsWith('http'));
  },

  getUrl(): string {
    return getScriptUrl();
  },

  /**
   * ทดสอบการเชื่อมต่อไปยัง Google Apps Script Web App
   */
  async ping(): Promise<{ success: boolean; message: string }> {
    const url = getScriptUrl();
    if (!url) return { success: false, message: 'ยังไม่ได้ตั้งค่า GOOGLE_SCRIPT_URL' };

    try {
      const res = await fetch(`${url}?action=PING`, {
        method: 'GET',
        redirect: 'follow',
      });
      const data = await res.json();
      return { success: data.success ?? true, message: data.message || 'เชื่อมต่อสำเร็จ' };
    } catch (err: any) {
      return { success: false, message: `เชื่อมต่อไม่สำเร็จ: ${err.message}` };
    }
  },

  /**
   * ดึงข้อมูลทั้งหมดจาก Google Sheets ในรอบเดียว (Classrooms, Students, Assignments, Submissions)
   */
  async getAllData(): Promise<{
    classrooms: any[];
    students: any[];
    assignments: any[];
    submissions: any[];
  } | null> {
    const url = getScriptUrl();
    if (!url) return null;

    try {
      const res = await fetch(`${url}?action=GET_ALL`, {
        method: 'GET',
        redirect: 'follow',
      });
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch data from Google Sheets:', err);
      return null;
    }
  },

  /**
   * ส่งคำสั่ง POST ไปยัง Google Apps Script
   */
  async postAction(action: string, payload: any): Promise<any> {
    const url = getScriptUrl();
    if (!url) return null;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // GAS Web App รับ text/plain เพื่อเลี่ยง CORS preflight
        },
        body: JSON.stringify({ action, ...payload }),
        redirect: 'follow',
      });
      return await res.json();
    } catch (err) {
      console.error(`Failed to execute GAS action ${action}:`, err);
      return null;
    }
  },

  /**
   * อัปโหลดไฟล์ Base64 ไปยัง Google Drive ของครูโดยตรง
   */
  async uploadFileToDrive(params: {
    base64Data: string;
    fileName: string;
    mimeType: string;
    classroomName?: string;
    assignmentTitle?: string;
  }): Promise<GoogleDriveUploadedFile | null> {
    const res = await this.postAction('UPLOAD_FILE', params);
    if (res && res.success && res.file) {
      return res.file;
    }
    return null;
  },
};
