import { searchKakao } from './kakao';
import { fetchNlkPages } from './nlk';
import type { BookCandidate } from './types';

export type { BookCandidate } from './types';

/**
 * 책 검색. 카카오로 후보를 찾고, 국립중앙도서관 ISBN 조회로 쪽수를 채운다.
 * LIBRARY_API_KEY가 없거나 조회가 실패해도 검색은 성공하고 쪽수만 비어 있다.
 */
export async function searchBooks(query: string): Promise<BookCandidate[]> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new Error('KAKAO_REST_API_KEY가 설정되지 않았어요');
  const books = await searchKakao(key, query);

  const libraryKey = process.env.LIBRARY_API_KEY;
  if (!libraryKey) return books;
  return Promise.all(
    books.map(async (b) => (b.isbn13 ? { ...b, pages: await fetchNlkPages(libraryKey, b.isbn13) } : b)),
  );
}
