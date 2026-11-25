# 끝낸 것

`docs/TODO.md`에서 끝난 항목을 여기로 옮긴다. 형식: `- [x] YYYY-MM-DD (P등급·누가) 내용 <!-- id:... -->`. 새 항목은 위에 쓴다. 등급, 누가, id는 되돌릴 때 쓴다. 2026-11-15까지의 옛 줄은 `(P등급)`뿐이라 누가가 없고, 되돌릴 때 `(함께)`로 본다.
- [x] 2026-11-25 (P4·함께) CI에서 `tools/` 우선순위 mod 테스트도 돌리기: 지금 `tools/`는 pnpm 워크스페이스 밖이라 verify가 검사하지 않는다. `claude` CLI가 CI에 필요한지, `tsx --test`로 대신할 수 있는지부터 정한다. `/grill-me`로 시작 <!-- id:ci-mod-tests -->
- [x] 2026-11-25 (P4·함께) PWA 완성도: 무엇이 모자란지 먼저 정한다(아이콘, 오프라인, 설치 안내?) <!-- id:pwa-polish -->
- [x] 2026-11-24 (P3·함께) AI 기능 1개를 SDD로 끝까지 구현(제안 단계, 확정 전): 책 정보 기반 토론 질문 초안 생성 등. 비용 한도·실패 시 대체 동작 포함 <!-- id:ai-feature -->
- [x] 2026-11-17 (P2·직접) workout Vercel 프로젝트 env 확인 <!-- id:workout-vercel-env -->
- [x] 2026-11-17 (P4·함께) 기능 문서 이전: 게스트 모드·백업·운동 문서를 `docs/features/`로 옮김(PR #28). CLAUDE.md는 102줄에서 멈춤(보안 규칙을 남기려고 60줄 목표는 접음) <!-- id:docs-features-migrate -->
- [x] 2026-11-17 (P4·직접) `CLAUDE.md`, `docs/NOTES.md`의 `<도메인>` 자리표시자를 실제 주소로 바꾸기로 정하고 바꿈(book.jaewon-choi.dev, workout.jaewon-choi.dev) <!-- id:domain-placeholder -->
- [x] 2026-11-17 (P2·직접) 백업 미러: 비공개 레포 만들기 → fine-grained 토큰 발급 → 시크릿 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `BACKUP_REPO_TOKEN`, 변수 `BACKUP_REPO` 등록 → `backup-mirror` 수동 실행. 워크플로가 한 번도 안 돌았고 지금은 매일 실패할 수 있다 <!-- id:backup-mirror -->
- [x] 2026-11-17 (P4·직접) 옛 노션 개발자 위키(하위 9쪽, 개인 정보 없음)를 휴지통으로 옮김. 개발 문서 원본은 레포 `docs/features/` <!-- id:notion-wiki-schema -->
- [x] 2026-11-17 (P4·직접) 노션 🏋️ DB는 더 쓰지 않기로 정함(DB 자체는 지우지 않음) <!-- id:notion-workout-db -->
- [x] 2026-11-17 (P1·직접) 운영 책 검색에서 쪽수가 채워지는지, 새 책 추가가 쪽수·장르 필수로 동작하는지 확인 <!-- id:check-nlk-pages-prod -->
- [x] 2026-11-16 (P3·함께) 우선순위 mod 만들기: SDD로 진행한 첫 사례(스펙 #17, PR #23). TODO를 등급별로 보여 주고 체크·되돌리기·필터를 하는 Claude 앱 패널(`tools/priority-mod`) <!-- id:priority-mod -->
- [x] 2026-11-15 (P1) 책 검색 쪽수 보강 머지(PR #7)와 쪽수 채우기 개선 머지(PR #16, 이슈 #9~#15): 첫 숫자 파싱, 목록 쪽수 표시·로딩 막대, 쪽수·장르 필수, 제목·저자 잠금, 이유 선택, "위시리스트 추가하기" 이름 변경 <!-- id:merge-nlk-pages -->
- [x] 2026-11-15 (P3) 로그인한 상태의 기존 흐름(평점, 선정, 기록 저장) 확인 <!-- id:login-flow-check -->
- [x] 2026-11-15 (P3) 로그아웃 상태(시크릿 창)에서 두 사이트가 읽기 전용으로 열리는지 확인 <!-- id:guest-readonly-check -->
- [x] 2026-11-15 (P2) book Vercel 프로젝트에 `LIBRARY_API_KEY` 등록 <!-- id:library-api-key -->
- [x] 2026-11-15 (P2) 로컬 git 원격 주소를 `me-apps`로 변경 <!-- id:git-remote-me-apps -->
- [x] 2026-11-15 로그인 후 `?next=` 복귀 확인은 필요 없다고 정해 삭제
- [x] 2026-11-13 책 검색 쪽수 보강: 국립중앙도서관 ISBN 서지정보(`lib/book-api/nlk.ts`)로 카카오 후보의 쪽수를 채움. 알라딘 코드(어댑터·노션 이전 보강) 삭제, `.env.example`을 현재 변수 목록으로 갱신
- [x] 2026-11-13 위조 쿠키 시험: 운영 두 사이트에 `club_member` 등 위조 쿠키만 넣고 쓰기 화면·API를 불러 모두 `/login` 이동 또는 401 확인. 액션 단계는 `member.test.ts`(로그인 없이 `club_member`만 있으면 null)로 고정
- [x] 2026-11-13 main 배포(CI & Deploy, PR #4 머지분) 성공 확인
