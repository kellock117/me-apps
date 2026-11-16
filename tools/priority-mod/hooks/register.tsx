/**
 * 우선순위 mod: 세션 작업 폴더의 docs/TODO.md를 등급별로 보여 주는 패널(읽기 전용).
 * 항목 옆 버튼으로 체크하면 TODO.md에서 빼 DONE.md 맨 위로 옮긴다(쓰기 직전에 두 파일을 다시 읽어 확인).
 * 아래 "최근 완료"의 되돌리기 버튼은 DONE.md 줄을 TODO.md 그 등급 섹션 맨 끝으로 돌려놓는다.
 * 파일이 없는 프로젝트에서는 아무것도 열지 않는다. 커밋은 하지 않는다.
 * 위쪽 토글로 1·2등급만/(직접)만 거르고, TODO·DONE에 미커밋 변경이 있으면 표시한다(git status).
 */
import type { Engine, Register } from 'claude-code'

import { checkItem, dirtyFiles, filterSections, parseDone, parseTodo, rollbackItem } from './todo'
import type { DoneItem, TodoItem } from './todo'

const PANE = 'priority-todo'
const TODO_PATH = 'docs/TODO.md'
const DONE_PATH = 'docs/DONE.md'
const REASON = {
  'not-found': '그 항목을 TODO.md에서 찾을 수 없어요',
  changed: '그 사이 파일이 바뀌었어요',
  'already-done': '이미 DONE.md에 있어요',
} as const
const ROLLBACK_REASON = {
  'not-found': '그 항목을 DONE.md에서 찾을 수 없어요',
  changed: '그 사이 파일이 바뀌었어요',
  'already-todo': '이미 TODO.md에 있어요',
  'no-section': 'TODO.md에 그 등급 섹션이 없어요',
} as const
const RECENT_DONE = 5
// 급한 것은 따뜻한 색, 여유 있는 것은 차분한 색으로 한눈에 구분한다.
const GRADE_COLOR: Record<number, string> = { 1: 'red', 2: 'yellow', 3: 'green', 4: 'cyan', 5: 'gray' }
const GIT_STATUS = ['git', 'status', '--porcelain', '--', TODO_PATH, DONE_PATH] as const

