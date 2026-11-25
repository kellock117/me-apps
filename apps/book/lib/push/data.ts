import 'server-only';
import { createAdminClient } from '@me/core/server/supabase';
import { readAllPages } from './paging';
import type { PlanInput } from './plan';

/**
 * 푸시 계산에 쓸 데이터를 DB에서 읽어 `planPushes` 입력 모양으로 만든다(크론·관리자 테스트가 함께 쓴다).
 * 로그인 쿠키가 없는 크론에서도 돌아야 해서 getClubData(게스트면 멤버 이름을 가림)를 쓰지 않고 직접 읽는다.
 * 표는 1000행 상한을 넘어도 끝까지 읽는다(`readAllPages`). 읽기에 실패하면 던진다: 데이터를 못 읽은 채 "보낼 게 없다"로 넘어가면 알림이 조용히 빠진다.
 */
export async function loadPlanData(): Promise<Omit<PlanInput, 'kind' | 'today'>> {
  const db = createAdminClient();
  // 표마다 PostgREST 상한(1000행)에서 잘리지 않게 끝까지 이어 읽는다. 정렬은 기본 키 순으로 고정해 페이지가 겹치거나 빠지지 않게 한다.
  const [members, books, meetings, ratings, progress, dismissed, sent] = await Promise.all([
    readAllPages('members', (a, b) => db.from('book_members').select('id,name,rotation_order,status').order('id').range(a, b)),
    readAllPages('books', (a, b) => db.from('book_books').select('id,title,pages,status,selected_by').order('id').range(a, b)),
    readAllPages('meetings', (a, b) => db.from('book_meetings').select('id,number,date,book_id').order('id').range(a, b)),
    readAllPages('ratings', (a, b) => db.from('book_ratings').select('book_id,member_id,score').order('book_id').order('member_id').range(a, b)),
    readAllPages('progress', (a, b) => db.from('book_reading_progress').select('book_id,member_id,week,pages').order('book_id').order('member_id').order('week').range(a, b)),
    readAllPages('dismissed', (a, b) => db.from('book_notice_dismissals').select('member_id,key').order('member_id').order('key').range(a, b)),
    readAllPages('sent', (a, b) => db.from('book_push_sent').select('member_id,key').order('member_id').order('key').range(a, b)),
  ]);

  const dismissedByMember: Record<string, string[]> = {};
  for (const d of dismissed) (dismissedByMember[d.member_id] ??= []).push(d.key);

  return {
    members: members.map((m) => ({ id: m.id, name: m.name, rotationOrder: m.rotation_order, status: m.status as 'active' | 'pending' })),
    books: books.map((b) => ({ id: b.id, title: b.title, pages: b.pages, status: b.status as 'wishlist' | 'reading' | 'done', selectedBy: b.selected_by })),
    meetings: meetings.map((m) => ({ id: m.id, number: m.number, date: m.date, bookId: m.book_id })),
    ratings: ratings.map((r) => ({ bookId: r.book_id, memberId: r.member_id, score: Number(r.score) })),
    progress: progress.map((p) => ({ bookId: p.book_id, memberId: p.member_id, week: p.week, pages: p.pages })),
    dismissed: dismissedByMember,
    sent: sent.map((s) => ({ memberId: s.member_id, key: s.key })),
  };
}
