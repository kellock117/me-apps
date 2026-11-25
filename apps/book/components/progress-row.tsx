'use client';

import { useActionState, useEffect, useState } from 'react';
import { saveProgress, type ProgressState } from '@/app/(main)/books/[id]/progress-actions';

type Props = {
  bookId: string;
  week: number;
  /** 화면에 보일 기준일(예: 2026년 11월 14일) */
  dueLabel: string;
  /** 기준일이 됐는가(열렸는가) */
  open: boolean;
  /** 가장 최근에 열린 주차(입력 칸을 강조한다) */
  current: boolean;
  /** 저장된 누적 쪽수. 아직 안 적었으면 null */
  saved: number | null;
  totalPages: number | null;
  /** 읽는 중이 아닌 책: 값만 보여 주고 고칠 수 없다 */
  readOnly: boolean;
};

/**
 * 진도 입력 한 줄. 열린 주차는 입력 칸 + ✓(저장). 저장한 줄은 값이 잠기고 "되돌리기"로 수정 상태로 푼다(값은 ✓로 다시 저장할 때까지 그대로).
 * 같은 규칙을 서버 액션이 다시 검사하므로 화면은 편의일 뿐이다.
 */
export function ProgressRow({ bookId, week, dueLabel, open, current, saved, totalPages, readOnly }: Props) {
  const [state, action, pending] = useActionState<ProgressState, FormData>(saveProgress, {});
  const [editing, setEditing] = useState(saved === null);
  const [value, setValue] = useState(saved === null ? '' : String(saved));
  // 저장에 성공하면 다시 잠그고, 서버가 새 값을 내려 주면 입력 칸에 맞춘다
  useEffect(() => {
    if (state.saved === undefined) return;
    setEditing(false);
    setValue(String(state.saved)); // 칸에는 서버가 받은 값만 남긴다
  }, [state]);
  useEffect(() => setValue(saved === null ? '' : String(saved)), [saved]);

  const head = (
    <div className="w-24 shrink-0">
      <p className="font-medium">{week}주차</p>
      <p className="text-xs text-muted">{dueLabel}</p>
    </div>
  );
  const done = saved !== null && totalPages !== null && saved >= totalPages;

  if (readOnly) {
    return (
      <li className="flex items-center gap-3 py-2">
        {head}
        <p className="tabular-nums">{saved === null ? <span className="text-muted">—</span> : `${saved}쪽`}{done && <span className="ml-2 text-sm font-medium text-accent">완독</span>}</p>
      </li>
    );
  }

  const locked = !open;
  const highlighted = current && editing;
  return (
    <li className="py-2">
      <form action={action} className="flex items-center gap-3">
        <input type="hidden" name="bookId" value={bookId} />
        <input type="hidden" name="week" value={week} />
        {head}
        <input
          name="pages"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={`${week}주차 읽은 쪽수`}
          placeholder={locked ? '아직이에요' : '누적 쪽수'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={locked || !editing}
          className={`min-h-11 min-w-0 flex-1 rounded-xl border bg-surface px-3 tabular-nums disabled:opacity-60 ${highlighted ? 'border-accent ring-2 ring-accent' : 'border-line'}`}
        />
        {editing ? (
          <button
            key="save"
            type="submit"
            aria-label={`${week}주차 저장`}
            disabled={locked || pending || value.trim() === ''}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink disabled:opacity-40"
          >
            ✓
          </button>
        ) : (
          // key가 달라야 한다: 같은 자리의 버튼이 button → submit으로 바뀌면 이 클릭이 폼을 옛 값으로 제출해 버린다
          <button key="undo" type="button" onClick={() => setEditing(true)} className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line px-3 text-sm">
            되돌리기
          </button>
        )}
      </form>
      {state.error && editing && (
        <p role="alert" className="mt-1 pl-[6.75rem] text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      {!editing && (state.warning || done) && (
        <p className="mt-1 pl-[6.75rem] text-sm text-muted">
          {done && <span className="font-medium text-accent">완독</span>}
          {done && state.warning && ' · '}
          {state.warning}
        </p>
      )}
    </li>
  );
}
