'use client';

import { useId, useRef } from 'react';

/**
 * 진도 그래프 카드 오른쪽 위의 "?" 버튼과 계산 방식 모달. 예상선(점선)과 속도 지표를 어떻게 셌는지 설명한다.
 * 홈("모두의 진도")과 책 상세("내 진도")가 같은 설명을 쓴다. 모달은 no-meeting-dialog와 같은 `<dialog>` 패턴이다.
 */
export function ProgressHelpDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label="계산 방식 보기"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-sm font-bold text-muted"
      >
        ?
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
      >
        <div className="relative space-y-4 p-5">
          <button type="button" onClick={() => dialog.current?.close()} aria-label="닫기" className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full text-muted">
            ✕
          </button>
          <h2 id={titleId} className="pr-10 font-serif text-lg font-bold">
            이렇게 계산해요
          </h2>
          <dl className="space-y-3 text-sm">
            <Item term="예상선(점선)">
              마지막으로 적은 주차의 쪽수에서 시작해, 하루 평균만큼 매일 읽는다고 보고 남은 주차의 기준일까지 이어요. 총 쪽수(100%)를 넘지 않아요. 기록이 없거나 마지막 주차까지 적었으면 그리지 않아요.
            </Item>
            <Item term="하루 평균">가장 최근에 적은 쪽수 ÷ 앞 모임일부터 그 주차 기준일까지의 일수</Item>
            <Item term="최근 주">최근 두 기록 사이에 늘어난 쪽수 ÷ 두 기준일 사이의 일수. 줄었으면 0, 기록이 하나뿐이면 하루 평균과 같아요.</Item>
            <Item term="모임까지 필요">(총 쪽수 − 가장 최근 쪽수) ÷ 오늘부터 모임일까지의 일수</Item>
          </dl>
          <p className="text-xs text-muted">모두 하루에 읽는 쪽수예요. 기준일은 각 주차 입력 칸이 열리는 날이에요.</p>
        </div>
      </dialog>
    </>
  );
}

function Item({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-semibold">{term}</dt>
      <dd className="text-muted">{children}</dd>
    </div>
  );
}
