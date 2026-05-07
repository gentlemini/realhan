export default function sitemap() {
  const base = process.env.NEXTAUTH_URL || 'https://realhan.vercel.app';
  const now = new Date();

  const staticPages = [
    { url: base,                          priority: 1.0,  changeFrequency: 'weekly'  },
    { url: `${base}/properties`,          priority: 0.9,  changeFrequency: 'daily'   },
    { url: `${base}/about`,               priority: 0.8,  changeFrequency: 'monthly' },
    { url: `${base}/contact`,             priority: 0.8,  changeFrequency: 'monthly' },
    { url: `${base}/property-request`,    priority: 0.7,  changeFrequency: 'monthly' },
    { url: `${base}/calculator`,          priority: 0.6,  changeFrequency: 'monthly' },
    { url: `${base}/news`,                priority: 0.6,  changeFrequency: 'weekly'  },
    { url: `${base}/blog`,                priority: 0.6,  changeFrequency: 'weekly'  },
    { url: `${base}/links`,               priority: 0.5,  changeFrequency: 'monthly' },
  ];

  return staticPages.map((page) => ({
    ...page,
    lastModified: now,
  }));
}
