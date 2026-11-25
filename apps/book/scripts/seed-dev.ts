/**
 * 로컬 DB에 화면 확인용 시험 데이터를 넣는다. `supabase db reset` 뒤에 한 번 돌리면 된다.
 *
 *   pnpm --filter book seed:dev
 *
 * - 멤버는 supabase/seed.sql이 넣은 활동 멤버를 그대로 쓴다(없으면 멈춘다).
 * - 넣는 것: 읽은 책 3권(전원 평점+리뷰+문장 여러 개 / 일부만 평점 / 평점 없음), 읽는 중 1권, 읽고 싶은 1권.
 *   그래서 미평점 책 모달, 오늘의 문장(다른 문장 보기), 리뷰·문장 표시를 바로 눌러 볼 수 있다.
 * - 모임 4개: 책 가(73일 전)·책 나(45일 전)의 옛 모임(88, 89)이 더 있고, 책 다·읽는 중 책에도 일부 멤버의 평점+리뷰, 읽는 중 책에 첫 멤버의 1·2주차 진도가 들어 있다.
 * - 진도 화면용 모임 2개: 책 다의 모임(17일 전, 앞 모임)과 읽는 중 책의 모임(12일 뒤). 그래서 1·2주차는 열려 있고 3·4주차는 닫혀 있다.
 *   모임은 회차 번호(90, 91)로 알아보고 날짜는 돌릴 때마다 오늘 기준으로 다시 맞춘다.
 * - 관리자 테스트 푸시(주차 알림 케이스)도 이 데이터로 만든다: 다음 모임(91), 읽는 중 책, 읽은 책 3권이 있으면 모든 케이스를 볼 수 있다.
 * - id를 고정해 upsert하므로 몇 번을 돌려도 같은 결과(멱등)다. 이 id의 행만 만들고 다른 데이터는 건드리지 않는다.
 * - 로컬 주소(localhost·127.0.0.1)가 아니면 멈춘다. 운영 DB에 시험 데이터를 넣지 않기 위해서다.
 */
import { createClient } from '@supabase/supabase-js';
import { addDays, todayInSeoul } from '@me/core/date';

const BOOKS = [
  { id: '11111111-1111-4111-8111-111111111111', title: '시험용 책 가', authors: ['저자 가'], genre: '소설', status: 'done' },
  { id: '22222222-2222-4222-8222-222222222222', title: '시험용 책 나', authors: ['저자 나'], genre: '에세이', status: 'done' },
  { id: '33333333-3333-4333-8333-333333333333', title: '시험용 책 다', authors: ['저자 다'], genre: '철학/인문', status: 'done' },
  { id: '44444444-4444-4444-8444-444444444444', title: '시험용 읽는 중 책', authors: ['저자 라'], genre: '소설', status: 'reading', pages: 300 },
  { id: '55555555-5555-4555-8555-555555555555', title: '시험용 읽고 싶은 책', authors: ['저자 마'], genre: '과학', status: 'wishlist' },
] as const;

const [A, B] = [BOOKS[0].id, BOOKS[1].id];

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY가 .env.local에 없어요');
  const host = new URL(url).hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') throw new Error(`로컬 DB가 아니에요(${host}). 시험 데이터는 로컬에만 넣어요`);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: members, error: mErr } = await db.from('book_members').select('id,name').eq('status', 'active').order('rotation_order');
  if (mErr) throw mErr;
  if (!members?.length) throw new Error('활동 멤버가 없어요. 먼저 `npx supabase db reset`으로 seed.sql을 적용하세요');

  const must = <T extends { error: { message: string } | null }>(r: T, what: string) => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`);
  };

  must(await db.from('book_books').upsert(BOOKS.map((b) => ({ ...b, authors: [...b.authors] }))), '책');

  // 책 가: 전원 평점 + 리뷰. 책 나: 마지막 멤버만 빠짐. 책 다: 아무도 안 남김.
  const ratings = [
    ...members.map((m, i) => ({
      book_id: A,
      member_id: m.id,
      score: 3 + (i % 3) * 0.5 + 0.5,
      review: i === 0 ? '첫 줄이에요.\n둘째 줄이에요.\n\n셋째 줄입니다.' : '',
    })),
    ...members.slice(0, -1).map((m, i) => ({ book_id: B, member_id: m.id, score: 4 - i * 0.5, review: '' })),
  ];
  must(await db.from('book_ratings').upsert(ratings, { onConflict: 'book_id,member_id' }), '평점');

  // 모임이 있는 책(다·읽는 중)에도 평점과 리뷰를 일부 멤버만 남겨 둔다(알림 시험과 리뷰 화면용)
  const meetingRatings = [BOOKS[2].id, BOOKS[3].id].flatMap((bookId, b) =>
    members.slice(0, 2).map((m, i) => ({ book_id: bookId, member_id: m.id, score: 4 - i * 0.5, review: `${m.name}의 ${b === 0 ? '다' : '읽는 중'} 책 리뷰예요.\n둘째 줄입니다.` })),
  );
  must(await db.from('book_ratings').upsert(meetingRatings, { onConflict: 'book_id,member_id' }), '모임 책 평점');

  // 읽는 중 책 진도: 첫 멤버만 1·2주차를 적어 둔다(나머지는 주차 알림에 "진도를 아직 안 적었어요"가 뜬다)
  must(
    await db.from('book_reading_progress').upsert(
      [1, 2].map((week) => ({ book_id: BOOKS[3].id, member_id: members[0]!.id, week, pages: week * 60 })),
      { onConflict: 'book_id,member_id,week' },
    ),
    '진도',
  );

  const quotes = members.flatMap((m, i) => [
    { book_id: A, member_id: m.id, ord: 0, text: `${m.name}가 밑줄 친 첫 번째 문장입니다.` },
    ...(i < 2 ? [{ book_id: A, member_id: m.id, ord: 1, text: `${m.name}가 밑줄 친 두 번째 문장입니다.` }] : []),
  ]);
  must(await db.from('book_quotes').upsert(quotes, { onConflict: 'book_id,member_id,ord' }), '문장');

  const today = todayInSeoul(new Date());
  must(
    await db.from('book_meetings').upsert(
      [
        { number: 88, date: addDays(today, -73), book_id: A },
        { number: 89, date: addDays(today, -45), book_id: B },
        { number: 90, date: addDays(today, -17), book_id: BOOKS[2].id },
        { number: 91, date: addDays(today, 12), book_id: BOOKS[3].id },
      ],
      { onConflict: 'number' },
    ),
    '모임',
  );

  console.log(`시험 데이터를 넣었어요: 책 ${BOOKS.length}권, 모임 4개, 평점 ${ratings.length}개, 문장 ${quotes.length}개 (멤버 ${members.length}명)`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
