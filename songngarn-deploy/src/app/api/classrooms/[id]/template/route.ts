import { NextResponse } from 'next/server';
import { generateStudentTemplateCsv } from '@/lib/excel-helper';

export async function GET() {
  const csv = generateStudentTemplateCsv();
  return new NextResponse('\uFEFF' + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="student_roster_template.csv"',
    },
  });
}
