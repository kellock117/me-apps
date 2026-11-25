import 'server-only';
import { createAdminClient } from '@me/core/server/supabase';
import type { PlanInput } from './plan';

/**
 * 푸시 계산에 쓸 데이터를 DB에서 읽어 `planPushes` 입력 모양으로 만든다(크론·관리자 테스트가 함께 쓴다).
 * 로그인 쿠키가 없는 크론에서도 돌아야 해서 getClubData(게스트면 멤버 이름을 가림)를 쓰지 않고 직접 읽는다.
 * 읽기에 실패하면 던진다: 데이터를 못 읽은 채 "보낼 게 없다"로 넘어가면 알림이 조용히 빠진다.
 */
export async function loadPlanData(): Promise<Omit<PlanInput, 'kind' | 'today'>> {
  const db = createAdminClient();
  const [members, books, meetings, ratings, progress, dismissed, sent] = await Promise.all([
    db.from('book_members').select('id,name,rotation_order,status'),
    db.from('book_books').select('id,title,pages,status,selected_by'),
    db.from('book_meetings').select('id,number,date,book_id'),
    db.from('book_ratings').select('book_id,member_id,score'),
    db.from('book_reading_progress').select('book_id,member_id,week,pages'),
    db.from('book_notice_dismissals').select('member_id,key'),
    db.from('book_push_sent').select('member_id,key'),
  ]);
  for (const [what, r] of Object.entries({ members, books, meetings, ratings, progress, dismissed, sent })) {
    if (r.error) throw new Error(`${what}: ${r.error.message}`);
  }

  const dismissedByMember: Record<string, string[]> = {};
  for (const d of dismissed.data!) (dismissedByMember[d.member_id] ??= []).push(d.key);

  return {
    members: members.data!.map((m) => ({ id: m.id, name: m.name, rotationOrder: m.rotation_order, status: m.status as 'active' | 'pending' })),
    books: books.data!.map((b) => ({ id: b.id, title: b.title, pages: b.pages, status: b.status as 'wishlist' | 'reading' | 'done', selectedBy: b.selected_by })),
    meetings: meetings.data!.map((m) => ({ id: m.id, number: m.number, date: m.date, bookId: m.book_id })),
    ratings: ratings.data!.map((r) => ({ bookId: r.book_id, memberId: r.member_id, score: Number(r.score) })),
    progress: progress.data!.map((p) => ({ bookId: p.book_id, memberId: p.member_id, week: p.week, pages: p.pages })),
    dismissed: dismissedByMember,
    sent: sent.data!.map((s) => ({ memberId: s.member_id, key: s.key })),
  };
}
