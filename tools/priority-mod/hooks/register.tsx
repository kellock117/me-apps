/**
 * 우선순위 mod: 세션 작업 폴더의 docs/TODO.md를 등급별로 보여 주는 패널(읽기 전용).
 * 파일이 없는 프로젝트에서는 아무것도 열지 않는다. 체크·되돌리기는 이후 티켓에서 붙인다.
 */
import type { Register } from 'claude-code'

import { parseTodo } from './todo'

const PANE = 'priority-todo'
const TODO_PATH = 'docs/TODO.md'

export const register: Register = on => {
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

    const sections = parseTodo(markdown)
    return (
      <Box flexDirection="column">
        <Button onPress={() => $.ui.invalidate('ui.render')}>새로고침</Button>
        {sections.map(section => (
          <Box key={section.grade} flexDirection="column">
            <Text bold>
              {section.grade}등급: {section.title}
            </Text>
            {section.items.length === 0 && <Text dimColor>  (없음)</Text>}
            {section.items.map(item => (
              <Text key={item.id ?? item.text}>
                {'  '}
                {item.who ? `(${item.who}) ` : ''}
                {item.text}
              </Text>
            ))}
          </Box>
        ))}
      </Box>
    )
  })
}
