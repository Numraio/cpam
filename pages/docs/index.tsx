import Link from 'next/link';
import { type ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui';
import {
  BookOpenIcon,
  CodeBracketIcon,
  RocketLaunchIcon,
  CubeIcon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
  ArrowRightIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const DocsPage: NextPageWithLayout = () => {
  const docSections = [
    {
      icon: RocketLaunchIcon,
      title: 'Getting Started',
      description: 'Quick start guide to set up CPAM, create your first contract, and run calculations.',
      href: '/docs/getting-started',
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
    },
    {
      icon: LightBulbIcon,
      title: 'Core Concepts',
      description: 'Learn about Contracts, SKUs, PAMs, Index Series, Scenarios, and how they work together.',
      href: '/docs/concepts',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      icon: CubeIcon,
      title: 'PAM Builder Guide',
      description: 'Master the visual formula builder to create sophisticated Price Adjustment Mechanisms.',
      href: '/docs/pam-builder',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      icon: CodeBracketIcon,
      title: 'API Reference',
      description: 'Complete REST API documentation with endpoints, request/response examples, and authentication.',
      href: '/docs/api',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: Cog6ToothIcon,
      title: 'Integration Guides',
      description: 'Connect CPAM with ERP systems, price index providers, and third-party applications.',
      href: '/docs/integrations',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: QuestionMarkCircleIcon,
      title: 'FAQs & Troubleshooting',
      description: 'Common questions, solutions to frequent issues, and best practices for CPAM.',
      href: '/docs/faq',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  const quickLinks = [
    { title: 'Create your first PAM', href: '/docs/getting-started#first-pam' },
    { title: 'API Authentication', href: '/docs/api#authentication' },
    { title: 'Understanding Price Formulas', href: '/docs/concepts#pams' },
    { title: 'Index Series Setup', href: '/docs/getting-started#index-series' },
    { title: 'What-If Scenarios', href: '/docs/concepts#scenarios' },
    { title: 'Batch Calculations', href: '/docs/concepts#calculations' },
  ];

  const popularGuides = [
    {
      title: 'Building Your First PAM',
      description: 'Step-by-step tutorial for creating a Price Adjustment Mechanism with the visual builder.',
      href: '/docs/pam-builder#first-pam',
      time: '10 min read',
    },
    {
      title: 'Connecting to Price Indices',
      description: 'How to configure Platts, Oanda, Argus, and other price index providers.',
      href: '/docs/integrations#price-indices',
      time: '5 min read',
    },
    {
      title: 'Contract Pricing Best Practices',
      description: 'Recommended patterns for structuring contracts, PAMs, and approval workflows.',
      href: '/docs/concepts#best-practices',
      time: '8 min read',
    },
  ];

  return (
    <>
      <SEO pageKey="docs" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary-600">
                CPAM
              </Link>
              <span className="ml-3 text-gray-400">/</span>
              <Link href="/docs" className="ml-3 text-gray-700 font-medium">
                Documentation
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Button
                variant="primary"
                size="md"
                onClick={() => (window.location.href = '/auth/join')}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 via-white to-primary-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6">
            <BookOpenIcon className="h-4 w-4" />
            Documentation
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            CPAM Documentation
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Everything you need to master contract pricing automation, from quick starts to advanced integrations.
          </p>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search documentation..."
                className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-300 rounded">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Documentation Sections */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docSections.map((section, index) => (
              <Link
                key={index}
                href={section.href}
                className="group p-6 rounded-2xl border-2 border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all"
              >
                <div className={`w-12 h-12 rounded-xl ${section.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <section.icon className={`h-6 w-6 ${section.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {section.title}
                </h3>
                <p className="text-gray-600 mb-4">{section.description}</p>
                <div className="flex items-center text-primary-600 font-medium">
                  <span>Learn more</span>
                  <ArrowRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Guides */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Popular Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {popularGuides.map((guide, index) => (
              <Link
                key={index}
                href={guide.href}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
                    {guide.title}
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                    {guide.time}
                  </span>
                </div>
                <p className="text-gray-600 text-sm">{guide.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Quick Links */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h3>
              <ul className="space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <Link
                      href={link.href}
                      className="text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-2"
                    >
                      <ArrowRightIcon className="h-4 w-4" />
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Need Help */}
            <div className="bg-primary-50 rounded-2xl p-6 border-2 border-primary-200">
              <ChartBarIcon className="h-8 w-8 text-primary-600 mb-3" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-gray-700 mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => (window.location.href = '/contact')}
              >
                Contact Support
              </Button>
            </div>

            {/* Community */}
            <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
              <BookOpenIcon className="h-8 w-8 text-gray-600 mb-3" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Join the Community</h3>
              <p className="text-gray-700 mb-4">
                Connect with other CPAM users, share best practices, and get tips.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open('https://community.cpam.example.com', '_blank')}
              >
                Visit Community
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold text-white mb-4">CPAM</div>
              <p className="text-sm">
                Contract Price Adjustment Management platform for automating SKU pricing.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/#features" className="hover:text-white">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="hover:text-white">
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="hover:text-white">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-white">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-white">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="hover:text-white">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} CPAM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { locale } = context;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

DocsPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default DocsPage;
