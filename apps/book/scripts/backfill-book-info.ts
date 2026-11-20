/**
 * 표지(cover_path)나 쪽수(pages)가 빈 책을 찾아 채운다. 이미 값이 있는 칸은 건드리지 않는다.
 *
 *   pnpm --filter book backfill:book-info            # 시험 실행: 무엇을 채울지만 보여 주고 아무것도 쓰지 않는다
 *   pnpm --filter book backfill:book-info -- --apply # 실제로 DB와 Storage에 쓴다
 *
 * 대상 DB는 .env.local의 SUPABASE_URL / SUPABASE_SECRET_KEY, 카카오·국립중앙도서관 키는 KAKAO_REST_API_KEY / LIBRARY_API_KEY.
 * 책 검색과 같은 출처를 쓴다: 표지는 카카오(ISBN으로 검색), 쪽수는 국립중앙도서관 ISBN 서지정보.
 * ISBN이 없는 책은 엉뚱한 책을 채울 위험이 있어 자동으로 채우지 않는다. 대신 카카오 후보(판·출판사·ISBN)를 보여 주고,
 * 사용자가 고른 ISBN을 `--isbn "제목=ISBN13"`으로 알려 주면 그 ISBN을 책에 저장하고 표지·쪽수를 채운다. 여러 번 쓸 수 있다.
 *   pnpm exec tsx --env-file=.env.prod scripts/backfill-book-info.ts --apply --isbn "이방인=9788937460xxx"
 * 다시 실행해도 같은 결과(멱등)다.
 */
import { createClient } from '@supabase/supabase-js';
import { fetchNlkPages } from '../lib/book-api/nlk';
import { parseKakaoDocument, type KakaoDocument } from '../lib/book-api/kakao';
import { copyCover } from '../lib/books/cover';

const KAKAO = 'https://dapi.kakao.com/v3/search/book';

/** ISBN으로 카카오를 검색해 표지 주소를 얻는다. 응답의 ISBN이 같은 책만 인정한다. */
async function kakaoCoverByIsbn(key: string, isbn13: string): Promise<string | null> {
  const url = new URL(KAKAO);
  url.searchParams.set('query', isbn13);
  url.searchParams.set('target', 'isbn');
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const body = (await res.json()) as { documents?: KakaoDocument[] };
  const hit = (body.documents ?? []).map(parseKakaoDocument).find((d) => d.isbn13 === isbn13);
  return hit?.coverUrl ?? null;
}

/** 제목(+저자)으로 카카오 후보를 찾는다. 고르는 건 사람이므로 ISBN이 있는 후보만 보여 준다. */
async function kakaoCandidates(key: string, title: string, author: string | undefined) {
  const url = new URL(KAKAO);
  url.searchParams.set('query', author ? `${title} ${author}` : title);
  url.searchParams.set('size', '5');
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, signal: AbortSignal.timeout(5000) });
  if (!res.ok) return [];
  const body = (await res.json()) as { documents?: KakaoDocument[] };
  return (body.documents ?? []).map(parseKakaoDocument).filter((d) => d.isbn13);
}

async function main() {
  const apply = process.argv.includes('--apply');
  // --isbn "제목=ISBN13" (여러 번 가능): ISBN 없는 책에 사용자가 고른 ISBN을 알려 준다
  const argv = process.argv.slice(2);
  const chosen = new Map<string, string>();
  // --pages "제목=쪽수" (여러 번 가능): 국립중앙도서관에 없는 쪽수를 사람이 확인한 값으로 넣는다
  const manualPages = new Map<string, number>();
  argv.forEach((a, i) => {
    const [t, v] = (argv[i + 1] ?? '').split('=');
    if (!t || !v) return;
    if (a === '--isbn' && /^\d{13}$/.test(v)) chosen.set(t.trim(), v);
    if (a === '--pages' && /^\d{1,5}$/.test(v) && Number(v) > 0) manualPages.set(t.trim(), Number(v));
  });
  const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret, KAKAO_REST_API_KEY: kakaoKey, LIBRARY_API_KEY: libKey } = process.env;
  if (!url || !secret) throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY가 .env.local에 없어요');
  if (!kakaoKey || !libKey) throw new Error('KAKAO_REST_API_KEY / LIBRARY_API_KEY가 .env.local에 없어요');
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log(`대상: ${url}\n모드: ${apply ? '적용(--apply)' : '시험 실행(쓰지 않음)'}\n`);

  const { data: books, error } = await db
    .from('book_books')
    .select('id,title,authors,isbn13,cover_path,pages')
    .or('cover_path.is.null,pages.is.null')
    .order('title');
  if (error) throw error;
  if (!books?.length) return console.log('채울 책이 없어요.');

  let filled = 0;
  const skipped: string[] = [];
  const notFound: string[] = [];

  for (const b of books) {
    let isbn13 = b.isbn13;
    if (!isbn13) {
      const pick = chosen.get(b.title);
      if (!pick) {
        skipped.push(b.title);
        console.log(`- ${b.title}: ISBN 없음. 후보(맞는 판의 ISBN을 --isbn "${b.title}=ISBN13"으로 알려 주세요)`);
        for (const c of await kakaoCandidates(kakaoKey, b.title, b.authors[0])) {
          console.log(`    ${c.isbn13}  ${c.title} / ${c.authors.join(', ')} / ${c.publisher ?? '?'} / ${c.publishedDate ?? '?'}`);
        }
        continue;
      }
      isbn13 = pick;
    }
    const notes: string[] = [];
    const patch: { cover_path?: string; pages?: number; isbn13?: string } = {};
    if (!b.isbn13) {
      patch.isbn13 = isbn13;
      notes.push(`ISBN: ${isbn13}`);
    }

    if (!b.cover_path) {
      const coverUrl = await kakaoCoverByIsbn(kakaoKey, isbn13);
      if (!coverUrl) notes.push('표지: 카카오에 없음');
      else if (apply) {
        const path = await copyCover(db, b.id, coverUrl);
        if (path) {
          patch.cover_path = path;
          notes.push(`표지: ${path}`);
        } else notes.push('표지: 내려받기 실패');
      } else notes.push(`표지: ${coverUrl}`);
    }
    if (b.pages === null) {
      const pages = manualPages.get(b.title) ?? (await fetchNlkPages(libKey, isbn13));
      if (pages === null) notes.push('쪽수: 국립중앙도서관에 없음');
      else {
        patch.pages = pages;
        notes.push(`쪽수: ${pages}`);
      }
    }

    if (apply && Object.keys(patch).length > 0) {
      const { error: upErr } = await db.from('book_books').update(patch).eq('id', b.id);
      if (upErr) notes.push(`저장 실패: ${upErr.message}`);
      else filled++;
    }
    if (!apply && notes.some((n) => !n.includes('없음') && !n.includes('실패'))) filled++;
    if (notes.every((n) => n.includes('없음') || n.includes('실패'))) notFound.push(`${b.title} (${notes.join(', ')})`);
    console.log(`- ${b.title}: ${notes.join(' / ')}`);
  }

  console.log(`\n${apply ? '채움' : '채울 수 있음'}: ${filled}권 / 확인 필요(자료 없음·실패): ${notFound.length}권 / ISBN 없어 건너뜀(--isbn으로 지정 필요): ${skipped.length}권`);
  if (notFound.length) console.log('\n자료 없음·실패:\n' + notFound.map((t) => `  · ${t}`).join('\n'));
  if (skipped.length) console.log('\nISBN 없음(직접 채워야 함):\n' + skipped.map((t) => `  · ${t}`).join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
