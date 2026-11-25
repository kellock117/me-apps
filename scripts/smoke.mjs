// 부팅 확인(스모크 테스트): 빌드된 앱을 `next start`로 띄워 핵심 주소가 오류 없이 응답하는지 본다.
// 쓰는 곳: CI의 verify(.github/workflows/deploy.yml). 로컬에서는 `pnpm build` 뒤에 `pnpm smoke`.
// 확인하는 것: 서버가 뜨는가, 설정 파일(proxy)이 도는가, 로그인 화면이 그려지는가, PWA 파일이 나가는가, 잠금이 걸리는가.
// 브라우저 확인(모바일 크기 Chromium): 로그인 화면이 오류 없이 하이드레이션되는가, 가로로 넘치지 않는가, 서비스 워커가 등록되는가.
//   브라우저가 없으면 로컬에서는 건너뛰고, CI(CI=true)에서는 실패한다. 설치: `pnpm exec playwright-core install chromium`.
// 확인하지 못하는 것: DB가 필요한 화면(자리표시 값이라 DB가 없다), 로그인 뒤 화면, 실제 환경 변수 값, 실기기(iOS Safari) 동작.
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';

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
    serviceWorker: true,
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

// 새 앱을 만들고 APPS에 넣지 않으면 부팅 확인에서 빠진 채 CI가 통과한다. 앱 폴더와 APPS를 맞춘다.
const missing = readdirSync('apps', { withFileTypes: true })
  .filter((d) => d.isDirectory() && !(d.name in APPS))
  .map((d) => d.name);
if (missing.length) {
  console.log(`✗ APPS에 없는 앱: ${missing.join(', ')} (scripts/smoke.mjs의 APPS에 포트와 확인할 주소를 더한다)`);
  process.exit(1);
}

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

/** 모바일 크기 브라우저로 /login을 열어 본다. 반환: 실패 수. */
async function browserCheck(app, origin, { serviceWorker }) {
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    chromium = null;
  }
  let browser = null;
  try {
    browser = await chromium?.launch();
  } catch (e) {
    if (process.env.CI) {
      console.log(`✗ ${app} 브라우저를 못 띄움 — ${String(e.message).split('\n')[0]}`);
      return 1;
    }
  }
  if (!browser) {
    if (process.env.CI) {
      console.log(`✗ ${app} 브라우저 확인 불가(playwright-core 없음)`);
      return 1;
    }
    console.log(`- ${app} 브라우저 확인 건너뜀 (pnpm exec playwright-core install chromium)`);
    return 0;
  }
  const problems = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    // Vercel 분석 스크립트(/_vercel/…)는 Vercel에서만 나간다. 로컬 서버에서는 로그인으로 리다이렉트되어 가짜 오류가 나므로 빈 스크립트로 대신한다.
    await page.route('**/_vercel/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    page.on('pageerror', (e) => problems.push(`페이지 오류: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && problems.push(`콘솔 오류: ${m.text()}`));
    await page.goto(origin + '/login', { waitUntil: 'networkidle', timeout: 30_000 });
    const hydrated = await page.evaluate(() => {
      const form = document.querySelector('form');
      return !!form && Object.keys(form).some((k) => k.startsWith('__reactFiber') || k.startsWith('__reactProps'));
    });
    if (!hydrated) problems.push('로그인 폼이 없거나 하이드레이션되지 않음');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) problems.push('모바일 폭에서 가로로 넘침');
    if (serviceWorker) {
      const ok = await page.evaluate(async () => {
        try {
          await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
          const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 15_000))]);
          return !!reg.active;
        } catch {
          return false;
        }
      });
      if (!ok) problems.push('서비스 워커가 등록·활성화되지 않음');
    }
  } catch (e) {
    problems.push(e.message.split('\n')[0]);
  } finally {
    await browser.close();
  }
  console.log(`${problems.length ? '✗' : '✓'} ${app} 브라우저(모바일) /login${problems.length ? ' — ' + problems.join(' | ') : ''}`);
  return problems.length ? 1 : 0;
}

async function smoke(app, { port, checks, serviceWorker }) {
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
    failed += await browserCheck(app, origin, { serviceWorker });
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
