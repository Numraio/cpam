import Link from 'next/link';
import { type ReactElement, useState } from 'react';
import type { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui';
import {
  ArrowLeftIcon,
  CodeBracketIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

const APIReferencePage: NextPageWithLayout = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState('list-items');

  const endpoints = [
    {
      category: 'Items',
      items: [
        {
          id: 'list-items',
          method: 'GET',
          path: '/api/teams/:slug/items',
          title: 'List Items',
          description: 'Get all items (SKUs) for a team',
        },
        {
          id: 'create-item',
          method: 'POST',
          path: '/api/teams/:slug/items',
          title: 'Create Item',
          description: 'Create a new item (SKU)',
        },
        {
          id: 'get-item',
          method: 'GET',
          path: '/api/teams/:slug/items/:id',
          title: 'Get Item',
          description: 'Get a single item by ID',
        },
      ],
    },
    {
      category: 'Index Series',
      items: [
        {
          id: 'list-series',
          method: 'GET',
          path: '/api/teams/:slug/index-series',
          title: 'List Index Series',
          description: 'Get all index series for a team',
        },
        {
          id: 'create-series',
          method: 'POST',
          path: '/api/teams/:slug/index-series',
          title: 'Create Index Series',
          description: 'Create a new price index series',
        },
      ],
    },
    {
      category: 'PAMs',
      items: [
        {
          id: 'list-pams',
          method: 'GET',
          path: '/api/teams/:slug/pams',
          title: 'List PAMs',
          description: 'Get all Price Adjustment Mechanisms',
        },
        {
          id: 'create-pam',
          method: 'POST',
          path: '/api/teams/:slug/pams',
          title: 'Create PAM',
          description: 'Create a new PAM with formula graph',
        },
      ],
    },
    {
      category: 'Calculations',
      items: [
        {
          id: 'list-calculations',
          method: 'GET',
          path: '/api/teams/:slug/calculations',
          title: 'List Calculations',
          description: 'Get all calculation runs',
        },
        {
          id: 'create-calculation',
          method: 'POST',
          path: '/api/teams/:slug/calculations',
          title: 'Start Calculation',
          description: 'Trigger a new batch calculation',
        },
        {
          id: 'get-calculation',
          method: 'GET',
          path: '/api/teams/:slug/calculations/:id',
          title: 'Get Calculation',
          description: 'Get calculation status and results',
        },
      ],
    },
  ];

  const endpointDetails: Record<string, any> = {
    'list-items': {
      method: 'GET',
      path: '/api/teams/:slug/items',
      description: 'Retrieve all items (SKUs) for the specified team.',
      authentication: 'Required',
      parameters: [
        { name: 'slug', type: 'string', location: 'path', description: 'Team slug identifier', required: true },
      ],
      requestExample: `curl -X GET \\
  https://cpam.example.com/api/teams/my-team/items \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
      responseExample: `{
  "data": [
    {
      "id": "item_abc123",
      "sku": "FUEL-001",
      "name": "Diesel Fuel",
      "basePrice": 100.00,
      "currency": "USD",
      "unit": "bbl",
      "contractId": "contract_xyz789",
      "pamId": "pam_def456",
      "createdAt": "2024-03-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "perPage": 20
  }
}`,
      statusCodes: [
        { code: '200', description: 'Success' },
        { code: '401', description: 'Unauthorized - Invalid API key' },
        { code: '403', description: 'Forbidden - Insufficient permissions' },
        { code: '404', description: 'Team not found' },
      ],
    },
    'create-item': {
      method: 'POST',
      path: '/api/teams/:slug/items',
      description: 'Create a new item (SKU) for the specified team.',
      authentication: 'Required',
      parameters: [
        { name: 'slug', type: 'string', location: 'path', description: 'Team slug identifier', required: true },
      ],
      requestExample: `curl -X POST \\
  https://cpam.example.com/api/teams/my-team/items \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sku": "FUEL-002",
    "name": "Gasoline Premium",
    "description": "95 RON Premium Gasoline",
    "basePrice": 110.00,
    "currency": "USD",
    "unit": "bbl",
    "contractId": "contract_xyz789",
    "pamId": "pam_def456"
  }'`,
      responseExample: `{
  "data": {
    "id": "item_new789",
    "sku": "FUEL-002",
    "name": "Gasoline Premium",
    "basePrice": 110.00,
    "currency": "USD",
    "unit": "bbl",
    "contractId": "contract_xyz789",
    "pamId": "pam_def456",
    "createdAt": "2024-03-01T10:30:00Z"
  }
}`,
      statusCodes: [
        { code: '201', description: 'Created successfully' },
        { code: '400', description: 'Bad request - Validation error' },
        { code: '401', description: 'Unauthorized' },
        { code: '409', description: 'Conflict - SKU already exists' },
      ],
    },
    'create-calculation': {
      method: 'POST',
      path: '/api/teams/:slug/calculations',
      description: 'Start a new batch calculation to compute adjusted prices for items.',
      authentication: 'Required',
      parameters: [
        { name: 'slug', type: 'string', location: 'path', description: 'Team slug identifier', required: true },
      ],
      requestExample: `curl -X POST \\
  https://cpam.example.com/api/teams/my-team/calculations \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "pamId": "pam_def456",
    "contractId": "contract_xyz789",
    "effectiveDate": "2024-03-01",
    "priority": "NORMAL"
  }'`,
      responseExample: `{
  "data": {
    "id": "calc_run123",
    "status": "QUEUED",
    "pamId": "pam_def456",
    "contractId": "contract_xyz789",
    "effectiveDate": "2024-03-01",
    "priority": "NORMAL",
    "estimatedItems": 150,
    "createdAt": "2024-03-01T11:00:00Z"
  }
}`,
      statusCodes: [
        { code: '201', description: 'Calculation queued successfully' },
        { code: '400', description: 'Bad request - Invalid parameters' },
        { code: '401', description: 'Unauthorized' },
        { code: '422', description: 'Validation error - PAM or contract not found' },
      ],
    },
  };

  const currentEndpoint = endpointDetails[selectedEndpoint] || endpointDetails['list-items'];

  return (
    <>
      <SEO
        pageKey="docs"
        overrides={{
          title: 'API Reference - CPAM Documentation',
          description: 'Complete REST API documentation with endpoints, request/response examples, and authentication.',
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
        <div className="max-w-7xl mx-auto">
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-4">
              <CodeBracketIcon className="h-4 w-4" />
              API Reference
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              REST API Documentation
            </h1>
            <p className="text-xl text-gray-600">
              Integrate CPAM into your applications with our RESTful API. All endpoints require authentication.
            </p>
          </div>

          {/* API Key Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <KeyIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <h2 id="authentication" className="text-2xl font-bold text-gray-900 mb-2 scroll-mt-20">
                  Authentication
                </h2>
                <p className="text-gray-700 mb-4">
                  All API requests require authentication using an API key. Include your API key in the
                  <code className="mx-1 px-2 py-1 bg-gray-100 rounded text-sm">Authorization</code> header.
                </p>
                <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto mb-4">
                  <pre className="text-gray-100 text-sm font-mono">
{`Authorization: Bearer YOUR_API_KEY`}
                  </pre>
                </div>
                <p className="text-gray-700 text-sm">
                  Generate API keys in your account settings: <strong>Settings → API Keys → Generate New Key</strong>
                </p>
              </div>
            </div>
          </div>

          {/* API Explorer */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sticky top-24">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Endpoints</h3>
                <div className="space-y-4">
                  {endpoints.map((category) => (
                    <div key={category.category}>
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {category.category}
                      </h4>
                      <ul className="space-y-1">
                        {category.items.map((endpoint) => (
                          <li key={endpoint.id}>
                            <button
                              onClick={() => setSelectedEndpoint(endpoint.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                selectedEndpoint === endpoint.id
                                  ? 'bg-primary-100 text-primary-700 font-medium'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                                endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                                endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                                endpoint.method === 'PATCH' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {endpoint.method}
                              </span>
                              {endpoint.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                {/* Endpoint Header */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                      currentEndpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                      currentEndpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                      currentEndpoint.method === 'PATCH' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {currentEndpoint.method}
                    </span>
                    <code className="text-lg font-mono text-gray-900">{currentEndpoint.path}</code>
                  </div>
                  <p className="text-gray-700">{currentEndpoint.description}</p>
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <KeyIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Authentication: <strong>{currentEndpoint.authentication}</strong></span>
                    </span>
                  </div>
                </div>

                {/* Parameters */}
                {currentEndpoint.parameters && (
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Parameters</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Name</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Type</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Location</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Required</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentEndpoint.parameters.map((param: any, index: number) => (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="px-4 py-3 font-mono text-primary-600">{param.name}</td>
                              <td className="px-4 py-3 font-mono text-gray-600">{param.type}</td>
                              <td className="px-4 py-3 text-gray-600">{param.location}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  param.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {param.required ? 'Required' : 'Optional'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-700">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Request Example */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Request Example</h3>
                  <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto">
                    <pre className="text-gray-100 text-sm font-mono whitespace-pre">
{currentEndpoint.requestExample}
                    </pre>
                  </div>
                </div>

                {/* Response Example */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Response Example</h3>
                  <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto">
                    <pre className="text-gray-100 text-sm font-mono whitespace-pre">
{currentEndpoint.responseExample}
                    </pre>
                  </div>
                </div>

                {/* Status Codes */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Status Codes</h3>
                  <ul className="space-y-2">
                    {currentEndpoint.statusCodes.map((status: any, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                          status.code.startsWith('2') ? 'bg-green-100 text-green-700' :
                          status.code.startsWith('4') ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {status.code}
                        </span>
                        <span className="text-gray-700">{status.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
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

APIReferencePage.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};

export default APIReferencePage;
