import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbylUivZh8odIFA_D8qc8XiuCNUSe71kUkSW9WtO-tZV3R2pg12MfqNJ6xwq_r7y62ZH/exec';

async function sendAction(action, payload) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
    redirect: 'follow',
  });
  return await res.json();
}

async function main() {
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const db = JSON.parse(raw);

  console.log('Syncing classrooms...');
  for (const cls of db.classrooms) {
    const res = await sendAction('SAVE_CLASSROOM', { data: cls });
    console.log('Saved classroom:', cls.name, res);
  }

  console.log('Syncing students...');
  const studentsByClass = {};
  for (const s of db.students) {
    if (!studentsByClass[s.classroomId]) studentsByClass[s.classroomId] = [];
    studentsByClass[s.classroomId].push(s);
  }
  for (const [classroomId, list] of Object.entries(studentsByClass)) {
    const res = await sendAction('SAVE_STUDENTS', { classroomId, students: list });
    console.log(`Saved ${list.length} students for class ${classroomId}:`, res);
  }

  console.log('Syncing assignments...');
  for (const a of db.assignments) {
    const res = await sendAction('SAVE_ASSIGNMENT', { data: a });
    console.log('Saved assignment:', a.title, res);
  }

  console.log('All local data successfully synced to Google Sheets!');
}

main().catch(console.error);
