import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/admin2/login',
  },
});

export const config = {
  matcher: ['/admin2/:path*'],
};
