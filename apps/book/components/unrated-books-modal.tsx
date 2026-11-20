'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

const key = (memberId: string) => `book:unrated-modal-day:${memberId}`; // 멤버별로 기억한다(한 기기를 나눠 써도 각자 뜬다)

/**
 * 홈의 미평점 책 모달. 로그인한 멤버에게만 렌더링된다(게스트·미평점 없음이면 홈이 아예 그리지 않는다).
 * 오늘(서울 날짜) 아직 안 닫았으면 홈에 들어올 때 한 번 뜨고, 닫으면(바깥·Esc·책 이동 포함) 이 기기에서 오늘은 다시 안 뜬다.
 * 날짜는 서버가 서울 기준으로 내려 준다(브라우저 시간대에 흔들리지 않게).
 */
export function UnratedBooksModal({ books, today, memberId }: { books: { id: string; title: string }[]; today: string; memberId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(key(memberId)) === today) return;
    } catch {} // 저장소를 못 써도(시크릿 모드 등) 모달은 보여 준다
    dialog.current?.showModal();
  }, [today, memberId]);

  const remember = () => {
    try {
      localStorage.setItem(key(memberId), today);
    } catch {}
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="unrated-title"
      onClose={remember}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <div className="relative space-y-4 p-5">
        <button type="button" onClick={() => dialog.current?.close()} aria-label="닫기" className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full text-muted">
          ✕
        </button>
        <h2 id="unrated-title" className="pr-10 font-serif text-lg font-bold">
          아직 별점을 안 남긴 책이 {books.length}권 있어요
        </h2>
        <ul className="flex flex-wrap gap-2">
          {books.map((b) => (
            <li key={b.id}>
              <Link href={`/books/${b.id}`} onClick={remember} className="inline-flex min-h-11 items-center rounded-full border border-accent bg-surface px-3.5 text-sm font-medium">
                {b.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
