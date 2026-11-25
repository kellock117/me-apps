import { describe, expect, it } from 'vitest';
import { checkProgress, currentWeek, hasNoProgress, isWeekOpen, previousMeetingDate, previousPages, progressPoints, projectionPoints, readingSpeed, seriesRows, weekSchedule } from './reading-progress';

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

describe('progressPoints: 일정 안의 입력만 주차 순으로, 퍼센트 포함', () => {
  const schedule = weekSchedule('2026-11-07', '2026-12-05'); // 1~4주차
  it('값이 있는 주차만 주차 순으로 나온다(입력 없는 주는 점 없음)', () => {
    const pts = progressPoints(schedule, [{ week: 3, pages: 150 }, { week: 1, pages: 30 }], 300);
    expect(pts).toEqual([
      { week: 1, pages: 30, percent: 10 },
      { week: 3, pages: 150, percent: 50 },
    ]);
  });
  it('모임을 당겨 기간 밖이 된 주차의 기록은 숨긴다(지우지는 않는다)', () => {
    const short = weekSchedule('2026-11-07', '2026-11-28'); // 1~3주차
    expect(progressPoints(short, [{ week: 2, pages: 60 }, { week: 4, pages: 200 }], 300).map((p) => p.week)).toEqual([2]);
  });
  it('총 쪽수가 없으면 퍼센트는 null', () => {
    expect(progressPoints(schedule, [{ week: 1, pages: 30 }], null)).toEqual([{ week: 1, pages: 30, percent: null }]);
  });
  it('퍼센트는 소수 첫째 자리까지', () => {
    expect(progressPoints(schedule, [{ week: 1, pages: 1 }], 3)[0]!.percent).toBe(33.3);
  });
});

describe('readingSpeed: 하루 몇 쪽', () => {
  const prev = '2026-11-07';
  const meeting = '2026-12-05';
  const schedule = weekSchedule(prev, meeting); // 기준일 11/14, 11/21, 11/28, 12/04
  const base = { prevMeetingDate: prev, meetingDate: meeting, schedule, totalPages: 300 };

  it('입력이 없으면 평균·최근 주는 null, 필요한 속도는 총 쪽수 ÷ 남은 일수', () => {
    const s = readingSpeed({ ...base, rows: [], today: '2026-11-15' });
    expect(s.average).toBeNull();
    expect(s.recent).toBeNull();
    expect(s.needed).toBeCloseTo(300 / 20); // 11/15 → 12/05
  });
  it('전체 평균: 가장 최근 입력 ÷ (그 기준일 − 전 모임일)', () => {
    const s = readingSpeed({ ...base, rows: [{ week: 2, pages: 140 }], today: '2026-11-22' });
    expect(s.average).toBe(10); // 140쪽 / 14일
  });
  it('입력이 하나면 최근 주는 전체 평균과 같다', () => {
    const s = readingSpeed({ ...base, rows: [{ week: 1, pages: 70 }], today: '2026-11-15' });
    expect(s.recent).toBe(s.average);
  });
  it('최근 주: 가장 최근 두 입력 사이 증가분 ÷ 기준일 간격(비어 있는 주를 건너뛰어도 일수로 센다)', () => {
    const s = readingSpeed({ ...base, rows: [{ week: 1, pages: 70 }, { week: 3, pages: 210 }], today: '2026-11-29' });
    expect(s.recent).toBe(10); // 140쪽 / 14일
    expect(s.average).toBeCloseTo(210 / 21);
  });
  it('앞보다 줄어든 입력이면 최근 주는 0으로 둔다', () => {
    const s = readingSpeed({ ...base, rows: [{ week: 1, pages: 100 }, { week: 2, pages: 80 }], today: '2026-11-22' });
    expect(s.recent).toBe(0);
  });
  it('필요한 속도: (총 쪽수 − 가장 최근 쪽수) ÷ (모임일 − 오늘)', () => {
    const s = readingSpeed({ ...base, rows: [{ week: 2, pages: 140 }], today: '2026-11-25' });
    expect(s.needed).toBe(16); // 160쪽 / 10일
  });
  it('이미 다 읽었으면 필요한 속도는 0', () => {
    const s = readingSpeed({ ...base, rows: [{ week: 2, pages: 300 }], today: '2026-11-25' });
    expect(s.needed).toBe(0);
  });
  it('총 쪽수가 없거나 모임일이 오늘이거나 지났으면 필요한 속도는 숨긴다(null)', () => {
    expect(readingSpeed({ ...base, totalPages: null, rows: [], today: '2026-11-25' }).needed).toBeNull();
    expect(readingSpeed({ ...base, rows: [], today: '2026-12-05' }).needed).toBeNull();
    expect(readingSpeed({ ...base, rows: [], today: '2026-12-20' }).needed).toBeNull();
  });
  it('일정 밖(숨겨진) 주차의 기록은 속도에 쓰지 않는다', () => {
    const short = weekSchedule(prev, '2026-11-28');
    const s = readingSpeed({ ...base, meetingDate: '2026-11-28', schedule: short, rows: [{ week: 5, pages: 250 }], today: '2026-11-20' });
    expect(s.average).toBeNull();
  });
});

