/**
 * 독서 진도 계산. DB·네트워크·현재 시각에 의존하지 않는 순수 함수만 둔다(docs/features/reading-progress.md).
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
  | { ok: true; /** 총 쪽수와 같음 = 완독 */ done: boolean; /** 앞 주차보다 줄어듦(저장은 된다) */ decreased: boolean }
  | { ok: false; error: 'invalid' | 'over-total' };

/** 입력값(누적 쪽수) 검증: 0 이상의 정수, 총 쪽수가 있으면 그 이하. totalPages가 null이면 상한을 보지 않는다. */
export function checkProgress(pages: number, opts: { totalPages: number | null; previous: number | null }): ProgressCheck {
  if (!Number.isInteger(pages) || pages < 0) return { ok: false, error: 'invalid' };
  if (opts.totalPages !== null && pages > opts.totalPages) return { ok: false, error: 'over-total' };
  return {
    ok: true,
    done: opts.totalPages !== null && pages === opts.totalPages,
    decreased: opts.previous !== null && pages < opts.previous,
  };
}
