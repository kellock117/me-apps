# me-apps — 개인 앱 모노레포 규칙

> 이 파일은 규칙이 생길 때마다 바로 추가한다. 특이사항·함정은 `docs/NOTES.md`에 쓴다.

@AGENTS.md

## 구조
- `apps/book` 독서 모임 (`book.jaewon-choi.dev`), `apps/workout` 운동 기록 (`workout.jaewon-choi.dev`).
- `packages/core` (`@me/core`) 서버 쪽 공용: 인증·잠금, 날짜, 백업, Supabase 클라이언트, DB 타입.
- `packages/ui` (`@me/ui`) 화면 공용: Section/Card, Toast, LoginForm, theme.css.
- `packages/config` (`@me/config`) tsconfig 기본값.
- `supabase/` DB 하나, 마이그레이션은 모든 앱이 함께 쓴다.
- 앱 하나 = Next 앱 하나 = Vercel 프로젝트 하나. 앱끼리 서로 import하지 않는다.
- `apps/*`, `tools/*`의 기능을 고치기 전에 그 기능 문서를 읽는다(무엇·동작·특이사항). 앱 전용은 `docs/<앱>/features/`(book, workout), 공용·도구는 `docs/features/`.

## 패키지 경계
- 두 앱 이상이 쓰거나 쓸 게 확실하면 packages로, 아니면 앱 안에 둔다.
- 앱 이름·문구·색 같은 앱 고유 값은 공용 패키지에 박지 않고 props나 앱 쪽 파일로 받는다.
- 패키지는 빌드하지 않고 TS 소스를 그대로 쓴다. 앱 `next.config.ts`에 `transpilePackages: ['@me/core','@me/ui']`.
- 앱 CSS에 `@import '@me/ui/theme.css'`와 `@source`로 ui 폴더를 가리킨다(Tailwind 4).

## Supabase
- 호출은 서버에서만 한다. `@me/core/server/supabase`의 secret 키 admin 클라이언트를 쓴다.
- `NEXT_PUBLIC_` 변수는 만들지 않는다. RLS는 켜고 정책은 두지 않는다.
- 읽기는 서버 컴포넌트, 쓰기는 서버 액션 + zod.
- DB 타입은 `packages/core/src/database.ts`. 마이그레이션을 바꾸면 `pnpm --filter @me/core db:types`로 다시 만든다.

## 앱별 잠금
- 앱마다 비밀번호·쿠키가 따로다(`site_<appId>`, host-only). 서명 키는 `site:<appId>:<password>`.
- `requireSite()`를 레이아웃과 모든 서버 액션에서 부른다. 로그인 액션에는 rate-limit을 건다.

## 테이블 이름
- 앱 테이블은 `<앱>_<이름>`으로 짓는다: 독서 = `book_*`, 운동 = `workout_*`, 새 앱 `money` = `money_*`. 뷰와 인덱스·기본 키·트리거도 같은 접두사를 단다.
- 이유: DB 하나를 여러 앱이 나눠 쓰고, Supabase 대시보드는 테이블을 이름순으로 한 줄에 보여준다. 접두사만 봐도 어느 앱 것인지 알 수 있어야 한다.
- 예외 없음. 이름이 겹쳐 보여도(`book_books`) 규칙을 지킨다.
- 새 테이블 마이그레이션에는 `comment on table <이름> is '[앱] 설명'`을 단다(대시보드에 보인다). `database.ts`는 마이그레이션 뒤에 다시 만든다.
- 테이블 이름을 바꾸면 백업 표의 `LEGACY_TABLE_RENAMES`에 옛 이름 → 새 이름을 더해 옛 백업도 복원되게 한다.

## 백업
- 앱이 테이블을 새로 만들면 `packages/core/src/backup-tables.ts`에 등록한다. 일시 데이터(draft 등)는 뺀다. 크론·복원·사본 설정은 `docs/features/backup.md`.

## 코드·주석
- 주석과 문서는 한국어. 사람이 읽을 파일(공용 패키지, 설정, 스크립트)은 머리 주석에 역할·쓰는 곳·주의를 적고, 공개 함수에는 JSDoc을 단다.
- 날짜는 Asia/Seoul. 새벽 5시 전 시작은 전날로 센다.

