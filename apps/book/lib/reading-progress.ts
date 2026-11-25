/**
 * 독서 진도 계산. DB·네트워크·현재 시각에 의존하지 않는 순수 함수만 둔다(docs/book/features/reading-progress.md).
 * - 날짜는 'YYYY-MM-DD' 문자열(한국 날짜). "오늘"은 호출하는 쪽이 todayInSeoul()로 만들어 넘긴다.
 * - 주차: 전 모임일부터 7일씩 센 1주차, 2주차 … 각 주차의 기준일(= 입력 칸이 열리는 날)은 그 주의 마지막 날(모임 요일)이고,
 *   마지막 주차의 기준일은 모임 전날이다. 주차 번호는 전 모임일에서 세므로 모임을 미뤄도 앞 주차의 번호는 변하지 않는다.
 */

import { addDays, daysBetween } from '@me/core/date';

export type WeekInfo = { week: number; dueDate: string };

/**
 * 모임 하나에 대한 주차 목록. prev = 바로 앞 모임일, meeting = 이 모임일.
 * 모임 전날이 전 모임일 이전이거나 같으면(기간이 하루도 없음) 빈 목록.
 */
export function weekSchedule(prevMeetingDate: string, meetingDate: string): WeekInfo[] {
  const last = addDays(meetingDate, -1);
  if (daysBetween(prevMeetingDate, last) <= 0) return [];
  const weeks: WeekInfo[] = [];
  let week = 1;
  while (addDays(prevMeetingDate, 7 * week) < last) {
    weeks.push({ week, dueDate: addDays(prevMeetingDate, 7 * week) });
    week++;
  }
  weeks.push({ week, dueDate: last });
  return weeks;
}

/** meetingDate 바로 앞 모임일(더 이른 날짜 중 가장 늦은 것). 앞 모임이 없으면(첫 책) null. */
export function previousMeetingDate(meetingDates: string[], meetingDate: string): string | null {
  const earlier = meetingDates.filter((d) => d < meetingDate).sort();
  return earlier.length > 0 ? earlier[earlier.length - 1]! : null;
}

/** 기준일부터 입력 칸이 열린다. 기준일이 지난 뒤에도 계속 열려 있다. */
export function isWeekOpen(dueDate: string, today: string): boolean {
  return today >= dueDate;
}

/** 가장 최근에 열린 주차(강조할 칸). 하나도 안 열렸으면 null. */
export function currentWeek(schedule: WeekInfo[], today: string): number | null {
  const open = schedule.filter((w) => isWeekOpen(w.dueDate, today));
  return open.length > 0 ? open[open.length - 1]!.week : null;
}

/** week보다 앞 주차 중 값이 있는 가장 가까운 주차의 쪽수. 없으면 null. */
export function previousPages(rows: { week: number; pages: number }[], week: number): number | null {
  const before = rows.filter((r) => r.week < week).sort((a, b) => a.week - b.week);
  return before.length > 0 ? before[before.length - 1]!.pages : null;
}

export type ProgressCheck =
  | { ok: true; /** 총 쪽수와 같음 = 완독 */ done: boolean }
  | { ok: false; error: 'invalid' | 'over-total' | 'decreased' };

/**
 * 입력값(누적 쪽수) 검증: 0 이상의 정수, 총 쪽수가 있으면 그 이하, 앞 주차(previousPages) 이상. totalPages가 null이면 상한을 보지 않는다.
 * 앞 주차와 같은 값은 받는다(그 주에 못 읽음).
 */
export function checkProgress(pages: number, opts: { totalPages: number | null; previous: number | null }): ProgressCheck {
  if (!Number.isInteger(pages) || pages < 0) return { ok: false, error: 'invalid' };
  if (opts.totalPages !== null && pages > opts.totalPages) return { ok: false, error: 'over-total' };
  if (opts.previous !== null && pages < opts.previous) return { ok: false, error: 'decreased' };
  return { ok: true, done: opts.totalPages !== null && pages === opts.totalPages };
}

// ───────────── 그래프·속도 ─────────────

export type ProgressPoint = { week: number; pages: number; /** 총 쪽수가 없으면 null */ percent: number | null };

/** 일정 안(기간 밖으로 숨겨진 주차 제외)에서 값이 있는 주차만, 주차 순으로. 입력 없는 주는 점이 없다. */
export function progressPoints(schedule: WeekInfo[], rows: { week: number; pages: number }[], totalPages: number | null): ProgressPoint[] {
  const inRange = new Set(schedule.map((w) => w.week));
  return rows
    .filter((r) => inRange.has(r.week))
    .sort((a, b) => a.week - b.week)
    .map((r) => ({ week: r.week, pages: r.pages, percent: toPercent(r.pages, totalPages) }));
}

/** 쪽수 → 퍼센트(소수 첫째 자리). 총 쪽수가 없으면 null. */
function toPercent(pages: number, totalPages: number | null): number | null {
  return totalPages ? Math.round((pages / totalPages) * 1000) / 10 : null;
}

