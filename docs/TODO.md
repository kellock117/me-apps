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
- [ ] (함께) 독서 진도 알림(웹 푸시): 각 주차 입력 칸이 열리는 날(기준일) 18:00 KST에 아직 안 적은 멤버에게 책 세부 링크를 보낸다. PWA 설정(manifest, 서비스 워커, 푸시 키, 구독 테이블, 멤버별 "알림 켜기")이 필요하다. 카톡 단체방에는 공식 발송 수단이 없어 푸시로 간다. 독서 진도 입력 기능 뒤에 `/grill-me`로 시작 <!-- id:reading-push -->
- [ ] (함께) 모임 완료 흐름: 모임 기록에서 "모임 완료"를 표시하면 곧바로 다음 모임 날짜와 책을 정하게 한다. 읽는 책과 다음 모임이 항상 있게 하는 전제다(독서 진도 기능은 이 흐름 없이도 동작). `/grill-me`로 시작 <!-- id:meeting-complete-flow -->

## 2등급: 곧 문제
- [ ] (함께) 보안 점검: 범위를 `/grill-me`로 좁힌 뒤 이슈로 만든다(시크릿 스캔, 의존성 감사, 쿠키 속성·보안 헤더, rate-limit 등) <!-- id:security-review -->
- [ ] (함께) 사용 가이드: 처음 쓰는 멤버가 화면별 기능(진도, 평점, 모임 정보 등)을 알 수 있게 안내한다. 책 상세에 정보가 많아져서 필요하다. `/grill-me`로 시작 <!-- id:usage-guide -->
- [ ] (Claude) 푸시 계산용 데이터 읽기가 1000행에서 조용히 잘리지 않게 한다(`lib/push/data.ts`가 `book_reading_progress`·`book_ratings`·`book_push_sent`를 한 번에 읽음, PostgREST 기본 상한 1000행). 페이지로 나눠 읽거나 상한을 확인한다 <!-- id:push-data-1000-rows -->

## 3등급: 목표 직결 (구직 준비 12월 중순~말)
- [ ] (직접) 워크아웃 게스트 화면 재확인: 팝업 → `/login` 링크로 바꾼 뒤 화면 <!-- id:workout-guest-check -->
- [ ] (직접) iPhone 홈 화면 추가(PWA) 동작 확인 <!-- id:pwa-install-check -->
- [ ] (직접) iPhone 실기기에서 운동 앱 확인: 화면 잠금·백그라운드 후 타이머, 1:30 삑 소리, 시간·횟수 입력(`docs/workout/features/workout.md` 미검증 항목) <!-- id:workout-device-check -->
- [ ] (Claude) ADR 소급 작성: 알라딘 종료 → 카카오·국립중앙도서관, 데이터 캐시 제거, RLS 켜고 정책 없음, 모노레포·테이블 접두사. `/grill-with-docs`로 사용자와 확인하며 `docs/adr/`에 쓴다 <!-- id:adr-backfill -->
- [ ] (함께) 지표 기준선 측정: 백업 복원 소요 시간, Lighthouse, 테스트 수·커버리지, `npm audit`. 값은 `docs/reference/`에 기록한다 <!-- id:metrics-baseline -->
- [ ] (함께) 핵심 흐름 e2e와 테스트 보강(로그인, 평점, 선정, 기록, 백업). SDD로 진행 <!-- id:full-tests -->
- [ ] (함께) admin 통합 대시보드: 백업 상태 등(백업 미러 선행) <!-- id:admin-dashboard -->
- [ ] (함께) 포트폴리오·소개 페이지(구직용·소개용). 위 항목들의 결과와 수치를 넣는다 <!-- id:portfolio-page -->

## 4등급: 선행 조건·정리·결정
- [ ] (함께) 경제 앱 추가(보안·테스트가 안정된 뒤. 구직 이후 권장) <!-- id:money-app -->
- [ ] (함께) `workout-log` SKILL.md(아티팩트 기준)와 작업로그를 웹앱 기준으로 갱신 <!-- id:workout-log-skill -->
- [ ] (함께) `docs/TODO.md`·`DONE.md` 줄 형식 검사를 `pnpm check`에 넣기: 우선순위 mod의 `parseTodo`/`parseDone`을 재사용해 id 누락·형식 오류를 잡는다. `/grill-me`로 시작 <!-- id:todo-format-check -->

## 5등급: 아이디어
- [ ] (함께) 알림: Web Push, 모임 리마인더, health check. PWA 완성도 뒤, health check는 admin 대시보드와 겹친다 <!-- id:notifications -->
- [ ] (함께) 운동 세션 요약 view(`workout_session_summary`) <!-- id:workout-session-summary -->
- [ ] (함께) 쪽수가 빈 책 줄이기: 국립중앙도서관 서지정보 API는 `PAGE`가 빈 책이 약 10~27%(표본에 따라). 소장자료 검색(형태사항 "239p.; 23cm")이 채워 주는지, 공식 오픈 API인지 조사한다. 이미 저장된 책의 빈 쪽수 백필도 함께 정한다 <!-- id:nlk-catalog-pages -->
- [ ] (직접) 허브 페이지(두 앱 진입점) 여부 <!-- id:hub-page -->
- [ ] (직접) `supabase/config.toml`의 `project_id = "book-club"`: 로컬 Docker 이름표일 뿐이라 바꾸지 않기를 권장. 결정만 한다 <!-- id:supabase-project-id -->
