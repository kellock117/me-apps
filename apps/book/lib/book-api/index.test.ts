import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import kakao from './fixtures/kakao-search-1984.json';
import { searchBooks } from '.';

function stubFetch(nlk: () => Response | Promise<Response>) {
  vi.stubGlobal('fetch', async (u: URL | string) => (String(u).includes('dapi.kakao.com') ? new Response(JSON.stringify(kakao)) : nlk()));
}

describe('searchBooks', () => {
  beforeEach(() => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'k');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('LIBRARY_API_KEY가 없으면 쪽수는 null, 후보는 그대로', async () => {
    vi.stubEnv('LIBRARY_API_KEY', '');
    stubFetch(() => new Response('{}'));
    const books = await searchBooks('1984');
    expect(books.length).toBeGreaterThan(0);
    expect(books.every((b) => b.pages === null)).toBe(true);
  });
  it('쪽수를 채운다', async () => {
    vi.stubEnv('LIBRARY_API_KEY', 'x');
    stubFetch(() => new Response(JSON.stringify({ docs: [{ PAGE: '448' }] })));
    const books = await searchBooks('1984');
    expect(books.filter((b) => b.isbn13).every((b) => b.pages === 448)).toBe(true);
  });
  it('조회가 실패해도 후보는 나온다', async () => {
    vi.stubEnv('LIBRARY_API_KEY', 'x');
    stubFetch(() => new Response('x', { status: 500 }));
    const books = await searchBooks('1984');
    expect(books.length).toBeGreaterThan(0);
    expect(books.every((b) => b.pages === null)).toBe(true);
  });
});
