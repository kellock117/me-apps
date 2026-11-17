# 백업과 복원

모든 앱의 테이블을 매일 JSON 하나로 저장하고, 그 사본을 별도 비공개 저장소에도 둡니다.

## 무엇
- 크론이 매일 한국 시간 00시(`vercel.json`의 `0 15 * * *` = UTC 15시)에 전 앱 테이블을 JSON 하나(`YYYY-MM-DD.json`, 한국 날짜)로 `backups` 버킷에 저장하고 12주 지난 파일을 지웁니다.
- `backup-mirror` 워크플로가 매일 한국 01시에 Storage의 최신 백업을 별도 **비공개** 저장소에 커밋합니다. 최신 백업이 36시간보다 오래되면 실패해서 메일이 옵니다(크론 실패 알림 대용).
- 복원은 `pnpm --filter book restore -- <파일>`. 기본은 빈 DB에만, 덮어쓰려면 `--force`.

## 어떻게 동작하나
- 대상은 `packages/core/src/backup-tables.ts`의 표입니다. 앱이 테이블을 새로 만들면 여기에 등록하고, 일시 데이터(draft 등)는 뺍니다(`workout_drafts`가 그 예).
- `exportAll`은 1000행 제한 없이 페이지 단위(1000행씩, 기본 키 정렬)로 끝까지 읽습니다. 안전장치는 테이블당 10만 행입니다.
- 테이블 이름을 바꾸면 백업 표의 `LEGACY_TABLE_RENAMES`에 옛 이름 → 새 이름을 더합니다. 복원 스크립트(`parseBackup` 3번째 인자)가 옛 백업을 새 이름으로 바꿔 넣고, 새 이름과 옛 이름이 한 파일에 같이 있으면 새 이름을 씁니다.
- 보관 기간은 `BACKUP_KEEP_WEEKS`로 바꿉니다(12주면 최대 약 84개 파일).

## 특이사항
- **Vercel Hobby 크론은 지정한 시 안의 아무 때나 실행됩니다.** 00:00~00:59 사이에 돌고 정확히 00:00:00이 아닙니다. 같은 날 다시 불러도 그날 파일을 덮어씁니다.
- **이 저장소는 공개라서 백업을 여기나 아티팩트로 남기면 안 됩니다**(누구나 받을 수 있음). 공개 저장소의 Actions 로그도 누구나 읽으므로 워크플로에서 키를 출력하지 않게 `set -x`·`echo`를 쓰지 않습니다.
- **사본 설정은 사용자가 직접 합니다**: 비공개 저장소 만들기 → 그 저장소 하나에만 Contents 쓰기 권한을 준 fine-grained 토큰 → 이 저장소 Actions에 secrets `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `BACKUP_REPO_TOKEN`, variable `BACKUP_REPO`(예: `<계정>/me-apps-backups`). 아직 설정 전이면 워크플로가 매일 실패할 수 있습니다(TODO `backup-mirror`).
- **옛 이름 백업을 실제 DB에 복원해 보는 점검은 하지 못했습니다.** `parseBackup` 단위 테스트로만 확인했습니다.
- 크론 요청에는 `CRON_SECRET` 검증이 있습니다. `?backup=1`은 이제 필요 없습니다(항상 백업).
