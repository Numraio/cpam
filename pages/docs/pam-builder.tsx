import Link from 'next/link';
import { type ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui';
import {
  ArrowLeftIcon,
  CubeIcon,
  LightBulbIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const PAMBuilderGuidePage: NextPageWithLayout = () => {
  const nodeTypes = [
    {
      name: 'Factor',
      color: 'bg-blue-100 text-blue-700',
      description: 'Reference an index series or constant value',
      example: 'BRENT index, 100 (constant)',
    },
    {
      name: 'Transform',
      color: 'bg-green-100 text-green-700',
      description: 'Apply mathematical transformation',
      example: 'Monthly Average, Lagged Value, Percentage Change',
    },
    {
      name: 'Convert',
      color: 'bg-purple-100 text-purple-700',
      description: 'Unit or currency conversion',
      example: 'USD to EUR, bbl to MT',
    },
    {
      name: 'Combine',
      color: 'bg-yellow-100 text-yellow-700',
      description: 'Combine multiple inputs with operations',
      example: 'Add, Subtract, Multiply, Divide, Weighted Average',
    },
    {
      name: 'Control',
      color: 'bg-red-100 text-red-700',
      description: 'Apply constraints and limits',
      example: 'Floor, Cap, Spike Share, Ratchet',
    },
  ];

  return (
    <>
      <SEO
        pageKey="docs"
        overrides={{
          title: 'PAM Builder Guide - CPAM Documentation',
          description: 'Master the visual formula builder to create sophisticated Price Adjustment Mechanisms.',
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-4">
              <CubeIcon className="h-4 w-4" />
              PAM Builder Guide
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Master the PAM Builder
            </h1>
            <p className="text-xl text-gray-600">
              Learn how to build sophisticated Price Adjustment Mechanisms using our visual formula builder.
              No coding required.
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
            {/* Introduction */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">What is a PAM?</h2>
              <p className="text-gray-700 mb-4">
                A <strong>Price Adjustment Mechanism (PAM)</strong> is a formula that defines how SKU prices
                are calculated based on index data, base prices, and contract terms. PAMs automate complex
                pricing rules that would otherwise require manual spreadsheet calculations.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                <p className="text-sm text-blue-900">
                  <strong>Example Use Case:</strong> "Adjust diesel price monthly based on Brent crude average,
                  add $10/bbl markup, apply floor of $80/bbl, cap increases at 10% per month."
                </p>
              </div>
            </section>

            {/* Node Types */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Node Types</h2>
              <p className="text-gray-700 mb-6">
                PAMs are built using a graph of connected nodes. Each node type serves a specific purpose:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nodeTypes.map((node, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4">
                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold mb-2 ${node.color}`}>
                      {node.name}
                    </span>
                    <p className="text-gray-700 text-sm mb-2">{node.description}</p>
                    <p className="text-gray-600 text-xs">
                      <strong>Examples:</strong> {node.example}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Example 1: Simple Additive Formula */}
            <section id="first-pam" className="mb-12 scroll-mt-20">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Example 1: Simple Additive Formula</h2>
              <p className="text-gray-700 mb-4">
                <strong>Business Rule:</strong> "Diesel price = Monthly average Brent crude + $15/bbl markup"
              </p>
              <div className="bg-gray-100 rounded-xl p-6 mb-4">
                <pre className="text-gray-800 text-sm font-mono whitespace-pre">
{`Graph Structure:
┌─────────────────────────────────┐
│ Factor: BRENT (Index Series)    │
│          ↓                      │
│ Transform: Monthly Average      │
│          ↓                      │
│ Combine: Add Constant (15)      │
│          ↓                      │
│ Output                          │
└─────────────────────────────────┘

Formula: P = Avg(BRENT_monthly) + 15`}
                </pre>
              </div>
              <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto mb-4">
                <p className="text-gray-400 text-xs mb-2">JSON Graph Representation:</p>
                <pre className="text-gray-100 text-sm font-mono">
{`{
  "nodes": [
    { "id": "n1", "type": "Factor", "config": { "series": "BRENT" } },
    { "id": "n2", "type": "Transform", "config": { "operation": "MonthlyAverage" } },
    { "id": "n3", "type": "Combine", "config": { "operation": "Add", "value": 15 } },
    { "id": "n4", "type": "Output" }
  ],
  "edges": [
    { "from": "n1", "to": "n2" },
    { "from": "n2", "to": "n3" },
    { "from": "n3", "to": "n4" }
  ]
}`}
                </pre>
              </div>
            </section>

            {/* Example 2: Advanced with Floor and Cap */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Example 2: Advanced with Floor and Cap</h2>
              <p className="text-gray-700 mb-4">
                <strong>Business Rule:</strong> "Diesel price = (70% Brent + 30% WTI) + $20, with floor of $80
                and cap increases at 10% per month"
              </p>
              <div className="bg-gray-100 rounded-xl p-6 mb-4">
                <pre className="text-gray-800 text-sm font-mono whitespace-pre">
{`Graph Structure:
┌─────────────────────────────────────────────┐
│ Factor: BRENT        Factor: WTI             │
│     ↓                    ↓                  │
│ Transform: MonthAvg  Transform: MonthAvg    │
│     ↓                    ↓                  │
│ ───────────────────────────────────────────│
│           Combine: Weighted Average         │
│           (70% BRENT, 30% WTI)              │
│                    ↓                        │
│           Combine: Add Constant (20)        │
│                    ↓                        │
│           Control: Floor (80)               │
│                    ↓                        │
│           Control: Cap Increase (10%)       │
│                    ↓                        │
│                 Output                      │
└─────────────────────────────────────────────┘

Formula: P = max(80, prev_P * 1.1, 0.7*Avg(BRENT) + 0.3*Avg(WTI) + 20)`}
                </pre>
              </div>
            </section>

            {/* Example 3: FX Conversion */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Example 3: Currency Conversion</h2>
              <p className="text-gray-700 mb-4">
                <strong>Business Rule:</strong> "Convert USD Brent price to EUR using period-average FX rate"
              </p>
              <div className="bg-gray-100 rounded-xl p-6 mb-4">
                <pre className="text-gray-800 text-sm font-mono whitespace-pre">
{`Graph Structure:
┌─────────────────────────────────────────────┐
│ Factor: BRENT_USD    Factor: EURUSD_FX      │
│     ↓                    ↓                  │
│ Transform: MonthAvg  Transform: MonthAvg    │
│     ↓                    ↓                  │
│ ───────────────────────────────────────────│
│           Combine: Multiply                 │
│           (BRENT * EURUSD)                  │
│                    ↓                        │
│                 Output                      │
└─────────────────────────────────────────────┘

Formula: P_EUR = Avg(BRENT_USD) * Avg(EURUSD_FX)`}
                </pre>
              </div>
              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded">
                <p className="text-sm text-yellow-900">
                  <strong>Note:</strong> CPAM supports automatic FX conversions. You can also use the Convert node
                  which fetches FX rates automatically.
                </p>
              </div>
            </section>

            {/* Best Practices */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Best Practices</h2>
              <ul className="space-y-4">
                {[
                  {
                    title: 'Name PAMs Descriptively',
                    description: 'Use names like "Brent-Linked-Monthly-Floor" instead of "PAM-001"',
                  },
                  {
                    title: 'Test with Scenarios',
                    description: 'Use What-If Scenarios to validate PAM behavior before applying to production items',
                  },
                  {
                    title: 'Document Complex Logic',
                    description: 'Add descriptions to nodes explaining business rationale (e.g., "10% cap protects against volatility")',
                  },
                  {
                    title: 'Reuse Common PAMs',
                    description: 'Create template PAMs for common patterns (e.g., "Standard Crude Indexation") and clone them',
                  },
                  {
                    title: 'Version Control',
                    description: 'CPAM tracks PAM versions automatically. Use status (DRAFT/TEST/ACTIVE) to manage changes',
                  },
                  {
                    title: 'Start Simple',
                    description: 'Begin with basic Factor → Transform → Combine, then add Controls as needed',
                  },
                ].map((practice, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900">{practice.title}:</strong>
                      <span className="text-gray-700"> {practice.description}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Common Patterns */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Common Patterns</h2>
              <div className="space-y-6">
                <div className="border-l-4 border-blue-600 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Additive Model</h3>
                  <p className="text-gray-700 text-sm mb-2">
                    New Price = Base Price + Index Movement
                  </p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    P_new = P_base + (Index_current - Index_base)
                  </code>
                </div>

                <div className="border-l-4 border-green-600 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Multiplicative Model</h3>
                  <p className="text-gray-700 text-sm mb-2">
                    New Price = Base Price × Index Ratio
                  </p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    P_new = P_base * (Index_current / Index_base)
                  </code>
                </div>

                <div className="border-l-4 border-purple-600 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Weighted Basket</h3>
                  <p className="text-gray-700 text-sm mb-2">
                    Blend multiple indices with custom weights
                  </p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    P = w1*Index1 + w2*Index2 + w3*Index3 (where w1+w2+w3=1)
                  </code>
                </div>

                <div className="border-l-4 border-red-600 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Volatility Protection</h3>
                  <p className="text-gray-700 text-sm mb-2">
                    Limit price changes to protect from market swings
                  </p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    P_new = max(P_prev * 0.9, min(P_prev * 1.1, P_calculated))
                  </code>
                </div>
              </div>
            </section>
          </div>

          {/* Next Steps */}
          <div className="bg-primary-50 rounded-2xl p-8 border-2 border-primary-200 text-center">
            <LightBulbIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Build Your First PAM?</h3>
            <p className="text-gray-700 mb-6">
              Sign in to CPAM and start building Price Adjustment Mechanisms with our visual builder.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                variant="primary"
                size="md"
                onClick={() => (window.location.href = '/auth/join')}
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => (window.location.href = '/docs/getting-started')}
              >
                Quick Start Guide
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

PAMBuilderGuidePage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default PAMBuilderGuidePage;
