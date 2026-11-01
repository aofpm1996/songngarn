import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Classroom, Student, StudentGradeRow } from './types';

export interface ParsedStudentRow {
  classRoomName: string;
  rollNumber: number;
  studentId: string;
  fullName: string;
}

/**
 * วิเคราะห์ไฟล์ Excel (.xlsx, .xls) หรือ CSV จากการอัปโหลดของครู
 * หัวคอลัมน์ที่รองรับ: ชั้น, เลขที่, เลขประจำตัว, ชื่อสกุล
 */
export function parseStudentRoster(fileBuffer: ArrayBuffer, fileName: string): ParsedStudentRow[] {
  const isCsv = fileName.toLowerCase().endsWith('.csv');

  let rows: any[] = [];

  if (isCsv) {
    const decoder = new TextDecoder('utf-8');
    let text = decoder.decode(fileBuffer);
    // ตรวจสอบ BOM
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    rows = result.data as any[];
  } else {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  }

  const parsedStudents: ParsedStudentRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // ตรวจหาคีย์ที่ตรงกับคำว่า ชั้น, เลขที่, เลขประจำตัว, ชื่อสกุล
    let classVal = '';
    let rollVal = 0;
    let idVal = '';
    let nameVal = '';

    for (const key of Object.keys(row)) {
      const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '');
      const rawVal = String(row[key] ?? '').trim();

      if (cleanKey.includes('ชั้น') || cleanKey.includes('ห้อง') || cleanKey === 'class') {
        classVal = rawVal;
      } else if (cleanKey.includes('เลขที่') || cleanKey === 'no' || cleanKey === 'number') {
        rollVal = parseInt(rawVal, 10) || i + 1;
      } else if (
        cleanKey.includes('เลขประจำตัว') ||
        cleanKey.includes('รหัสนักเรียน') ||
        cleanKey.includes('รหัสประจำตัว') ||
        cleanKey === 'studentid' ||
        cleanKey === 'id'
      ) {
        idVal = rawVal.replace(/\D/g, ''); // เก็บเฉพาะตัวเลข
      } else if (
        cleanKey.includes('ชื่อสกุล') ||
        cleanKey.includes('ชื่อ-สกุล') ||
        cleanKey.includes('ชื่อ') ||
        cleanKey === 'name' ||
        cleanKey === 'fullname'
      ) {
        nameVal = rawVal;
      }
    }

    // หากไม่พบด้วย header ที่ชัดเจน แต่แถวมีข้อมูลครบ ให้เดาตามตำแหน่ง
    if (!idVal && !nameVal) {
      const values = Object.values(row).map((v) => String(v).trim());
      if (values.length >= 4) {
        classVal = classVal || values[0];
        rollVal = rollVal || parseInt(values[1], 10) || i + 1;
        idVal = idVal || values[2].replace(/\D/g, '');
        nameVal = nameVal || values[3];
      }
    }

    if (idVal && nameVal) {
      // ทำให้เลขประจำตัวเป็น 5 หลักอย่างสมบูรณ์
      const cleanStudentId = idVal.padStart(5, '0').slice(-5);
      parsedStudents.push({
        classRoomName: classVal || 'ม.4/1',
        rollNumber: rollVal || i + 1,
        studentId: cleanStudentId,
        fullName: nameVal,
      });
    }
  }

  // เรียงลำดับตามเลขที่
  return parsedStudents.sort((a, b) => a.rollNumber - b.rollNumber);
}

/**
 * สร้างไฟล์ Excel รายงานคะแนนและสัดส่วนคะแนนที่คำนวณแล้วสำหรับครู
 */
