'use client';

import Link from 'next/link';
import { useRef } from 'react';

/**
 * 읽는 책의 모임이 아직 없을 때 "진도 입력하기"를 누르면 뜨는 안내 모달.
 * 모임일이 있어야 주차를 셀 수 있어서, 모임부터 정하게 한다.
 */
export function NoMeetingDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 font-semibold text-accent-ink">
        진도 입력하기
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="no-meeting-title"
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
      >
        <div className="relative space-y-4 p-5">
          <button type="button" onClick={() => dialog.current?.close()} aria-label="닫기" className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full text-muted">
            ✕
          </button>
          <h2 id="no-meeting-title" className="pr-10 font-serif text-lg font-bold">
            모임을 먼저 정해 주세요
          </h2>
          <p className="text-sm text-muted">모임 날짜가 있어야 주차별로 진도를 적을 수 있어요.</p>
          <Link href="/meetings" className="flex min-h-12 items-center justify-center rounded-xl border border-accent px-4 font-semibold">
            모임 기록으로 가기
          </Link>
        </div>
      </dialog>
    </>
  );
}
