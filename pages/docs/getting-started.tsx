import Link from 'next/link';
import { type ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';

const GettingStartedPage: NextPageWithLayout = () => {
  return (
    <>
      <SEO
        pageKey="docs"
        overrides={{
          title: 'Getting Started - CPAM Documentation',
          description: 'Quick start guide to set up CPAM, create your first contract, and run calculations.',
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary-600">
                CPAM
              </Link>
              <span className="ml-3 text-gray-400">/</span>
              <Link href="/docs" className="ml-3 text-gray-700 hover:text-primary-600">
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

      {/* Content */}
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium mb-6"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Documentation
          </Link>

          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
              <RocketLaunchIcon className="h-4 w-4" />
              Getting Started
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Quick Start Guide
            </h1>
            <p className="text-xl text-gray-600">
              Get up and running with CPAM in 15 minutes. This guide will walk you through
              account setup, creating your first contract, and running calculations.
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
            {/* Prerequisites */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Prerequisites</h2>
              <p className="text-gray-700 mb-4">
                Before you begin, make sure you have:
              </p>
              <ul className="space-y-3">
                {[
                  'A CPAM account (sign up at cpam.example.com)',
                  'Basic understanding of contract pricing concepts',
                  'Price index data or contracts ready to upload',
                  'API credentials (if integrating with external systems)',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Step 1 */}
            <section id="step-1" className="mb-12 scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                  1
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Create Your Team</h2>
              </div>
              <p className="text-gray-700 mb-4">
                After signing up, create your first team to organize contracts and users.
              </p>
              <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto mb-4">
                <pre className="text-gray-100 text-sm font-mono">
{`1. Navigate to Settings → Teams
2. Click "Create Team"
3. Enter team name (e.g., "Procurement Team")
4. Add team members via email
5. Assign roles (Admin, Manager, Viewer)`}
                </pre>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                <p className="text-sm text-blue-900">
                  <strong>Tip:</strong> Teams provide multi-tenancy. Each team has isolated contracts, SKUs, and data.
                </p>
              </div>
            </section>

            {/* Step 2 */}
            <section id="index-series" className="mb-12 scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                  2
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Configure Index Series</h2>
              </div>
              <p className="text-gray-700 mb-4">
                Index Series are price data sources (e.g., Platts Brent, Argus WTI, EUR/USD FX rates)
                that feed into your Price Adjustment Mechanisms.
              </p>
              <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto mb-4">
                <pre className="text-gray-100 text-sm font-mono">
{`1. Navigate to Index Series → Add Series
2. Enter series details:
   - Series Code: "BRENT" (unique identifier)
   - Name: "Platts Brent Crude"
   - Provider: "Platts"
   - Data Type: "Index"
   - Frequency: "Daily"
   - Unit: "USD/bbl"
3. Click "Save"
4. Upload historical data via CSV or connect API`}
                </pre>
              </div>
              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded">
                <p className="text-sm text-yellow-900">
                  <strong>Note:</strong> You can also configure automated ingestion from providers like Platts, Oanda, or custom APIs.
                </p>
              </div>
            </section>

            {/* Step 3 */}
            <section id="first-pam" className="mb-12 scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                  3
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Build Your First PAM</h2>
              </div>
              <p className="text-gray-700 mb-4">
                A Price Adjustment Mechanism (PAM) is a formula that defines how SKU prices
                are calculated based on index data and contract terms.
              </p>
              <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto mb-4">
                <pre className="text-gray-100 text-sm font-mono">
{`1. Navigate to PAMs → Create PAM
2. Enter PAM name: "Brent-Linked Pricing"
3. Use the Visual Builder:

   Example: Base Price + Index Movement
   ┌─────────────────────────────────────┐
   │ [Factor: BRENT]                     │
   │          ↓                          │
   │ [Transform: Monthly Average]        │
   │          ↓                          │
   │ [Combine: Add Base Price]           │
   │          ↓                          │
   │ [Control: Floor at $50/bbl]         │
   │          ↓                          │
   │ [Output]                            │
   └─────────────────────────────────────┘

4. Test with sample data
5. Save PAM`}
                </pre>
              </div>
              <p className="text-gray-700 mb-4">
                <strong>Formula Explanation:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                <li><strong>Factor:</strong> Reference BRENT index series</li>
                <li><strong>Transform:</strong> Calculate monthly average of daily prices</li>
                <li><strong>Combine:</strong> Add base price (e.g., $100/bbl)</li>
                <li><strong>Control:</strong> Apply floor ($50/bbl minimum)</li>
              </ul>
            </section>

            {/* Step 4 */}
            <section id="step-4" className="mb-12 scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                  4
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Create a Contract</h2>
              </div>
              <p className="text-gray-700 mb-4">
                Contracts govern pricing for one or more SKUs and reference a PAM.
              </p>
              <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto mb-4">
                <pre className="text-gray-100 text-sm font-mono">
{`1. Navigate to Contracts → Add Contract
2. Enter contract details:
   - Contract Name: "ABC Corp Fuel Supply"
   - Customer: "ABC Corporation"
   - Start Date: 2024-01-01
   - End Date: 2024-12-31
   - Default PAM: "Brent-Linked Pricing"
3. Save contract`}
                </pre>
              </div>
            </section>

            {/* Step 5 */}
            <section id="step-5" className="mb-12 scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                  5
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Add Items (SKUs)</h2>
              </div>
              <p className="text-gray-700 mb-4">
                Items represent products whose prices will be calculated using the contract's PAM.
              </p>
              <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto mb-4">
                <pre className="text-gray-100 text-sm font-mono">
{`1. Navigate to Items → Add Item
2. Enter item details:
   - SKU: "FUEL-001"
   - Name: "Diesel Fuel"
   - Base Price: 100.00
   - Currency: USD
   - Unit: bbl
   - Contract: "ABC Corp Fuel Supply"
   - PAM: "Brent-Linked Pricing" (inherited from contract)
3. Save item
4. Repeat for multiple items or use CSV bulk import`}
                </pre>
              </div>
            </section>

            {/* Step 6 */}
            <section id="step-6" className="mb-12 scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                  6
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Run Your First Calculation</h2>
              </div>
              <p className="text-gray-700 mb-4">
                Now you're ready to calculate adjusted prices for all items in the contract.
              </p>
              <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto mb-4">
                <pre className="text-gray-100 text-sm font-mono">
{`1. Navigate to Calculations → New Calculation
2. Select configuration:
   - PAM: "Brent-Linked Pricing"
   - Items: All items (or select contract: "ABC Corp")
   - Effective Date: 2024-03-01
   - Priority: Normal
3. Click "Start Calculation"
4. View results in real-time
5. Export results to CSV or approve for downstream systems`}
                </pre>
              </div>
              <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                <p className="text-sm text-green-900">
                  <strong>Success!</strong> Your first calculation is complete. Results show adjusted prices for each SKU based on the PAM formula.
                </p>
              </div>
            </section>

            {/* Next Steps */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Next Steps</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/docs/pam-builder"
                  className="p-6 rounded-xl border-2 border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Master PAM Builder</h3>
                  <p className="text-gray-600 text-sm">
                    Learn advanced formula techniques with transformations, conversions, and controls.
                  </p>
                </Link>
                <Link
                  href="/docs/concepts"
                  className="p-6 rounded-xl border-2 border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Core Concepts</h3>
                  <p className="text-gray-600 text-sm">
                    Dive deeper into contracts, scenarios, approval workflows, and best practices.
                  </p>
                </Link>
                <Link
                  href="/docs/api"
                  className="p-6 rounded-xl border-2 border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">API Integration</h3>
                  <p className="text-gray-600 text-sm">
                    Automate CPAM with REST API for headless operation and ERP integration.
                  </p>
                </Link>
                <Link
                  href="/docs/integrations"
                  className="p-6 rounded-xl border-2 border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Data Sources</h3>
                  <p className="text-gray-600 text-sm">
                    Set up automated price ingestion from Platts, Oanda, Argus, and custom APIs.
                  </p>
                </Link>
              </div>
            </section>
          </div>

          {/* Help Section */}
          <div className="bg-primary-50 rounded-2xl p-8 border-2 border-primary-200 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-gray-700 mb-6">
              Stuck on something? Our support team is here to help you get started.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                variant="primary"
                size="md"
                onClick={() => (window.location.href = '/contact')}
              >
                Contact Support
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => (window.location.href = '/docs')}
              >
                Browse Docs
              </Button>
            </div>
          </div>
        </div>
      </div>
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

GettingStartedPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default GettingStartedPage;
