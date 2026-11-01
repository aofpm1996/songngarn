/**
 * =========================================================================
 * songngarn (ส่งงาน) - Google Apps Script Backend API
 * โรงเรียนพัฒนานิคม • กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี
 * ครูผู้สอน: นายปารเมศ มหิเมือง (รหัส 12004)
 * =========================================================================
 * 
 * วิธีการติดตั้ง:
 * 1. สร้าง Google Sheet ใหม่ ตั้งชื่อว่า "songngarn_database"
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
 * 3. ลบโค้ดเดิมทั้งหมดออก แล้วนำโค้ดในไฟล์นี้ไปวางแทนที่
 * 4. กดปุ่ม "การทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New Deployment)
 * 5. เลือกประเภท: "เว็บแอป" (Web App)
 * 6. ตั้งค่า:
 *    - คำอธิบาย: songngarn API v1.0
 *    - ดำเนินการในฐานะ (Execute as): "ฉัน" (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): "ทุกคน" (Anyone) **สำคัญมาก**
 * 7. กด "ทำให้ใช้งานได้" (Deploy) แล้วคัดลอก "URL เว็บแอป" นำไปใส่ในเว็บ songngarn
 * =========================================================================
 */

// ชื่อชีตหลัก
const SHEETS = {
  CLASSROOMS: 'Classrooms',
  STUDENTS: 'Students',
  ASSIGNMENTS: 'Assignments',
  SUBMISSIONS: 'Submissions',
};

// ชื่อโฟลเดอร์หลักใน Google Drive สำหรับเก็บไฟล์งานนักเรียน
const ROOT_DRIVE_FOLDER_NAME = 'songngarn_uploads';

/**
 * จัดการ HTTP GET Request
 */