## 검증
- 커밋 전 `pnpm turbo typecheck test build`가 통과해야 한다.
- 패키지 매니저는 pnpm 10.18.3(corepack). npm/yarn을 쓰지 않는다.
- 커밋·PR은 사용자 확인 후에만. push는 시키기 전에는 하지 않는다. `git add`는 파일을 지정하고 `commit -a`는 쓰지 않는다(함께 커밋하려던 게 아닌 변경이 딸려 들어간다).

## 앱 폴더 규칙 (apps/<앱>)
- `app/` 라우트, `components/` 이 앱 전용 컴포넌트, `lib/` 순수 로직·데이터 접근(테스트 대상), `scripts/` 일회성 도구.
- 잠금 설정은 `lib/site.ts`(APP_ID, PASSWORD_ENV) 한 곳에 두고 proxy·로그인·서버 액션이 같이 쓴다.
- `proxy.ts` matcher는 로그인·정적 파일·PWA 파일만 빼고 전부 잠근다.

## 일회성 스크립트
- `apps/<앱>/scripts/`에 두고 `package.json`에 `tsx --env-file=.env.local …` 스크립트로 등록한다. 다시 실행해도 같은 결과(멱등)여야 한다.
- 개인정보가 든 입력 파일은 `.gitignore`에 넣는다. 레포에 올려도 되는 작은 픽스처만 `scripts/fixtures/`에 둔다.

## 읽기 전용 공개(게스트 모드)
- 로그인 안 한 사람(게스트)에게는 읽는 화면만 열어 준다. 스위치는 없고 항상 이렇게 동작한다.
- **새 쓰기 액션이나 쓰기 API 라우트를 만들면 첫 줄에서 로그인을 확인한다**(book은 `getCurrentMember()`, workout은 `requireSite()`). proxy의 허용 목록만으로는 쓰기가 막히지 않는다. 화면 버튼을 숨기는 것은 편의일 뿐이다.
- 게스트가 볼 새 읽기 화면은 각 앱 `proxy.ts`의 허용 목록(book `GUEST_PAGES`, workout `/`)에 넣어야 보인다. 기본은 잠김이다.
- 멤버 실명은 `getClubData()`에서 한 번에 가린다. 새 데이터 읽기 경로를 그 밖에 만들지 않는다. 파일로 된 글(`apps/book/content/*.md`)은 가릴 수 없으므로 실명을 쓰지 않는다.
- 구조·한계·함정은 `docs/features/guest-mode.md`.

## 운동 목록 변경 기록
- `apps/workout/lib/exercises.ts`의 종목을 추가·제외·이름 변경하면, 같은 작업에서 `docs/workout/changes/workout-exercises.md`(변경 기록 맨 위 + "현재 목록")를 함께 갱신한다. 갱신 없이 끝내지 않는다.
- 제외·이름 변경해도 DB와 `scripts/fixtures`의 옛 기록은 건드리지 않는다. 이름을 바꾸면 DB의 같은 이름도 함께 바꾼다(`exercises.ts` 머리 주석).

## README와 앞으로 할 일
- 루트 `README.md`는 남에게 보여 주는 소개서다(무엇을 만들었고, 어떤 기술·AI 활용을 했는지). 사용법·배포 절차는 넣지 않는다(그건 `docs/`).
- 앱이나 기능을 새로 만들 계획·아이디어가 생기면 그 자리에서 README의 "앞으로" 목록에 적는다. 만들고 나면 "앱" 섹션으로 옮긴다.
- 레포가 공개라서 실명·비밀번호·키·개인 기록은 README와 문서에 쓰지 않는다. 멤버는 "멤버 A"처럼 가린다.

## 명령
- 로컬 DB: Docker를 켜고 `npx supabase start && npx supabase db reset`. 마이그레이션을 바꾸면 `pnpm --filter @me/core db:types` 뒤에 `npx oxfmt packages/core/src/database.ts`(생성기가 서식 없이 뽑아 줄이 통째로 바뀌어 보인다).
- 화면 확인용 시험 데이터(책·평점·리뷰·문장)는 `db reset` 뒤 `pnpm --filter book seed:dev`(로컬 전용, 몇 번 돌려도 같다).
- `next dev`에서는 로그인이 생략된다(`DEV_LOGIN_SKIP=0`이면 끔). 자세한 것은 `docs/features/guest-mode.md`.
- 새 앱 추가 절차는 `docs/ADDING-AN-APP.md`.

