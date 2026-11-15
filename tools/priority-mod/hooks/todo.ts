/**
 * docs/TODO.md 읽기. 등급 섹션("## N등급: 제목")마다 `- [ ] (누가) 내용 <!-- id:... -->` 줄을 모은다.
 * 쓰는 곳: register.tsx(패널). 읽기 전용이라 파일은 고치지 않는다. 모르는 줄은 건너뛴다.
 */
export type Who = '직접' | 'Claude' | '함께'
export type TodoItem = { id: string | undefined; who: Who | undefined; text: string }
export type Section = { grade: number; title: string; items: TodoItem[] }

const SECTION = /^##\s+(\d)등급\s*:\s*(.*)$/
const ITEM = /^- \[ \]\s+(?:\((직접|Claude|함께)\)\s+)?(.*?)\s*(?:<!--\s*id:(\S+?)\s*-->)?\s*$/

/** TODO.md 텍스트를 등급 섹션 목록으로 바꾼다. 등급 섹션 밖의 줄과 체크된(`- [x]`) 줄은 무시한다. */
export function parseTodo(markdown: string): Section[] {
  const sections: Section[] = []
  for (const line of markdown.split('\n')) {
    const head = SECTION.exec(line)
    if (head) {
      sections.push({ grade: Number(head[1]), title: head[2].trim(), items: [] })
      continue
    }
    const item = ITEM.exec(line)
    const current = sections[sections.length - 1]
    if (item && current) {
      current.items.push({ id: item[3], who: item[1] as Who | undefined, text: item[2] })
    }
  }
  return sections
}

export type CheckResult =
  | { ok: true; todo: string; done: string }
  | { ok: false; reason: 'not-found' | 'changed' | 'already-done' }

/** DONE.md 머리글 뒤 첫 체크 줄 앞에 넣을 자리를 찾는다. 체크 줄이 없으면 맨 끝. */
function doneInsertIndex(lines: string[]): number {
  const first = lines.findIndex(line => line.startsWith('- [x]'))
  if (first >= 0) return first
  return lines.length > 0 && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length
}

/**
 * TODO.md에서 `id` 줄을 빼 DONE.md 맨 위에 `- [x] 날짜 (P등급·누가) 내용 <!-- id:... -->`로 옮긴 두 텍스트를 돌려준다.
 * `expected.text`는 화면에 보였던 내용이다. 그 사이 줄이 바뀌었으면 쓰지 않도록 'changed'로 거절한다.
 * 입력은 바꾸지 않고, 옮기는 줄 외의 모든 줄은 그대로 둔다.
 */
export function checkItem(
  todoText: string,
  doneText: string,
  expected: { id: string; text: string },
  date: string,
): CheckResult {
  if (!expected.id) return { ok: false, reason: 'not-found' }
  const todoLines = todoText.split('\n')
  let grade: number | undefined
  let at = -1
  let item: TodoItem | undefined
  for (let i = 0; i < todoLines.length; i++) {
    const head = SECTION.exec(todoLines[i])
    if (head) {
      grade = Number(head[1])
      continue
    }
    const m = ITEM.exec(todoLines[i])
    if (m && m[3] === expected.id && grade !== undefined) {
      at = i
      item = { id: m[3], who: m[1] as Who | undefined, text: m[2] }
      break
    }
  }
  if (!item || at < 0 || grade === undefined) return { ok: false, reason: 'not-found' }
  if (item.text !== expected.text) return { ok: false, reason: 'changed' }
  if (doneText.includes(`<!-- id:${expected.id} -->`)) return { ok: false, reason: 'already-done' }

  const line = `- [x] ${date} (P${grade}${item.who ? `·${item.who}` : ''}) ${item.text} <!-- id:${item.id} -->`
  const doneLines = doneText.split('\n')
  doneLines.splice(doneInsertIndex(doneLines), 0, line)
  return { ok: true, todo: todoLines.filter((_, i) => i !== at).join('\n'), done: doneLines.join('\n') }
}