function doGet(e) {
  try {
    const action = e?.parameter?.action || 'PING';
    ensureSheetsInitialized();

    if (action === 'PING') {
      return jsonResponse({
        success: true,
        message: 'songngarn Google Apps Script Backend ทำงานปกติ!',
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'GET_ALL') {
      const classrooms = getSheetData(SHEETS.CLASSROOMS);
      const students = getSheetData(SHEETS.STUDENTS);
      const assignments = getSheetData(SHEETS.ASSIGNMENTS);
      const submissions = getSheetData(SHEETS.SUBMISSIONS);

      return jsonResponse({
        success: true,
        data: {
          classrooms: classrooms.map(formatClassroomFromRow),
          students: students.map(formatStudentFromRow),
          assignments: assignments.map(formatAssignmentFromRow),
          submissions: submissions.map(formatSubmissionFromRow),
        },
      });
    }

    return jsonResponse({ success: false, message: 'ไม่พบ action ที่ระบุ' });
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

/**
 * จัดการ HTTP POST Request
 */
function doPost(e) {
  try {
    ensureSheetsInitialized();
    let body = {};
    if (e?.postData?.contents) {
      body = JSON.parse(e.postData.contents);
    }

    const action = body.action || '';

    // 1. จัดการห้องเรียน (Classrooms)
    if (action === 'SAVE_CLASSROOM') {
      const cls = body.data;
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEETS.CLASSROOMS);
      sheet.appendRow([
        cls.id,
        cls.name,
        cls.courseCode,
        cls.gradeLevel,
        cls.roomLocation || '',
        cls.scheduleTime || '',
        cls.teacherId || '12004',
        cls.teacherName || 'นายปารเมศ มหิเมือง',
        JSON.stringify(cls.scorePlan || {}),
        cls.createdAt || new Date().toISOString(),
      ]);
      return jsonResponse({ success: true, classroom: cls });
    }

    if (action === 'UPDATE_CLASSROOM') {
      const { id, updates } = body;
      updateRowById(SHEETS.CLASSROOMS, id, (row) => {
        if (updates.name !== undefined) row[1] = updates.name;
        if (updates.courseCode !== undefined) row[2] = updates.courseCode;
        if (updates.gradeLevel !== undefined) row[3] = updates.gradeLevel;
        if (updates.roomLocation !== undefined) row[4] = updates.roomLocation;
        if (updates.scheduleTime !== undefined) row[5] = updates.scheduleTime;
        if (updates.scorePlan !== undefined) row[8] = JSON.stringify(updates.scorePlan);
        return row;
      });
      return jsonResponse({ success: true });
    }

    if (action === 'DELETE_CLASSROOM') {
      const { id } = body;
      deleteRowsByColumnValue(SHEETS.CLASSROOMS, 0, id);
      deleteRowsByColumnValue(SHEETS.STUDENTS, 2, id);
      deleteRowsByColumnValue(SHEETS.ASSIGNMENTS, 1, id);
      deleteRowsByColumnValue(SHEETS.SUBMISSIONS, 2, id);
      return jsonResponse({ success: true });
    }

    // 2. จัดการนักเรียน (Students)
    if (action === 'SAVE_STUDENTS') {
      const { classroomId, students } = body;
      // ลบนักเรียนเดิมของห้องนี้ออกก่อน
      deleteRowsByColumnValue(SHEETS.STUDENTS, 2, classroomId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEETS.STUDENTS);
      const rows = students.map((s) => [
        s.id,
        s.studentId,
        classroomId,
        s.classRoomName,
        s.rollNumber,
        s.fullName,
        s.createdAt || new Date().toISOString(),
      ]);
      if (rows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      }
      return jsonResponse({ success: true, count: rows.length });
    }

    if (action === 'ADD_STUDENT') {
      const s = body.data;
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEETS.STUDENTS);
      sheet.appendRow([
        s.id,
        s.studentId,
        s.classroomId,
        s.classRoomName,
        s.rollNumber,
        s.fullName,
        s.createdAt || new Date().toISOString(),
      ]);
      return jsonResponse({ success: true, student: s });
    }

    if (action === 'DELETE_STUDENT') {
      const { id } = body;
      deleteRowsByColumnValue(SHEETS.STUDENTS, 0, id);
      return jsonResponse({ success: true });
    }

    // 3. จัดการงาน (Assignments)
    if (action === 'SAVE_ASSIGNMENT') {
      const a = body.data;
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEETS.ASSIGNMENTS);
      sheet.appendRow([
        a.id,
        a.classroomId,
        a.title,
        a.description || '',
        a.maxScore,
        a.dueDate,
        a.isOpen ? 'TRUE' : 'FALSE',
        a.isGroup ? 'TRUE' : 'FALSE',
        a.targetCategory,
        a.targetBucketId,
        a.targetBucketName,
        a.bucketWeight,
        JSON.stringify(a.attachments || []),
        a.createdAt || new Date().toISOString(),
      ]);
      return jsonResponse({ success: true, assignment: a });
    }

    if (action === 'UPDATE_ASSIGNMENT') {
      const { id, updates } = body;
      updateRowById(SHEETS.ASSIGNMENTS, id, (row) => {
        if (updates.title !== undefined) row[2] = updates.title;
        if (updates.description !== undefined) row[3] = updates.description;
        if (updates.maxScore !== undefined) row[4] = updates.maxScore;
        if (updates.dueDate !== undefined) row[5] = updates.dueDate;
        if (updates.isOpen !== undefined) row[6] = updates.isOpen ? 'TRUE' : 'FALSE';
        if (updates.isGroup !== undefined) row[7] = updates.isGroup ? 'TRUE' : 'FALSE';
        if (updates.attachments !== undefined) row[12] = JSON.stringify(updates.attachments);
        return row;
      });
      return jsonResponse({ success: true });
    }

    if (action === 'DELETE_ASSIGNMENT') {
      const { id } = body;
      deleteRowsByColumnValue(SHEETS.ASSIGNMENTS, 0, id);
      deleteRowsByColumnValue(SHEETS.SUBMISSIONS, 1, id);
      return jsonResponse({ success: true });
    }

    // 4. การส่งงาน (Submissions)
    if (action === 'SAVE_SUBMISSION') {
      const sub = body.data;
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEETS.SUBMISSIONS);

      // ตรวจสอบว่าเคยส่งไปแล้วหรือไม่ ถ้าเคยส่งให้อัปเดตแถวเดิม
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === sub.id || (data[i][1] === sub.assignmentId && data[i][3] === sub.submitterStudentId)) {
          rowIndex = i + 1;
          break;
        }
      }

      const rowValues = [
        sub.id,
        sub.assignmentId,
        sub.classroomId,
        sub.submitterStudentId,
        sub.submitterName,
        sub.isGroup ? 'TRUE' : 'FALSE',
        JSON.stringify(sub.groupMembers || []),
        JSON.stringify(sub.attachments || []),
        sub.studentComment || '',
        sub.submittedAt || new Date().toISOString(),
        sub.isLate ? 'TRUE' : 'FALSE',
        sub.status || 'submitted',
        JSON.stringify(sub.studentScores || {}),
        sub.generalFeedback || '',
        sub.gradedAt || '',
        sub.gradedBy || '',
      ];

      if (rowIndex > -1) {
        sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }
      return jsonResponse({ success: true, submission: sub });
    }

    if (action === 'GRADE_SUBMISSION') {
      const { id, studentScores, generalFeedback, gradedBy } = body;
      const now = new Date().toISOString();
      updateRowById(SHEETS.SUBMISSIONS, id, (row) => {
        row[11] = 'graded'; // status
        row[12] = JSON.stringify(studentScores);
        row[13] = generalFeedback || row[13];
        row[14] = now;
        row[15] = gradedBy || 'นายปารเมศ มหิเมือง';
        return row;
      });
      return jsonResponse({ success: true });
    }

    // 5. อัปโหลดไฟล์ไปยัง Google Drive
    if (action === 'UPLOAD_FILE') {
      const { base64Data, fileName, mimeType, classroomName, assignmentTitle } = body;
      if (!base64Data || !fileName) {
        return jsonResponse({ success: false, message: 'ไม่มีข้อมูลไฟล์' });
      }

      const folder = getOrCreateUploadFolder(classroomName, assignmentTitle);
      const decodedBytes = Utilities.base64Decode(base64Data.split(',')[1] || base64Data);
      const blob = Utilities.newBlob(decodedBytes, mimeType || 'application/octet-stream', fileName);
      const file = folder.createFile(blob);

      // กำหนดสิทธิ์ให้ทุกคนที่มีลิงก์สามารถดูได้
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const fileUrl = file.getUrl();
      const downloadUrl = `https://drive.google.com/uc?export=view&id=${file.getId()}`;

      return jsonResponse({
        success: true,
        file: {
          name: fileName,
          url: downloadUrl,
          previewUrl: fileUrl,
          id: file.getId(),
          type: mimeType?.includes('image') ? 'image' : mimeType?.includes('pdf') ? 'pdf' : 'link',
        },
      });
    }

    return jsonResponse({ success: false, message: 'ไม่พบ action POST ที่ระบุ' });
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