## 개발 방식 (SDD, 스펙 먼저)
- 상세 흐름과 단계 설명은 `docs/reference/sdd.md`. 전체 흐름: `/grill-me` → `/to-spec` → `/to-tickets` → `/implement` → 검증·PR → `/retro`.
- **새 기능이나 동작이 바뀌는 변경(화면 흐름, 규칙, 데이터 구조, 권한)은 스펙이 승인되기 전에 코드를 쓰지 않는다.** 요청이 이런 변경이면 구현을 시작하지 말고 먼저 "`/grill-me`로 시작할까요?"라고 안내한다. 이 스킬들은 사용자만 실행할 수 있다(`disable-model-invocation`). 결정(ADR)이 나올 것 같으면 `/grill-with-docs`를 권한다.
- 예외(스펙 없이 진행): 오타·문구 수정, 문서만 바뀌는 일, 운영 장애 핫픽스, `next dev`에서만 켜지는 개발 편의 도구(운영 빌드의 동작이 안 바뀌는 것). 끝난 뒤 `docs/NOTES.md`나 PR에 한 줄 남긴다. 경계가 애매하면 사용자에게 묻는다.
- 구현 중 스펙이 틀린 걸 알게 되면 코드보다 스펙(GitHub 이슈)을 먼저 고치고 사용자에게 알린다. 스펙에 없는 것은 만들지 않는다.
- 단위가 끝나면 스펙의 완료 기준을 하나씩 대조한 결과를 보여 주고 멈춘다. PR 본문에는 그 PR이 끝낸 하위 티켓마다 `Closes #번호`를 단다(부모만 적으면 하위 티켓이 안 닫힌다).
- 스펙·티켓은 GitHub 이슈, 개인이 할 일은 `docs/TODO.md`(이슈 규칙은 `docs/agents/issue-tracker.md`). 공개 레포이므로 이슈에도 실명·키·개인 기록을 쓰지 않는다.

## 대화 시작 시 (할 일 인지)
- 새 대화를 시작하면 `docs/TODO.md`의 1·2등급과 `docs/DONE.md` 최근 항목을 읽고, 지금 작업과 관련 있는 것만 한두 줄로 알린다. 읽기 전에 작업부터 시작하지 않는다.
- `docs/TODO.md`는 등급별로 묶여 있고 줄마다 `<!-- id:... -->`가 있다(우선순위 mod가 체크·되돌리기에 쓴다). 줄을 고칠 때 id를 지우거나 바꾸지 않는다. 항목을 끝내면 `DONE.md` 맨 위에 `- [x] YYYY-MM-DD (P등급·누가) 내용 <!-- id:... -->`로 옮긴다(예: `(P1·직접)`). 누가는 TODO 줄의 `(직접)`·`(Claude)`·`(함께)`다. 옛 줄은 `(P등급)`뿐이라 되돌릴 때 `(함께)`로 본다.
- 새 할 일이 생기면 등급(기준은 `docs/TODO.md` 머리)을 매겨 제안하고, 사용자가 확인한 뒤 추가한다.

## Agent skills

### Issue tracker

GitHub Issues(`gh` CLI). 앱 개발 티켓만 이슈로 만들고, 개인이 할 일은 `docs/TODO.md`에 쓰고, 끝나면 `docs/DONE.md`로 옮긴다. See `docs/agents/issue-tracker.md`.

### Triage labels

기본 5개 라벨(`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

single-context (루트 `GLOSSARY.md` + ADR, 필요할 때 만든다). ADR은 공용 `docs/adr/`, 앱 전용 `docs/<앱>/adr/`에 두고 번호는 레포 전체에서 하나로 잇는다(새 번호 = 모든 `adr/` 폴더의 최대 번호 + 1). 스킬이 ADR을 `docs/adr/`에 쓰면 앱 전용인지 보고 옮긴다. See `docs/agents/domain.md`.
