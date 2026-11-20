'use client';

/**
 * 확인 창(ask)과 토스트(toast)를 한 번에 제공하는 훅. 쓰는 쪽은 `node`를 화면 어딘가에 그려 두면 된다.
 *
 * - ask: "정말 지울까요?" 같은 확인. danger=true면 확인 버튼이 빨강. Esc나 바깥을 누르면 취소.
 * - toast: 닫기 버튼(✕)으로만 닫히는 알림. 여러 개가 쌓이고 각각 따로 닫는다. 버튼(예: 되돌리기)을 달 수 있다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface Dialog {
  title: string;
  text: string;
  ok: string;
  danger: boolean;
  cb: () => void;
}
interface ToastState {
  id: number;
  text: string;
  btn?: string;
  cb?: () => void;
}

export interface Overlays {
  ask: (title: string, text: string, ok: string, cb: () => void, danger?: boolean) => void;
  toast: (text: string, btn?: string, cb?: () => void) => void;
  node: React.ReactNode;
}

export function useOverlays(): Overlays {
  const [dlg, setDlg] = useState<Dialog | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const nextId = useRef(0);
  const okRef = useRef<HTMLButtonElement>(null);

  const ask = useCallback<Overlays['ask']>((title, text, ok, cb, danger = false) => setDlg({ title, text, ok, danger, cb }), []);
  const toast = useCallback<Overlays['toast']>((text, btn, cb) => {
    // 되돌리기 콜백은 만든 시점의 위치를 기억하므로, 새 되돌리기가 오면 옛 되돌리기 알림은 치운다(어긋난 위치에 끼워 넣지 않게)
    setToasts((prev) => [...(btn ? prev.filter((x) => !x.btn) : prev), { id: nextId.current++, text, btn, cb }]);
  }, []);

  // 확인 창이 뜨면 확인 버튼에 포커스, Esc로 닫기
  useEffect(() => {
    if (!dlg) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDlg(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dlg]);

  const node = (
    <>
      {dlg && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setDlg(null)}>
          <div className="box" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
            <h3 id="dlg-title">{dlg.title}</h3>
            <p>{dlg.text}</p>
            <div className="mact">
              <button type="button" className="btn" onClick={() => setDlg(null)}>
                취소
              </button>
              <button
                ref={okRef}
                type="button"
                className={`btn ${dlg.danger ? 'danger' : 'pri'}`}
                onClick={() => {
                  const f = dlg.cb;
                  setDlg(null);
                  f();
                }}
              >
                {dlg.ok}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.text}</span>
            {t.btn && (
              <button
                type="button"
                onClick={() => {
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                  t.cb?.();
                }}
              >
                {t.btn}
              </button>
            )}
            <button type="button" className="tclose" aria-label="알림 닫기" onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </>
  );

  return { ask, toast, node };
}
