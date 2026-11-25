'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { Notice } from '@/lib/notices';

// 옛 미평점 모달과 같은 키를 쓴다: 바꾸면 오늘 이미 닫은 사람에게 한 번 더 뜬다. 멤버별로 기억한다(한 기기를 나눠 써도 각자 뜬다).
const key = (memberId: string) => `book:unrated-modal-day:${memberId}`;

/**
 * 홈의 "할 일" 모달(옛 미평점 책 모달을 넓힌 것). 로그인한 멤버에게만, 할 일이 있을 때만 홈이 그린다.
 * 진도와 평점을 나눠 보여 준다. 오늘(서울 날짜) 아직 안 닫았으면 홈에 들어올 때 한 번 뜨고, 닫으면(바깥·Esc·줄 이동 포함) 이 기기에서 오늘은 다시 안 뜬다.
 * force(푸시 알림의 `/?todo=1`)이면 오늘 이미 닫았어도 띄운다.
 * 날짜는 서버가 서울 기준으로 내려 준다(브라우저 시간대에 흔들리지 않게).
 */
export function TodoModal({ notices, today, memberId, force = false }: { notices: Notice[]; today: string; memberId: string; force?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try {
      // force(푸시 알림에서 들어옴)이면 하루 한 번 규칙을 넘긴다
      if (!force && localStorage.getItem(key(memberId)) === today) return;
    } catch {} // 저장소를 못 써도(시크릿 모드 등) 모달은 보여 준다
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    // 주소에 ?todo=1이 남으면 새로고침할 때마다 다시 뜬다: 한 번 띄운 뒤 지운다
    if (force) window.history.replaceState(null, '', window.location.pathname);
  }, [today, memberId, force]);

  const remember = () => {
    try {
      localStorage.setItem(key(memberId), today);
    } catch {}
  };

  const progress = notices.filter((n) => n.kind === 'progress');
  const rate = notices.filter((n) => n.kind === 'rate');

  return (
    <dialog
      ref={dialog}
      aria-labelledby="todo-title"
      onClose={remember}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <div className="relative space-y-5 p-5">
        <button type="button" onClick={() => dialog.current?.close()} aria-label="닫기" className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full text-muted">
          ✕
        </button>
        <h2 id="todo-title" className="pr-10 font-serif text-lg font-bold">
          할 일이 {notices.length}개 있어요
        </h2>
        {progress.length > 0 && (
          <TodoGroup title="진도">
            {progress.map((n) => (
              <TodoLink key={n.key} href={n.href} onClick={remember}>
                {n.title} · {n.kind === 'progress' && `${n.week}주차`}
              </TodoLink>
            ))}
          </TodoGroup>
        )}
        {rate.length > 0 && (
          <TodoGroup title={`별점을 안 남긴 책 ${rate.length}권`}>
            {rate.map((n) => (
              <TodoLink key={n.key} href={n.href} onClick={remember}>
                {n.title}
              </TodoLink>
            ))}
          </TodoGroup>
        )}
      </div>
    </dialog>
  );
}

function TodoGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      <ul className="flex flex-wrap gap-2">{children}</ul>
    </section>
  );
}

function TodoLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} onClick={onClick} className="inline-flex min-h-11 items-center rounded-full border border-accent bg-surface px-3.5 text-sm font-medium">
        {children}
      </Link>
    </li>
  );
}
