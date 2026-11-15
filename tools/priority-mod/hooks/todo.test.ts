// parseTodo 테스트: 텍스트를 넣으면 등급별 항목이 나오고, 모르는 줄은 건너뛴다.
import { expect, test } from 'claude-code/testing'

import { parseTodo } from './todo'

const SAMPLE = `# 아직 안 한 것

머리말 줄

## 1등급: 막힘·장애
- [ ] (직접) 운영 확인 <!-- id:check-prod -->

## 2등급: 곧 문제
- [ ] (Claude) 보안 점검 <!-- id:sec -->
- [ ] (함께) 백업 <!-- id:backup -->

## 3등급: 목표 직결 (구직 준비)

## 5등급: 아이디어
- [ ] (직접) 허브 페이지 여부 <!-- id:hub-page -->
`

test('등급별로 묶고 누가·id·내용을 읽는다', async () => {
  const sections = parseTodo(SAMPLE)
  expect(sections.map(s => s.grade)).toEqual([1, 2, 3, 5])
  expect(sections[1].items).toEqual([
    { id: 'sec', who: 'Claude', text: '보안 점검' },
    { id: 'backup', who: '함께', text: '백업' },
  ])
  expect(sections[2].items).toEqual([])
})

test('id나 누가가 없는 줄도 죽지 않고 읽는다', async () => {
  const sections = parseTodo('## 4등급: 정리\n- [ ] 이름 없는 항목\n')
  expect(sections[0].items).toEqual([{ id: undefined, who: undefined, text: '이름 없는 항목' }])
})

test('모르는 줄과 등급 앞의 줄은 건너뛴다', async () => {
  const sections = parseTodo('- [ ] (직접) 섹션 밖 <!-- id:x -->\n## 문서 설명\n## 1등급: a\n그냥 글\n- [x] (직접) 체크됨 <!-- id:y -->\n')
  expect(sections).toEqual([{ grade: 1, title: 'a', items: [] }])
})

test('빈 텍스트는 빈 목록', async () => {
  expect(parseTodo('')).toEqual([])
})
