import { ImageResponse } from 'next/og';

/** iOS 홈 화면 아이콘(180×180). 기본 글꼴에 한글이 없어서 글자 대신 펼친 책 도형을 그린다. */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#7a4b2a' }}>
        {/* 펼친 책: 두 쪽 + 가운데 접힌 선 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 53, height: 74, background: '#faf6ee', borderRadius: '10px 2px 2px 10px' }} />
          <div style={{ width: 4, height: 81, background: '#d9a06b', margin: '0 1px', borderRadius: 2 }} />
          <div style={{ width: 53, height: 74, background: '#faf6ee', borderRadius: '2px 10px 10px 2px' }} />
        </div>
      </div>
    ),
    size,
  );
}
