'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const GridEditor = dynamic(() => import('./GridEditor'), { ssr: false });

export default function ShpLeasePage() {
  const router = useRouter();
  return <GridEditor onBack={() => router.push('/admin2')} />;
}
