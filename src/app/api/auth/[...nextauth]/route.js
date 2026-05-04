import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const ALLOWED_EMAILS = ['air.minisoul@gmail.com'];

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
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
