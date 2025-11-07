# CPAM - Commodity Price Analysis & Management

Enterprise-grade SaaS platform for commodity price analysis, hedging strategy modeling, and contract price adjustments. Built on Next.js with production-ready observability, SLOs, and compliance features.

## 📋 Overview

CPAM enables procurement teams to:
- Track commodity price indices across multiple sources
- Build portfolio items with complex commodity exposures
- Model hedging strategies and scenarios
- Calculate contract price adjustments automatically
- Generate approval workflows and audit trails
- Export to ERP systems (SAP S/4, Coupa)

**Key Performance Targets:**
- ⚡ < 5 minutes calculation time for 10,000 items
- 📊 Support for 1M+ items per tenant
- 🎯 99.9% API availability SLO
- 🔄 < 1 hour data freshness for market prices

## 🛠️ Tech Stack

### Core Framework
- **[Next.js](https://nextjs.org)** - React framework with SSR and API routes
- **[React](https://reactjs.org)** - UI component library
- **[TypeScript](https://www.typescriptlang.org)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first styling

### Database & ORM
- **[PostgreSQL](https://www.postgresql.org)** - Primary database
- **[Prisma](https://www.prisma.io)** - Type-safe ORM and migrations

### Authentication & Security
- **[NextAuth.js](https://next-auth.js.org)** - Authentication (Email, OAuth, SAML SSO)
- **[SAML Jackson](https://github.com/boxyhq/jackson)** - Enterprise SSO and Directory Sync
- PII filtering and data sanitization

### Observability & Operations
- **[OpenTelemetry](https://opentelemetry.io)** - Distributed tracing
- **[Prometheus](https://prometheus.io)** - Metrics collection and alerting
- **[Grafana](https://grafana.com)** - Dashboards and visualization
- **[AlertManager](https://prometheus.io/docs/alerting/latest/alertmanager/)** - Alert routing and management
- SLO tracking with burn-rate alerting

### Billing & Payments
- **[Stripe](https://stripe.com)** - Subscription billing and payments
- Usage-based metering and entitlements

### Compliance & Audit
- **[Retraced](https://github.com/retracedhq/retraced)** - Audit logging
- **[Svix](https://www.svix.com/)** - Webhook orchestration
- Role-based access control (RBAC)

### Testing
- **[Jest](https://jestjs.io/)** - Unit and integration tests
- **[Playwright](https://playwright.dev)** - E2E browser tests

### DevOps
- **[Docker](https://www.docker.com)** - Containerization
- **[pnpm](https://pnpm.io)** - Fast, disk-efficient package manager

## 🚀 Quick Start

### Prerequisites

- **Node.js** (>=18.x)
- **pnpm** (enforced via `.npmrc`)
- **PostgreSQL** (>=14)
- **Docker** (optional, for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Numraio/cpam.git
   cd cpam
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - `DATABASE_URL` - PostgreSQL connection string
   - `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `SMTP_*` - Email configuration for magic links
   - `STRIPE_SECRET_KEY` - For billing (optional in development)

4. **Start the database (optional - Docker)**
   ```bash
   docker-compose up -d
   ```

5. **Initialize the database**
   ```bash
   pnpm prisma db push
   pnpm prisma db seed
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

7. **Open the application**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Development Tools

**Prisma Studio** - Visual database editor:
```bash
pnpm prisma studio
```

**Run tests**:
```bash
# Unit and integration tests
pnpm test

# E2E tests
pnpm test:e2e

# Type checking
pnpm tsc --noEmit
```

**Database migrations**:
```bash
# Create migration
pnpm prisma migrate dev --name migration_name

# Apply migrations
pnpm prisma migrate deploy
```

## 🏗️ Architecture

### Domain Model

**Items** - Portfolio items with commodity exposures (e.g., a product SKU)
- Complex exposure formulas with multiple commodities
- Historical price tracking
- Calculation batch processing

**Index Series** - Market price data sources
- Multiple data providers
- Configurable update frequencies
- Lag monitoring and alerting

**Scenarios** - What-if analysis and hedging strategies
- Price override modeling
- Hedge position simulation
- Baseline vs scenario comparison

**Calculations** - Batch computation engine
- Async queue-based processing
- Prioritization and rate limiting
- Performance targets: <5min for 10k items

**Billing** - Usage-based subscription model
- Items under management (IUM) metering
- Stripe integration with webhooks
- Plan gates and entitlement enforcement

### Key Features

✅ **Implemented:**
- Multi-tenant authentication (Email, OAuth, SAML SSO)
- Role-based access control (RBAC)
- Stripe billing with usage metering
- Scenario simulation and comparison
- OpenTelemetry tracing with PII filtering
- Prometheus metrics and Grafana dashboards
- SLO tracking with burn-rate alerting
- AlertManager integration (PagerDuty, Slack)
- Comprehensive health checks
- Audit logging
- Webhook orchestration

🚧 **In Progress:**
- Disaster recovery and backup automation
- E2E test coverage
- SOC2 compliance controls

📋 **Planned:**
- SAP S/4 connector
- Coupa connector
- Performance optimization (1M items/tenant)
- WAF and rate limiting
- Customer-managed encryption keys (BYOK)

## 📚 Documentation

- **[Billing Guide](./docs/billing.md)** - Subscription plans, usage tracking, and entitlements
- **[Scenario Simulation](./docs/scenario-simulation.md)** - What-if modeling and hedging strategies
- **[Observability](./docs/observability.md)** - Tracing, metrics, and PII filtering
- **[SLO & Alerting](./docs/slo-alerting.md)** - Service level objectives, error budgets, and incident response
- **[Runbooks](./docs/adr/runbooks/)** - Incident response procedures

## 🔧 Configuration

### Authentication

**Email Magic Link** (default):
- Configure `SMTP_*` environment variables
- Recommended: [AWS SES](https://aws.amazon.com/ses/), [Resend](https://resend.com/)

**OAuth** (GitHub, Google):
- Create OAuth apps in provider consoles
- Add `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**SAML SSO** (Enterprise):
- Configured via Jackson service
- Supports Okta, Azure AD, OneLogin

### Billing & Payments

1. Create [Stripe](https://stripe.com/) account
2. Add `STRIPE_SECRET_KEY` from [API keys](https://dashboard.stripe.com/apikeys)
3. Create webhook: `https://your-domain.com/api/webhooks/stripe`
4. Add `STRIPE_WEBHOOK_SECRET` from webhook configuration

### Observability

**Metrics Endpoint**:
- `GET /api/metrics` - Prometheus-compatible metrics
- `GET /api/health` - Health check for load balancers
- `GET /api/health?detailed=true` - Detailed health with queue depth

**Grafana Dashboards**:
- SLO Dashboard: `/grafana/dashboards/slo-dashboard.json`
- CPAM Overview: `/grafana/dashboards/cpam-overview.json`

**Alerting**:
- Configure AlertManager: `/monitoring/alertmanager.yaml`
- Set `PAGERDUTY_SERVICE_KEY` for critical alerts
- Set `SLACK_API_URL` for team notifications

## 🧪 Testing

### Unit Tests
```bash
# Run all unit tests
pnpm test

# Run specific test file
pnpm test lib/billing/usage-service.spec.ts

# Watch mode
pnpm test --watch
```

### E2E Tests
```bash
# Install Playwright browsers
pnpm playwright:update

# Run E2E tests
pnpm test:e2e

# Run E2E tests in UI mode
pnpm playwright test --ui
```

### Type Checking
```bash
# Check TypeScript types
pnpm tsc --noEmit
```

## 🚢 Deployment

### Environment Variables

Required for production:
```env
# App
APP_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-with-openssl>

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASSWORD=pass
SMTP_FROM=noreply@your-domain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring (optional but recommended)
SENTRY_DSN=https://...
PAGERDUTY_SERVICE_KEY=...
SLACK_API_URL=https://hooks.slack.com/...
```

### Docker Deployment

Build and run with Docker:
```bash
docker build -t cpam .
docker run -p 3000:3000 --env-file .env cpam
```

### Database Migrations

Always run migrations before deploying:
```bash
pnpm prisma migrate deploy
```

## 📊 Monitoring & Operations

### Health Checks

- **Liveness**: `GET /api/health`
- **Readiness**: `GET /api/health?detailed=true`
- **Metrics**: `GET /api/metrics` (Prometheus format)

### Grafana Dashboards

1. Import dashboards from `/grafana/dashboards/`
2. Configure Prometheus data source
3. Monitor SLOs and error budgets

### Alerting

Alerts are configured in `/monitoring/prometheus-alerts.yaml`:
- Critical alerts → PagerDuty + Slack
- Warning alerts → Slack only
- Info alerts → Dashboard only

See [SLO & Alerting Guide](./docs/slo-alerting.md) for details.

## 🤝 Contributing

We welcome contributions! Please see our [contributing guide](./CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes with tests
4. Run tests: `pnpm test`
5. Run type checking: `pnpm tsc --noEmit`
6. Commit with conventional commits: `feat: add new feature`
7. Push and create a pull request

## 📝 License

[Apache 2.0 License](./LICENSE)

## 🙏 Acknowledgments

Built on [BoxyHQ SaaS Starter Kit](https://github.com/boxyhq/saas-starter-kit) with additional enterprise features for commodity price analysis.
