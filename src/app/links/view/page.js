'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import styles from './view.module.css';

function Viewer() {
  const params = useSearchParams();
  const router = useRouter();
  const url = params.get('url') || '';
  const name = params.get('name') || '사이트';

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <button className={styles.back} onClick={() => router.back()}>
          ← 목록으로
        </button>
        <span className={styles.siteName}>{name}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className={styles.external}>
          새 탭으로 열기 ↗
        </a>
      </div>
      <iframe
        src={url}
        className={styles.frame}
        title={name}
      />
    </div>
  );
}

export default function ViewPage() {
  return (
    <Suspense>
      <Viewer />
    </Suspense>
  );
}
