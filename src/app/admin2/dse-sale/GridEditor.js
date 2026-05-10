'use client';

import { useState, useEffect, useRef } from 'react';
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './FormBuilder.module.css';
import { DEFAULT_FIELDS, FIELD_TYPES } from './fields';
import AdminMapField from './AdminMapField';
import BuildingLookup from '../_components/BuildingLookup';
import { useRouter } from 'next/navigation';

const STORAGE_KEY  = 'hk_dse_sale_layout_v1';
const COUNTER_KEY  = 'hk_property_counter';
const PROPERTY_PREFIX = 'dssm';

function generatePropertyId() {
  const count = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1;
  localStorage.setItem(COUNTER_KEY, String(count));
  return `${PROPERTY_PREFIX}-${String(count).padStart(4, '0')}`;
}

function LocationInput({ value = {}, onChange, placeholder = '동까지 기입' }) {
  const { text = '', privacy = '노출', adminMemo = '' } = value;
  return (
    <div className={styles.privacyInputRow}>
      <input
        className={styles.input}
        type="text"
        value={privacy === '미노출' ? '' : text}
        placeholder={privacy === '미노출' ? '소유자 요청으로 인한 미노출' : placeholder}
        disabled={privacy === '미노출'}
        onChange={e => onChange?.({ text: e.target.value, privacy, adminMemo })}
        style={privacy === '미노출' ? { color: '#3a2a1a', background: '#fafafa' } : {}}
      />
      <select
        className={styles.privacySelect}
        value={privacy}
        onChange={e => onChange?.({ text, privacy: e.target.value, adminMemo })}
      >
        <option value="노출">노출</option>
        <option value="미노출">미노출</option>
      </select>
      <input
        className={styles.adminMemoInput}
        type="text"
        value={adminMemo}
        placeholder="🔒 관리자 메모"
        onChange={e => onChange?.({ text, privacy, adminMemo: e.target.value })}
      />
    </div>
  );
}

function PrivacyTextInput({ value = {}, onChange }) {
  const { text = '', privacy = '공개', adminMemo = '' } = value;
  return (
    <div className={styles.privacyInputRow}>
      <input
        className={styles.input}
        type="text"
        value={privacy === '비공개' ? '' : text}
        placeholder={privacy === '비공개' ? '소유자 요청으로 인한 미공개' : ''}
        disabled={privacy === '비공개'}
        onChange={e => onChange?.({ text: e.target.value, privacy, adminMemo })}
        style={privacy === '비공개' ? { color: '#3a2a1a', background: '#fafafa' } : {}}
      />
      <select
        className={styles.privacySelect}
        value={privacy}
        onChange={e => onChange?.({ text, privacy: e.target.value, adminMemo })}
      >
        <option value="공개">공개</option>
        <option value="비공개">비공개</option>
      </select>
      <input
        className={styles.adminMemoInput}
        type="text"
        value={adminMemo}
        placeholder="🔒 관리자 메모"
        onChange={e => onChange?.({ text, privacy, adminMemo: e.target.value })}
      />
    </div>
  );
}

function SelectWithCustom({ field, value = '', onChange }) {
  const opts = field.options || [];
  const isPreset = !value || opts.includes(value);
  return (
    <div className={styles.selectCustomRow}>
      <select className={styles.select} value={isPreset ? value : ''} onChange={e => onChange?.(e.target.value)}>
        <option value="">선택</option>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {!isPreset && (
        <input className={styles.input} type="text" placeholder="직접 입력" value={value} onChange={e => onChange?.(e.target.value)} />
      )}
    </div>
  );
}

function LoanInfoInput({ value, onChange }) {
  const norm = (value && typeof value === 'object') ? value : { display: '표시안함', amount: (value != null ? String(value) : '') };
  const { display = '표시안함', amount = '' } = norm;
  return (
    <div className={styles.selectCustomRow}>
      <select className={styles.select} value={display} onChange={e => onChange?.({ display: e.target.value, amount })}>
        <option value="표시안함">표시안함</option>
        <option value="융자금 없음">융자금 없음</option>
        <option value="시세대비 30% 미만">시세대비 30% 미만</option>
        <option value="시세대비 30% 이상">시세대비 30% 이상</option>
        <option value="직접입력">직접입력</option>
      </select>
      {display === '직접입력' && (
        <input className={styles.input} type="text" placeholder="직접 입력" value={amount} onChange={e => onChange?.({ display, amount: e.target.value })} style={{ width: 130 }} />
      )}
    </div>
  );
}

