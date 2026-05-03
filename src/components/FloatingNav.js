'use client';

import { useState } from 'react';

const BUTTONS = [
  {
    id: 'blog',
    label: '네이버\n블로그',
    href: 'https://blog.naver.com/zsaza',
    bg: '#03c75a',
    icon: 'N',
  },
  {
    id: 'youtube',
    label: '유튜브',
    href: 'https://www.youtube.com/@hankyulrealty',
    bg: '#ff0000',
    icon: '▶',
  },
  {
    id: 'kakao',
    label: '카카오톡\n상담',
    href: 'https://pf.kakao.com/_QaxliG',
    bg: '#fee500',
    color: '#000',
    icon: '💬',
  },
];

export default function FloatingNav() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        left: 20,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      {expanded &&
        BUTTONS.map((btn) => (
          <a
            key={btn.id}
            href={btn.href}
            target="_blank"
            rel="noopener noreferrer"
            title={btn.label.replace('\n', ' ')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: btn.bg,
              color: btn.color || '#fff',
              fontSize: '1.3rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {btn.icon}
          </a>
        ))}

      <button
        onClick={() => setExpanded((v) => !v)}
        aria-label="소셜 링크 열기"
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: expanded ? '#444' : 'var(--accent-primary)',
          color: '#fff',
          fontSize: '1.4rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s, transform 0.2s',
          transform: expanded ? 'rotate(45deg)' : 'none',
          cursor: 'pointer',
          border: 'none',
        }}
      >
        +
      </button>
    </div>
  );
}