/**
 * ฟังก์ชันสร้างโฟลเดอร์แยกวิชาและงานใน Google Drive อย่างเป็นระเบียบ
 */
function getOrCreateUploadFolder(classroomName, assignmentTitle) {
  const rootFolders = DriveApp.getFoldersByName(ROOT_DRIVE_FOLDER_NAME);
  let rootFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(ROOT_DRIVE_FOLDER_NAME);

  if (!classroomName) return rootFolder;

  // โฟลเดอร์ห้องเรียน
  const cleanClsName = classroomName.replace(/[\/\\:*?"<>|]/g, '_');
  const clsFolders = rootFolder.getFoldersByName(cleanClsName);
  let clsFolder = clsFolders.hasNext() ? clsFolders.next() : rootFolder.createFolder(cleanClsName);

  if (!assignmentTitle) return clsFolder;

  // โฟลเดอร์งาน
  const cleanAssnTitle = assignmentTitle.replace(/[\/\\:*?"<>|]/g, '_');
  const assnFolders = clsFolder.getFoldersByName(cleanAssnTitle);
  return assnFolders.hasNext() ? assnFolders.next() : clsFolder.createFolder(cleanAssnTitle);
}

/**
 * สร้างชีตและหัวตารางเริ่มต้นหากยังไม่มี
 */
function ensureSheetsInitialized() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const schema = [
    {
      name: SHEETS.CLASSROOMS,
      headers: ['id', 'name', 'courseCode', 'gradeLevel', 'roomLocation', 'scheduleTime', 'teacherId', 'teacherName', 'scorePlanJson', 'createdAt'],
    },
    {
      name: SHEETS.STUDENTS,
      headers: ['id', 'studentId', 'classroomId', 'classRoomName', 'rollNumber', 'fullName', 'createdAt'],
    },
    {
      name: SHEETS.ASSIGNMENTS,
      headers: ['id', 'classroomId', 'title', 'description', 'maxScore', 'dueDate', 'isOpen', 'isGroup', 'targetCategory', 'targetBucketId', 'targetBucketName', 'bucketWeight', 'attachmentsJson', 'createdAt'],
    },
    {
      name: SHEETS.SUBMISSIONS,
      headers: ['id', 'assignmentId', 'classroomId', 'submitterStudentId', 'submitterName', 'isGroup', 'groupMembersJson', 'attachmentsJson', 'studentComment', 'submittedAt', 'isLate', 'status', 'studentScoresJson', 'generalFeedback', 'gradedAt', 'gradedBy'],
    },
  ];

  schema.forEach((item) => {
    let sheet = ss.getSheetByName(item.name);
    if (!sheet) {
      sheet = ss.insertSheet(item.name);
      sheet.appendRow(item.headers);
      sheet.getRange(1, 1, 1, item.headers.length)
        .setBackground('#0284c7')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  });
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1); // ข้ามแถว header
}

function updateRowById(sheetName, id, updater) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      const updatedRow = updater(data[i]);
      sheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
      break;
    }
  }
}

