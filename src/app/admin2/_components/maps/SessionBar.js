'use client';

import { useState } from 'react';
import styles from './SessionBar.module.css';

export default function SessionBar({
  sessions,
  activeId,
  onSelect,
  onSaveNew,
  onRename,
  onDelete,
  loading,
}) {
  const [draftName, setDraftName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');

  const handleSave = () => {
    const name = draftName.trim();
    if (!name) {
      alert('저장할 이름을 입력해주세요.');
      return;
    }
    onSaveNew(name);
    setDraftName('');
  };

  const handleRename = (id) => {
    const name = renameDraft.trim();
    if (!name) {
      setRenamingId(null);
      return;
    }
    onRename(id, name);
    setRenamingId(null);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.saveRow}>
        <input
          className={styles.saveInput}
          placeholder="이 지도를 저장할 이름..."
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
        />
        <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
          💾 저장
        </button>
      </div>

      <div className={styles.listWrap}>
        {sessions.length === 0 ? (
          <div className={styles.empty}>저장된 지도가 없습니다.</div>
        ) : (
          <ul className={styles.list}>
            {sessions.map((s) => (
              <li
                key={s.id}
                className={`${styles.item} ${s.id === activeId ? styles.active : ''}`}
              >
                {renamingId === s.id ? (
                  <input
                    autoFocus
                    className={styles.renameInput}
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={() => handleRename(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(s.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                  />
                ) : (
                  <button
                    className={styles.itemName}
                    onClick={() => onSelect(s.id)}
                    title={s.name}
                  >
                    📍 {s.name}
                  </button>
                )}
                <div className={styles.itemActions}>
                  <button
                    className={styles.iconBtn}
                    onClick={() => {
                      setRenamingId(s.id);
                      setRenameDraft(s.name);
                    }}
                    title="이름 변경"
                  >
                    ✎
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.delBtn}`}
                    onClick={() => {
                      if (confirm(`"${s.name}" 지도를 삭제할까요? (모든 핀이 함께 삭제됩니다)`)) {
                        onDelete(s.id);
                      }
                    }}
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
