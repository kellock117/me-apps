/**
 * 백업·복원 대상 테이블 표. 새 앱이 DB 테이블을 만들면 여기에 한 줄 추가한다.
 *
 * - 순서가 중요하다: 외래 키가 가리키는 쪽(부모)이 먼저 와야 복원할 때 넣을 수 있다.
 * - conflictKey: 복원(upsert)할 때 "같은 행"을 알아보는 열. 연결 테이블은 복합 키다.
 * - 이름 규칙: 앱 테이블은 `<앱>_<이름>`(book_*, workout_*). 새 앱도 같은 규칙을 따른다 (CLAUDE.md 참고).
 * - 진행 중 상태처럼 잃어도 되는 임시 테이블(workout_drafts)은 넣지 않는다.
 */
import type { Backup, TableSpec } from './backup';

/** 독서 모임(apps/book) */
export const BOOK_TABLES: readonly TableSpec[] = [
  { name: 'book_members', conflictKey: 'id' },
  { name: 'book_books', conflictKey: 'id' },
  { name: 'book_meetings', conflictKey: 'id' },
  { name: 'book_meeting_attendees', conflictKey: 'meeting_id,member_id' },
  { name: 'book_ratings', conflictKey: 'id' },
  // id가 아니라 (책, 멤버, 순서)로 같은 행을 알아본다: 옛 백업에서 변환한 행은 id가 없어서, 두 번 복원해도 늘어나지 않게
  { name: 'book_quotes', conflictKey: 'book_id,member_id,ord' },
  { name: 'book_interests', conflictKey: 'book_id,member_id' },
  { name: 'book_reading_progress', conflictKey: 'book_id,member_id,week' },
  { name: 'book_notice_dismissals', conflictKey: 'member_id,key' },
];

/**
 * 테이블 이름에 `book_` 접두사가 붙기 전(2026-11-14 이전)에 만든 백업 파일의 옛 이름 → 새 이름.
 * 복원 스크립트가 옛 백업을 읽을 때 이름을 바꿔서 넣는다.
 */
export const LEGACY_TABLE_RENAMES: Readonly<Record<string, string>> = {
  members: 'book_members',
  books: 'book_books',
  meetings: 'book_meetings',
  meeting_attendees: 'book_meeting_attendees',
  ratings: 'book_ratings',
};

/**
 * 열 이름이 바뀌기 전의 백업을 읽을 때: 테이블(새 이름) → { 옛 열 → 새 열 }.
 * book_ratings.one_liner(한 줄 평, 2026-11-20 이전)는 review(리뷰)로 옮긴다.
 */
export const LEGACY_COLUMN_RENAMES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  book_ratings: { one_liner: 'review' },
};

/**
 * 평점당 문장 하나(book_ratings.quote)였던 옛 백업을 새 구조로 바꾼다(2026-11-20 이전 백업).
 * quote가 있는 평점마다 book_quotes에 첫 문장(ord 0)을 만들고, 평점 행의 quote 열은 지운다(DB에 이 열이 없다).
 * 이미 book_quotes가 있는 새 백업은 건드리지 않는다. 열 이름 변환(LEGACY_COLUMN_RENAMES)과 별개로, 테이블이 둘로 갈라져서 따로 둔다.
 */
export function splitLegacyQuotes(backup: Backup): Backup {
  const ratings = backup.tables.book_ratings;
  if (!ratings || 'book_quotes' in backup.tables || !ratings.some((r) => 'quote' in r)) return backup;
  const quotes: Record<string, unknown>[] = [];
  const cleaned = ratings.map((r) => {
    const { quote, ...rest } = r;
    if (typeof quote === 'string' && quote.trim()) quotes.push({ book_id: r.book_id, member_id: r.member_id, ord: 0, text: quote.trim() });
    return rest;
  });
  const tables: Backup['tables'] = { ...backup.tables, book_ratings: cleaned };
  if (quotes.length > 0) tables.book_quotes = quotes;
  return { ...backup, tables };
}

/**
 * 모임 장소(book_meetings.place, 2026-11-25 삭제) 칸이 있던 옛 백업을 새 구조로 바꾼다.
 * book_meetings 행에서 place 열만 지운다(DB에 이 열이 없어서 그대로 넣으면 복원이 실패한다). place 값은 복원되지 않고 버려진다.
 * place가 없는 새 백업은 같은 객체를 그대로 돌려준다.
 */
export function dropLegacyMeetingPlace(backup: Backup): Backup {
  const meetings = backup.tables.book_meetings;
  if (!meetings || !meetings.some((m) => 'place' in m)) return backup;
  const cleaned = meetings.map((m) => {
    const { place: _place, ...rest } = m;
    return rest;
  });
  return { ...backup, tables: { ...backup.tables, book_meetings: cleaned } };
}

/** 운동 기록(apps/workout) */
export const WORKOUT_TABLES: readonly TableSpec[] = [
  { name: 'workout_sessions', conflictKey: 'id' },
  { name: 'workout_sets', conflictKey: 'session_id,ord,set_no' },
];

/** 크론이 매일 백업하는 전체 표. 앱을 추가하면 여기에 이어 붙인다. */
export const ALL_BACKUP_TABLES: readonly TableSpec[] = [...BOOK_TABLES, ...WORKOUT_TABLES];