function ControlledFieldInput({ field, value, onChange }) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'text' in value && field.type !== 'locationPrivacy')
    return <PrivacyTextInput value={value} onChange={onChange} />;
  if (field.type === 'auto')
    return <span className={styles.autoValue}>{value || '생성 중…'}</span>;
  if (field.type === 'fixed')
    return <span className={styles.fixedValue}>{field.value}</span>;
  if (field.type === 'textarea')
    return <textarea className={styles.textarea} placeholder="" value={value || ''} onChange={e => onChange?.(e.target.value)} />;
  if (field.type === 'select')
    return <SelectWithCustom field={field} value={value || ''} onChange={onChange} />;
  if (field.type === 'radio')
    return (
      <div className={styles.radioGroup}>
        {(field.options || []).map(o => (
          <label key={o} className={styles.radioLabel}>
            <input type="radio" name={field.id} checked={value === o} onChange={() => onChange?.(o)} /> {o}
          </label>
        ))}
      </div>
    );
  if (field.type === 'multicheck')
    return (
      <div className={styles.checkGroup}>
        {(field.options || []).map(o => (
          <label key={o} className={styles.checkLabel}>
            <input type="checkbox" checked={(value || []).includes(o)} onChange={e => {
              const arr = value || [];
              onChange?.(e.target.checked ? [...arr, o] : arr.filter(x => x !== o));
            }} /> {o}
          </label>
        ))}
      </div>
    );
  if (field.type === 'checkbox')
    return (
      <label className={styles.radioLabel}>
        <input type="checkbox" checked={!!value} onChange={e => onChange?.(e.target.checked)} />
        {' '}{field.hint || field.label}
      </label>
    );
  if (field.type === 'direction')
    return (
      <div className={styles.directionRow}>
        <input className={styles.directionInput} placeholder="기준 입력" value={(value || {}).base || ''} onChange={e => onChange?.({ ...(value || {}), base: e.target.value })} />
        <select className={styles.directionSelect} value={(value || {}).dir || '동향'} onChange={e => onChange?.({ ...(value || {}), dir: e.target.value })}>
          {['동향','서향','남향','북향','남동향','남서향','북동향','북서향'].map(d => <option key={d}>{d}</option>)}
        </select>
      </div>
    );
  if (field.type === 'locationPrivacy') {
    const locVal = typeof value === 'string' ? { text: value, privacy: '노출', adminMemo: '' } : value;
    return <LocationInput value={locVal} onChange={onChange} placeholder={field.placeholder} />;
  }
  if (field.type === 'privacyText')
    return <PrivacyTextInput value={value} onChange={onChange} />;
  if (field.type === 'loanInfo')
    return <LoanInfoInput value={value} onChange={onChange} />;
  if (field.type === 'photos')
    return <div className={styles.photosBox}>📷 사진 업로드 (Cloudinary 연결)</div>;
  return (
    <input className={styles.input} type={field.type === 'number' ? 'number' : 'text'} inputMode={field.type === 'area' ? 'decimal' : undefined} placeholder={field.hint || ''} value={value || ''} onChange={e => onChange?.(e.target.value)} />
  );
}

