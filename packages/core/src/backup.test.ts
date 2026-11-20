import { describe, expect, it } from 'vitest';
import { splitLegacyQuotes } from './backup-tables';
import { backupFileName, fetchAllRows, expiredBackups, latestBackup, parseBackup } from './backup';

describe('backupFileName', () => {
  it('한국 날짜로 이름을 만든다', () => {
    expect(backupFileName(new Date('2026-11-16T00:00:00Z'))).toBe('2026-11-16.json');
  });
  it('한국 00시(UTC 전날 15시)에 돌면 그날(한국) 날짜가 된다', () => {
    expect(backupFileName(new Date('2026-11-15T15:00:00Z'))).toBe('2026-11-16.json');
    expect(backupFileName(new Date('2026-11-15T14:59:00Z'))).toBe('2026-11-15.json');
  });
});

describe('expiredBackups', () => {
  const now = new Date('2026-11-16T00:00:00Z');
  it('12주(84일)보다 오래된 것만 고른다', () => {
    // 84일 전 = 2026-08-24. 그보다 이전만 만료
    const names = ['2026-08-23.json', '2026-08-24.json', '2026-11-09.json', '2026-01-05.json'];
    expect(expiredBackups(names, now).sort()).toEqual(['2026-01-05.json', '2026-08-23.json']);
  });
  it('형식이 다른 파일은 지우지 않는다', () => {
    expect(expiredBackups(['notes.txt', '2020-13-99.bak', '.emptyFolderPlaceholder'], now)).toEqual([]);
  });
});

describe('latestBackup', () => {
  it('가장 최근 날짜를 고른다', () => {
    expect(latestBackup(['2026-11-02.json', '2026-11-16.json', '2026-11-09.json', 'x.txt'])).toBe('2026-11-16.json');
  });
  it('없으면 null', () => {
    expect(latestBackup([])).toBeNull();
    expect(latestBackup(['x.txt'])).toBeNull();
  });
});

describe('parseBackup', () => {
  const empty = { members: [], books: [], meetings: [], meeting_attendees: [], ratings: [], book_interests: [] };
  const required = Object.keys(empty);
  it('올바른 백업은 통과', () => {
    const b = parseBackup(JSON.stringify({ version: 1, createdAt: '2026-11-16T00:00:00Z', tables: empty }), required);
    expect(b.tables.members).toEqual([]);
  });
  it('필수 테이블을 지정하지 않으면 없는 테이블이 있어도 통과(옛 백업 복원)', () => {
    expect(() => parseBackup(JSON.stringify({ version: 1, createdAt: 'x', tables: { members: [] } }))).not.toThrow();
  });
  it('JSON이 아니거나 형식이 다르면 이유와 함께 거절', () => {
    expect(() => parseBackup('not json')).toThrow('JSON');
    expect(() => parseBackup(JSON.stringify({ version: 2, createdAt: 'x', tables: empty }), required)).toThrow('형식');
    expect(() => parseBackup(JSON.stringify({ version: 1, createdAt: 'x', tables: { ...empty, ratings: undefined } }), required)).toThrow('ratings');
  });
});

describe('parseBackup 옛 이름 변환', () => {
  const renames = { members: 'book_members', books: 'book_books' };
  const text = (tables: object) => JSON.stringify({ version: 1, createdAt: 'x', tables });
  it('옛 이름의 테이블을 새 이름으로 바꿔서 돌려준다', () => {
    const b = parseBackup(text({ members: [{ id: 1 }], books: [] }), ['book_members', 'book_books'], renames);
    expect(Object.keys(b.tables).sort()).toEqual(['book_books', 'book_members']);
    expect(b.tables.book_members).toEqual([{ id: 1 }]);
  });
  it('새 이름 백업은 그대로 통과한다', () => {
    const b = parseBackup(text({ book_members: [{ id: 2 }], book_books: [] }), ['book_members'], renames);
    expect(b.tables.book_members).toEqual([{ id: 2 }]);
  });
  it('옛 이름과 새 이름이 같이 있으면 새 이름 쪽을 쓴다', () => {
    const b = parseBackup(text({ members: [{ id: 1 }], book_members: [{ id: 2 }] }), [], renames);
    expect(b.tables.book_members).toEqual([{ id: 2 }]);
  });
  it('변환하고도 필수 테이블이 없으면 거절한다', () => {
    expect(() => parseBackup(text({ members: [] }), ['book_books'], renames)).toThrow('tables.book_books');
  });
});

