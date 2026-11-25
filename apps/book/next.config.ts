import type { NextConfig } from 'next';

// iPhone에서 로컬 서버를 열어 볼 때 쓰는 터널(cloudflared) 주소. 개발 중에만 허용한다.
const DEV_TUNNEL_HOSTS = ['*.trycloudflare.com'];
const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // next dev가 앱 폴더마다 AGENTS.md를 만들지 않게 한다 (루트의 AGENTS.md 하나만 쓴다)
  agentRules: false,
  // 공용 패키지는 빌드하지 않은 TS 소스 그대로 쓰므로 Next가 함께 컴파일하게 한다.
  transpilePackages: ['@me/core', '@me/ui'],
  // 터널 주소는 개발 모드에서만 연다. serverActions.allowedOrigins는 운영에도 적용되는 설정이라 반드시 개발 조건으로 감싼다.
  ...(isDev && {
    allowedDevOrigins: DEV_TUNNEL_HOSTS,
    experimental: { serverActions: { allowedOrigins: DEV_TUNNEL_HOSTS } },
  }),
  async headers() {
    return [
      {
        // 서비스 워커는 브라우저가 늘 최신본을 받아야 갱신된다
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
