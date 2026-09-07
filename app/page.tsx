'use client';
import dynamic from 'next/dynamic';
const LastCity = dynamic(() => import('./game/LastCity'), {
  ssr: false,
  loading: () => (
    <main className="boot">
      <span className="boot-mark">LC</span>
      <p>해문시 통신 연결 중…</p>
    </main>
  ),
});
export default function Home() {
  return <LastCity />;
}
