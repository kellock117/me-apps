'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import type { Notice } from '@/lib/notices';

/**
 * 헤더의 🔔 버튼(프로필 왼쪽)과 드롭다운. 로그인한 멤버에게만 레이아웃이 그린다(게스트는 계산도 하지 않는다).
 * 배지 = 알림 개수(0이면 없음). 줄을 누르면 그 화면으로 간다. 눌러도 알림은 없어지지 않는다(할 일을 해야 사라진다).
 * 바깥을 누르거나 Esc, 화면 이동이면 닫힌다. 패널은 헤더(relative) 아래로 펼쳐진다.
 */
export function NoticeBell({ notices }: { notices: Notice[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const count = notices.length;
  return (
    <div ref={box}>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={count > 0 ? `알림 ${count}개` : '알림 없음'}
        className="relative inline-flex size-11 items-center justify-center rounded-full text-xl"
      >
        <span aria-hidden>🔔</span>
        {count > 0 && (
          <span aria-hidden className="absolute right-0.5 top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold leading-5 text-accent-ink">
            {count}
          </span>
        )}
      </button>
      {open && (
        <div id={panelId} className="absolute inset-x-4 top-full z-40 mt-2 rounded-2xl border border-line bg-surface p-2 shadow-lg">
          {count === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted">할 일이 없어요</p>
          ) : (
            <ul className="divide-y divide-line">
              {notices.map((n) => (
                <li key={n.key}>
                  <Link href={n.href} onClick={() => setOpen(false)} className="flex min-h-12 flex-col justify-center rounded-xl px-3 py-2">
                    <span className="text-sm font-medium">{n.kind === 'rate' ? '별점을 남겨 주세요' : `${n.week}주차 진도를 적어 주세요`}</span>
                    <span className="truncate text-xs text-muted">{n.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
