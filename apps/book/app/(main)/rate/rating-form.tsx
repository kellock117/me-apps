'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { StarPicker } from '@/components/star-picker';
import { QUOTE_MAX, REVIEW_MAX } from '@/lib/validation/rating';
import { saveRating, type RateState } from './actions';

type Existing = { score: number; review: string; quotes: string[] };
/** 문장 칸. key는 칸을 지워도 다른 칸의 글이 섞이지 않게 하려는 고유 번호 */
type QuoteCell = { key: number; text: string };

export function RatingForm({ bookId, existing }: { bookId: string; existing: Existing | null }) {
  const [state, action, pending] = useActionState<RateState, FormData>(saveRating, {});
  const initialScore = state.values?.score ? Number(state.values.score) : (existing?.score ?? 0);
  const [score, setScore] = useState(initialScore);
  const [review, setReview] = useState(state.values?.review ?? existing?.review ?? '');
  // 서버가 돌려준 오류는, 그 칸을 다시 고치면 지운다. 새 응답이 오면 다시 보여 준다.
  // 인상 깊은 문장 칸들. 처음엔 기존 문장(없으면 빈 칸 하나). 칸 수 제한은 화면에 두지 않는다.
  const nextKey = useRef(0);
  const cell = (text: string): QuoteCell => ({ key: nextKey.current++, text });
  const [cells, setCells] = useState<QuoteCell[]>(() => {
    const initial = state.values?.quotes ?? existing?.quotes ?? [];
    return (initial.length ? initial : ['']).map(cell);
  });
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => setEdited(new Set()), [state]);
  const touch = (field: string) => setEdited((prev) => new Set(prev).add(field));
  const e = Object.fromEntries(Object.entries(state.errors ?? {}).filter(([field]) => !edited.has(field))) as NonNullable<RateState['errors']>;

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="score" value={score || ''} />

      {e.bookId && (
        <p role="alert" className="text-sm font-medium text-danger">
          {e.bookId[0]}
        </p>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">별점</p>
        <StarPicker
          value={score}
          onChange={(v) => {
            setScore(v);
            touch('score');
          }}
describedBy={e.score ? 'score-error' : undefined} invalid={!!e.score} />
        {e.score && (
          <p id="score-error" role="alert" className="mt-2 text-center text-sm font-medium text-danger">
            {e.score[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="review" className="mb-2 flex items-baseline justify-between text-sm font-medium">
          <span>
            리뷰 <span className="font-normal text-muted">(선택)</span>
          </span>
          <span className="font-normal text-muted">
            {review.length}/{REVIEW_MAX}
          </span>
        </label>
        <textarea
          id="review"
          name="review"
          rows={5}
          value={review}
          onChange={(ev) => {
            setReview(ev.target.value);
            touch('review');
          }}
          maxLength={REVIEW_MAX}
          aria-invalid={e.review ? true : undefined}
          aria-describedby={e.review ? 'review-error' : undefined}
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base"
          placeholder="이 책은 어땠나요? 여러 줄로 남겨도 돼요"
        />
        {e.review && (
          <p id="review-error" role="alert" className="mt-2 text-sm font-medium text-danger">
            {e.review[0]}
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">
          인상 깊은 문장 <span className="font-normal text-muted">(선택)</span>
        </p>
        <ul className="space-y-3">
          {cells.map((c, i) => (
            <li key={c.key} className="flex items-start gap-2">
              <textarea
                name="quote"
                aria-label={`인상 깊은 문장 ${i + 1}`}
                rows={3}
                value={c.text}
                onChange={(ev) => {
                  setCells((prev) => prev.map((x) => (x.key === c.key ? { ...x, text: ev.target.value } : x)));
                  touch('quotes');
                }}
                maxLength={QUOTE_MAX}
                aria-invalid={e.quotes ? true : undefined}
                aria-describedby={e.quotes ? 'quotes-error' : undefined}
                className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-base"
              />
              <button
                type="button"
                aria-label={`문장 ${i + 1} 지우기`}
                onClick={() => {
                  // 마지막 한 칸은 지우는 대신 비운다(입력 칸이 항상 하나는 있게)
                  setCells((prev) => (prev.length <= 1 ? [cell('')] : prev.filter((x) => x.key !== c.key)));
                  touch('quotes');
                }}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:text-ink"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setCells((prev) => [...prev, cell('')])}
          className="mt-3 min-h-11 rounded-xl border border-dashed border-line px-4 text-sm font-medium text-muted hover:text-ink"
        >
          + 문장 추가
        </button>
        {e.quotes && (
          <p id="quotes-error" role="alert" className="mt-2 text-sm font-medium text-danger">
            {e.quotes[0]}
          </p>
        )}
      </div>

      {e.form && (
        <p role="alert" className="text-sm font-medium text-danger">
          {e.form[0]}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink disabled:opacity-60"
      >
        {pending ? '저장 중…' : existing ? '평점 고치기' : '평점 남기기'}
      </button>
    </form>
  );
}
