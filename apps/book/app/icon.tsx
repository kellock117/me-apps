import { ImageResponse } from 'next/og';

/** 앱 아이콘(512×512). 그림 파일 없이 코드로 만든다. 기본 글꼴에 한글이 없어서 글자 대신 펼친 책 도형을 그린다. */
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#7a4b2a' }}>
        {/* 펼친 책: 두 쪽 + 가운데 접힌 선 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 150, height: 210, background: '#faf6ee', borderRadius: '28px 6px 6px 28px' }} />
          <div style={{ width: 12, height: 230, background: '#d9a06b', margin: '0 4px', borderRadius: 6 }} />
          <div style={{ width: 150, height: 210, background: '#faf6ee', borderRadius: '6px 28px 28px 6px' }} />
        </div>
      </div>
    ),
    size,
  );
}
