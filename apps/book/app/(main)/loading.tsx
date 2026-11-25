/**
 * 화면을 옮기는 동안(서버가 데이터를 읽는 동안) 보이는 로딩 표시. 맨 위 가는 막대와 "불러오는 중" 글자.
 * (main) 안의 모든 화면이 같이 쓴다. 레이아웃은 그대로 두고 본문 자리만 바꾼다.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="py-16 text-center text-sm text-muted">
      <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-line">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
      </div>
      불러오는 중…
    </div>
  );
}
