'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { getDailyQuote, type DailyQuote } from '@/app/(main)/daily-quote-action';
import { Cover } from '@/components/cover';
import { fmtScore } from '@/lib/format';

/**
 * 홈의 "오늘의 문장" 버튼과 모달.
 * 버튼을 눌렀을 때만 모달이 뜨고, 문장은 서버에서 하나씩 가져온다(홈에 문장 전체를 내려보내지 않는다).
 * 닫았다 다시 열면 본 목록을 비우고 오늘의 문장부터 다시 시작한다.
 */
export function DailyQuoteButton() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [quote, setQuote] = useState<DailyQuote | null>(null);
  const [failed, setFailed] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const requestNo = useRef(0); // 가장 최근 요청의 답만 반영한다(닫았다 다시 열었을 때 옛 답이 덮어쓰지 않게)

  const load = (from: string[]) => {
    const no = ++requestNo.current;
    start(async () => {
      try {
        const q = await getDailyQuote(from);
        if (no !== requestNo.current) return;
        if (!q) return setFailed(true);
        setFailed(false);
        setQuote(q);
        setSeen(q.restarted ? [q.id] : [...from, q.id]); // 다 봤으면 처음부터 다시 센다
      } catch {
        if (no === requestNo.current) setFailed(true);
      }
    });
  };

  const open = () => {
    setQuote(null);
    setSeen([]);
    setFailed(false);
    dialog.current?.showModal();
    load([]);
  };

  return (
    <>
      <button type="button" onClick={open} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 font-semibold">
        <span aria-hidden>✍️</span> 오늘의 문장
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="daily-quote-title"
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()} // 바깥(어두운 영역)을 눌러도 닫힌다
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
      >
        <div className="relative p-5">
          <h2 id="daily-quote-title" className="sr-only">
            오늘의 문장
          </h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => dialog.current?.close()}
            className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full text-muted hover:text-ink"
          >
            ✕
          </button>

          {failed ? (
            <p role="alert" className="py-16 text-center text-sm text-muted">
              문장을 불러오지 못했어요. 잠시 뒤에 다시 해 주세요.
            </p>
          ) : !quote ? (
            <p className="py-16 text-center text-sm text-muted">불러오는 중…</p>
          ) : (
            <div className={pending ? 'opacity-60' : undefined} aria-busy={pending}>
              <div className="flex gap-4 pr-10">
                <div className="w-20 shrink-0">
                  <Cover title={quote.book.title} authors={quote.book.authors} genre={quote.book.genre} coverPath={quote.book.coverPath} />
                </div>
                <div className="min-w-0 flex-1 space-y-1 self-center">
                  <p className="font-serif text-lg font-bold leading-snug">{quote.book.title}</p>
                  <p className="text-sm text-muted">{quote.book.authors.join(', ') || '저자 정보 없음'}</p>
                  {quote.book.selectorName && <p className="text-sm text-muted">선정 {quote.book.selectorName}</p>}
                  <p className="text-sm tabular-nums">
                    <span aria-hidden className="text-star">★</span> {fmtScore(quote.book.avg)}{' '}
                    <span className="text-muted">{quote.book.n > 0 ? `(${quote.book.n}명)` : '평점 없음'}</span>
                  </p>
                </div>
              </div>

              <blockquote className="mt-5 whitespace-pre-wrap break-words border-l-4 border-accent pl-4 font-serif text-lg leading-relaxed">{quote.text}</blockquote>
              <p className="mt-2 pl-5 text-sm text-muted">— {quote.memberName}</p>

              <div className="mt-6 flex items-center justify-between gap-3">
                {quote.total > 1 ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => load(seen)}
                    className="min-h-11 rounded-xl border border-line px-4 text-sm font-medium disabled:opacity-60"
                  >
                    다른 문장 보기
                  </button>
                ) : (
                  <span />
                )}
                <Link href={`/books/${quote.book.id}`} className="flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink">
                  책 보러 가기
                </Link>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
