/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next-build',
  serverExternalPackages: ['@notionhq/client'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'notion.so' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
    ],
  },
};

export default nextConfig;
