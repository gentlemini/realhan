export default function robots() {
  const base = process.env.NEXTAUTH_URL || 'https://realhan.vercel.app';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin2/', '/api/'],
      },
      {
        userAgent: 'Yeti',
        allow: '/',
        disallow: ['/admin2/', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
