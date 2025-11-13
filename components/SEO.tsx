import Head from 'next/head';
import { useRouter } from 'next/router';
import { getSEOConfig, type SEOConfig } from '@/lib/seo';

interface SEOProps {
  pageKey?: string;
  overrides?: Partial<SEOConfig>;
  structuredData?: Record<string, any> | Record<string, any>[];
}

/**
 * SEO component for managing page metadata
 *
 * Usage:
 * ```tsx
 * <SEO pageKey="home" />
 * <SEO pageKey="pricing" overrides={{ title: "Custom Title" }} />
 * <SEO pageKey="blog" structuredData={articleSchema} />
 * ```
 */
export default function SEO({ pageKey = 'home', overrides, structuredData }: SEOProps) {
  const router = useRouter();
  const config = getSEOConfig(pageKey, overrides);

  // Build canonical URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cpam.example.com';
  const canonical = config.canonical || `${baseUrl}${router.asPath.split('?')[0]}`;

  // Robots meta
  const robotsContent = [];
  if (config.noindex) robotsContent.push('noindex');
  if (config.nofollow) robotsContent.push('nofollow');
  const robotsMeta = robotsContent.length > 0 ? robotsContent.join(',') : 'index,follow';

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{config.title}</title>
      <meta name="description" content={config.description} />
      <meta name="robots" content={robotsMeta} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={config.openGraph?.type || 'website'} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={config.openGraph?.title || config.title} />
      <meta
        property="og:description"
        content={config.openGraph?.description || config.description}
      />
      {config.openGraph?.siteName && (
        <meta property="og:site_name" content={config.openGraph.siteName} />
      )}
      {config.openGraph?.image && (
        <>
          <meta property="og:image" content={config.openGraph.image} />
          {config.openGraph.imageAlt && (
            <meta property="og:image:alt" content={config.openGraph.imageAlt} />
          )}
        </>
      )}

      {/* Twitter */}
      <meta name="twitter:card" content={config.twitter?.card || 'summary_large_image'} />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={config.twitter?.title || config.title} />
      <meta
        name="twitter:description"
        content={config.twitter?.description || config.description}
      />
      {config.twitter?.site && <meta name="twitter:site" content={config.twitter.site} />}
      {config.twitter?.creator && <meta name="twitter:creator" content={config.twitter.creator} />}
      {config.twitter?.image && (
        <>
          <meta name="twitter:image" content={config.twitter.image} />
          {config.twitter.imageAlt && (
            <meta name="twitter:image:alt" content={config.twitter.imageAlt} />
          )}
        </>
      )}

      {/* Additional Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta httpEquiv="x-ua-compatible" content="IE=edge" />
      <meta name="theme-color" content="#3B82F6" />

      {/* Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              Array.isArray(structuredData) ? structuredData : [structuredData]
            ),
          }}
        />
      )}
    </Head>
  );
}
