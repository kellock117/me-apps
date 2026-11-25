# 특이사항 (NOTES)

발견할 때마다 바로 추가한다. 코드로 알 수 없는 것, 함정, 가정, 사용자가 해야 할 일.
- 기능별 특이사항은 [`docs/features/`](features/)에 있다. 여기에는 여러 기능에 걸친 것만 둔다.

## 환경·도구
- corepack이 pnpm 12를 읽지 못해(`pnpm.cjs` 없음) pnpm 10.18.3으로 고정했다. 루트 `package.json`의 `packageManager`.
- pnpm이 esbuild 빌드 스크립트를 막아서 `pnpm.onlyBuiltDependencies: ["esbuild"]`를 둔다(tsx가 필요로 함).
- `next dev`가 가끔 레포 루트에 `.next`를 만든다. 지워도 된다.
- Next 16은 `middleware.ts` 대신 `proxy.ts`를 쓴다.
- zsh에서 `grep --include=*.ts`는 glob 오류가 난다. 따옴표로 감싸거나 `--exclude-dir=node_modules`로 거른다. macOS `sed -i`는 `sed -i ''`다(여러 줄 편집은 python이 안전).
- 로컬 Supabase나 Docker가 꺼져 있으면 앱이 "fetch failed" 500만 보여 준다. 먼저 Docker와 `npx supabase status`를 본다.
- `.claude/launch.json`(개발 서버 설정: book 3000, workout 3001)은 gitignore라서 새 체크아웃에는 없다.
- `noUnusedLocals`가 켜져 있어 안 쓰는 변수·import는 `typecheck`에서 실패한다. `.next/dev/types/validator.ts`는 Next가 만드는 파일이라 workout tsconfig에서 제외했다.

## 이동·호환
- 독서 전용이던 쿠키 이름은 `apps/book/lib/auth/cookies.ts`, 토스트 문구는 `apps/book/lib/toast-messages.ts`.
- `apps/book/lib/stats.ts`가 `todayInSeoul`, `daysBetween`을 core에서 다시 내보낸다(기존 import 호환용, 나중에 정리 가능).
- 노션 스냅샷 경로는 `apps/book/scripts/fixtures/notion-snapshot.json`(개인정보, git 제외).
- 공개 레포에 못 쓰는 실명·개인 기록은 루트 `.private/`(git 제외)에 둔다. 폴더가 없으면 만든다.

## 배포 (사용자가 할 일)
- 기존 Vercel 프로젝트(이름은 옛 이름 `book-club` 그대로)의 Root Directory를 `apps/book`으로 바꾼다. 바꾸기 전에 main에 머지하면 배포가 깨진다.
- `workout` 프로젝트를 새로 만든다(Root Directory `apps/workout`). env: SUPABASE_URL, SUPABASE_SECRET_KEY, WORKOUT_PASSWORD.
- 도메인: `book.jaewon-choi.dev` → book, `workout.jaewon-choi.dev` → workout. 기존 `*.vercel.app`은 book에 그대로 둔다.
- GitHub 시크릿: `VERCEL_PROJECT_ID_BOOK`, `VERCEL_PROJECT_ID_WORKOUT`.

## 가정
- 운동 원본은 Supabase만. 노션 🏋️ DB는 더 쓰지 않기로 정했다(2026-11-17, DB 자체는 남아 있다).

## CI
- `.github/workflows/deploy.yml`: verify(전체 `pnpm turbo typecheck test build`) → supabase(db push) → vercel(앱 matrix). 비밀 값 없이 도는 verify는 자리표시 env로 빌드한다.
- Vercel 잡은 `turbo-ignore <앱>`으로 "그 앱 또는 의존 패키지가 바뀐 경우"만 배포한다. 수동 실행(workflow_dispatch)은 항상 배포한다. 마이그레이션(supabase/)만 바뀐 커밋은 앱을 다시 배포하지 않는다.
- 시크릿 이름이 바뀌었다: 기존 `VERCEL_PROJECT_ID` → `VERCEL_PROJECT_ID_BOOK`. 새로 `VERCEL_PROJECT_ID_WORKOUT`이 필요하다. 머지 전에 GitHub에서 추가해야 한다.
- 이 워크플로는 아직 GitHub에서 돌려 보지 않았다 (PR을 올려야 verify를 확인할 수 있고, vercel 잡은 main 머지 때만 돈다).
- `db:types`는 임시 파일(`database.ts.tmp`)에 쓴 뒤 옮긴다. 예전 방식(`> database.ts`)은 `supabase` 실행이 실패하면 파일을 빈 파일로 만들었다(이번에 실제로 겪음, git으로 복구). 생성 결과는 줄 모양이 지금 파일과 다르지만 내용은 같다. 확인: 직접 쓴 workout 3개 테이블 타입이 생성본과 열·null 여부가 모두 일치했다.
- 로컬 Supabase는 Docker Desktop을 켜야 한다 (`open -a Docker`). 이미지가 캐시돼 있으면 `supabase start`가 1분 안에 끝난다.
- `next dev`가 `AGENTS.md`를 자동 생성/재생성한다. 각 앱 next.config에 `agentRules: false`를 두어 앱 폴더에는 만들지 않게 했다. 루트 `AGENTS.md`(CLAUDE.md가 `@AGENTS.md`로 읽음)만 커밋한다.

## 테이블 접두사 (2026-11-14)
- 독서 모임 테이블에 `book_`를 붙였다: `members`→`book_members`, `books`→`book_books`, `meetings`→`book_meetings`, `meeting_attendees`→`book_meeting_attendees`, `ratings`→`book_ratings`, 뷰 `member_stats`→`book_member_stats`. `book_interests`·`book_stats`·`workout_*`는 원래 접두사가 있어 그대로다. 마이그레이션은 `20261114000000_book_prefix.sql`이고 데이터는 그대로다(이름표만 바뀜).
- `books`가 `book_books`가 된 것은 어색하지만 "예외 없음" 규칙이 더 중요하다고 정했다(접두사만 보고 앱을 가르기 위해). 규칙은 CLAUDE.md "테이블 이름".
- 이름을 바꾸지 않은 것: 외래 키·check·unique 제약의 자동 이름(`books_selected_by_fkey` 등). 앱이 이름으로 쓰지 않는다. 기본 키와 인덱스, 트리거는 바꿨다.
- 옛 이름 백업의 복원 방법은 [백업](features/backup.md).
