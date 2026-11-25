#!/usr/bin/env node
/**
 * 문서 링크 검사. CI의 verify에서 돈다(`pnpm docs:check`로 로컬에서도 가능).
 * 1) 마크다운 파일의 상대 링크 `[글](경로)`가 실제 파일인지
 * 2) 문서·코드 주석에 적힌 `docs/…` 경로가 실제 파일인지
 * 문서를 옮기거나 이름을 바꾸면 여기서 잡힌다. 옛 경로를 일부러 남기는 곳은 IGNORE에 둔다.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** 이미 적용된 마이그레이션 SQL은 고치지 않는다. DONE은 지난 기록이라 옛 경로가 남을 수 있다. */
const IGNORE = [/^supabase\/migrations\//, /^docs\/DONE\.md$/];
const TEXT = /\.(md|ts|tsx|mjs|css|json|yml)$/;

const files = execFileSync('git', ['-c', 'core.quotepath=off', 'ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && TEXT.test(f) && !IGNORE.some((re) => re.test(f)));

const errors = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const where = `${file}:${i + 1}`;
    if (file.endsWith('.md')) {
      for (const [, target] of line.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:|#)/.test(target)) continue;
        const path = decodeURIComponent(target.split('#')[0]);
        if (path && !existsSync(resolve(dirname(file), path))) errors.push(`${where} 링크가 없는 파일을 가리킨다: ${target}`);
      }
    }
    for (const [ref] of line.matchAll(/docs\/[^\s`'"()<>*,;]+\.md/g)) {
      if (!existsSync(ref)) errors.push(`${where} 없는 문서 경로: ${ref}`);
    }
  });
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n✗ 문서 경로 ${errors.length}건이 깨졌다`);
  process.exit(1);
}
console.log(`✓ 문서 링크·경로 정상 (파일 ${files.length}개 검사)`);