/** 한국 날짜(YYYY-MM-DD). */
function seoulDate(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

/** 체크 버튼: 파일을 다시 읽어 확인한 뒤 DONE → TODO 순서로 쓴다(중간에 실패해도 항목이 사라지지 않는다). */
async function check($: Engine, item: TodoItem) {
  if (!item.id) return
  const [todo, done] = await Promise.all([
    $.fs.read(TODO_PATH).catch(() => undefined),
    $.fs.read(DONE_PATH).catch(() => undefined),
  ])
  if (todo === undefined || done === undefined) {
    $.ui.toast('TODO.md나 DONE.md를 읽을 수 없어요')
    return
  }
  const r = checkItem(todo, done, { id: item.id, text: item.text }, seoulDate())
  if (!r.ok) {
    $.ui.toast(`${REASON[r.reason]}. 새로고침했어요`)
  } else {
    await $.fs.write(DONE_PATH, r.done)
    await $.fs.write(TODO_PATH, r.todo)
    $.ui.toast('DONE.md로 옮겼어요')
  }
  $.ui.invalidate('ui.render')
}

/** 되돌리기 버튼: 다시 읽어 확인한 뒤 TODO → DONE 순서로 쓴다(중간에 실패해도 항목이 사라지지 않는다). */
async function rollback($: Engine, item: DoneItem) {
  const [todo, done] = await Promise.all([
    $.fs.read(TODO_PATH).catch(() => undefined),
    $.fs.read(DONE_PATH).catch(() => undefined),
  ])
  if (todo === undefined || done === undefined) {
    $.ui.toast('TODO.md나 DONE.md를 읽을 수 없어요')
    return
  }
  const r = rollbackItem(todo, done, { id: item.id, text: item.text })
  if (!r.ok) {
    $.ui.toast(`${ROLLBACK_REASON[r.reason]}. 새로고침했어요`)
  } else {
    await $.fs.write(TODO_PATH, r.todo)
    await $.fs.write(DONE_PATH, r.done)
    $.ui.toast('TODO.md로 되돌렸어요')
  }
  $.ui.invalidate('ui.render')
}

/** 아직 커밋하지 않은 TODO/DONE 파일 이름. git 저장소가 아니거나 실행이 실패하면 빈 목록(패널은 그대로 그려진다). */
async function uncommitted($: Engine): Promise<string[]> {
  try {
    const r = await $.process.run(GIT_STATUS)
    return r.exitCode === 0 ? dirtyFiles(r.stdout) : []
  } catch {
    return []
  }
}

export const register: Register = on => {
  // 필터 상태는 이 세션의 화면 설정일 뿐이라 파일에 저장하지 않는다(재로드하면 꺼진다).
  let topOnly = false
  let mineOnly = false

  on('session.start', async ($, e, next) => {
    // 파일이 없는 프로젝트에서는 명령도 패널도 만들지 않는다.
    if (await $.fs.exists(TODO_PATH).catch(() => false)) {
      await $.command.register({ name: 'todo', description: 'docs/TODO.md를 등급별 패널로 연다' })
      void $.ui.open({ id: PANE, title: 'TODO' })
    }
    return next(e)
  })

  on('command.run', { command: 'todo' }, async $ => {
    await $.ui.open({ id: PANE, title: 'TODO' })
    return { text: 'TODO 패널을 열었어요.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const markdown = await $.fs.read(TODO_PATH).catch(() => undefined)
    if (markdown === undefined) return <Text dimColor>{TODO_PATH}를 읽을 수 없어요.</Text>

    // 항목 사이 구분선: 긴 점선을 폭 90% 상자 안에서 잘라 내서 폭 계산 없이 맞춘다.
    const rule = '┄'.repeat(300)
    const sections = filterSections(parseTodo(markdown), { topOnly, mineOnly })
    const dirty = await uncommitted($)
    const done = await $.fs.read(DONE_PATH).catch(() => undefined)
    const recent = done === undefined ? [] : parseDone(done).slice(0, RECENT_DONE)
    return (
      <Box flexDirection="column" gap={1}>
        <Box borderStyle="round" borderColor="gray" paddingX={1} gap={2}>
          <Button onPress={() => $.ui.invalidate('ui.render')}>↻</Button>
          <Button key="filter-top" onPress={() => { topOnly = !topOnly; $.ui.invalidate('ui.render') }}>
            {topOnly ? '☑' : '☐'} 1·2등급만
          </Button>
          <Button key="filter-mine" onPress={() => { mineOnly = !mineOnly; $.ui.invalidate('ui.render') }}>
            {mineOnly ? '☑' : '☐'} (직접)만
          </Button>
        </Box>
        {dirty.length > 0 && <Text color="yellow">● 커밋 안 한 변경: {dirty.join(', ')}</Text>}
        {sections.map(section => {
          const color = GRADE_COLOR[section.grade] ?? 'white'
          return (
            <Box key={section.grade} flexDirection="column" borderStyle="round" borderColor={color} paddingX={1}>
              <Text bold color={color}>
                {section.grade}등급 · {section.title} ({section.items.length})
              </Text>
              {section.items.length === 0 && <Text dimColor>(없음)</Text>}
              {section.items.map((item, i) => (
                <Box key={item.id ?? item.text} flexDirection="column">
                  {i > 0 && (
                    <Box width="90%" height={1} overflow="hidden" alignSelf="center" marginBottom="sm">
                      <Text dimColor color="gray" wrap="wrap">{rule}</Text>
                    </Box>
                  )}
                  <Box gap={1} width="100%">
                  <Box flexShrink={0}>
                    {item.id ? <Button key={`check-${item.id}`} onPress={() => check($, item)}>○</Button> : <Text> </Text>}
                  </Box>
                  <Box flexGrow={1} flexShrink={1}>
                  <Text wrap="wrap">
                    {item.who && <Text bold={item.who === '직접'} dimColor={item.who !== '직접'}>({item.who}) </Text>}
                    {item.text}
                  </Text>
                  </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )
        })}
        {recent.length > 0 && (
          <Box flexDirection="column" borderStyle="round" borderColor="gray" borderDimColor paddingX={1}>
            <Text bold dimColor>
              최근 완료
            </Text>
            {recent.map(item => (
              <Box key={item.id} gap={1}>
                <Button key={`undo-${item.id}`} onPress={() => rollback($, item)}>↩</Button>
                <Text dimColor>
                  {item.date} (P{item.grade}
                  {item.who ? `·${item.who}` : ''}) {item.text}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    )
  })
}
