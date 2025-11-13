import Link from 'next/link';
import { type ReactElement, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import SEO from '@/components/SEO';
import { Button, Input } from '@/components/ui';
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

const ContactPage: NextPageWithLayout = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    employees: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual form submission
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const contactMethods = [
    {
      icon: EnvelopeIcon,
      title: 'Email Us',
      description: 'Our team typically responds within 24 hours',
      value: 'sales@cpam.example.com',
      link: 'mailto:sales@cpam.example.com',
    },
    {
      icon: PhoneIcon,
      title: 'Call Us',
      description: 'Mon-Fri from 9am to 6pm EST',
      value: '+1 (555) 123-4567',
      link: 'tel:+15551234567',
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Live Chat',
      description: 'Available during business hours',
      value: 'Start a conversation',
      link: '#',
    },
  ];

  return (
    <>
      <SEO pageKey="contact" />

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
            Get in Touch
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Have questions about CPAM? We're here to help. Schedule a demo or reach out to our team.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {contactMethods.map((method, index) => (
              <a
                key={index}
                href={method.link}
                className="p-6 rounded-xl border-2 border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-600 transition-colors">
                  <method.icon className="h-6 w-6 text-primary-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {method.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">{method.description}</p>
                <p className="text-primary-600 font-medium">{method.value}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Request a Demo
              </h2>
              <p className="text-gray-600 mb-8">
                See how CPAM can transform your contract pricing workflow. Fill out the form below and we'll reach out to schedule a personalized demo.
              </p>

              {submitted && (
                <div className="mb-6 p-4 bg-success-light/20 border border-success-light rounded-lg">
                  <p className="text-success font-medium">
                    Thank you! We'll be in touch soon.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Work Email *
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company *
                  </label>
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    required
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Acme Inc."
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="employees" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Size
                  </label>
                  <select
                    id="employees"
                    name="employees"
                    value={formData.employees}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  >
                    <option value="">Select company size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501-1000">501-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Tell us about your needs
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="How many SKUs do you manage? What are your main pricing challenges?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent resize-none"
                  />
                </div>

                <Button type="submit" variant="primary" size="lg" className="w-full">
                  Request Demo
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  By submitting this form, you agree to our{' '}
                  <Link href="/privacy" className="text-primary-600 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </form>
            </div>

            {/* Additional Info */}
            <div className="space-y-8">
              {/* Office Info */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
                <div className="flex items-start gap-4 mb-6">
                  <MapPinIcon className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Headquarters
                    </h3>
                    <p className="text-gray-600">
                      123 Business Street
                      <br />
                      Suite 100
                      <br />
                      San Francisco, CA 94105
                      <br />
                      United States
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
                <div className="flex items-start gap-4 mb-6">
                  <ClockIcon className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Business Hours
                    </h3>
                    <div className="space-y-2 text-gray-600">
                      <div className="flex justify-between">
                        <span>Monday - Friday:</span>
                        <span className="font-medium">9:00 AM - 6:00 PM EST</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Saturday - Sunday:</span>
                        <span className="font-medium">Closed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Support Info */}
              <div className="bg-primary-50 rounded-2xl p-8 border-2 border-primary-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Existing Customer?
                </h3>
                <p className="text-gray-700 mb-4">
                  For technical support and account questions, please visit our help center or contact support directly.
                </p>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full"
                    onClick={() => (window.location.href = '/docs')}
                  >
                    Visit Help Center
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full"
                    onClick={() => (window.location.href = 'mailto:support@cpam.example.com')}
                  >
                    Email Support
                  </Button>
                </div>
              </div>
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

ContactPage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default ContactPage;