describe('seriesRows: 그래프에 넣을 주차별 줄', () => {
  const s1 = [{ week: 1, pages: 30, percent: 10 }, { week: 3, pages: 150, percent: 50 }];
  const s2 = [{ week: 2, pages: 60, percent: 20 }];
  it('주차마다 한 줄, 시리즈 값이 없으면 키가 없다(점 없음)', () => {
    expect(seriesRows([1, 2, 3], [{ id: 'a', points: s1 }, { id: 'b', points: s2 }], 'pages')).toEqual([
      { week: 1, a: 30 },
      { week: 2, b: 60 },
      { week: 3, a: 150 },
    ]);
  });
  it('퍼센트 모드는 percent를 쓰고, 퍼센트가 null인 점은 뺀다', () => {
    expect(seriesRows([1, 3], [{ id: 'a', points: s1 }], 'percent')).toEqual([{ week: 1, a: 10 }, { week: 3, a: 50 }]);
    expect(seriesRows([1], [{ id: 'a', points: [{ week: 1, pages: 30, percent: null }] }], 'percent')).toEqual([{ week: 1 }]);
  });
});

describe('hasNoProgress: "모두의 진도"에 아직 아무 기록이 없는가', () => {
  const schedule = weekSchedule('2026-11-07', '2026-12-05'); // 1~4주차

  it('기록이 하나도 없으면 참', () => {
    expect(hasNoProgress(schedule, [], ['a', 'b'])).toBe(true);
  });

  it('일정 밖 주차 기록만 있으면 없는 것으로 센다', () => {
    expect(hasNoProgress(schedule, [{ member_id: 'a', week: 5 }], ['a', 'b'])).toBe(true);
  });

  it('활동 멤버가 아닌 사람의 기록은 세지 않는다', () => {
    expect(hasNoProgress(schedule, [{ member_id: 'x', week: 1 }], ['a', 'b'])).toBe(true);
  });

  it('활동 멤버 한 명이라도 일정 안 기록이 있으면 거짓', () => {
    expect(hasNoProgress(schedule, [{ member_id: 'b', week: 2 }], ['a', 'b'])).toBe(false);
  });
});

describe('projectionPoints: 하루 평균으로 본 예상선', () => {
  const schedule = weekSchedule('2026-11-07', '2026-12-05'); // 기준일 11-14, 11-21, 11-28, 12-04(마지막 주는 6일)

  it('마지막 기록 주차에서 시작해 남은 주차마다 (기준일까지 일수 × 하루 평균)을 더한다', () => {
    expect(projectionPoints(schedule, [{ week: 1, pages: 70 }], 10, null)).toEqual([
      { week: 1, pages: 70, percent: null },
      { week: 2, pages: 140, percent: null },
      { week: 3, pages: 210, percent: null },
      { week: 4, pages: 270, percent: null },
    ]);
  });

  it('쪽수는 반올림한 정수다', () => {
    expect(projectionPoints(schedule, [{ week: 2, pages: 50 }], 50 / 14, null).map((p) => p.pages)).toEqual([50, 75, 96]);
  });

  it('총 쪽수를 넘지 않는다', () => {
    expect(projectionPoints(schedule, [{ week: 1, pages: 70 }], 10, 200).map((p) => p.pages)).toEqual([70, 140, 200, 200]);
  });

  it('퍼센트는 기록 점과 같은 방식(소수 첫째 자리)으로 환산한다', () => {
    expect(projectionPoints(schedule, [{ week: 1, pages: 70 }], 10, 300).map((p) => p.percent)).toEqual([23.3, 46.7, 70, 90]);
  });

  it('여러 기록 중 가장 늦은 주차에서 시작하고, 일정 밖 기록은 쓰지 않는다', () => {
    const rows = [{ week: 2, pages: 100 }, { week: 1, pages: 40 }, { week: 9, pages: 999 }];
    expect(projectionPoints(schedule, rows, 5, null).map((p) => [p.week, p.pages])).toEqual([[2, 100], [3, 135], [4, 165]]);
  });

  it('기록이 없거나, 하루 평균이 없거나, 마지막 주차에 이미 기록이 있으면 빈 결과', () => {
    expect(projectionPoints(schedule, [], 10, 300)).toEqual([]);
    expect(projectionPoints(schedule, [{ week: 9, pages: 10 }], 10, 300)).toEqual([]);
    expect(projectionPoints(schedule, [{ week: 1, pages: 70 }], null, 300)).toEqual([]);
    expect(projectionPoints(schedule, [{ week: 1, pages: 70 }, { week: 4, pages: 250 }], 10, 300)).toEqual([]);
  });
});
