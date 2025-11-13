import Link from 'next/link';
import { type ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import env from '@/lib/env';
import Head from 'next/head';
import { Button } from '@/components/ui';
import {
  ChartBarIcon,
  CubeIcon,
  BeakerIcon,
  BoltIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const Home: NextPageWithLayout = () => {
  const features = [
    {
      name: 'Dynamic Price Adjustment',
      description: 'Build sophisticated pricing formulas using our visual PAM (Price Adjustment Methodology) builder with real-time index data.',
      icon: ChartBarIcon,
    },
    {
      name: 'Portfolio Management',
      description: 'Manage thousands of commodity items with flexible contract terms, FX policies, and custom pricing mechanisms.',
      icon: CubeIcon,
    },
    {
      name: 'Scenario Analysis',
      description: 'Run what-if scenarios to test pricing strategies before committing. Override prices, simulate market conditions.',
      icon: BeakerIcon,
    },
    {
      name: 'Batch Calculations',
      description: 'Process bulk price adjustments across your entire portfolio with automated calculation workflows.',
      icon: BoltIcon,
    },
    {
      name: 'Enterprise Security',
      description: 'SOC2 compliant with role-based access control, audit trails, and comprehensive compliance features.',
      icon: ShieldCheckIcon,
    },
    {
      name: 'Real-Time Analytics',
      description: 'Monitor exposure, track trends, and make data-driven decisions with comprehensive dashboards and reports.',
      icon: ArrowTrendingUpIcon,
    },
  ];

  const benefits = [
    'Reduce pricing errors by 95% with automated calculations',
    'Save 20+ hours per month on manual price adjustments',
    'Gain real-time visibility into commodity exposure',
    'Scale from hundreds to millions of items effortlessly',
    'Ensure compliance with built-in audit trails',
    'Integrate with existing ERP and data providers',
  ];

  return (
    <>
      <Head>
        <title>CPAM - Commodity Price Adjustment Management Platform</title>
        <meta
          name="description"
          content="Enterprise-grade commodity pricing platform. Automate price adjustments, manage exposure, and make confident pricing decisions with CPAM."
        />
        <meta property="og:title" content="CPAM - Commodity Price Adjustment Management" />
        <meta
          property="og:description"
          content="Automate commodity price adjustments with dynamic formulas, scenario analysis, and real-time analytics."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary-600">
                CPAM
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
                onClick={() => window.location.href = '/auth/join'}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 via-white to-primary-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              Master Your{' '}
              <span className="text-primary-600">Commodity Pricing</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-10 leading-relaxed">
              Enterprise-grade platform for automating price adjustments, managing exposure,
              and making confident pricing decisions across your commodity portfolio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={() => window.location.href = '/auth/join'}
                rightIcon={<ArrowRightIcon className="h-5 w-5" />}
              >
                Start Free Trial
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '#features'}
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">95%</div>
              <div className="text-gray-600">Fewer Pricing Errors</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">20+</div>
              <div className="text-gray-600">Hours Saved Monthly</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">1M+</div>
              <div className="text-gray-600">Items Managed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Commodity Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From formula builders to compliance reporting, CPAM provides all the tools
              you need for sophisticated pricing management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-normal"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.name}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                Why Choose CPAM?
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Join leading commodity traders and procurement teams who trust CPAM
                to manage billions in pricing exposure.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-lg text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                    What Our Customers Say
                  </h3>
                  <blockquote className="text-lg text-gray-700 mb-4">
                    "CPAM transformed how we manage commodity pricing. What used to take days
                    now takes minutes. The formula builder is intuitive and powerful."
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-600 font-semibold">JD</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">John Doe</div>
                      <div className="text-sm text-gray-600">VP of Procurement, Fortune 500</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Pricing?
          </h2>
          <p className="text-xl text-primary-100 mb-10">
            Join thousands of pricing professionals who trust CPAM for their commodity price management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => window.location.href = '/auth/join'}
              rightIcon={<ArrowRightIcon className="h-5 w-5" />}
            >
              Start Free Trial
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.location.href = '#contact'}
              className="border-white text-white hover:bg-white/10"
            >
              Schedule Demo
            </Button>
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
                Enterprise commodity price adjustment management platform.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
                <li><Link href="/security" className="hover:text-white">Security</Link></li>
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

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  // Redirect to login page if landing page is disabled
  if (env.hideLandingPage) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: true,
      },
    };
  }

  const { locale } = context;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

Home.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default Home;
