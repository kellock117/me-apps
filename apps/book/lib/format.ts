/** 별점 표시: 소수 첫째 자리까지. 값이 없으면 "—". */
export function fmtScore(n: number | null | undefined, digits = 1): string {
  return n === null || n === undefined ? '—' : n.toFixed(digits);
}

/** 'YYYY-MM-DD' → '2026년 3월 7일' (문자열 그대로 쪼개서 시간대 영향이 없다). */
export function fmtDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

export function fmtDday(days: number | null): string {
  if (days === null) return '';
  return days === 0 ? 'D-day' : `D-${days}`;
}

/** 커버 이미지 주소. 표지 경로가 없으면 null (자동 표지를 그린다). */
export function coverUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = process.env.SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/covers/${path}` : null;
}

/** 하루 읽는 쪽수 표시: 소수 첫째 자리, 정수면 소수점 없이. 값이 없으면 "—". */
export const fmtPerDay = (n: number | null) => (n === null ? '—' : `${Number.isInteger(n) ? n : n.toFixed(1)}쪽`);

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 'YYYY-MM-DD' → '12월 13일(일)' (푸시 제목처럼 연도 없이 짧게). 요일은 날짜 문자열만으로 구해 시간대 영향이 없다. */
export function fmtMonthDayWeekday(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()];
  return `${m}월 ${d}일(${weekday})`;
}
