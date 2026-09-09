import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'THE ISLAND — 6 ROUND SURVIVAL',
  description:
    '고립된 3D 경기장의 여섯 가지 생존 게임. PC와 모바일에서 도전하고, LAST CITY 도시 모드도 즐기세요.',
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
