/** PostgREST가 한 번에 돌려주는 기본 상한(1000행). 이보다 작은 값으로 나눠 읽는다. */
export const PAGE_SIZE = 1000;

type Page<T> = { data: T[] | null; error: { message: string } | null };

/**
 * `.range(from, to)`로 끝까지 페이지를 이어 읽는다. 상한에서 조용히 잘리지 않게 하려는 것이다.
 * `fetchPage`는 같은 정렬로 [from, to] 구간을 돌려줘야 한다(정렬이 흔들리면 행이 겹치거나 빠진다).
 * 읽기에 실패하면 던진다: 일부만 읽은 채 계산하면 알림이 조용히 빠진다.
 */
export async function readAllPages<T>(what: string, fetchPage: (from: number, to: number) => PromiseLike<Page<T>>, pageSize = PAGE_SIZE): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw new Error(`${what}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}
