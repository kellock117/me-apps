import { describe, expect, it } from 'vitest';
import { checkProgress, currentWeek, isWeekOpen, previousMeetingDate, previousPages, weekSchedule } from './reading-progress';

describe('weekSchedule: 전 모임일부터 7일씩 센 주차와 기준일', () => {
  it('모임 요일마다 한 주차, 마지막 주차의 기준일은 모임 전날', () => {
    expect(weekSchedule('2026-11-07', '2026-12-05')).toEqual([
      { week: 1, dueDate: '2026-11-14' },
      { week: 2, dueDate: '2026-11-21' },
      { week: 3, dueDate: '2026-11-28' },
      { week: 4, dueDate: '2026-12-04' },
    ]);
  });

  it('모임을 한 주 미루면 앞 주차는 그대로 두고 뒤에 주차가 늘어난다(기준일은 모임 요일)', () => {
    const w = weekSchedule('2026-11-07', '2026-12-12');
    expect(w.map((x) => x.week)).toEqual([1, 2, 3, 4, 5]);
    expect(w.slice(0, 3)).toEqual(weekSchedule('2026-11-07', '2026-12-05').slice(0, 3));
    expect(w[3]).toEqual({ week: 4, dueDate: '2026-12-05' });
    expect(w[4]).toEqual({ week: 5, dueDate: '2026-12-11' });
  });

  it('모임을 며칠 당기면 기간 밖이 된 주차는 빠지고 마지막 주는 모임 전날', () => {
    expect(weekSchedule('2026-11-07', '2026-11-28')).toEqual([
      { week: 1, dueDate: '2026-11-14' },
      { week: 2, dueDate: '2026-11-21' },
      { week: 3, dueDate: '2026-11-27' },
    ]);
  });

  it('마지막 주가 며칠뿐이어도 모임 전날이 기준일', () => {
    expect(weekSchedule('2026-11-07', '2026-11-09')).toEqual([{ week: 1, dueDate: '2026-11-08' }]);
  });

  it('모임 전날이 전 모임일 이전이거나 같으면 주차가 없다', () => {
    expect(weekSchedule('2026-11-07', '2026-11-08')).toEqual([]);
    expect(weekSchedule('2026-11-07', '2026-11-07')).toEqual([]);
  });

  it('월·연 경계를 넘어도 날짜가 맞다', () => {
    expect(weekSchedule('2026-12-26', '2027-01-16')).toEqual([
      { week: 1, dueDate: '2027-01-02' },
      { week: 2, dueDate: '2027-01-09' },
      { week: 3, dueDate: '2027-01-15' },
    ]);
  });
});

describe('previousMeetingDate: 이 모임 바로 앞 모임일', () => {
  it('날짜가 더 이른 모임 중 가장 늦은 날', () => {
    expect(previousMeetingDate(['2026-10-03', '2026-11-07', '2026-12-05'], '2026-12-05')).toBe('2026-11-07');
  });
  it('이전 모임이 없으면 null(첫 책)', () => {
    expect(previousMeetingDate(['2026-11-07'], '2026-11-07')).toBeNull();
    expect(previousMeetingDate([], '2026-11-07')).toBeNull();
  });
  it('같은 날 모임은 이전으로 치지 않는다', () => {
    expect(previousMeetingDate(['2026-11-07', '2026-11-07'], '2026-11-07')).toBeNull();
  });
});

describe('입력 가능 시점', () => {
  const schedule = weekSchedule('2026-11-07', '2026-12-05');
  it('기준일 전에는 막히고, 당일부터는 열린다', () => {
    expect(isWeekOpen('2026-11-14', '2026-11-13')).toBe(false);
    expect(isWeekOpen('2026-11-14', '2026-11-14')).toBe(true);
  });
  it('기준일이 지난 뒤에도 계속 열려 있다', () => {
    expect(isWeekOpen('2026-11-14', '2026-12-30')).toBe(true);
  });
  it('currentWeek: 가장 최근에 열린 주차, 아직 하나도 안 열렸으면 null', () => {
    expect(currentWeek(schedule, '2026-11-13')).toBeNull();
    expect(currentWeek(schedule, '2026-11-14')).toBe(1);
    expect(currentWeek(schedule, '2026-11-27')).toBe(2);
    expect(currentWeek(schedule, '2026-11-28')).toBe(3);
    expect(currentWeek(schedule, '2026-12-04')).toBe(4);
    expect(currentWeek(schedule, '2027-02-01')).toBe(4);
  });
});

describe('previousPages: 앞 주차 중 값이 있는 가장 가까운 것', () => {
  const rows = [
    { week: 1, pages: 30 },
    { week: 3, pages: 120 },
  ];
  it('비어 있는 주차는 건너뛴다', () => {
    expect(previousPages(rows, 2)).toBe(30);
    expect(previousPages(rows, 4)).toBe(120);
  });
  it('앞에 값이 없으면 null, 자기 자신은 세지 않는다', () => {
    expect(previousPages(rows, 1)).toBeNull();
    expect(previousPages(rows, 3)).toBe(30);
  });
});

describe('checkProgress: 입력값 검증', () => {
  const opts = { totalPages: 300, previous: 100 };
  it('정상 값은 통과', () => {
    expect(checkProgress(150, opts)).toEqual({ ok: true, done: false, decreased: false });
  });
  it('0은 허용', () => {
    expect(checkProgress(0, { totalPages: 300, previous: null })).toEqual({ ok: true, done: false, decreased: false });
  });
  it('음수·소수·숫자 아님은 거부', () => {
    expect(checkProgress(-1, opts)).toEqual({ ok: false, error: 'invalid' });
    expect(checkProgress(1.5, opts)).toEqual({ ok: false, error: 'invalid' });
    expect(checkProgress(Number.NaN, opts)).toEqual({ ok: false, error: 'invalid' });
  });
  it('총 쪽수보다 크면 거부, 같으면 완독', () => {
    expect(checkProgress(301, opts)).toEqual({ ok: false, error: 'over-total' });
    expect(checkProgress(300, opts)).toEqual({ ok: true, done: true, decreased: false });
  });
  it('앞 주차보다 줄어도 저장은 되지만 줄었다고 알린다', () => {
    expect(checkProgress(80, opts)).toEqual({ ok: true, done: false, decreased: true });
  });
  it('앞 주차와 같으면 줄어든 게 아니다', () => {
    expect(checkProgress(100, opts).ok && checkProgress(100, opts)).toMatchObject({ decreased: false });
  });
  it('총 쪽수를 모르면 상한 검사를 건너뛰고 완독 표시도 없다', () => {
    expect(checkProgress(5000, { totalPages: null, previous: null })).toEqual({ ok: true, done: false, decreased: false });
  });
});
