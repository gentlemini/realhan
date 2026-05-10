import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// Vercel 배포 시 NEXTAUTH_URL이 localhost로 잘못 설정된 경우 자동으로 수정
if (process.env.VERCEL_URL && (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes('localhost'))) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

const ALLOWED_EMAILS = ['air.minisoul@gmail.com', 'air.minisoul2@gmail.com'];

const isProd = process.env.NODE_ENV === 'production';

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { prompt: 'select_account' } },
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
        // maxAge 없음 = 브라우저 종료 시 쿠키 삭제
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
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
