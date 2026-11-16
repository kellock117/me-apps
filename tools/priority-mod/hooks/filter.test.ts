// filterSections·dirtyFiles 테스트: 필터는 보이는 항목만 거르고, git status 출력에서 바뀐 파일 이름을 뽑는다.
import { expect, test } from 'claude-code/testing'

import { dirtyFiles, filterSections, parseTodo } from './todo'

const SECTIONS = parseTodo(`## 1등급: a
- [ ] (직접) 하나 <!-- id:a -->
- [ ] (Claude) 둘 <!-- id:b -->
## 3등급: b
- [ ] (직접) 셋 <!-- id:c -->
- [ ] 넷 <!-- id:d -->
## 5등급: c
- [ ] (직접) 다섯 <!-- id:e -->
`)
const ids = (s: ReturnType<typeof filterSections>) => s.map(x => x.items.map(i => i.id))

test('필터를 안 걸면 그대로', async () => {
  expect(ids(filterSections(SECTIONS, { topOnly: false, mineOnly: false }))).toEqual([['a', 'b'], ['c', 'd'], ['e']])
})

test('1·2등급만: 3등급 이하 섹션이 빠진다', async () => {
  expect(ids(filterSections(SECTIONS, { topOnly: true, mineOnly: false }))).toEqual([['a', 'b']])
})

test('(직접)만: 직접이 아닌 항목(누가 없는 줄 포함)이 빠지고 빈 섹션은 사라진다', async () => {
  expect(ids(filterSections(SECTIONS, { topOnly: false, mineOnly: true }))).toEqual([['a'], ['c'], ['e']])
})

test('둘을 함께 켜면 둘 다 적용된다', async () => {
  expect(ids(filterSections(SECTIONS, { topOnly: true, mineOnly: true }))).toEqual([['a']])
})

test('필터를 걸어도 남은 항목의 id·내용은 그대로다(체크·되돌리기가 같은 줄을 가리킨다)', async () => {
  const [first] = filterSections(SECTIONS, { topOnly: false, mineOnly: true })
  expect(first.items[0]).toEqual({ id: 'a', who: '직접', text: '하나' })
})

test('dirtyFiles: porcelain 출력에서 바뀐 파일 이름만 뽑는다', async () => {
  expect(dirtyFiles(' M docs/TODO.md\n M docs/DONE.md\n')).toEqual(['docs/TODO.md', 'docs/DONE.md'])
  expect(dirtyFiles('')).toEqual([])
})
