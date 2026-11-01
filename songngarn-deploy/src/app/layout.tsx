import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'songngarn (ส่งงาน) - ระบบรับ-ส่งงานและประเมินผลออนไลน์ โรงเรียนพัฒนานิคม',
  description: 'ระบบจัดการห้องเรียน รับส่งงานออนไลน์ และคำนวณสัดส่วนคะแนนอัตโนมัติ สำหรับครูและนักเรียน',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
