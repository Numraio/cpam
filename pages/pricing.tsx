import Link from 'next/link';
import { type ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const PricingPage: NextPageWithLayout = () => {
  const plans = [
    {
      name: 'Starter',
      price: '$299',
      period: '/month',
      description: 'Perfect for small teams getting started with contract pricing automation',
      features: [
        { name: 'Up to 500 SKUs', included: true },
        { name: 'Up to 5 contracts', included: true },
        { name: '10 Price Adjustment Mechanisms (PAMs)', included: true },
        { name: 'Visual PAM builder', included: true },
        { name: 'Basic index series (3 providers)', included: true },
        { name: 'What-if scenarios', included: true },
        { name: 'Batch calculations', included: true },
        { name: 'Standard support (email)', included: true },
        { name: 'Single user', included: true },
        { name: 'Approval workflows', included: false },
        { name: 'Custom integrations', included: false },
        { name: 'Dedicated account manager', included: false },
      ],
      cta: 'Start Free Trial',
      highlighted: false,
    },
    {
      name: 'Professional',
      price: '$799',
      period: '/month',
      description: 'For growing teams managing multiple contracts and complex pricing formulas',
      features: [
        { name: 'Up to 5,000 SKUs', included: true },
        { name: 'Up to 25 contracts', included: true },
        { name: 'Unlimited PAMs', included: true },
        { name: 'Visual PAM builder', included: true },
        { name: 'All index series providers', included: true },
        { name: 'Unlimited scenarios', included: true },
        { name: 'Batch calculations', included: true },
        { name: 'Priority support (email + chat)', included: true },
        { name: 'Up to 10 users', included: true },
        { name: 'Approval workflows', included: true },
        { name: 'API access', included: true },
        { name: 'Dedicated account manager', included: false },
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations with advanced needs and custom requirements',
      features: [
        { name: 'Unlimited SKUs', included: true },
        { name: 'Unlimited contracts', included: true },
        { name: 'Unlimited PAMs', included: true },
        { name: 'Visual PAM builder', included: true },
        { name: 'All index series + custom providers', included: true },
        { name: 'Unlimited scenarios', included: true },
        { name: 'Batch calculations', included: true },
        { name: 'Premium support (24/7 phone + Slack)', included: true },
        { name: 'Unlimited users', included: true },
        { name: 'Advanced approval workflows', included: true },
        { name: 'Custom integrations & API', included: true },
        { name: 'Dedicated account manager', included: true },
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  const faqs = [
    {
      question: 'What is a SKU?',
      answer:
        'A SKU (Stock Keeping Unit) is a unique identifier for a product or item in your system. Each SKU can have its own pricing rules based on the contract it\'s linked to.',
    },
    {
      question: 'What is a Price Adjustment Mechanism (PAM)?',
      answer:
        'A PAM is a formula that defines how a SKU\'s price should be adjusted based on index data, market conditions, and contract terms. You can build PAMs visually using our drag-and-drop builder without writing code.',
    },
    {
      question: 'Can I try CPAM before purchasing?',
      answer:
        'Yes! We offer a 14-day free trial on all plans. No credit card required. You can test all features and see how CPAM fits your workflow.',
    },
    {
      question: 'What index series providers do you support?',
      answer:
        'We support major providers including Platts, Argus, LME, CME, Oanda (for FX), and allow manual data entry. Enterprise plans can integrate custom providers via API.',
    },
    {
      question: 'How do approval workflows work?',
      answer:
        'Professional and Enterprise plans include approval workflows where price changes can be reviewed and approved before being applied. You can configure multi-level approvals based on your organization\'s requirements.',
    },
    {
      question: 'Can I integrate CPAM with my existing systems?',
      answer:
        'Yes. Professional plans include API access for integrating with ERP systems, data warehouses, and other tools. Enterprise plans include custom integration support.',
    },
    {
      question: 'What happens if I exceed my plan limits?',
      answer:
        'We\'ll notify you when you\'re approaching your limits. You can upgrade to a higher tier at any time, or contact us to discuss custom pricing for your specific needs.',
    },
    {
      question: 'Do you offer discounts for annual billing?',
      answer:
        'Yes! Save 20% with annual billing on Starter and Professional plans. Contact our sales team for Enterprise annual pricing.',
    },
  ];

  return (
    <>
      <SEO pageKey="pricing" />

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
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-success-light/20 text-success rounded-full text-sm font-medium">
            <CheckIcon className="h-4 w-4" />
            Save 20% with annual billing
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`rounded-2xl border-2 p-8 ${
                  plan.highlighted
                    ? 'border-primary-600 shadow-xl scale-105 relative'
                    : 'border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-primary-600 text-white text-sm font-semibold rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                </div>

                <Button
                  variant={plan.highlighted ? 'primary' : 'outline'}
                  size="lg"
                  className="w-full mb-8"
                  onClick={() =>
                    plan.cta === 'Contact Sales'
                      ? (window.location.href = '/contact')
                      : (window.location.href = '/auth/join')
                  }
                >
                  {plan.cta}
                </Button>

                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      {feature.included ? (
                        <CheckIcon className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      ) : (
                        <XMarkIcon className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
                      )}
                      <span
                        className={feature.included ? 'text-gray-700' : 'text-gray-400'}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-100 mb-10">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => (window.location.href = '/auth/join')}
            >
              Start Free Trial
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => (window.location.href = '/contact')}
              className="border-white text-white hover:bg-white/10"
            >
              Contact Sales
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

PricingPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default PricingPage;
