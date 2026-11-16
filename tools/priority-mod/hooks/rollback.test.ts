// parseDone·rollbackItem 테스트: DONE 줄을 TODO의 같은 등급 섹션 맨 끝으로 되돌린다.
import { expect, test } from 'claude-code/testing'

import { checkItem, parseDone, rollbackItem } from './todo'

const TODO = `# 아직 안 한 것

## 1등급: 막힘·장애
- [ ] (직접) 운영 확인 <!-- id:check-prod -->

## 2등급: 곧 문제
- [ ] (Claude) 보안 점검 <!-- id:sec -->
- [ ] (함께) 백업 <!-- id:backup -->

## 3등급: 계획

## 4등급: 정리
- [ ] (직접) 결정 <!-- id:decide -->
`
const DONE = `# 끝낸 것

설명 줄
- [x] 2026-11-16 (P2·Claude) 방금 한 일 <!-- id:fresh -->
- [x] 2026-11-15 (P1) 옛 항목 <!-- id:old -->
- [x] 2026-11-15 로그인 후 복귀는 필요 없다고 정해 삭제
- [x] 2026-11-14 (P9) 없는 등급 <!-- id:ghost -->
`

test('parseDone: 날짜·등급·누가·내용·id를 읽고, 형식이 다른 줄은 건너뛴다', async () => {
  expect(parseDone(DONE)).toEqual([
    { id: 'fresh', date: '2026-11-16', grade: 2, who: 'Claude', text: '방금 한 일' },
    { id: 'old', date: '2026-11-15', grade: 1, who: undefined, text: '옛 항목' },
    { id: 'ghost', date: '2026-11-14', grade: 9, who: undefined, text: '없는 등급' },
  ])
})

test('되돌리면 DONE에서 빠지고 TODO의 그 등급 섹션 맨 끝에 (누가) 형식으로 붙는다', async () => {
  const r = rollbackItem(TODO, DONE, { id: 'fresh', text: '방금 한 일' })
  if (!r.ok) throw new Error('거절됨')
  expect(r.todo).toBe(
    TODO.replace(
      '- [ ] (함께) 백업 <!-- id:backup -->\n',
      '- [ ] (함께) 백업 <!-- id:backup -->\n- [ ] (Claude) 방금 한 일 <!-- id:fresh -->\n',
    ),
  )
  expect(r.done).toBe(DONE.replace('- [x] 2026-11-16 (P2·Claude) 방금 한 일 <!-- id:fresh -->\n', ''))
})

test('누가가 없는 옛 줄은 (함께)로 돌아가고, 항목이 빈 섹션에도 들어간다', async () => {
  const r = rollbackItem(TODO, DONE.replace('(P1) 옛 항목', '(P3) 옛 항목'), { id: 'old', text: '옛 항목' })
  if (!r.ok) throw new Error('거절됨')
  expect(r.todo).toContain('## 3등급: 계획\n- [ ] (함께) 옛 항목 <!-- id:old -->\n\n## 4등급')
})

test('마지막 섹션(뒤에 섹션이 없음)에도 끝에 붙는다', async () => {
  const done = '# 끝낸 것\n- [x] 2026-11-16 (P4·직접) 결정 2 <!-- id:d2 -->\n'
  const r = rollbackItem(TODO, done, { id: 'd2', text: '결정 2' })
  if (!r.ok) throw new Error('거절됨')
  expect(r.todo).toBe(TODO + '- [ ] (직접) 결정 2 <!-- id:d2 -->\n')
})

test('섹션의 마지막 항목을 체크했다가 되돌리면 원문과 같다(왕복)', async () => {
  const c = checkItem(TODO, DONE, { id: 'backup', text: '백업' }, '2026-11-16')
  if (!c.ok) throw new Error('거절됨')
  const r = rollbackItem(c.todo, c.done, { id: 'backup', text: '백업' })
  if (!r.ok) throw new Error('거절됨')
  expect(r.todo).toBe(TODO)
  expect(r.done).toBe(DONE)
})

test('중간 항목은 되돌리면 섹션 맨 끝으로 간다(원래 자리는 복원하지 않는다)', async () => {
  const c = checkItem(TODO, DONE, { id: 'sec', text: '보안 점검' }, '2026-11-16')
  if (!c.ok) throw new Error('거절됨')
  const r = rollbackItem(c.todo, c.done, { id: 'sec', text: '보안 점검' })
  if (!r.ok) throw new Error('거절됨')
  expect(r.todo.indexOf('id:backup')).toBeLessThan(r.todo.indexOf('id:sec'))
})

test('거절: 없는 id, 내용이 바뀜, 이미 TODO에 있음, 그 등급 섹션이 없음', async () => {
  expect(rollbackItem(TODO, DONE, { id: 'nope', text: 'x' })).toEqual({ ok: false, reason: 'not-found' })
  expect(rollbackItem(TODO, DONE, { id: 'fresh', text: '다른 문구' })).toEqual({ ok: false, reason: 'changed' })
  const todoHas = TODO.replace('(Claude) 보안 점검 <!-- id:sec -->', '(Claude) 보안 점검 <!-- id:sec -->\n- [ ] (Claude) 방금 한 일 <!-- id:fresh -->')
  expect(rollbackItem(todoHas, DONE, { id: 'fresh', text: '방금 한 일' })).toEqual({ ok: false, reason: 'already-todo' })
  expect(rollbackItem(TODO, DONE, { id: 'ghost', text: '없는 등급' })).toEqual({ ok: false, reason: 'no-section' })
})
