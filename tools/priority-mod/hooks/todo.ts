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
