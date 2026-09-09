'use client';
import dynamic from 'next/dynamic';
import {useEffect, useState} from 'react';
const City = dynamic(() => import('./game/LastCity'), {ssr:false});
const LastCity = dynamic(() => import('./arena/Arena'), {
  ssr: false,
  loading: () => (
    <main className="boot">
      <span className="boot-mark">LC</span>
      <p>해문시 통신 연결 중…</p>
    </main>
  ),
});
export default function Home() {
  const [city,setCity]=useState(false);
  useEffect(()=>{setCity(new URLSearchParams(window.location.search).get('mode')==='city');},[]);
  return city ? <City/> : <LastCity />;
}
