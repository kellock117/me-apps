// checkItem 테스트: TODO 텍스트와 DONE 텍스트를 넣으면 옮겨진 두 텍스트(또는 거절 이유)가 나온다.
import { expect, test } from 'claude-code/testing'

import { checkItem } from './todo'

const TODO = `# 아직 안 한 것

## 1등급: 막힘·장애
- [ ] (직접) 운영 확인 <!-- id:check-prod -->

## 2등급: 곧 문제
- [ ] (Claude) 보안 점검 <!-- id:sec -->
- [ ] (함께) 백업 <!-- id:backup -->

## 4등급: 정리
- [ ] 이름 없는 항목 <!-- id:nobody -->
- [ ] id 없는 항목
`
const DONE = `# 끝낸 것

설명 줄
- [x] 2026-11-15 (P1) 옛 항목 <!-- id:old -->
- [x] 2026-11-14 (P3) 더 옛 항목 <!-- id:older -->
`
const WHEN = '2026-11-16'

test('체크하면 TODO에서 빠지고 DONE 맨 위(머리글 바로 아래)에 새 형식으로 들어간다', async () => {
  const r = checkItem(TODO, DONE, { id: 'sec', text: '보안 점검' }, WHEN)
  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect(r.todo).toBe(TODO.replace('- [ ] (Claude) 보안 점검 <!-- id:sec -->\n', ''))
  expect(r.done).toBe(
    DONE.replace(
      '- [x] 2026-11-15 (P1) 옛 항목',
      '- [x] 2026-11-16 (P2·Claude) 보안 점검 <!-- id:sec -->\n- [x] 2026-11-15 (P1) 옛 항목',
    ),
  )
})

test('id 주석이 그대로 유지되고 다른 줄은 한 글자도 바뀌지 않는다', async () => {
  const r = checkItem(TODO, DONE, { id: 'check-prod', text: '운영 확인' }, WHEN)
  if (!r.ok) throw new Error('거절됨')
  expect(r.done).toContain('- [x] 2026-11-16 (P1·직접) 운영 확인 <!-- id:check-prod -->')
  expect(r.todo.split('\n').length).toBe(TODO.split('\n').length - 1)
  expect(r.todo).toContain('- [ ] (Claude) 보안 점검 <!-- id:sec -->')
})

test('누가가 없는 항목은 (P등급)만 붙는다', async () => {
  const r = checkItem(TODO, DONE, { id: 'nobody', text: '이름 없는 항목' }, WHEN)
  if (!r.ok) throw new Error('거절됨')
  expect(r.done).toContain('- [x] 2026-11-16 (P4) 이름 없는 항목 <!-- id:nobody -->')
})

test('없는 id와 id 없는 줄은 거절한다', async () => {
  expect(checkItem(TODO, DONE, { id: 'nope', text: 'x' }, WHEN)).toEqual({ ok: false, reason: 'not-found' })
  expect(checkItem(TODO, DONE, { id: '', text: 'id 없는 항목' }, WHEN)).toEqual({ ok: false, reason: 'not-found' })
})

test('화면에 보인 내용과 지금 줄이 다르면 거절한다(그 사이 파일이 바뀜)', async () => {
  expect(checkItem(TODO, DONE, { id: 'sec', text: '다른 문구' }, WHEN)).toEqual({ ok: false, reason: 'changed' })
})

test('DONE에 이미 같은 id가 있으면 거절한다', async () => {
  expect(checkItem(TODO, DONE, { id: 'old', text: '옛 항목' }, WHEN)).toEqual({ ok: false, reason: 'not-found' })
  const doneHasSec = DONE + '- [x] 2026-11-10 (P2) 보안 점검 <!-- id:sec -->\n'
  expect(checkItem(TODO, doneHasSec, { id: 'sec', text: '보안 점검' }, WHEN)).toEqual({ ok: false, reason: 'already-done' })
})

test('DONE에 체크 줄이 하나도 없으면 맨 끝에 붙는다', async () => {
  const r = checkItem(TODO, '# 끝낸 것\n', { id: 'backup', text: '백업' }, WHEN)
  if (!r.ok) throw new Error('거절됨')
  expect(r.done).toBe('# 끝낸 것\n- [x] 2026-11-16 (P2·함께) 백업 <!-- id:backup -->\n')
})

test('입력을 바꾸지 않는다(같은 호출은 같은 결과)', async () => {
  const a = checkItem(TODO, DONE, { id: 'sec', text: '보안 점검' }, WHEN)
  const b = checkItem(TODO, DONE, { id: 'sec', text: '보안 점검' }, WHEN)
  expect(a).toEqual(b)
})
