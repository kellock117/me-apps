import { describe, expect, it } from 'vitest';
import { pendingNotices, type NoticeInput } from './notices';
import type { StatsBook, StatsMeeting } from './stats';

const book = (id: string, status: StatsBook['status']): StatsBook => ({ id, title: `책 ${id}`, pages: 300, status, selectedBy: null });
const meeting = (n: number, date: string, bookId: string): StatsMeeting => ({ id: `m${n}`, number: n, date, bookId });

// d = 읽은 책(11-07 모임), r = 읽는 책(12-05 모임). r의 주차 기준일: 1주 11-14, 2주 11-21, 3주 11-28, 4주 12-04
const base: NoticeInput = {
  books: [book('d', 'done'), book('r', 'reading')],
  meetings: [meeting(1, '2026-11-07', 'd'), meeting(2, '2026-12-05', 'r')],
  ratings: [],
  progress: [],
  memberId: 'me',
  today: '2026-11-22',
  dismissed: [],
};
const keys = (input: Partial<NoticeInput>) => pendingNotices({ ...base, ...input }).map((n) => n.key);

describe('pendingNotices: 내가 할 일(평점·진도) 알림', () => {
  it('키 모양: 평점 rate:<책id>, 진도 progress:<책id>:<주차>', () => {
    expect(keys({}).sort()).toEqual(['progress:r:2', 'rate:d']);
  });

  it('항목에 종류·책·주차·읽음 가능 여부·이동할 곳이 있다', () => {
    const list = pendingNotices(base);
    expect(list.find((n) => n.kind === 'rate')).toEqual({ kind: 'rate', key: 'rate:d', bookId: 'd', title: '책 d', dismissable: false, href: '/rate?book=d' });
    expect(list.find((n) => n.kind === 'progress')).toEqual({ kind: 'progress', key: 'progress:r:2', bookId: 'r', title: '책 r', week: 2, dismissable: true, href: '/books/r#progress' });
  });

  it('평점 알림은 숨김 키가 있어도 나온다', () => {
    expect(keys({ dismissed: ['rate:d'] })).toContain('rate:d');
  });

  it('평점을 매기면 평점 알림이 사라진다(다른 멤버의 평점은 상관없다)', () => {
    expect(keys({ ratings: [{ bookId: 'd', memberId: 'other', score: 4 }] })).toContain('rate:d');
    expect(keys({ ratings: [{ bookId: 'd', memberId: 'me', score: 4 }] })).not.toContain('rate:d');
  });

  it('진도 알림은 가장 최근 열린 주차만 나온다(더 앞의 빈 주차는 세지 않는다)', () => {
    expect(keys({ today: '2026-11-29' }).filter((k) => k.startsWith('progress'))).toEqual(['progress:r:3']);
  });

  it('그 주차에 기록하면 사라진다(다른 멤버의 기록은 상관없다)', () => {
    expect(keys({ progress: [{ bookId: 'r', memberId: 'other', week: 2 }] })).toContain('progress:r:2');
    expect(keys({ progress: [{ bookId: 'r', memberId: 'me', week: 2 }] })).not.toContain('progress:r:2');
  });

  it('앞 주차에 기록이 있어도 최근 주차가 비어 있으면 나온다', () => {
    expect(keys({ progress: [{ bookId: 'r', memberId: 'me', week: 1 }] })).toContain('progress:r:2');
  });

  it('숨김 키에 있는 진도 주차는 빠지고, 다음 주차가 열리면 다시 나온다', () => {
    expect(keys({ dismissed: ['progress:r:2'] })).not.toContain('progress:r:2');
    expect(keys({ dismissed: ['progress:r:2'], today: '2026-11-28' })).toContain('progress:r:3');
  });

  it('읽는 책이 없으면 진도 알림이 없다', () => {
    expect(keys({ books: [book('d', 'done'), book('r', 'done')] }).filter((k) => k.startsWith('progress'))).toEqual([]);
  });

  it('앞 모임이 없으면(첫 책) 진도 알림이 없다', () => {
    expect(keys({ books: [book('r', 'reading')], meetings: [meeting(2, '2026-12-05', 'r')] })).toEqual([]);
  });

  it('읽는 책의 모임이 아직 없으면 진도 알림이 없다', () => {
    expect(keys({ meetings: [meeting(1, '2026-11-07', 'd')] }).filter((k) => k.startsWith('progress'))).toEqual([]);
  });

  it('아직 열린 주차가 없으면 진도 알림이 없다', () => {
    expect(keys({ today: '2026-11-10' }).filter((k) => k.startsWith('progress'))).toEqual([]);
  });
});
