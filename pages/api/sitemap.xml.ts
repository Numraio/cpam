import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Generate sitemap.xml dynamically
 * This helps search engines discover and index all public pages
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cpam.example.com';

  // Define static pages with their priority and change frequency
  const staticPages = [
    { url: '/', changefreq: 'weekly', priority: 1.0 },
    { url: '/pricing', changefreq: 'monthly', priority: 0.8 },
    { url: '/about', changefreq: 'monthly', priority: 0.6 },
    { url: '/contact', changefreq: 'monthly', priority: 0.7 },
    { url: '/blog', changefreq: 'daily', priority: 0.9 },
    { url: '/docs', changefreq: 'weekly', priority: 0.8 },
    { url: '/auth/login', changefreq: 'monthly', priority: 0.5 },
    { url: '/auth/join', changefreq: 'monthly', priority: 0.7 },
  ];

  // Generate XML sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.status(200).send(sitemap);
}
