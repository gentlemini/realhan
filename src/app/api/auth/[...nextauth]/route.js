import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const ALLOWED_EMAILS = ['air.minisoul@gmail.com', 'air.minisoul2@gmail.com'];

const isProd = process.env.NODE_ENV === 'production';

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { prompt: 'select_account' } },
      checks: ['state'],  // PKCE 비활성화 — Vercel 서버리스 환경에서 쿠키 검증 실패 방지
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: isProd ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
      },
    },
  },
  callbacks: {
    async signIn({ user }) {
      return ALLOWED_EMAILS.includes(user.email);
    },
    async redirect({ baseUrl }) {
      return baseUrl + '/admin2';
    },
  },
  pages: {
    signIn: '/admin2/login',
    error: '/admin2/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  logger: {
    error(code, metadata) {
      console.error('[AUTH]', code, JSON.stringify(metadata));
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
