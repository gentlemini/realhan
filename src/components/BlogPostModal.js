'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function BlogPostModal({ item, onClose }) {
  const [step, setStep] = useState('select');
  const [platform, setPlatform] = useState(null);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postFormat, setPostFormat] = useState('html');
  const [error, setError] = useState('');
  const [publishUrl, setPublishUrl] = useState('');
  const [previewMode, setPreviewMode] = useState('edit');
  const [multiData, setMultiData] = useState(null);
  const [multiTab, setMultiTab] = useState('naver');
  const [multiPreviewMode, setMultiPreviewMode] = useState({ naver: 'edit', tistory: 'edit', wordpress: 'edit' });

  const [creds, setCreds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('realhm_blog_creds') || '{}'); } catch { return {}; }
  });
  const [tcBlog, setTcBlog] = useState('');
  const [tcToken, setTcToken] = useState('');
  const [wpUrl, setWpUrl] = useState('');
  const [wpUser, setWpUser] = useState('');
  const [wpPass, setWpPass] = useState('');

  useEffect(() => {
    setTcBlog(creds.tistory_blog || '');
    setTcToken(creds.tistory_token || '');
    setWpUrl(creds.wp_url || '');
    setWpUser(creds.wp_user || '');
    setWpPass(creds.wp_pass || '');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate(pl) {
    setPlatform(pl);
    setStep('generating');
    setError('');
    try {
      const res = await fetch('/api/blog-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property: item, platform: pl }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.multi) {
        setMultiData(data);
        setMultiTab('naver');
        setMultiPreviewMode({ naver: 'edit', tistory: 'edit', wordpress: 'edit' });
        setStep('preview_multi');
      } else {
        setPostTitle(data.title || '');
        setPostContent(data.content || '');
        setPostFormat(data.format || 'html');
        setPreviewMode('edit');
        setStep('preview');
      }
    } catch (e) {
      setError('생성 실패: ' + e.message);
      setStep('select');
    }
  }

  function handleCopyNaver() {
    const copyText = postFormat === 'text'
      ? `${postTitle}\n\n${postContent}`
      : `<h2>${postTitle}</h2>\n${postContent}`;
    navigator.clipboard?.writeText(copyText).catch(() => {});
    const msg = postFormat === 'text'
      ? '✅ 클립보드에 복사되었습니다!\n\n네이버 블로그 → 글쓰기 → 텍스트 에디터에 붙여넣기 하세요.'
      : '✅ 클립보드에 복사되었습니다!\n\n네이버 블로그 → 글쓰기 → HTML 에디터에 붙여넣기 하세요.';
    alert(msg);
  }

  async function doPublish(activeCreds) {
    setStep('publishing');
    setError('');
    try {
      const res = await fetch('/api/blog-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          title: postTitle,
          content: postContent,
          tistory_blog:  activeCreds.tistory_blog,
          tistory_token: activeCreds.tistory_token,
          wp_url:  activeCreds.wp_url,
          wp_user: activeCreds.wp_user,
          wp_pass: activeCreds.wp_pass,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPublishUrl(data.url || '');
      setStep('done');
    } catch (e) {
      setError('발행 실패: ' + e.message);
      setStep('preview');
    }
  }

  function handlePublishClick() {
    if (platform === 'naver') { handleCopyNaver(); return; }
    if (platform === 'tistory' && (!creds.tistory_blog || !creds.tistory_token)) { setStep('creds_tistory'); return; }
    if (platform === 'wordpress' && (!creds.wp_url || !creds.wp_user || !creds.wp_pass)) { setStep('creds_wp'); return; }
    doPublish(creds);
  }

  function saveTistoryCreds() {
    const next = { ...creds, tistory_blog: tcBlog, tistory_token: tcToken };
    setCreds(next);
    localStorage.setItem('realhm_blog_creds', JSON.stringify(next));
    doPublish(next);
  }

  function saveWpCreds() {
    const next = { ...creds, wp_url: wpUrl, wp_user: wpUser, wp_pass: wpPass };
    setCreds(next);
    localStorage.setItem('realhm_blog_creds', JSON.stringify(next));
    doPublish(next);
  }

  const platformLabels = { naver: '네이버 블로그', tistory: '티스토리', wordpress: '워드프레스' };
  const platformColors = { naver: '#03C75A', tistory: '#f15922', wordpress: '#21759b' };

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}>
      <style>{`@keyframes bpSpin{to{transform:rotate(360deg)}}.bp-spin{animation:bpSpin .8s linear infinite}`}</style>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ebe4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#faf7f4', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#2a3e3f', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✍️ AI 블로그 포스팅
            {platform && step !== 'select' && (
              <span style={{ fontSize: '12px', color: '#888', fontWeight: 400 }}>— {platformLabels[platform]}</span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#888', lineHeight: 1, padding: '0 2px' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {step === 'select' && (
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px', lineHeight: '1.6' }}>
                매물 정보를 분석해 블로그 포스팅 내용을 자동 생성합니다. 내용을 확인한 후 발행할 수 있습니다.
              </p>
              <button onClick={() => handleGenerate('all')}
                style={{ width: '100%', padding: '14px 20px', marginBottom: '12px', background: 'linear-gradient(135deg,#1a2e2f,#2d4e50)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '22px' }}>🚀</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>3개 플랫폼 동시 발행 (중복방지)</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>네이버·티스토리·워드프레스 — 제목·도입부·마무리를 각각 다르게 생성</div>
                </div>
              </button>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { id: 'naver', label: '네이버 블로그', desc: '내용 생성 → 클립보드 복사', icon: 'N', color: '#03C75A' },
                  { id: 'tistory', label: '티스토리', desc: 'HTML 생성 → 붙여넣기', icon: 'T', color: '#f15922' },
                  { id: 'wordpress', label: '워드프레스', desc: 'HTML 생성 → REST API 발행', icon: 'W', color: '#21759b' },
                ].map(pl => (
                  <button key={pl.id} onClick={() => handleGenerate(pl.id)}
                    style={{ flex: '1 1 160px', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', background: '#fff', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = pl.color; e.currentTarget.style.background = '#fafafa'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}>
                    <div style={{ width: '34px', height: '34px', background: pl.color, color: '#fff', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '17px', marginBottom: '8px' }}>{pl.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '3px' }}>{pl.label}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>{pl.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div className="bp-spin" style={{ width: '44px', height: '44px', border: '4px solid #f3f4f6', borderTopColor: '#2a3e3f', borderRadius: '50%', margin: '0 auto 18px' }} />
              <p style={{ fontSize: '15px', color: '#374151', fontWeight: 600, margin: '0 0 6px' }}>포스팅 내용을 생성 중입니다...</p>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>매물 정보를 분석하여 최적화된 내용을 작성합니다.</p>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>제목</label>
                <input value={postTitle} onChange={e => setPostTitle(e.target.value)} style={{ ...inputStyle, fontSize: '14px', fontWeight: 600 }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={labelStyle}>
                    내용
                    <span style={{ marginLeft: '6px', padding: '2px 7px', background: postFormat === 'text' ? '#fffbeb' : '#eff6ff', color: postFormat === 'text' ? '#92400e' : '#1d4ed8', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                      {postFormat === 'text' ? 'TEXT' : 'HTML'}
                    </span>
                  </label>
                  {postFormat === 'html' && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['edit', 'preview'].map(m => (
                        <button key={m} onClick={() => setPreviewMode(m)}
                          style={{ padding: '3px 10px', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '4px', background: previewMode === m ? '#2a3e3f' : '#fff', color: previewMode === m ? '#fff' : '#374151', cursor: 'pointer' }}>
                          {m === 'edit' ? '편집' : '미리보기'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {postFormat === 'text' ? (
                  <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
                    style={{ width: '100%', height: '380px', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: "'Noto Sans KR', sans-serif", lineHeight: '1.7', resize: 'vertical', boxSizing: 'border-box', outline: 'none', whiteSpace: 'pre-wrap' }} />
                ) : previewMode === 'edit' ? (
                  <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
                    style={{ width: '100%', height: '380px', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.5', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                ) : (
                  <div style={{ height: '380px', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'auto', padding: '14px' }}
                    dangerouslySetInnerHTML={{ __html: postContent }} />
                )}
              </div>
            </div>
          )}

          {step === 'preview_multi' && multiData && (() => {
            const tabs = [
              { id: 'naver', label: '네이버', color: '#03C75A' },
              { id: 'tistory', label: '티스토리', color: '#f15922' },
              { id: 'wordpress', label: '워드프레스', color: '#21759b' },
            ];
            const cur = multiData[multiTab];
            const isText = cur.format === 'text';
            const pm = multiPreviewMode[multiTab];
            return (
              <div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                  {tabs.map(t => (
                    <button key={t.id} onClick={() => setMultiTab(t.id)}
                      style={{ flex: 1, padding: '8px', border: `2px solid ${multiTab === t.id ? t.color : '#e5e7eb'}`, borderRadius: '8px', background: multiTab === t.id ? t.color : '#fff', color: multiTab === t.id ? '#fff' : '#374151', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>제목</label>
                  <input value={cur.title} onChange={e => setMultiData(prev => ({ ...prev, [multiTab]: { ...prev[multiTab], title: e.target.value } }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                      내용 <span style={{ marginLeft: '6px', padding: '2px 7px', background: isText ? '#fffbeb' : '#eff6ff', color: isText ? '#92400e' : '#1d4ed8', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>{isText ? 'TEXT' : 'HTML'}</span>
                    </label>
                    {!isText && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {['edit', 'preview'].map(m => (
                          <button key={m} onClick={() => setMultiPreviewMode(prev => ({ ...prev, [multiTab]: m }))}
                            style={{ padding: '3px 10px', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '4px', background: pm === m ? '#2a3e3f' : '#fff', color: pm === m ? '#fff' : '#374151', cursor: 'pointer' }}>
                            {m === 'edit' ? '편집' : '미리보기'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {isText ? (
                    <textarea value={cur.content} onChange={e => setMultiData(prev => ({ ...prev, [multiTab]: { ...prev[multiTab], content: e.target.value } }))}
                      style={{ width: '100%', height: '340px', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', lineHeight: '1.7', resize: 'vertical', boxSizing: 'border-box', outline: 'none', whiteSpace: 'pre-wrap' }} />
                  ) : pm === 'edit' ? (
                    <textarea value={cur.content} onChange={e => setMultiData(prev => ({ ...prev, [multiTab]: { ...prev[multiTab], content: e.target.value } }))}
                      style={{ width: '100%', height: '340px', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.5', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                  ) : (
                    <div style={{ height: '340px', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'auto', padding: '14px' }}
                      dangerouslySetInnerHTML={{ __html: cur.content }} />
                  )}
                </div>
                {multiTab === 'naver' && (
                  <button onClick={() => {
                    navigator.clipboard?.writeText(`${cur.title}\n\n${cur.content}`).catch(() => {});
                    alert('✅ 네이버 클립보드 복사 완료!\n\n네이버 블로그 → 글쓰기에 붙여넣기 하세요.');
                  }} style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#03C75A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    📋 네이버 클립보드 복사
                  </button>
                )}
                {multiTab === 'tistory' && (
                  <button onClick={() => {
                    navigator.clipboard?.writeText(cur.content).catch(() => {});
                    alert('✅ 티스토리 HTML 복사 완료!\n\n티스토리 → 글쓰기 → HTML 에디터에 붙여넣기 하세요.');
                  }} style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#f15922', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    📋 티스토리 HTML 복사
                  </button>
                )}
                {multiTab === 'wordpress' && (
                  <button onClick={() => {
                    navigator.clipboard?.writeText(cur.content).catch(() => {});
                    alert('✅ 워드프레스 HTML 복사 완료!\n\n워드프레스 → 글쓰기 → HTML 에디터에 붙여넣기 하세요.');
                  }} style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#21759b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    📋 워드프레스 HTML 복사
                  </button>
                )}
              </div>
            );
          })()}

          {step === 'creds_tistory' && (
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '18px', lineHeight: '1.6' }}>
                티스토리 발행에 필요한 정보를 입력해주세요. 최초 1회 입력하면 저장됩니다.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>블로그명 <span style={{ color: '#9ca3af', fontWeight: 400 }}>(예: myblog → myblog.tistory.com)</span></label>
                  <input value={tcBlog} onChange={e => setTcBlog(e.target.value)} placeholder="your-blog-name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>액세스 토큰</label>
                  <input value={tcToken} onChange={e => setTcToken(e.target.value)} type="password" placeholder="Tistory Access Token" style={inputStyle} />
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>티스토리 관리 → 설정 → Open API → 인증 토큰 확인</p>
                </div>
              </div>
            </div>
          )}

          {step === 'creds_wp' && (
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '18px', lineHeight: '1.6' }}>
                WordPress 발행에 필요한 정보를 입력해주세요. 최초 1회 입력하면 저장됩니다.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>사이트 주소</label>
                  <input value={wpUrl} onChange={e => setWpUrl(e.target.value)} placeholder="https://your-blog.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>사용자명</label>
                  <input value={wpUser} onChange={e => setWpUser(e.target.value)} placeholder="admin" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>애플리케이션 비밀번호</label>
                  <input value={wpPass} onChange={e => setWpPass(e.target.value)} type="password" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" style={inputStyle} />
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>워드프레스 → 사용자 → 내 프로필 → 애플리케이션 비밀번호 생성</p>
                </div>
              </div>
            </div>
          )}

          {step === 'publishing' && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div className="bp-spin" style={{ width: '44px', height: '44px', border: '4px solid #f3f4f6', borderTopColor: '#2a3e3f', borderRadius: '50%', margin: '0 auto 18px' }} />
              <p style={{ fontSize: '15px', color: '#374151', fontWeight: 600, margin: 0 }}>블로그에 발행 중입니다...</p>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎉</div>
              <p style={{ fontSize: '17px', color: '#059669', fontWeight: 700, margin: '0 0 8px' }}>발행 완료!</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>블로그에 포스팅이 성공적으로 등록되었습니다.</p>
              {publishUrl && (
                <a href={publishUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#f0fdf4', border: '1px solid #86efac', color: '#059669', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                  블로그에서 확인 →
                </a>
              )}
            </div>
          )}
        </div>

        {step === 'preview_multi' && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f0ebe4', display: 'flex', justifyContent: 'flex-start', flexShrink: 0 }}>
            <button onClick={() => setStep('select')}
              style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>
              ← 이전
            </button>
          </div>
        )}
        {(step === 'preview' || step === 'creds_tistory' || step === 'creds_wp') && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f0ebe4', display: 'flex', justifyContent: 'space-between', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => setStep(step === 'preview' ? 'select' : 'preview')}
              style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>
              ← 이전
            </button>
            {step === 'preview' && (
              <button onClick={handlePublishClick}
                style={{ padding: '8px 22px', background: platformColors[platform] || '#2a3e3f', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                {platform === 'naver' ? '📋 클립보드 복사' : '🚀 발행하기'}
              </button>
            )}
            {step === 'creds_tistory' && (
              <button onClick={saveTistoryCreds} disabled={!tcBlog || !tcToken}
                style={{ padding: '8px 22px', background: !tcBlog || !tcToken ? '#d1d5db' : '#f15922', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: !tcBlog || !tcToken ? 'not-allowed' : 'pointer' }}>
                저장 후 발행
              </button>
            )}
            {step === 'creds_wp' && (
              <button onClick={saveWpCreds} disabled={!wpUrl || !wpUser || !wpPass}
                style={{ padding: '8px 22px', background: !wpUrl || !wpUser || !wpPass ? '#d1d5db' : '#21759b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: !wpUrl || !wpUser || !wpPass ? 'not-allowed' : 'pointer' }}>
                저장 후 발행
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
