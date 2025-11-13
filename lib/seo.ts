/**
 * SEO configuration and utilities for CPAM
 * Centralized SEO metadata management for consistent optimization
 */

export interface SEOConfig {
  title: string;
  description: string;
  canonical?: string;
  openGraph?: {
    type?: string;
    title?: string;
    description?: string;
    image?: string;
    imageAlt?: string;
    siteName?: string;
  };
  twitter?: {
    card?: 'summary' | 'summary_large_image' | 'app' | 'player';
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    image?: string;
    imageAlt?: string;
  };
  noindex?: boolean;
  nofollow?: boolean;
}

// Default site configuration
export const defaultSEO: SEOConfig = {
  title: 'CPAM - Commodity Price Adjustment Management',
  description:
    'Enterprise-grade commodity pricing platform. Automate price adjustments, manage exposure, and make confident pricing decisions.',
  openGraph: {
    type: 'website',
    siteName: 'CPAM',
    image: '/og-image.png',
    imageAlt: 'CPAM - Commodity Price Adjustment Management Platform',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@cpam',
    creator: '@cpam',
  },
};

// SEO configurations for specific pages
export const pageSEO: Record<string, SEOConfig> = {
  home: {
    title: 'CPAM - Commodity Price Adjustment Management Platform',
    description:
      'Enterprise-grade commodity pricing platform. Automate price adjustments, manage exposure, and make confident pricing decisions with CPAM.',
    openGraph: {
      type: 'website',
      title: 'CPAM - Master Your Commodity Pricing',
      description:
        'Automate commodity price adjustments with dynamic formulas, scenario analysis, and real-time analytics.',
    },
  },
  dashboard: {
    title: 'Dashboard - CPAM',
    description: 'View your commodity pricing overview, KPIs, and recent activity.',
    noindex: true,
  },
  items: {
    title: 'Items - CPAM',
    description: 'Manage your commodity portfolio items and pricing formulas.',
    noindex: true,
  },
  'index-series': {
    title: 'Index Series - CPAM',
    description: 'Manage price index data sources and providers.',
    noindex: true,
  },
  pams: {
    title: 'PAMs - CPAM',
    description: 'Build and manage Price Adjustment Methodologies with visual formula builder.',
    noindex: true,
  },
  scenarios: {
    title: 'Scenarios - CPAM',
    description: 'Run what-if scenario analysis on your commodity pricing.',
    noindex: true,
  },
  calculations: {
    title: 'Calculations - CPAM',
    description: 'Manage batch price calculation runs and view results.',
    noindex: true,
  },
  pricing: {
    title: 'Pricing - CPAM',
    description:
      'Transparent pricing plans for CPAM. From startups to enterprise, find the right plan for your commodity pricing needs.',
    openGraph: {
      type: 'website',
      title: 'CPAM Pricing - Plans for Every Business Size',
    },
  },
  about: {
    title: 'About Us - CPAM',
    description:
      'Learn about CPAM, our mission to simplify commodity pricing, and the team building the future of price management.',
    openGraph: {
      type: 'website',
      title: 'About CPAM - Our Mission and Team',
    },
  },
  contact: {
    title: 'Contact Us - CPAM',
    description:
      'Get in touch with CPAM. Request a demo, ask questions, or speak with our sales team.',
    openGraph: {
      type: 'website',
      title: 'Contact CPAM - Request a Demo',
    },
  },
  blog: {
    title: 'Blog - CPAM',
    description:
      'Latest insights on commodity pricing, product updates, and industry best practices from the CPAM team.',
    openGraph: {
      type: 'website',
      title: 'CPAM Blog - Commodity Pricing Insights',
    },
  },
  docs: {
    title: 'Documentation - CPAM',
    description:
      'Complete documentation for CPAM. API reference, user guides, tutorials, and integration examples.',
    openGraph: {
      type: 'website',
      title: 'CPAM Documentation - API & User Guides',
    },
  },
};

/**
 * Merge page-specific SEO config with defaults
 */
export function getSEOConfig(pageKey: string, overrides?: Partial<SEOConfig>): SEOConfig {
  const pageSEOConfig = pageSEO[pageKey] || {};
  return {
    ...defaultSEO,
    ...pageSEOConfig,
    ...overrides,
    openGraph: {
      ...defaultSEO.openGraph,
      ...pageSEOConfig.openGraph,
      ...overrides?.openGraph,
    },
    twitter: {
      ...defaultSEO.twitter,
      ...pageSEOConfig.twitter,
      ...overrides?.twitter,
    },
  };
}

/**
 * Generate JSON-LD structured data for organization
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CPAM',
    description: 'Commodity Price Adjustment Management Platform',
    url: 'https://cpam.example.com',
    logo: 'https://cpam.example.com/logo.png',
    sameAs: [
      'https://twitter.com/cpam',
      'https://linkedin.com/company/cpam',
      'https://github.com/cpam',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Sales',
      email: 'sales@cpam.example.com',
    },
  };
}

/**
 * Generate JSON-LD structured data for software application
 */
export function getSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'CPAM',
    applicationCategory: 'BusinessApplication',
    description:
      'Enterprise commodity price adjustment management platform with automated calculations and scenario analysis.',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free trial available',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
    },
  };
}

/**
 * Generate JSON-LD breadcrumb schema
 */
export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
