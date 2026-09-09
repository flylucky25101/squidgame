'use client';
import dynamic from 'next/dynamic';
const City = dynamic(() => import('../game/LastCity'), {ssr:false});
export default function Page(){return <City/>;}
