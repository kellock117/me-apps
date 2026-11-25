import type { MetadataRoute } from 'next';

/** 홈 화면에 추가(PWA)할 때 쓰는 정보. 주소는 /manifest.webmanifest 로 자동 제공된다. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '독서 모임',
    short_name: '독서',
    description: '우리 독서 모임의 기록',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf6ee',
    theme_color: '#7a4b2a',
    icons: [{ src: '/icon', sizes: '512x512', type: 'image/png' }],
  };
}