export function generateGradebookExcel(
  classroom: Classroom,
  gradeRows: StudentGradeRow[],
  assignments: any[]
): Uint8Array {
  const wb = XLSX.utils.book_new();

  // สร้างโครงสร้างข้อมูลตาราง
  const plan = classroom.scorePlan;

  // Header ข้อมูลวิชา
  const headerData = [
    [`รายงานผลคะแนนและการประเมินผล - โรงเรียนพัฒนานิคม`],
    [`วิชา: ${classroom.courseCode} ${classroom.name}  |  ชั้น: ${classroom.gradeLevel}`],
    [`ครูผู้สอน: ${classroom.teacherName}  |  วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}`],
    [], // แถวว่าง
  ];

  // หัวตาราง
  const tableHeaders: string[] = ['เลขที่', 'เลขประจำตัว', 'ชื่อ - สกุล'];

  // ช่องคะแนนตามสัดส่วน
  plan.preMidterm.buckets.forEach((b) => {
    tableHeaders.push(`ก่อนกลาง: ${b.name} (${b.maxScore} คะแนน)`);
  });
  tableHeaders.push(`รวมก่อนกลางภาค (${plan.preMidterm.totalScore} คะแนน)`);

  tableHeaders.push(`สอบกลางภาค (${plan.midterm.maxScore} คะแนน)`);

  plan.postMidterm.buckets.forEach((b) => {
    tableHeaders.push(`หลังกลาง: ${b.name} (${b.maxScore} คะแนน)`);
  });
  tableHeaders.push(`รวมหลังกลางภาค (${plan.postMidterm.totalScore} คะแนน)`);

  tableHeaders.push(`สอบปลายภาค (${plan.final.maxScore} คะแนน)`);
  tableHeaders.push(`คะแนนรวม (100)`);
  tableHeaders.push(`ระดับผลการเรียน (เกรด)`);

  const rowsData: any[][] = [...headerData, tableHeaders];

  gradeRows.forEach((row) => {
    const studentData: (string | number)[] = [
      row.student.rollNumber,
      row.student.studentId,
      row.student.fullName,
    ];

    // ก่อนกลางภาค แต่ละช่อง
    plan.preMidterm.buckets.forEach((b) => {
      const bScore = row.bucketScores[b.id]?.scaledScore ?? 0;
      studentData.push(bScore);
    });
    studentData.push(row.preMidtermTotal);

    // กลางภาค
    studentData.push(row.midtermScore);

    // หลังกลางภาค แต่ละช่อง
    plan.postMidterm.buckets.forEach((b) => {
      const bScore = row.bucketScores[b.id]?.scaledScore ?? 0;
      studentData.push(bScore);
    });
    studentData.push(row.postMidtermTotal);

    // ปลายภาค
    studentData.push(row.finalScore);

    // รวมและเกรด
    studentData.push(row.totalScore);
    studentData.push(row.gradeText);

    rowsData.push(studentData);
  });

  const ws = XLSX.utils.aoa_to_sheet(rowsData);

  // กำหนดความกว้างคอลัมน์
  ws['!cols'] = [
    { wch: 8 },  // เลขที่
    { wch: 14 }, // รหัส
    { wch: 28 }, // ชื่อ
    ...tableHeaders.slice(3).map(() => ({ wch: 22 })),
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'คะแนนรวมตามสัดส่วน');

  // Sheet ที่ 2: คะแนนดิบรายชิ้นงาน
  const rawHeaders = ['เลขที่', 'เลขประจำตัว', 'ชื่อ - สกุล'];
  assignments.forEach((a) => {
    rawHeaders.push(`${a.title} (เต็ม ${a.maxScore})`);
  });
  const rawRows: any[][] = [
    [`คะแนนดิบรายชิ้นงาน: ${classroom.courseCode} ${classroom.name}`],
    [],
    rawHeaders,
  ];

  gradeRows.forEach((row) => {
    const itemData: (string | number)[] = [
      row.student.rollNumber,
      row.student.studentId,
      row.student.fullName,
    ];
    assignments.forEach((a) => {
      const s = row.assignmentScores[a.id];
      itemData.push(s && s.isGraded ? s.rawScore : s?.isSubmitted ? 'รอตรวจ' : '-');
    });
    rawRows.push(itemData);
  });

  const rawWs = XLSX.utils.aoa_to_sheet(rawRows);
  rawWs['!cols'] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 28 },
    ...assignments.map(() => ({ wch: 24 })),
  ];
  XLSX.utils.book_append_sheet(wb, rawWs, 'คะแนนดิบรายชิ้นงาน');

  const excelOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelOut);
}

/**
 * สร้างไฟล์ CSV แม่แบบสำหรับอัปโหลดรายชื่อนักเรียน
 */
export function generateStudentTemplateCsv(): string {
  const sampleData = [
    ['ชั้น', 'เลขที่', 'เลขประจำตัว', 'ชื่อสกุล'],
    ['ม.4/1', '1', '54001', 'นายกิตติศักดิ์ เจริญพร'],
    ['ม.4/1', '2', '54002', 'นางสาวจิราภรณ์ วงศ์สว่าง'],
    ['ม.4/1', '3', '54003', 'นายณัฐวุฒิ สิทธิชัย'],
    ['ม.4/1', '4', '54004', 'นางสาวธนพร พรหมมา'],
    ['ม.4/1', '5', '54005', 'นายพงศกร สุวรรณรัตน์'],
  ];

  return Papa.unparse(sampleData);
}
