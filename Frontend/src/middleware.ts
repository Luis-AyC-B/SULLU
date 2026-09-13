export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/dashboard/:path*', '/examenes/:path*', '/usuarios/:path*', '/ambientes/:path*'],
};