/**
 * 예상선: 마지막 기록 주차의 누적 쪽수에서 시작해, 남은 주차마다 (그 기준일까지 일수 × 하루 평균)을 더한 점들.
 * 첫 점은 마지막 기록 그대로다(실제 선과 이어지게). 쪽수는 반올림하고 총 쪽수에서 자른다. average는 readingSpeed().average를 넘긴다.
 * 기록이 없거나(일정 밖 기록만 있어도), 하루 평균이 없거나, 마지막 주차에 이미 기록이 있으면 빈 목록.
 */
export function projectionPoints(schedule: WeekInfo[], rows: { week: number; pages: number }[], average: number | null, totalPages: number | null): ProgressPoint[] {
  const recorded = progressPoints(schedule, rows, totalPages);
  const latest = recorded[recorded.length - 1];
  const lastWeek = schedule[schedule.length - 1];
  if (!latest || average === null || !lastWeek || latest.week === lastWeek.week) return [];
  const from = schedule.find((w) => w.week === latest.week)!;
  return [
    latest,
    ...schedule
      .filter((w) => w.week > latest.week)
      .map((w) => {
        const raw = Math.round(latest.pages + daysBetween(from.dueDate, w.dueDate) * average);
        const pages = totalPages === null ? raw : Math.min(totalPages, raw);
        return { week: w.week, pages, percent: toPercent(pages, totalPages) };
      }),
  ];
}

export type ChartMode = 'percent' | 'pages';
export type ChartRow = { week: number } & Record<string, number>;

/**
 * 그래프에 넣을 줄: 주차마다 한 줄, 시리즈 id마다 값. 값이 없는 시리즈는 키를 넣지 않는다(점이 없고 입력된 점끼리 이어진다).
 * 대시보드의 멤버별 선 그래프도 같은 함수를 쓴다.
 */
export function seriesRows(weeks: number[], series: { id: string; points: ProgressPoint[] }[], mode: ChartMode): ChartRow[] {
  return weeks.map((week) => {
    const row: ChartRow = { week };
    for (const s of series) {
      const p = s.points.find((x) => x.week === week);
      const v = p ? (mode === 'percent' ? p.percent : p.pages) : null;
      if (v !== null) row[s.id] = v;
    }
    return row;
  });
}

export type ReadingSpeed = {
  /** 전체 평균: 가장 최근 입력 ÷ (그 기준일 − 전 모임일). 입력이 없으면 null */
  average: number | null;
  /** 최근 주: 가장 최근 두 입력 사이 증가분 ÷ 기준일 간격(줄었으면 0). 입력이 하나면 전체 평균과 같다. 입력이 없으면 null */
  recent: number | null;
  /** 모임일까지 필요한 속도: (총 쪽수 − 가장 최근 쪽수) ÷ (모임일 − 오늘). 총 쪽수가 없거나 모임일이 오늘 이전이면 null */
  needed: number | null;
};

/** 하루에 몇 쪽 읽는 중인가. 모두 "쪽/일". 일정 밖 주차의 기록은 쓰지 않는다. */
export function readingSpeed(o: {
  prevMeetingDate: string;
  meetingDate: string;
  schedule: WeekInfo[];
  rows: { week: number; pages: number }[];
  totalPages: number | null;
  today: string;
}): ReadingSpeed {
  const due = new Map(o.schedule.map((w) => [w.week, w.dueDate]));
  const entries = o.rows
    .filter((r) => due.has(r.week))
    .sort((a, b) => a.week - b.week)
    .map((r) => ({ pages: r.pages, dueDate: due.get(r.week)! }));
  const latest = entries[entries.length - 1];
  const before = entries[entries.length - 2];

  const average = latest ? latest.pages / daysBetween(o.prevMeetingDate, latest.dueDate) : null;
  const recent = latest ? (before ? Math.max(0, latest.pages - before.pages) / daysBetween(before.dueDate, latest.dueDate) : average) : null;

  const daysLeft = daysBetween(o.today, o.meetingDate);
  const needed = o.totalPages === null || daysLeft <= 0 ? null : Math.max(0, o.totalPages - (latest?.pages ?? 0)) / daysLeft;
  return { average, recent, needed };
}

/**
 * "모두의 진도"에 보여 줄 기록이 아직 하나도 없는가. rows는 그 책의 기록만 넘긴다.
 * 일정 밖 주차의 기록과 활동 멤버가 아닌 사람의 기록은 없는 것으로 센다(그래프에 점이 찍히지 않는 기록).
 */
export function hasNoProgress(schedule: WeekInfo[], rows: { member_id: string; week: number }[], memberIds: string[]): boolean {
  const weeks = new Set(schedule.map((w) => w.week));
  const members = new Set(memberIds);
  return !rows.some((r) => weeks.has(r.week) && members.has(r.member_id));
}
