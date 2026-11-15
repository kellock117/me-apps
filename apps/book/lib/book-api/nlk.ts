/**
 * 국립중앙도서관 ISBN 서지정보(seoji) 조회. 카카오 검색에 없는 "쪽수"를 채우는 데만 쓴다.
 * 인증키는 서버 환경 변수 LIBRARY_API_KEY. 이 파일의 외부 필드명(PAGE 등)은 다른 곳으로 나가지 않는다.
 */
const ENDPOINT = 'https://www.nl.go.kr/seoji/SearchApi.do';
const TIMEOUT_MS = 3000;
const CACHE_SEC = 7 * 24 * 60 * 60; // 서지 정보는 거의 안 바뀐다

/**
 * "448", "328p.", "xii, 320 p.", "328, 16 p." 같은 값에서 쪽수를 뽑는다. 숫자가 없거나 0이거나 10000 초과면 null.
 * 첫 숫자가 본문 쪽수다. 로마숫자는 숫자가 아니라 건너뛰고, 뒤따르는 "16 p.", "[22] p.", "도판 [1]장"은 무시한다.
 */
export function parseNlkPage(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const first = String(raw).match(/\d+/);
  if (!first) return null;
  const n = Number(first[0]);
  return Number.isInteger(n) && n > 0 && n <= 10000 ? n : null;
}

/** ISBN13으로 쪽수를 조회한다. 실패·결과 없음·시간 초과는 모두 null(검색 전체를 실패시키지 않는다). */
export async function fetchNlkPages(apiKey: string, isbn13: string): Promise<number | null> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('cert_key', apiKey);
  url.searchParams.set('result_style', 'json');
  url.searchParams.set('page_no', '1');
  url.searchParams.set('page_size', '1');
  url.searchParams.set('isbn', isbn13);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), next: { revalidate: CACHE_SEC } } as RequestInit);
    if (!res.ok) return null;
    const body = (await res.json()) as { docs?: { PAGE?: unknown }[] };
    return parseNlkPage(body.docs?.[0]?.PAGE);
  } catch {
    return null;
  }
}
