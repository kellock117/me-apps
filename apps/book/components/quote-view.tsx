'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { getDailyQuote, type DailyQuote } from '@/app/(main)/quotes/actions';
import { Cover } from '@/components/cover';
import { fmtScore } from '@/lib/format';

/**
 * 문장 탭(`/quotes`)의 본문. 처음 문장(오늘의 문장)은 서버가 그려서 넘기고,
 * "다른 문장"을 누르면 서버 액션으로 하나씩 더 가져온다(문장 전체를 내려보내지 않는다).
 * 다 보면 처음부터 다시 돈다.
 */
export function QuoteView({ initial }: { initial: DailyQuote }) {
  const [quote, setQuote] = useState<DailyQuote>(initial);
  const [failed, setFailed] = useState(false);
  const [seen, setSeen] = useState<string[]>([initial.id]);
  const [pending, start] = useTransition();
  const requestNo = useRef(0); // 가장 최근 요청의 답만 반영한다(연달아 눌렀을 때 옛 답이 덮어쓰지 않게)

  const next = () => {
    const no = ++requestNo.current;
    start(async () => {
      try {
        const q = await getDailyQuote(seen);
        if (no !== requestNo.current) return;
        if (!q) return setFailed(true);
        setFailed(false);
        setQuote(q);
        setSeen(q.restarted ? [q.id] : [...seen, q.id]); // 다 봤으면 처음부터 다시 센다
      } catch {
        if (no === requestNo.current) setFailed(true);
      }
    });
  };

  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 ${pending ? 'opacity-60' : ''}`} aria-busy={pending}>
      <div className="flex gap-4">
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

      {failed && (
        <p role="alert" className="mt-4 text-sm text-muted">
          문장을 불러오지 못했어요. 잠시 뒤에 다시 해 주세요.
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        {quote.total > 1 ? (
          <button type="button" disabled={pending} onClick={next} className="min-h-11 rounded-xl border border-line px-4 text-sm font-medium disabled:opacity-60">
            다른 문장
          </button>
        ) : (
          <span />
        )}
        <Link href={`/books/${quote.book.id}`} className="flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink">
          책 보러 가기
        </Link>
      </div>
    </div>
  );
}