describe('fetchAllRows 페이지 읽기', () => {
  // range(from, to)를 흉내 내는 가짜 클라이언트: id 0..n-1 을 정렬된 순서로 돌려준다
  const fake = (n: number) => {
    const calls: [number, number][] = [];
    const db = {
      from: () => ({
        select: () => {
          const q = {
            order: () => q,
            range: async (from: number, to: number) => {
              calls.push([from, to]);
              const data = Array.from({ length: Math.max(0, Math.min(to + 1, n) - from) }, (_, i) => ({ id: from + i }));
              return { data, error: null };
            },
          };
          return q;
        },
      }),
    };
    return { db: db as never, calls };
  };
  it('2500행이면 3번에 나눠 빠짐·중복 없이 읽는다', async () => {
    const { db, calls } = fake(2500);
    const rows = await fetchAllRows(db, { name: 't', conflictKey: 'id' });
    expect(rows).toHaveLength(2500);
    expect(new Set(rows.map((r) => r.id)).size).toBe(2500);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });
  it('정확히 페이지 크기만큼이면 빈 페이지를 한 번 더 읽고 끝낸다', async () => {
    const { db, calls } = fake(1000);
    expect(await fetchAllRows(db, { name: 't', conflictKey: 'id' })).toHaveLength(1000);
    expect(calls).toHaveLength(2);
  });
  it('0행이면 빈 배열', async () => {
    const { db } = fake(0);
    expect(await fetchAllRows(db, { name: 't', conflictKey: 'id' })).toEqual([]);
  });
});

describe('parseBackup 옛 열 이름 변환', () => {
  const colRenames = { book_ratings: { one_liner: 'review' } };
  const make = (row: Record<string, unknown>) => JSON.stringify({ version: 1, createdAt: 'x', tables: { book_ratings: [row] } });
  it('옛 열 이름의 값을 새 열로 옮긴다', () => {
    const b = parseBackup(make({ id: 1, one_liner: '좋았다' }), [], {}, colRenames);
    expect(b.tables.book_ratings).toEqual([{ id: 1, review: '좋았다' }]);
  });
  it('옛 값이 null이면 빈 문자열(리뷰는 비어 있지 않은 열)로 바꾼다', () => {
    const b = parseBackup(make({ id: 1, one_liner: null }), [], {}, colRenames);
    expect(b.tables.book_ratings).toEqual([{ id: 1, review: '' }]);
  });
  it('새 열이 이미 있으면 그대로 둔다', () => {
    const b = parseBackup(make({ id: 1, review: '새 값', one_liner: '옛 값' }), [], {}, colRenames);
    expect(b.tables.book_ratings).toEqual([{ id: 1, review: '새 값' }]);
  });
  it('옛 이름 테이블 변환과 함께 쓸 수 있다', () => {
    const text = JSON.stringify({ version: 1, createdAt: 'x', tables: { ratings: [{ id: 1, one_liner: 'a' }] } });
    const b = parseBackup(text, [], { ratings: 'book_ratings' }, colRenames);
    expect(b.tables.book_ratings).toEqual([{ id: 1, review: 'a' }]);
  });
});

describe('splitLegacyQuotes (옛 백업의 평점당 문장 1개 → book_quotes)', () => {
  const rating = (o: Record<string, unknown>) => ({ id: 'r', book_id: 'b1', member_id: 'm1', score: 4, review: '', ...o });
  const wrap = (tables: Record<string, Record<string, unknown>[]>) => ({ version: 1 as const, createdAt: 'x', tables });
  it('quote가 있는 평점마다 첫 문장(ord 0)을 만들고, 평점 행에서 quote 열은 지운다', () => {
    const out = splitLegacyQuotes(wrap({ book_ratings: [rating({ quote: '문장' }), rating({ id: 'r2', member_id: 'm2', quote: null })] }));
    expect(out.tables.book_quotes).toEqual([{ book_id: 'b1', member_id: 'm1', ord: 0, text: '문장' }]);
    expect(out.tables.book_ratings!.every((r) => !('quote' in r))).toBe(true);
  });
  it('빈 문자열·공백뿐인 quote는 문장으로 만들지 않는다', () => {
    const out = splitLegacyQuotes(wrap({ book_ratings: [rating({ quote: '  ' })] }));
    expect(out.tables.book_quotes).toBeUndefined();
  });
  it('이미 book_quotes가 있는 새 백업은 건드리지 않는다', () => {
    const t = wrap({ book_ratings: [rating({})], book_quotes: [{ book_id: 'b1', member_id: 'm1', ord: 0, text: 'x' }] });
    expect(splitLegacyQuotes(t)).toEqual(t);
  });
  it('quote 열이 아예 없는 백업은 그대로 둔다', () => {
    const t = wrap({ book_ratings: [rating({})] });
    expect(splitLegacyQuotes(t)).toEqual(t);
  });
});