function deleteRowsByColumnValue(sheetName, colIndex, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][colIndex]) === String(value)) {
      sheet.deleteRow(i + 1);
    }
  }
}

// Data formatters
function formatClassroomFromRow(row) {
  let scorePlan = {};
  try { scorePlan = JSON.parse(row[8] || '{}'); } catch (e) {}
  return {
    id: String(row[0]),
    name: String(row[1]),
    courseCode: String(row[2]),
    gradeLevel: String(row[3]),
    roomLocation: String(row[4] || ''),
    scheduleTime: String(row[5] || ''),
    teacherId: String(row[6] || '12004'),
    teacherName: String(row[7] || 'นายปารเมศ มหิเมือง'),
    scorePlan: scorePlan,
    createdAt: String(row[9] || new Date().toISOString()),
  };
}

function formatStudentFromRow(row) {
  return {
    id: String(row[0]),
    studentId: String(row[1]),
    classroomId: String(row[2]),
    classRoomName: String(row[3] || ''),
    rollNumber: Number(row[4]) || 1,
    fullName: String(row[5] || ''),
    createdAt: String(row[6] || new Date().toISOString()),
  };
}

function formatAssignmentFromRow(row) {
  let attachments = [];
  try { attachments = JSON.parse(row[12] || '[]'); } catch (e) {}
  return {
    id: String(row[0]),
    classroomId: String(row[1]),
    title: String(row[2]),
    description: String(row[3] || ''),
    maxScore: Number(row[4]) || 0,
    dueDate: String(row[5]),
    isOpen: String(row[6]).toUpperCase() === 'TRUE',
    isGroup: String(row[7]).toUpperCase() === 'TRUE',
    targetCategory: String(row[8]),
    targetBucketId: String(row[9]),
    targetBucketName: String(row[10]),
    bucketWeight: Number(row[11]) || 0,
    attachments: attachments,
    createdAt: String(row[13] || new Date().toISOString()),
  };
}

function formatSubmissionFromRow(row) {
  let groupMembers = [];
  let attachments = [];
  let studentScores = {};
  try { groupMembers = JSON.parse(row[6] || '[]'); } catch (e) {}
  try { attachments = JSON.parse(row[7] || '[]'); } catch (e) {}
  try { studentScores = JSON.parse(row[12] || '{}'); } catch (e) {}

  return {
    id: String(row[0]),
    assignmentId: String(row[1]),
    classroomId: String(row[2]),
    submitterStudentId: String(row[3]),
    submitterName: String(row[4]),
    isGroup: String(row[5]).toUpperCase() === 'TRUE',
    groupMembers: groupMembers,
    attachments: attachments,
    studentComment: String(row[8] || ''),
    submittedAt: String(row[9] || new Date().toISOString()),
    isLate: String(row[10]).toUpperCase() === 'TRUE',
    status: String(row[11]) || 'submitted',
    studentScores: studentScores,
    generalFeedback: String(row[13] || ''),
    gradedAt: String(row[14] || ''),
    gradedBy: String(row[15] || ''),
  };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
