# 아직 안 한 것

끝내면 항목을 `docs/DONE.md`로 옮긴다(날짜와 함께). 아이디어·계획은 README "앞으로"에, 동작 특이사항은 `NOTES.md`에 둔다. 이 파일은 "하기로 했는데 아직 안 한 일"만 모은다.

## 쓰는 법

- **등급**: 1이 가장 급하고 5가 가장 여유 있다. 같은 등급 안에서는 위에 있는 것이 먼저다. 한 번 매긴 등급은 근거가 바뀔 때만 바꾼다.
- **줄 형식**: `- [ ] (누가) 내용 <!-- id:고유이름 -->`. `(직접)`은 사용자가, `(Claude)`는 Claude가, `(함께)`는 둘이 한다. `id`는 우선순위 mod가 체크·되돌리기에 쓰니 지우지 않는다.
- **앱 기능 항목**(보안, 테스트, 새 앱 등)은 [SDD](reference/sdd.md)대로 먼저 `/grill-me` → `/to-spec`으로 GitHub 이슈를 만든다. 이슈가 생기면 줄 끝에 `#번호`를 붙인다. 이 파일에는 한 줄과 번호만 둔다.
- **끝낼 때**: 체크하면 `DONE.md`로 날짜·등급·누가와 함께 옮겨진다.

| 등급 | 기준 |
| --- | --- |
| 1 | 지금 깨져 있거나, 안 하면 데이터를 잃거나, 다른 일을 막고 있다 |
| 2 | 멤버가 곧 겪거나 알림이 계속 오는데, 당장 깨진 건 아니다 |
| 3 | 목표(안정성, 구직 준비)에 직결되는 계획 작업과 확인. 미뤄도 당장 피해는 없다 |
| 4 | 선행 조건이 있는 기능, 정리, 결정, 문서 |
| 5 | 아이디어, 하면 좋은 것 |

## 1등급: 막힘·장애

## 2등급: 곧 문제
- [ ] (직접) workout Vercel 프로젝트 env 확인 <!-- id:workout-vercel-env -->
- [ ] (함께) 보안 점검: 범위를 `/grill-me`로 좁힌 뒤 이슈로 만든다(시크릿 스캔, 의존성 감사, 쿠키 속성·보안 헤더, rate-limit 등) <!-- id:security-review -->

## 3등급: 목표 직결 (구직 준비 12월 중순~말)
- [ ] (직접) 워크아웃 게스트 화면 재확인: 팝업 → `/login` 링크로 바꾼 뒤 화면 <!-- id:workout-guest-check -->
- [ ] (직접) iPhone 홈 화면 추가(PWA) 동작 확인 <!-- id:pwa-install-check -->
- [ ] (직접) iPhone 실기기에서 운동 앱 확인: 화면 잠금·백그라운드 후 타이머, 1:30 삑 소리, 시간·횟수 입력(`docs/features/workout.md` 미검증 항목) <!-- id:workout-device-check -->
- [ ] (Claude) ADR 소급 작성: 알라딘 종료 → 카카오·국립중앙도서관, 데이터 캐시 제거, RLS 켜고 정책 없음, 모노레포·테이블 접두사. `/grill-with-docs`로 사용자와 확인하며 `docs/adr/`에 쓴다 <!-- id:adr-backfill -->
- [ ] (함께) 지표 기준선 측정: 백업 복원 소요 시간, Lighthouse, 테스트 수·커버리지, `npm audit`. 값은 `docs/reference/`에 기록한다 <!-- id:metrics-baseline -->
- [ ] (함께) 핵심 흐름 e2e와 테스트 보강(로그인, 평점, 선정, 기록, 백업). SDD로 진행 <!-- id:full-tests -->
- [ ] (함께) AI 기능 1개를 SDD로 끝까지 구현(제안 단계, 확정 전): 책 정보 기반 토론 질문 초안 생성 등. 비용 한도·실패 시 대체 동작 포함 <!-- id:ai-feature -->
- [ ] (함께) admin 통합 대시보드: 백업 상태 등(백업 미러 선행) <!-- id:admin-dashboard -->
- [ ] (함께) 포트폴리오·소개 페이지(구직용·소개용). 위 항목들의 결과와 수치를 넣는다 <!-- id:portfolio-page -->

## 4등급: 선행 조건·정리·결정
- [ ] (함께) 경제 앱 추가(보안·테스트가 안정된 뒤. 구직 이후 권장) <!-- id:money-app -->
- [ ] (함께) PWA 완성도: 무엇이 모자란지 먼저 정한다(아이콘, 오프라인, 설치 안내?) <!-- id:pwa-polish -->
- [ ] (직접) `CLAUDE.md`, `docs/NOTES.md`의 `book.<도메인>` 자리표시자를 실제 주소로 바꿀지 결정. README에는 이미 실제 주소가 있다 <!-- id:domain-placeholder -->
- [ ] (함께) `workout-log` SKILL.md(아티팩트 기준)와 작업로그를 웹앱 기준으로 갱신 <!-- id:workout-log-skill -->
- [ ] (함께) 기능 문서 이전: 게스트 모드·백업·운동 앱 설명을 `CLAUDE.md`·`docs/NOTES.md`에서 `docs/features/`로 옮기고 CLAUDE.md를 60줄 안팎으로 줄인다. NOTES.md의 날짜 붙은 확인 기록은 지우고 못 한 확인은 TODO로 옮긴다. 문서만 바뀌므로 스펙 없이 진행 <!-- id:docs-features-migrate -->

## 5등급: 아이디어
- [ ] (함께) 알림: Web Push, 모임 리마인더, health check. PWA 완성도 뒤, health check는 admin 대시보드와 겹친다 <!-- id:notifications -->
- [ ] (함께) 운동 세션 요약 view(`workout_session_summary`) <!-- id:workout-session-summary -->
- [ ] (함께) 쪽수가 빈 책 줄이기: 국립중앙도서관 서지정보 API는 `PAGE`가 빈 책이 약 10~27%(표본에 따라). 소장자료 검색(형태사항 "239p.; 23cm")이 채워 주는지, 공식 오픈 API인지 조사한다. 이미 저장된 책의 빈 쪽수 백필도 함께 정한다 <!-- id:nlk-catalog-pages -->
- [ ] (직접) 허브 페이지(두 앱 진입점) 여부 <!-- id:hub-page -->
- [ ] (직접) `supabase/config.toml`의 `project_id = "book-club"`: 로컬 Docker 이름표일 뿐이라 바꾸지 않기를 권장. 결정만 한다 <!-- id:supabase-project-id -->
