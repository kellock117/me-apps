/**
 * 개발 모드(`next dev`)에서만 로그인을 생략한다.
 *
 * - 조건은 NODE_ENV === 'development' 하나다. `next build`로 만든 것(Vercel의 운영·프리뷰 포함)은 NODE_ENV가 production이라 절대 켜지지 않는다.
 * - 쓰는 곳: 두 앱 proxy.ts, book의 isLoggedIn, core의 verifySiteToken. 관리자 화면(ADMIN_PASSWORD)은 생략하지 않는다.
 * - book은 로그인만 생략하고 "나는 누구" 선택 화면(/who)은 그대로 거친다.
 * - 게스트 화면을 보고 싶으면 `DEV_LOGIN_SKIP=0`으로 서버를 띄운다.
 */
export function isDevLoginSkip(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.DEV_LOGIN_SKIP !== '0';
}