function PhotoSection({ filePreviews, repIdx, setRepIdx, onImageSelect, onRemove }) {
  return (
    <div className={styles.row}>
      <div className={styles.labelCell}>사진정보</div>
      <div className={styles.inputCell}>
        <div className={styles.uploadArea}>
          <label className={styles.uploadBtn}>
            ＋ 사진 추가
            <input type="file" accept="image/*" multiple onChange={onImageSelect} style={{ display: 'none' }} disabled={filePreviews.length >= 10} />
          </label>
          {filePreviews.length === 0 && <p className={styles.uploadHint}>최대 10장 · 클릭으로 대표사진 선택</p>}
          <div className={styles.photoGrid}>
            {filePreviews.map(({ preview }, idx) => (
              <div key={idx} className={`${styles.photoItem} ${idx === repIdx ? styles.photoItemActive : ''}`} onClick={() => setRepIdx(idx)}>
                <img src={preview} alt={`사진 ${idx + 1}`} className={styles.photoImg} />
                {idx === repIdx && <div className={styles.photoBadge}>대표</div>}
                <button type="button" className={styles.photoDelete} onClick={e => { e.stopPropagation(); onRemove(idx); }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMap({ lat, lng, radius }) {
  const mapRef = useRef(null);
  useEffect(() => {
    if (!mapRef.current || typeof window.kakao?.maps?.LatLng !== 'function') return;
    const kakao = window.kakao;
    const center = new kakao.maps.LatLng(lat, lng);
    const map = new kakao.maps.Map(mapRef.current, { center, level: 5 });
    map.setZoomable(false);
    if (radius === 0) { new kakao.maps.Marker({ position: center, map }); }
    else {
      new kakao.maps.Circle({ center, radius, strokeWeight: 2, strokeColor: '#a87b51', strokeOpacity: 0.8, fillColor: '#c19a6b', fillOpacity: 0.15, map });
    }
  }, [lat, lng, radius]);
  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

function FormRow({ field, formValues, onFormChange }) {
  if (field.type === 'mapConfig') {
    return (
      <div className={styles.row} style={{ display: 'block', padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid #f0ebe4', background: '#faf7f4' }}>
          <span style={{ flex: 1, textAlign: 'center', color: '#5a3e28', fontWeight: 700, fontSize: 13 }}>지도</span>
        </div>
        <AdminMapField addressValue={formValues?.location?.text || ''} onConfigChange={v => onFormChange?.('map_config', v)} initialCoords={formValues?.map_config} />
      </div>
    );
  }
  if (field.type === 'twoCol') return null;
  if (field.type === 'spacer') {
    return (
      <div className={styles.spacerRow}>
        <div className={styles.spacerRowInner}>
          <div className={styles.spacerLine} />
          <span className={styles.spacerText}>여백</span>
          <div className={styles.spacerLine} />
        </div>
      </div>
    );
  }
  return (
    <div className={styles.row}>
      <div className={styles.labelCell}>
        {field.label}
        {field.privacy && <span className={styles.privacyTag}>공개/비공개</span>}
      </div>
      <div className={styles.inputCell}>
        <ControlledFieldInput field={field} value={formValues?.[field.id]} onChange={v => onFormChange?.(field.id, v)} />
        {field.hint && !['auto', 'fixed', 'multicheck', 'radio', 'textarea'].includes(field.type) && (
          <span className={styles.hint}>{field.hint}</span>
        )}
      </div>
    </div>
  );
}

function PreviewModal({ fields, formValues, filePreviews, repIdx, onClose }) {
  function renderValue(field) {
    const v = formValues[field.id];
    if (field.type === 'fixed') return <span className={styles.fixedValue}>{field.value}</span>;
    if (field.type === 'auto') return <span className={styles.autoValue}>{v || '—'}</span>;
    if (field.type === 'locationPrivacy') {
      if (!v || v.privacy !== '미노출') return <span>{v?.text || <span className={styles.previewEmpty}>—</span>}</span>;
      return <span className={styles.previewPrivate}>소유자 요청으로 인한 미노출</span>;
    }
    if (field.type === 'privacyText') {
      if (!v || v.privacy !== '비공개') return <span>{v?.text || <span className={styles.previewEmpty}>—</span>}</span>;
      return <span className={styles.previewPrivate}>소유자 요청으로 인한 미공개</span>;
    }
    if (field.type === 'multicheck') {
      const arr = v || [];
      return arr.length ? <div className={styles.previewTagList}>{arr.map(o => <span key={o} className={styles.previewTag}>{o}</span>)}</div> : <span className={styles.previewEmpty}>—</span>;
    }
    if (field.type === 'direction') return v ? <span>{v.base} {v.dir}</span> : <span className={styles.previewEmpty}>—</span>;
    if (field.type === 'checkbox') return <span>{v ? '✓' : '—'}</span>;
    if (field.type === 'loanInfo') {
      if (!v) return <span className={styles.previewEmpty}>—</span>;
      const ld = (v && typeof v === 'object') ? v.display : '표시안함';
      const la = (v && typeof v === 'object') ? v.amount : (v || '');
      if (ld === '표시안함') return <span className={styles.previewEmpty}>표시안함</span>;
      if (ld === '융자금 없음') return <span>없음</span>;
      if (ld === '직접입력') return <span>{la || '—'}</span>;
      return <span>{ld}{la ? ' (' + la + ')' : ''}</span>;
    }
    if (field.type === 'photos') return <span className={styles.previewEmpty}>사진 첨부</span>;
    if (!v) return <span className={styles.previewEmpty}>—</span>;
    return <span>{String(v)}</span>;
  }

  const visibleFields = fields.filter(f => !['spacer', 'twoCol', 'mapConfig', 'photos'].includes(f.type) && f.id !== 'title');
  const [pvPhotoIdx, setPvPhotoIdx] = useState(repIdx || 0);
  const pvCurrent = filePreviews?.[pvPhotoIdx]?.preview || null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBoxWide} onClick={e => e.stopPropagation()}>
        <button className={styles.modalCloseAbs} onClick={onClose}>✕</button>
        <a href="https://pf.kakao.com/_QaxliG" target="_blank" rel="noopener noreferrer" className={styles.kakaoFloatBtn}>
          <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" alt="카카오톡 상담" className={styles.kakaoFloatIcon} />
          <span>카카오톡 상담</span>
        </a>
        <div className={styles.previewLayout}>
          <div className={styles.previewPhotoCol} style={{ position: 'relative' }}>
            {pvCurrent ? (
              <>

                <img src={pvCurrent} alt={`사진 ${pvPhotoIdx + 1}`} className={styles.previewPhotoImg} />

                {(filePreviews?.length || 0) > 1 && (

                  <>

                    <button onClick={() => setPvPhotoIdx(i => (i - 1 + filePreviews.length) % filePreviews.length)} style={{ position:'absolute', top:'50%', left:10, transform:'translateY(-50%)', background:'rgba(0,0,0,0.35)', color:'#fff', border:'none', borderRadius:'50%', width:40, height:40, fontSize:26, cursor:'pointer', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>&#8249;</button>

                    <button onClick={() => setPvPhotoIdx(i => (i + 1) % filePreviews.length)} style={{ position:'absolute', top:'50%', right:10, transform:'translateY(-50%)', background:'rgba(0,0,0,0.35)', color:'#fff', border:'none', borderRadius:'50%', width:40, height:40, fontSize:26, cursor:'pointer', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>&#8250;</button>

                    <div style={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6, zIndex:10 }}>

                      {filePreviews.map((_, i) => (

                        <span key={i} onClick={() => setPvPhotoIdx(i)} style={{ width:8, height:8, borderRadius:'50%', cursor:'pointer', border:'1px solid rgba(255,255,255,0.5)', background: i === pvPhotoIdx ? '#5a3e28' : 'rgba(255,255,255,0.6)' }} />

                      ))}

                    </div>

                    <div style={{ position:'absolute', bottom:10, right:14, background:'rgba(0,0,0,0.45)', color:'#fff', fontSize:12, padding:'2px 8px', borderRadius:10, zIndex:10, pointerEvents:'none' }}>{pvPhotoIdx + 1} / {filePreviews.length}</div>

                  </>

                )}

              </>
            ) : (
              <div className={styles.previewPhotoArea}>
                <span className={styles.previewPhotoGhost}>사진위치</span>
                <div className={styles.previewPhotoFallback}>
                  <p className={styles.previewFallbackSub}>사진 첨부 없을시 아래 내용</p>
                  <p className={styles.previewFallbackName}>"공인중개사 한민희"</p>
                  <p className={styles.previewFallbackPhone}>"010-4706-8253"</p>
                </div>
              </div>
            )}
          </div>
          <div className={styles.previewDataCol}>
            <div className={styles.previewMapBox}>
              {formValues.map_config?.lat ? (
                <PreviewMap lat={formValues.map_config.lat} lng={formValues.map_config.lng} radius={formValues.map_config.radius || 0} />
              ) : (
                <span className={styles.previewMapPlaceholder}>지도 위치</span>
              )}
            </div>
            <div className={styles.previewDataScroll}>
              <div className={styles.previewDataHeader}>
                <div className={styles.previewDataHeaderSub}>다세대 매매</div>
                <div className={styles.previewTitle}>
                  {formValues.title || <span className={styles.previewTitleEmpty}>매물제목/특징 미입력</span>}
                </div>
              </div>
              {visibleFields.map(field => (
                <div
                  key={field.id}
                  className={`${styles.previewRow} ${field.id === 'sale_price' ? styles.previewRowHighlight : ''}`}
                >
                  <div className={styles.previewLabel}>{field.label}</div>
                  <div className={`${styles.previewValue} ${field.id === 'sale_price' ? styles.previewValuePrice : ''}`}>
                    {renderValue(field)}
                  </div>
                </div>
              ))}
              <div className={styles.agentCard}>
                <img src="/profile.png" alt="한민희" className={styles.agentAvatar} />
                <div className={styles.agentInfo}>
                  <div className={styles.agentName}>친절한 공인중개사 한민희 부장</div>
                  <div className={styles.agentRole}>부동산 전담 매니저</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableRow({ field, onDelete, formValues, onFormChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  if (field.type === 'mapConfig') {
    return (
      <div ref={setNodeRef} style={{ ...style, display: 'block', padding: 0 }} className={`${styles.row} ${isDragging ? styles.rowDragging : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px 8px 8px', borderBottom: '1px solid #f0ebe4', background: '#faf7f4' }}>
          <span className={styles.dragHandle} {...attributes} {...listeners}>⠿</span>
          <span style={{ flex: 1, textAlign: 'center', color: '#5a3e28', fontWeight: 700, fontSize: 13 }}>지도</span>
          <div className={styles.rowControls} style={{ opacity: 1 }}>
            <button className={styles.deleteBtn} onClick={() => onDelete(field.id)}>✕</button>
          </div>
        </div>
        <AdminMapField addressValue={formValues?.location?.text || ''} onConfigChange={v => onFormChange?.(field.id, v)} />
      </div>
    );
  }
  if (field.type === 'spacer') {
    return (
      <div ref={setNodeRef} style={style} className={`${styles.spacerRow} ${isDragging ? styles.rowDragging : ''}`}>
        <div className={styles.spacerRowInner}>
          <span className={styles.dragHandle} {...attributes} {...listeners}>⠿</span>
          <div className={styles.spacerLine} />
          <span className={styles.spacerText}>여백</span>
          <div className={styles.spacerLine} />
          <div className={styles.rowControls} style={{ opacity: 1 }}>
            <button className={styles.deleteBtn} onClick={() => onDelete(field.id)}>✕</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div ref={setNodeRef} style={style} className={`${styles.row} ${isDragging ? styles.rowDragging : ''}`}>
      <span className={styles.dragHandle} {...attributes} {...listeners} title="드래그하여 이동">⠿</span>
      <div className={styles.labelCell}>
        {field.label}
        {field.privacy && <span className={styles.privacyTag}>공개/비공개</span>}
      </div>
      <div className={styles.inputCell}>
        <ControlledFieldInput field={field} value={formValues?.[field.id]} onChange={v => onFormChange?.(field.id, v)} />
        {field.hint && !['auto', 'fixed', 'multicheck', 'radio', 'textarea'].includes(field.type) && (
          <span className={styles.hint}>{field.hint}</span>
        )}
      </div>
      <div className={styles.rowControls}>
        <button className={styles.deleteBtn} onClick={() => onDelete(field.id)} title="삭제">✕</button>
      </div>
    </div>
  );
}

const INITIAL_FORM = () => ({
  location:       { text: '', privacy: '노출', adminMemo: '' },
  address_detail: { text: '', privacy: '노출', adminMemo: '' },
  curr_floor:     { text: '', privacy: '공개', adminMemo: '' },
  property_id:    '',
  direction:      { base: '', dir: '동향' },
});

export default function GridEditor({ onBack, isEdit = false, initialValues = null, pageId = null }) {
  const [fields, setFields]           = useState([]);
  const [saveStatus, setSaveStatus]   = useState('저장됨');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [newLabel, setNewLabel]       = useState('');
  const [newType, setNewType]         = useState('text');
  const [activeId, setActiveId]       = useState(null);
  const [editMode, setEditMode]       = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formValues, setFormValues]   = useState(INITIAL_FORM);
  const [filePreviews, setFilePreviews] = useState([]);
  const [repIdx, setRepIdx]           = useState(0);
  const router = useRouter();
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState('');
  const saveTimer = useRef(null);

  function resizeImage(file, maxPx = 1920, quality = 0.85) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
          else { width = Math.round(width * maxPx / height); height = maxPx; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const wmText = '공인중개사 한민희 010-4706-8253';
        const fz = Math.max(12, Math.round(width * 0.016));
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fz}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.translate(width / 2, height / 2);
        ctx.rotate(-Math.PI / 5);
        const gapX = fz * 14;
        const gapY = fz * 5.5;
        const diag = Math.sqrt(width * width + height * height);
        const cols = Math.ceil(diag / gapX) + 2;
        const rows = Math.ceil(diag / gapY) + 2;
        for (let r = -rows; r <= rows; r++)
          for (let c = -cols; c <= cols; c++)
            ctx.fillText(wmText, c * gapX, r * gapY);
        ctx.restore();
        canvas.toBlob(blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
      };
      img.src = url;
    });
  }

  async function handleImageSelect(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 10 - filePreviews.length;
    const sliced = files.slice(0, remaining);
    const toAdd = await Promise.all(sliced.map(async file => {
      const resized = await resizeImage(file);
      return { preview: URL.createObjectURL(resized), file: resized };
    }));
    setFilePreviews(prev => [...prev, ...toAdd]);
    e.target.value = '';
  }

  function removePreview(idx) {
    setFilePreviews(prev => prev.filter((_, i) => i !== idx));
    setRepIdx(prev => (prev >= idx && prev > 0 ? prev - 1 : prev === idx ? 0 : prev));
  }

  function handleFormChange(key, value) {
    setFormValues(prev => ({ ...prev, [key]: value }));
  }

  function applyBuildingData(fields) {
    setFormValues(prev => ({ ...prev, ...fields }));
  }

  useEffect(() => {
    if (isEdit && initialValues) {
      setFormValues(initialValues);
      if (initialValues.imageUrls?.length) {
        setFilePreviews(initialValues.imageUrls.map(url => ({ preview: url, url })));
        setRepIdx(0);
      } else if (initialValues.imageUrl) {
        setFilePreviews([{ preview: initialValues.imageUrl, url: initialValues.imageUrl }]);
        setRepIdx(0);
      }
    } else {
      setFormValues(prev => ({ ...prev, property_id: generatePropertyId() }));
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          const typeMap = Object.fromEntries(DEFAULT_FIELDS.map(f => [f.id, f.type]));
          const fixed = parsed.map(f => typeMap[f.id] ? { ...f, type: typeMap[f.id] } : f);
          const savedIds = new Set(fixed.map(f => f.id));
          const defaultIds = DEFAULT_FIELDS.map(f => f.id);
          const merged = [...fixed];
          for (const nf of DEFAULT_FIELDS.filter(f => !savedIds.has(f.id))) {
            const di = defaultIds.indexOf(nf.id);
            let at = merged.length;
            for (let i = di - 1; i >= 0; i--) {
              const pi = merged.findIndex(f => f.id === defaultIds[i]);
              if (pi !== -1) { at = pi + 1; break; }
            }
            merged.splice(at, 0, nf);
          }
          setFields(merged);
          return;
        }
      }
    } catch {}
    setFields(DEFAULT_FIELDS);
  }, []);

  function save(updated) {
    setSaveStatus('저장 중…');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSaveStatus('✓ 저장됨');
    }, 500);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragStart({ active }) { setActiveId(active.id); }

  function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setFields(prev => {
      const updated = arrayMove(prev, prev.findIndex(f => f.id === active.id), prev.findIndex(f => f.id === over.id));
      save(updated);
      return updated;
    });
  }

  function handleDelete(id) {
    setFields(prev => { const u = prev.filter(f => f.id !== id); save(u); return u; });
  }

  function handleAddSpacer() {
    const f = { id: `spacer_${Date.now()}`, label: '여백', type: 'spacer' };
    setFields(prev => { const u = [...prev, f]; save(u); return u; });
  }

  function handleAddField() {
    if (!newLabel.trim()) return;
    const f = {
      id: `custom_${Date.now()}`,
      label: newLabel.trim(),
      type: newType,
      options: ['select', 'radio', 'multicheck'].includes(newType) ? ['옵션1', '옵션2'] : undefined,
    };
    setFields(prev => { const u = [...prev, f]; save(u); return u; });
    setNewLabel(''); setNewType('text'); setShowAddPanel(false);
  }

  async function handleSubmit() {
    if (saving) return;
    setSaving(true); setMsg('');

let uploadedUrls = [];
    if (filePreviews.length > 0) {
      let uploadFailed = 0;
      let lastError = '';
      if (filePreviews.some(p => p.file)) setMsg('📤 사진 업로드 중...');
      for (const item of filePreviews) {
        if (item.url) {
          uploadedUrls.push(item.url);
        } else if (item.file) {
          const fd = new FormData();
          fd.append('file', item.file);
          try {
            const r = await fetch('/api/upload', { method: 'POST', body: fd });
            if (r.ok) { const d = await r.json(); if (d.secure_url) uploadedUrls.push(d.secure_url); else { uploadFailed++; lastError = d.error || ''; } }
            else { const d = await r.json().catch(() => ({})); uploadFailed++; lastError = d.error || `HTTP ${r.status}`; }
          } catch (e) { uploadFailed++; lastError = e.message; }
        }
      }
      if (uploadFailed > 0) {
        setMsg(`⚠️ 사진 ${uploadFailed}개 업로드 실패${lastError ? ': ' + lastError : ''} — 나머지로 저장합니다.`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    setMsg(isEdit ? '📋 수정 저장 중...' : '📋 노션 DB 저장 중...');
    try {
      const payload = { ...formValues, imageUrls: uploadedUrls, imageUrl: uploadedUrls[repIdx] || uploadedUrls[0] || '' };
      const url     = isEdit ? `/api/dse-sale/${pageId}` : '/api/dse-sale/register';
      const method  = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        setMsg(isEdit ? `✅ 수정 완료! (${formValues.property_id}) — 사진 ${uploadedUrls.length}장 저장` : `✅ 등록 완료! (${formValues.property_id}) — 사진 ${uploadedUrls.length}장`);
        if (isEdit) {
          try {
            sessionStorage.setItem(pageId + '_fresh_form', JSON.stringify({ ...formValues, imageUrl: payload.imageUrl, imageUrls: uploadedUrls }));
          } catch {}
          setTimeout(() => onBack(), 800);
        }
        else {
          setFilePreviews([]); setRepIdx(0);
          setFormValues({ ...INITIAL_FORM(), property_id: generatePropertyId() });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg(`❌ ${isEdit ? '수정' : '저장'} 실패: ${err.error || '알 수 없는 오류'}`);
      }
    } catch (e) { setMsg(`❌ 오류: ${e.message}`); }
    setSaving(false);
  }

  const activeField = fields.find(f => f.id === activeId);

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.topLeft}>
          <button className={styles.backBtn} onClick={onBack}>← 관리자2</button>
          <span className={styles.topTitle}>다세대 매매 — {editMode ? '레이아웃 편집' : isEdit ? '수정' : '등록'}</span>
        </div>
        <div className={styles.topRight}>
          {editMode ? (
            <>
              <span className={styles.saveStatus}>{saveStatus}</span>
              <button className={styles.spacerBtn} onClick={handleAddSpacer}>＋ 여백</button>
              <button className={styles.addBtn} onClick={() => setShowAddPanel(v => !v)}>＋ 필드 추가</button>
              <button className={styles.resetBtn} onClick={() => { if (window.confirm('레이아웃을 기본값으로 초기화할까요?')) { setFields(DEFAULT_FIELDS); localStorage.removeItem(STORAGE_KEY); } }}>초기화</button>
              <button className={styles.editDoneBtn} onClick={() => { setEditMode(false); setShowAddPanel(false); }}>완료</button>
            </>
          ) : (
            <>
              <button className={styles.editLayoutBtn} onClick={() => setEditMode(true)}>레이아웃 편집</button>
              <button className={styles.previewBtn} onClick={() => setShowPreview(true)}>미리보기</button>
              <button className={styles.submitBtn} style={{ padding: '6px 18px', fontSize: 13 }} onClick={handleSubmit} disabled={saving}>{saving ? '저장 중…' : '매물등록하기'}</button>
            </>
          )}
        </div>
      </div>

      <div className={`${styles.canvas} ${showAddPanel ? styles.canvasShift : ''}`}>
                  {!editMode && <BuildingLookup 종류="다세대" 거래유형="매매" onApply={applyBuildingData} />}
<div className={styles.formCard}>
          {editMode ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                {fields.map(field => (
                  <SortableRow key={field.id} field={field} onDelete={handleDelete} formValues={formValues} onFormChange={handleFormChange} />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeField ? (
                  activeField.type === 'spacer' ? (
                    <div className={`${styles.spacerRow} ${styles.rowOverlay}`}>
                      <div className={styles.spacerRowInner}>
                        <div className={styles.spacerLine} />
                        <span className={styles.spacerText}>여백</span>
                        <div className={styles.spacerLine} />
                      </div>
                    </div>
                  ) : (
                    <div className={`${styles.row} ${styles.rowOverlay}`}>
                      <span className={styles.dragHandle}>⠿</span>
                      <div className={styles.labelCell}>{activeField.label}</div>
                      <div className={styles.inputCell} style={{ color: '#bbb', fontSize: 13 }}>— 이동 중 —</div>
                    </div>
                  )
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            fields.map(field => {
              if (field.type === 'photos') {
                return <PhotoSection key={field.id} filePreviews={filePreviews} repIdx={repIdx} setRepIdx={setRepIdx} onImageSelect={handleImageSelect} onRemove={removePreview} />;
              }
              return <FormRow key={field.id} field={field} formValues={formValues} onFormChange={handleFormChange} />;
            })
          )}
          {!editMode && (
            <>
              <div className={styles.row} style={{ background: '#f5f0eb', borderTop: '2px solid #c9a87c' }}>
                <div className={styles.labelCell} style={{ color: '#7a4f2d', fontWeight: 700 }}>
                  🔒 관리자메모
                  <span style={{ display: 'block', fontSize: 11, color: '#aaa', fontWeight: 400 }}>미노출</span>
                </div>
                <div className={styles.inputCell}>
                  <textarea
                    className={styles.textarea}
                    placeholder="관리자 전용 — 홈페이지에 표시되지 않습니다"
                    value={formValues.admin_memo || ''}
                    onChange={e => handleFormChange('admin_memo', e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.row} style={{ background: '#f5f0eb' }}>
                <div className={styles.labelCell} style={{ color: '#7a4f2d', fontWeight: 700 }}>
                  📅 매물 등록일
                  <span style={{ display: 'block', fontSize: 11, color: '#aaa', fontWeight: 400 }}>미노출</span>
                </div>
                <div className={styles.inputCell}>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="예: 2024-01-15"
                    value={formValues.registered_date || ''}
                    onChange={e => handleFormChange('registered_date', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {!editMode && (
          <div className={styles.submitArea}>
            <button className={styles.submitBtn} onClick={handleSubmit} disabled={saving}>
              {saving ? '저장 중…' : isEdit ? '수정완료' : '등록하기'}
            </button>
            {msg && <p className={styles.submitMsg}>{msg}</p>}
          </div>
        )}
      </div>

      {showAddPanel && (
        <div className={styles.addPanel}>
          <div className={styles.addPanelHeader}>
            <span className={styles.addPanelTitle}>필드 추가</span>
            <button className={styles.addPanelClose} onClick={() => setShowAddPanel(false)}>×</button>
          </div>
          <div className={styles.addPanelBody}>
            <input className={styles.addFieldInput} placeholder="필드 이름 입력" value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddField()} autoFocus />
            {FIELD_TYPES.map(ft => (
              <button key={ft.type} className={`${styles.typeBtn} ${newType === ft.type ? styles.typeBtnSelected : ''}`} onClick={() => setNewType(ft.type)}>
                <span className={styles.typeBtnIcon}>{ft.icon}</span>
                <span className={styles.typeBtnLabel}>{ft.label}</span>
              </button>
            ))}
            <button className={styles.confirmAddBtn} onClick={handleAddField}>추가하기</button>
          </div>
        </div>
      )}

      {showPreview && (
        <PreviewModal fields={fields} formValues={formValues} filePreviews={filePreviews} repIdx={repIdx} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}
