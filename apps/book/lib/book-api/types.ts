/** 책 검색 어댑터(카카오 + 국립중앙도서관 쪽수)가 공통으로 돌려주는 형태. 외부 API 필드명은 이 폴더 밖으로 나가지 않는다. */
export type BookCandidate = {
  isbn13: string | null;
  title: string; // 부제를 뗀 본제목
  authors: string[];
  translators: string[];
  publisher: string | null;
  publishedDate: string | null; // YYYY-MM-DD
  coverUrl: string | null;
  categoryName: string | null; // 카카오는 주지 않아 항상 null
  description: string | null;
  pages: number | null; // 카카오 검색에는 없어서 국립중앙도서관 ISBN 조회(nlk.ts)로 채운다
  source: 'kakao';
};
