/**
 * "오늘의 문장" 선택 규칙. 순수 함수만 둔다(DB·시각·난수는 호출하는 쪽이 넘긴다).
 *
 * - 오늘의 문장: 서울 날짜가 같으면 모두에게 같은 문장. 문장 id를 정렬한 뒤 날짜 문자열의 해시로 고른다
 *   (목록 순서·불러온 순서에 영향받지 않는다). 문장이 늘거나 줄면 같은 날에도 바뀔 수 있다.
 * - 다른 문장 보기: 이미 본 문장을 뺀 나머지에서 무작위. 다 봤으면 처음부터(오늘의 문장부터) 다시 돈다.
 */

/** 문자열 → 0 이상의 정수 (FNV-1a). 같은 문자열은 항상 같은 값. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** 서울 날짜(YYYY-MM-DD)에 맞는 오늘의 문장 id. 문장이 없으면 null. */
export function quoteIdForDay(ids: readonly string[], date: string): string | null {
  if (ids.length === 0) return null;
  const sorted = [...ids].sort();
  return sorted[hash(date) % sorted.length]!;
}

/**
 * 아직 안 본 문장 중 무작위로 하나. 안 본 문장이 없으면 처음부터 다시 도는 것이므로 restarted=true로 알린다
 * (호출하는 쪽은 그때 본 목록을 비운다). seen에 이미 지워진 문장 id가 있어도 무시한다.
 * @param random 0 이상 1 미만을 돌려주는 함수(테스트에서 고정값을 넣는다)
 */
export function nextQuoteId(ids: readonly string[], seen: readonly string[], random: () => number): { id: string; restarted: boolean } | null {
  if (ids.length === 0) return null;
  const seenSet = new Set(seen);
  const unseen = [...ids].sort().filter((id) => !seenSet.has(id));
  if (unseen.length === 0) {
    // 다 봤다: 처음부터 다시 돈다. 방금 본 문장(seen의 마지막)이 바로 또 나오지 않게 뺀다(문장이 하나뿐이면 어쩔 수 없다).
    const last = seen.at(-1);
    const pool = [...ids].sort().filter((id) => id !== last);
    const from = pool.length > 0 ? pool : [...ids];
    return { id: from[Math.floor(random() * from.length)]!, restarted: true };
  }
  return { id: unseen[Math.floor(random() * unseen.length)]!, restarted: false };
}
