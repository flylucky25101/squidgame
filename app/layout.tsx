import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'LAST CITY — 목숨의 가격',
  description:
    '해문시를 무대로 펼쳐지는 3D 범죄 생존 액션. 차량을 탈취하고, 동맹을 맺고, 마지막 탈출에 도전하세요.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="dark">
      <body>{children}</body>
    </html>
  );
}
