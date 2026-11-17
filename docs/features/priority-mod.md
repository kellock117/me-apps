# 우선순위 mod (`tools/priority-mod`)

`docs/TODO.md`를 등급별로 보여 주는 Claude 앱 패널입니다. 결정 기록은 [ADR 0001](../adr/0001-priority-mod-never-commits.md)(커밋·푸시를 하지 않는다), [ADR 0002](../adr/0002-done-line-records-who.md)(DONE 줄에 누가를 남긴다), 스펙은 GitHub 이슈 #17입니다.

## 무엇
- 세션 시작 때 작업 폴더에 `docs/TODO.md`가 있으면 `/todo` 명령을 등록하고 패널을 엽니다. 파일이 없는 프로젝트에서는 아무것도 열지 않습니다.
- 등급별 상자에 항목을 보여 주고, 항목 옆 `○`로 체크하면 `DONE.md` 맨 위로 옮깁니다. 아래 "최근 완료" 5개의 `↩`로 되돌립니다.
- 위쪽 토글로 1·2등급만, (직접)만 거릅니다. TODO·DONE에 커밋 안 한 변경이 있으면 노란 줄로 알립니다.

## 어떻게 동작하나
- `hooks/todo.ts`는 순수 함수(`parseTodo`, `checkItem`, `parseDone`, `rollbackItem`, `filterSections`, `dirtyFiles`)이고 테스트는 같은 폴더의 `*.test.ts`입니다. `hooks/register.tsx`는 그리기와 파일 읽기·쓰기만 합니다.
- 체크·되돌리기는 쓰기 직전에 두 파일을 다시 읽어 id와 문구가 같은지 확인합니다. 다르면 거절하고 새로 그립니다.
- 체크는 DONE → TODO 순서로, 되돌리기는 TODO → DONE 순서로 씁니다. 중간에 실패해도 항목이 사라지지 않고 한쪽에 남습니다.
- 되돌린 항목은 그 등급 섹션의 맨 끝에 붙습니다. 원래 자리는 복원하지 않습니다. 누가가 없는 옛 DONE 줄은 `(함께)`로 돌아갑니다.
- 필터 상태는 메모리에만 있어서 다시 불러오면 꺼집니다.
- 줄 형식(`- [ ] (누가) 내용 <!-- id:… -->`, `- [x] 날짜 (P등급·누가) 내용 <!-- id:… -->`)에 정규식이 묶여 있습니다. TODO·DONE 형식을 바꾸면 `todo.ts`와 테스트를 같이 고칩니다.

## 특이사항
- **검사**: `claude plugin test tools/priority-mod`(25개), `claude plugin validate tools/priority-mod`. validate는 `Engine` 미내보내기 같은 기존 타입 경고를 늘 출력하고 통과하니 무시해도 됩니다. 이 명령이 `tsconfig.json`을 만드는데 `.gitignore`가 막습니다.
- **`pnpm check`와 CI가 이 폴더를 검사하지 않습니다**: `tools/`는 pnpm 워크스페이스 밖입니다. 고친 뒤에는 위 두 명령을 직접 돌립니다.
- **패널은 데스크톱 앱에서만 그려집니다**: 터미널 세션의 `--plugin-dir`은 불러오기만 하고 패널은 그리지 않습니다. 앱 세션에서 보려면 `~/.claude/dev-mods/<세션 id>/priority-mod`에서 `tools/priority-mod`로 심볼릭 링크를 만듭니다. 모든 세션에 상시 설치하는 방법은 정하지 않았습니다.
- **mod API 함정**
  - 화면 크기는 `e.viewport.columns`와 `rows`입니다(`cols` 아님).
  - validator는 `$`를 최상위 함수에만 넘기게 합니다.
  - `Box`에는 변별 테두리가 없습니다. 항목 구분선은 `overflow="hidden"` 상자 안에 긴 `┄` 줄을 넣어 잘라 냅니다. 글자 수로 폭을 계산하면 줄이 넘칩니다.
  - 터미널에서 `Space`의 `sm` 세로 간격은 0칸이고, 데스크톱은 자체 눈금을 씁니다.
