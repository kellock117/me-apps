// 부팅 확인(스모크 테스트): 빌드된 앱을 `next start`로 띄워 핵심 주소가 오류 없이 응답하는지 본다.
// 쓰는 곳: CI의 verify(.github/workflows/deploy.yml). 로컬에서는 `pnpm build` 뒤에 `pnpm smoke`.
// 확인하는 것: 서버가 뜨는가, 설정 파일(proxy)이 도는가, 로그인 화면이 그려지는가, PWA 파일이 나가는가, 잠금이 걸리는가.
// 확인하지 못하는 것: DB가 필요한 화면(자리표시 값이라 DB가 없다), 브라우저 동작, 실제 환경 변수 값.
import { spawn } from 'node:child_process';

const BASE_ENV = {
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_SECRET_KEY: 'smoke-placeholder',
  SITE_PASSWORD: 'smoke-placeholder',
  WORKOUT_PASSWORD: 'smoke-placeholder',
  CRON_SECRET: 'smoke-placeholder',
  DEV_LOGIN_SKIP: '0',
};

/** 앱마다 [주소, 기대 상태, 추가 확인]. 리다이렉트는 따라가지 않고 Location을 본다. */
const APPS = {
  book: {
    port: 4100,
    checks: [
      { path: '/login', status: 200, text: '<form' },
      { path: '/manifest.webmanifest', status: 200, json: (j) => typeof j.name === 'string' && j.start_url },
      { path: '/sw.js', status: 200, text: 'push' },
      { path: '/api/cron/daily', status: 401 },
      { path: '/admin', status: 307, location: '/login' },
    ],
  },
  workout: {
    port: 4101,
    checks: [
      { path: '/login', status: 200, text: '<form' },
      { path: '/manifest.webmanifest', status: 200, json: (j) => typeof j.name === 'string' && j.start_url },
      { path: '/history', status: 307, location: '/login' },
    ],
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitUntilUp(url, child, ms = 60_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error(`서버가 먼저 종료됨(코드 ${child.exitCode})`);
    try {
      await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(3000) });
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error(`${ms / 1000}초 안에 뜨지 않음`);
}

async function runCheck(origin, c) {
  const res = await fetch(origin + c.path, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
  const body = await res.text();
  const problems = [];
  if (res.status !== c.status) problems.push(`상태 ${res.status} (기대 ${c.status})`);
  if (c.location && !(res.headers.get('location') ?? '').includes(c.location)) problems.push(`Location이 ${c.location}이 아님`);
  if (c.text && !body.includes(c.text)) problems.push(`본문에 "${c.text}" 없음`);
  if (c.json) {
    try {
      if (!c.json(JSON.parse(body))) problems.push('JSON 내용이 기대와 다름');
    } catch {
      problems.push('JSON이 아님');
    }
  }
  return problems;
}

async function smoke(app, { port, checks }) {
  const origin = `http://127.0.0.1:${port}`;
  let log = '';
  const child = spawn('pnpm', ['--filter', app, 'exec', 'next', 'start', '--port', String(port)], {
    env: { ...process.env, ...BASE_ENV, NODE_ENV: 'production' },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const stop = () => {
    try {
      process.kill(-child.pid);
    } catch {
      // 이미 끝남
    }
  };
  let failed = 0;
  try {
    await waitUntilUp(origin + '/login', child);
    for (const c of checks) {
      const problems = await runCheck(origin, c);
      console.log(`${problems.length ? '✗' : '✓'} ${app} ${c.path}${problems.length ? ' — ' + problems.join(', ') : ''}`);
      failed += problems.length ? 1 : 0;
    }
  } catch (e) {
    console.log(`✗ ${app} — ${e.message}`);
    failed += 1;
  } finally {
    stop();
  }
  if (failed) console.log(`--- ${app} 서버 로그 ---\n${log.trim().slice(-3000)}\n---`);
  return failed;
}

const only = process.argv[2];
let failed = 0;
for (const [app, cfg] of Object.entries(APPS)) {
  if (only && only !== app) continue;
  failed += await smoke(app, cfg);
}
process.exit(failed ? 1 : 0);
