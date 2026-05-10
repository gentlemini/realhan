const BASE_URL = 'https://realhan.vercel.app';

export default function sitemap() {
  const now = new Date().toISOString();

  const staticPages = [
    { url: BASE_URL,                          priority: 1.0,  changeFrequency: 'daily' },
    { url: `${BASE_URL}/properties`,          priority: 0.9,  changeFrequency: 'daily' },
    { url: `${BASE_URL}/property-request`,    priority: 0.8,  changeFrequency: 'monthly' },
    { url: `${BASE_URL}/about`,               priority: 0.7,  changeFrequency: 'monthly' },
    { url: `${BASE_URL}/contact`,             priority: 0.7,  changeFrequency: 'monthly' },
    { url: `${BASE_URL}/news`,                priority: 0.6,  changeFrequency: 'daily' },
    { url: `${BASE_URL}/calculator`,          priority: 0.6,  changeFrequency: 'monthly' },
    { url: `${BASE_URL}/blog`,                priority: 0.5,  changeFrequency: 'weekly' },
    { url: `${BASE_URL}/web-design`,          priority: 0.8,  changeFrequency: 'monthly' },
    { url: `${BASE_URL}/links`,               priority: 0.4,  changeFrequency: 'monthly' },
  ];

  return staticPages.map(page => ({
    ...page,
    lastModified: now,
  }));
}
