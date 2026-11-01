import { Classroom } from './types';

/**
 * แยกส่วนประกอบของข้อความระดับชั้น/ห้องเรียน (เช่น "ม.4/1", "ม. 4/10", "4/1", "ห้อง 2")
 * เพื่อให้สามารถจัดเรียงลำดับห้องเรียนตามตัวเลขจริงได้อย่างถูกต้อง
 */
export function parseGradeLevel(rawGrade: string): {
  prefix: string;
  level: number;
  room: number;
  raw: string;
} {
  const str = (rawGrade || '').trim();
  // รูปแบบยอดนิยมในโรงเรียนไทย: ม.4/1, ม.4/10, ม.5/11, 4/1, ม.4 ห้อง 2, ป.6/1
  const match = str.match(/^([^\d]*?)(\d+)(?:\s*(?:[\/\-]|ห้อง)\s*(\d+))?/i);
  if (match) {
    const prefix = match[1].replace(/\s+/g, '').trim();
    const level = parseInt(match[2], 10);
    const room = match[3] !== undefined ? parseInt(match[3], 10) : 0;
    return { prefix, level, room, raw: str };
  }
  return { prefix: str, level: 9999, room: 9999, raw: str };
}

/**
 * เปรียบเทียบห้องเรียน 2 ห้องเพื่อเรียงลำดับตามห้องเรียน:
 * 1. ระดับชั้น (ม.4 ก่อน ม.5)
 * 2. ลำดับห้อง (ห้อง 1 ก่อน ห้อง 2 ก่อน ห้อง 10 ก่อน ห้อง 11)
 * 3. หากอยู่ห้องเดียวกัน ให้เรียงตามรหัสวิชา (courseCode)
 * 4. หากรหัสวิชาเดียวกัน ให้เรียงตามชื่อวิชา (name)
 */
export function compareClassrooms(a: Classroom, b: Classroom): number {
  const pA = parseGradeLevel(a.gradeLevel);
  const pB = parseGradeLevel(b.gradeLevel);

  // 1. เปรียบเทียบคำนำหน้าระดับชั้น (เช่น ป. ก่อน ม.)
  if (pA.prefix !== pB.prefix) {
    const prefComp = pA.prefix.localeCompare(pB.prefix, 'th');
    if (prefComp !== 0) return prefComp;
  }

  // 2. เปรียบเทียบระดับชั้นตัวเลข (เช่น ม.4 ก่อน ม.5)
  if (pA.level !== pB.level) {
    return pA.level - pB.level;
  }

  // 3. เปรียบเทียบเลขห้องตัวเลข (เช่น ห้อง 1, 2, 3, 10, 11)
  if (pA.room !== pB.room) {
    return pA.room - pB.room;
  }

  // 4. หาก parse ตัวเลขไม่ได้ ให้ใช้ natural localeCompare
  const rawComp = (a.gradeLevel || '').localeCompare(b.gradeLevel || '', 'th', {
    numeric: true,
    sensitivity: 'base',
  });
  if (rawComp !== 0) return rawComp;

  // 5. หากเป็นห้องเดียวกัน ให้เรียงตามรหัสวิชา (เช่น I30202 ก่อน ว30103 ก่อน ว30104)
  const codeComp = (a.courseCode || '').localeCompare(b.courseCode || '', 'th', {
    numeric: true,
    sensitivity: 'base',
  });
  if (codeComp !== 0) return codeComp;

  // 6. หากรหัสวิชาเดียวกัน ให้เรียงตามชื่อวิชา
  return (a.name || '').localeCompare(b.name || '', 'th');
}

/**
 * เรียงลำดับรายการห้องเรียนทั้งหมดตามห้องเรียน
 */
export function sortClassrooms(classrooms: Classroom[]): Classroom[] {
  return [...classrooms].sort(compareClassrooms);
}
