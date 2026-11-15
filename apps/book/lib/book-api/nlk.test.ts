import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from './fixtures/nlk-1984.json';
import { fetchNlkPages, parseNlkPage } from './nlk';

describe('parseNlkPage', () => {
  it('여러 표기에서 쪽수를 뽑는다', () => {
    expect(parseNlkPage('448')).toBe(448);
    expect(parseNlkPage('328p.')).toBe(328);
    expect(parseNlkPage('xii, 320 p.')).toBe(320);
    expect(parseNlkPage(256)).toBe(256);
  });
  it('조사에서 나온 모양은 첫 숫자(본문 쪽수)를 쓴다', () => {
    expect(parseNlkPage('167 p.')).toBe(167);
    expect(parseNlkPage('328, 16 p.')).toBe(328);
    expect(parseNlkPage('309, [22] p.')).toBe(309);
    expect(parseNlkPage('약 300페이지 내외')).toBe(300);
    expect(parseNlkPage('xiii, 250 p.')).toBe(250);
    expect(parseNlkPage('338 p., 도판 [1]장 (접지)')).toBe(338);
  });
  it('없거나 이상하면 null', () => {
    expect(parseNlkPage('')).toBeNull();
    expect(parseNlkPage('0')).toBeNull();
    expect(parseNlkPage('99999')).toBeNull();
    expect(parseNlkPage(undefined)).toBeNull();
    expect(parseNlkPage(null)).toBeNull();
  });
});

describe('fetchNlkPages', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('실제 응답 모양에서 쪽수를 읽는다', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(fixture)));
    vi.stubGlobal('fetch', f);
    expect(await fetchNlkPages('k', '9788937460777')).toBe(448);
    const url = String((f.mock.calls[0] as unknown[])[0]);
    expect(url).toContain('isbn=9788937460777');
  });
  it('HTTP 오류·빈 결과·예외는 null', async () => {
    vi.stubGlobal('fetch', async () => new Response('x', { status: 500 }));
    expect(await fetchNlkPages('k', '1')).toBeNull();
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ TOTAL_COUNT: '0', docs: [] })));
    expect(await fetchNlkPages('k', '1')).toBeNull();
    vi.stubGlobal('fetch', async () => {
      throw new Error('timeout');
    });
    expect(await fetchNlkPages('k', '1')).toBeNull();
  });
});
