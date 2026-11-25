'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { dismissAllNotices, dismissNotice, type DismissResult } from '@/app/(main)/notice-actions';
import { PushToggle } from '@/components/push-toggle';
import type { Notice } from '@/lib/notices';

/**
 * 헤더의 🔔 버튼(프로필 왼쪽)과 드롭다운. 로그인한 멤버에게만 레이아웃이 그린다(게스트는 계산도 하지 않는다).
 * 배지 = 알림 개수(0이면 없음). 줄을 누르면 그 화면으로 간다. 눌러도 알림은 없어지지 않는다(할 일을 하거나 "읽음"으로 숨겨야 사라진다).
 * 진도 알림 줄에만 "읽음"이 있고, 패널 위 "모두 읽음"은 진도 알림만 숨긴다(평점 알림은 숨길 수 없다). 서버 액션이 화면을 새로 그린다.
 * 맨 아래에는 이 기기의 푸시 알림을 켜고 끄는 줄이 있다(push가 null이면 서버에 VAPID 키가 없어 줄도 없다).
 * 바깥을 누르거나 Esc, 화면 이동이면 닫힌다. 패널은 헤더(relative) 아래로 펼쳐진다.
 */
export function NoticeBell({ notices, push }: { notices: Notice[]; push: { publicKey: string; savedEndpoints: string[] } | null }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState<string | null>(null);
  const run = (call: () => Promise<DismissResult>) =>
    start(async () => {
      try {
        const res = await call();
        setFailed(res.ok ? null : res.error);
      } catch {
        setFailed('알림을 숨기지 못했어요. 잠시 뒤에 다시 해 주세요');
      }
    });

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
  const progressKeys = notices.filter((n) => n.dismissable).map((n) => n.key);
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
        <div id={panelId} aria-busy={pending} className={`absolute inset-x-4 top-full z-40 mt-2 rounded-2xl border border-line bg-surface p-2 shadow-lg ${pending ? 'opacity-60' : ''}`}>
          {progressKeys.length > 0 && (
            <div className="flex justify-end">
              <button type="button" disabled={pending} onClick={() => run(() => dismissAllNotices(progressKeys))} className="min-h-11 rounded-xl px-3 text-sm font-medium text-accent disabled:opacity-60">
                모두 읽음
              </button>
            </div>
          )}
          {failed && (
            <p role="alert" className="px-3 pb-1 text-sm text-danger">
              {failed}
            </p>
          )}
          {count === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted">할 일이 없어요</p>
          ) : (
            <ul className="divide-y divide-line">
              {notices.map((n) => (
                <li key={n.key} className="flex items-start gap-1">
                  <Link href={n.href} onClick={() => setOpen(false)} className="flex min-h-12 min-w-0 flex-1 flex-col justify-center rounded-xl px-3 py-2">
                    <span className="text-sm font-medium">{n.kind === 'rate' ? '별점을 남겨 주세요' : `${n.week}주차 진도를 적어 주세요`}</span>
                    <span className="truncate text-xs text-muted">{n.title}</span>
                  </Link>
                  {n.dismissable && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => dismissNotice(n.key))}
                      aria-label={`${n.title} ${n.kind === 'progress' ? `${n.week}주차 ` : ''}알림 읽음`}
                      className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-medium text-muted disabled:opacity-60"
                    >
                      읽음
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {push && <PushToggle publicKey={push.publicKey} savedEndpoints={push.savedEndpoints} />}
        </div>
      )}
    </div>
  );
}
