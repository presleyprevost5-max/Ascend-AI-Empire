# Ascnd — Phase 1 Architecture

> **Version:** 1.0  
> **Status:** Draft — awaiting lead review  
> **Date:** 2026-07-20

---

## Table of Contents

1. [Overview & Principles](#1-overview--principles)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [API Design](#5-api-design)
6. [Tracking Mechanism](#6-tracking-mechanism)
7. [Component Tree](#7-component-tree)
8. [Security & Auth](#8-security--auth)
9. [Phase 2 Considerations](#9-phase-2-considerations)

---

## 1. Overview & Principles

Ascnd Phase 1 is the **wedge**: the best affiliate platform for AI and SaaS companies. Every feature must serve one goal — **help businesses acquire more customers through affiliates.**

### Design Principles

| Principle | What it means |
|---|---|
| **Launch in minutes** | A founder lands, creates a program, gets a shareable link — no multi-step onboarding, no required fields beyond the essential. |
| **Recurring-first** | Commissions are modeled for subscriptions, not one-off e-commerce purchases. Recurring tracking is a first-class concept, not bolted on. |
| **Trustworthy numbers** | Every click, conversion, and commission must be auditable. Businesses and affiliates see the same data from different angles. |
| **Startup-friendly** | Zero-infra startup. SQLite on day one. A single founder should be able to run this on a $5 VPS or free-tier cloud. |
| **Network effects** | Each new business makes the platform more valuable for affiliates; each new affiliate makes it more valuable for businesses. |

### Phase 1 Scope

**In:** Business onboarding, program creation/management, affiliate registration & application, unique link generation, click tracking, conversion attribution (one-time + recurring), commission calculation, two dashboards (business + affiliate), basic payouts tracking.

**Out:** Marketplace discovery (Phase 2), automated payouts via Stripe/PayPal, Ascnd's own two-tier affiliate program, email notifications, advanced analytics, team/multi-user accounts.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Language** | TypeScript (strict) | End-to-end type safety from DB to UI. Catches bugs at compile time in a domain where correctness matters (money). |
| **Frontend** | React 19 + Vite 7 | Fast dev server, small bundle, no SSR overhead. The app is an authenticated SPA — there are no SEO pages to pre-render. Vite uses ~80% less memory than Next.js in dev. |
| **Styling** | Tailwind CSS 4 | Utility-first, zero runtime, tree-shaken in production. Fast to iterate on dashboards and forms. |
| **Routing** | TanStack Router | Type-safe, file-based, already in use on the marketing site. Shared mental model across the codebase. |
| **Data Fetching** | TanStack Query (React Query) | Cache-first, stale-while-revalidate, automatic refetching. Perfect for dashboard data that changes frequently. |
| **Backend** | Bun HTTP server (native `Bun.serve`) | Same runtime as the package manager and test runner. No Express/Hono dependency — Bun's native server is fast enough and keeps the dependency tree small. |
| **Database** | SQLite via `better-sqlite3` | **Zero setup.** No Docker, no cloud DB, no connection strings. A single file on disk. Perfect for MVP. Migrates to Postgres later via Drizzle when scale demands it. |
| **ORM** | Drizzle ORM | Lightweight, type-safe, generates migrations. First-class SQLite support. No codegen step at runtime — types are inferred from schema definitions. |
| **Auth** | bcryptjs + signed cookies | Simple password hashing + HMAC-signed session cookies. No OAuth for Phase 1 — email/password is the fastest path to launch. JWT-free: signed cookies are simpler and more secure by default (httpOnly, sameSite). |
| **Validation** | Zod | Request body validation at the API boundary. Shared schemas between client and server for form validation. |
| **IDs** | nanoid (12-char) | URL-safe, collision-resistant, shorter than UUIDs. Used for public-facing IDs (affiliate codes, link short codes) while SQLite rowids handle internal references. |

### Why not Next.js?

Next.js (App Router) carries significant memory overhead from its Rust compiler, file-system routing cache, and dual server/client module graph. In sandbox environments with limited memory, it causes OOM kills during `next build` and dev. Vite + React gives the same DX (HMR, file-based routing via TanStack Router, SSR when needed) at a fraction of the memory cost.

### Why SQLite over Postgres for MVP?

| Concern | SQLite | Postgres (Neon) |
|---|---|---|
| Setup | Zero. File on disk. | Connection string, provisioning, pool config |
| Latency | Sub-ms (local) | 5-20ms (network) |
| Memory | ~2MB | Connection pool overhead |
| Concurrency | WAL mode handles reads fine | Excellent, but overkill for MVP |
| Migration path | Drizzle abstracts the dialect | Native |

For Phase 1 (100 businesses, 5k affiliates), SQLite in WAL mode handles the load easily. The Drizzle schema can be migrated to Postgres by changing the dialect driver — no schema rewrites needed.

---

## 3. Project Structure

```
Ascend-AI-Empire/
├── site/                    # Marketing site (TanStack Start, port 3000)
│   ├── src/
│   │   ├── routes/          # Landing page, docs, blog
│   │   └── styles/
│   └── ...
├── app/                     # Product — Phase 1 (Vite SPA + Bun API)
│   ├── client/              # React SPA
│   │   ├── src/
│   │   │   ├── components/  # Shared UI components
│   │   │   ├── features/    # Feature-specific components & hooks
│   │   │   │   ├── auth/
│   │   │   │   ├── business-dashboard/
│   │   │   │   ├── affiliate-dashboard/
│   │   │   │   ├── programs/
│   │   │   │   ├── links/
│   │   │   │   └── payouts/
│   │   │   ├── hooks/       # Shared hooks (useAuth, useApi)
│   │   │   ├── lib/         # API client, utilities
│   │   │   ├── routes/      # TanStack Router route definitions
│   │   │   └── styles/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── server/              # Bun API server
│   │   ├── src/
│   │   │   ├── db/          # Drizzle schema, migrations, connection
│   │   │   ├── routes/      # API route handlers
│   │   │   ├── middleware/   # Auth, validation, error handling
│   │   │   ├── services/    # Business logic (tracking, commissions)
│   │   │   ├── lib/         # Utilities, cookie helpers, nanoid
│   │   │   └── index.ts     # Entry point (Bun.serve)
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── shared/              # Shared types, Zod schemas, constants
│       ├── types.ts
│       ├── schemas.ts       # Zod validation schemas
│       └── constants.ts
└── docs/
    └── architecture.md
```

### Server-Client Communication

The API server runs on `localhost:3001` during development. The Vite dev server proxies `/api/*` to it. In production, the Bun server serves both the API and the built SPA static files from a single port.

---

## 4. Database Schema

### Entity Relationship Diagram (textual)

```
businesses 1───* programs
programs   1───* program_affiliates *───1 affiliates
program_affiliates 1───* links
links      1───* clicks
clicks     1───0..1 conversions
conversions *───1 affiliates
conversions *───1 programs
conversions *───1 businesses
conversions 1───* conversions (recurring chain via parent_conversion_id)
payouts    1───* payout_items *───1 conversions
```

### Table Definitions

#### `businesses`

```sql
CREATE TABLE businesses (
  id            TEXT PRIMARY KEY,           -- nanoid, public-facing
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  company_name  TEXT NOT NULL,
  website       TEXT,
  logo_url      TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### `programs`

```sql
CREATE TABLE programs (
  id                TEXT PRIMARY KEY,        -- nanoid
  business_id       TEXT NOT NULL REFERENCES businesses(id),
  name              TEXT NOT NULL,
  description       TEXT,
  commission_rate   REAL NOT NULL,           -- e.g. 20.0 = 20%
  commission_type   TEXT NOT NULL DEFAULT 'recurring',  -- 'one_time' | 'recurring'
  recurring_months  INTEGER,                 -- NULL = lifetime, N = capped at N months
  cookie_days       INTEGER NOT NULL DEFAULT 30,  -- attribution window
  min_payout        REAL NOT NULL DEFAULT 50.0,    -- minimum balance before payout
  is_active         INTEGER NOT NULL DEFAULT 1,    -- boolean (SQLite has no bool)
  signup_url        TEXT,                    -- default destination for affiliate links
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### `affiliates`

```sql
CREATE TABLE affiliates (
  id              TEXT PRIMARY KEY,          -- nanoid
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  bio             TEXT,
  website         TEXT,
  payment_email   TEXT NOT NULL,             -- where to send payouts
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### `program_affiliates`

Join table representing an affiliate's enrollment in a program. Status workflow: `pending` → (business approves) → `approved` | `rejected`.

```sql
CREATE TABLE program_affiliates (
  id            TEXT PRIMARY KEY,            -- nanoid
  program_id    TEXT NOT NULL REFERENCES programs(id),
  affiliate_id  TEXT NOT NULL REFERENCES affiliates(id),
  unique_code   TEXT NOT NULL UNIQUE,        -- short code for link generation
  status        TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(program_id, affiliate_id)
);
```

#### `links`

Affiliate links for specific campaigns or landing pages within a program.

```sql
CREATE TABLE links (
  id                    TEXT PRIMARY KEY,     -- nanoid
  program_affiliate_id  TEXT NOT NULL REFERENCES program_affiliates(id),
  destination_url       TEXT NOT NULL,        -- can override program's default signup_url
  short_code            TEXT NOT NULL UNIQUE, -- used in /r/{short_code}
  utm_source            TEXT,
  utm_medium            TEXT,
  utm_campaign          TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### `clicks`

Every click on an affiliate link is recorded. `visitor_id` is a first-party cookie set on the browser — this is how we attribute conversions.

```sql
CREATE TABLE clicks (
  id              TEXT PRIMARY KEY,           -- nanoid
  link_id         TEXT NOT NULL REFERENCES links(id),
  affiliate_id    TEXT NOT NULL REFERENCES affiliates(id),
  program_id      TEXT NOT NULL REFERENCES programs(id),
  visitor_id      TEXT NOT NULL,              -- cookie value set on the browser
  ip_address      TEXT,
  user_agent      TEXT,
  referrer        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_clicks_visitor ON clicks(visitor_id, program_id);
CREATE INDEX idx_clicks_affiliate ON clicks(affiliate_id, created_at);
```

#### `conversions`

The money table. Every conversion — initial purchase or recurring renewal — is a row here. `parent_conversion_id` chains recurring conversions back to the original.

```sql
CREATE TABLE conversions (
  id                    TEXT PRIMARY KEY,      -- nanoid
  click_id              TEXT REFERENCES clicks(id),  -- nullable: direct/offline attribution
  program_id            TEXT NOT NULL REFERENCES programs(id),
  affiliate_id          TEXT NOT NULL REFERENCES affiliates(id),
  business_id           TEXT NOT NULL REFERENCES businesses(id),
  customer_id           TEXT NOT NULL,         -- external ID from the business's system
  order_id              TEXT,                  -- external order/invoice ID
  amount                REAL NOT NULL,         -- the purchase/subscription amount
  commission_amount     REAL NOT NULL,         -- calculated: amount * (rate/100)
  currency              TEXT NOT NULL DEFAULT 'USD',
  is_recurring          INTEGER NOT NULL DEFAULT 0,  -- boolean
  parent_conversion_id  TEXT REFERENCES conversions(id),  -- for recurring chain
  status                TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'rejected' | 'refunded'
  metadata              TEXT,                  -- JSON blob for business-specific data
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_conversions_affiliate ON conversions(affiliate_id, created_at);
CREATE INDEX idx_conversions_business ON conversions(business_id, created_at);
CREATE INDEX idx_conversions_program ON conversions(program_id, created_at);
CREATE INDEX idx_conversions_parent ON conversions(parent_conversion_id);
```

#### `payouts`

A payout groups multiple conversions into a single payment to an affiliate.

```sql
CREATE TABLE payouts (
  id            TEXT PRIMARY KEY,              -- nanoid
  business_id   TEXT NOT NULL REFERENCES businesses(id),
  affiliate_id  TEXT NOT NULL REFERENCES affiliates(id),
  amount        REAL NOT NULL,                 -- sum of included conversions
  status        TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid'
  period_start  TEXT NOT NULL,                 -- ISO date
  period_end    TEXT NOT NULL,                 -- ISO date
  paid_at       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE payout_items (
  id            TEXT PRIMARY KEY,
  payout_id     TEXT NOT NULL REFERENCES payouts(id),
  conversion_id TEXT NOT NULL REFERENCES conversions(id),
  UNIQUE(conversion_id)  -- a conversion can only be paid once
);
```

### Design Rationale

- **Nanoid public IDs:** Shorter than UUIDs, URL-safe, and look clean in affiliate links (`ascnd.com/r/abc123`). SQLite rowids handle internal joins efficiently — we don't expose them.
- **Text timestamps:** SQLite has no native datetime type. ISO 8601 strings are portable, human-readable, and sort correctly. Drizzle handles coercion.
- **No `deleted_at` / soft deletes:** Phase 1 keeps it simple. Programs can be deactivated (`is_active = 0`) but not deleted. Data integrity for affiliates who earned commissions is non-negotiable.
- **`recurring_months = NULL` means lifetime:** The most affiliate-friendly default. Businesses that want to cap recurring commissions set a number.
- **`customer_id` for deduplication:** Businesses send their internal customer ID. Combined with the date, this prevents double-counting conversions.
- **`metadata` JSON on conversions:** Businesses can attach plan tier, subscription ID, or any internal reference without us needing to model their domain.

---

## 5. API Design

### Base URL

All API routes are prefixed with `/api/v1`.

### Authentication

- `POST /api/v1/auth/register` — Create account (business or affiliate). Body: `{ email, password, name, account_type: 'business'|'affiliate', company_name? }`
- `POST /api/v1/auth/login` — Returns a signed session cookie (`httpOnly`, `sameSite=Lax`). Body: `{ email, password }`
- `POST /api/v1/auth/logout` — Clears session cookie.
- `GET /api/v1/auth/me` — Returns current user (business or affiliate profile).

### Business Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/businesses/:id` | Get business profile | Business owner |
| `PUT` | `/api/v1/businesses/:id` | Update business profile | Business owner |
| `GET` | `/api/v1/businesses/:id/dashboard` | KPI summary: MRR from affiliates, active affiliates, conversion rate, pending payouts | Business owner |

### Program Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/programs` | Create program. **Minimal fields required:** name, commission_rate. Everything else has sane defaults. | Business |
| `GET` | `/api/v1/businesses/:id/programs` | List business's programs | Business owner |
| `GET` | `/api/v1/programs/:id` | Get program detail + stats | Business owner or enrolled affiliate |
| `PUT` | `/api/v1/programs/:id` | Update program settings | Business owner |
| `POST` | `/api/v1/programs/:id/deactivate` | Deactivate program (stops new affiliates, doesn't cancel existing commissions) | Business owner |
| `GET` | `/api/v1/programs/:id/stats` | Program stats: clicks, conversions, revenue, top affiliates | Business owner |

### Affiliate Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/affiliates/me` | Get my affiliate profile | Affiliate |
| `PUT` | `/api/v1/affiliates/me` | Update profile | Affiliate |
| `POST` | `/api/v1/programs/:id/apply` | Apply to join a program | Affiliate |
| `GET` | `/api/v1/affiliates/me/programs` | List programs I'm enrolled in (with status) | Affiliate |
| `GET` | `/api/v1/affiliates/me/dashboard` | KPI summary: total earnings, clicks, conversions, EPC | Affiliate |

### Program Affiliate Management (Business Side)

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/programs/:id/affiliates` | List affiliates in program (with status, stats) | Business owner |
| `PUT` | `/api/v1/programs/:id/affiliates/:affiliateId` | Approve/reject affiliate application. Body: `{ status: 'approved'|'rejected' }` | Business owner |

### Link Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/links` | Generate affiliate link. Body: `{ program_id, destination_url? }` | Affiliate (must be approved) |
| `GET` | `/api/v1/affiliates/me/links` | List my links across all programs | Affiliate |
| `GET` | `/api/v1/links/:id/stats` | Stats for a specific link (clicks, conversions) | Affiliate owner |

### Tracking Endpoints (Public — No Auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/r/:shortCode` | **Click tracking.** Records click, sets visitor cookie, 302 redirects to destination. |
| `POST` | `/api/v1/track/conversion` | **Conversion webhook.** Called by business's system. Body includes customer_id, amount, and the visitor cookie. |

### Commission & Payout Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/commissions` | List commissions (filterable by status, date, program) | Business or Affiliate (scoped) |
| `GET` | `/api/v1/commissions/:id` | Single commission detail | Business or Affiliate (scoped) |
| `POST` | `/api/v1/payouts` | Create payout (business triggers payment to affiliate) | Business |
| `GET` | `/api/v1/payouts` | List payouts | Business or Affiliate (scoped) |

### Dashboard Summary Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/dashboard/business` | Aggregated: total GMV, active affiliates count, conversion rate, pending commissions, revenue chart data | Business |
| `GET` | `/api/v1/dashboard/affiliate` | Aggregated: total earnings, clicks (30d), conversions (30d), EPC, earnings chart data | Affiliate |

---

## 6. Tracking Mechanism

### 6.1 Click Tracking Flow

```
1. Affiliate shares link: https://ascnd.com/r/abc123
2. Visitor clicks link
3. Server receives GET /r/abc123
4. Look up link by short_code → get affiliate_id, program_id, destination_url
5. Read or create visitor_id from cookie (ascnd_vid)
6. INSERT INTO clicks (link_id, affiliate_id, program_id, visitor_id, ip, ua, referrer)
7. Set cookie: ascnd_attr={program_id}:{affiliate_id}:{click_id}; Max-Age={cookie_days}d; Path=/; SameSite=Lax
8. 302 redirect to destination_url
```

### 6.2 Cookie Strategy

| Cookie | Purpose | Duration | Attributes |
|---|---|---|---|
| `ascnd_vid` | Anonymous visitor ID (persistent across clicks) | 2 years | `SameSite=Lax`, `httpOnly`, `Path=/` |
| `ascnd_attr` | Attribution data: `program_id:affiliate_id:click_id` | Program's `cookie_days` | `SameSite=Lax`, `httpOnly`, `Path=/` |

### 6.3 Attribution Model — First-Touch

**Rule:** The first affiliate who drives a click gets credit for the conversion, within the attribution window.

```
When a click occurs:
  If ascnd_attr cookie does NOT exist:
    → Set ascnd_attr = {program_id}:{affiliate_id}:{click_id}
  If ascnd_attr cookie EXISTS:
    → Do NOT overwrite. First affiliate keeps attribution.
    → Still record the click (for analytics), but mark it as unattributed.
```

This is the fairest model for affiliates and industry standard (Refersion, PartnerStack, FirstPromoter all default to first-touch). Last-touch attribution can be added as a per-program setting in Phase 2.

### 6.4 Conversion Attribution Flow

```
1. Customer signs up on business's website
2. Business's backend or JS snippet sends POST /api/v1/track/conversion
   Body: {
     program_id: "prog_abc",
     customer_id: "cus_123",     // from business's system
     amount: 49.00,               // the purchase amount
     order_id: "ord_456",
     currency: "USD",
     is_recurring: false,
     visitor_id: "vid_xyz"       // from ascnd_vid cookie on customer's browser
   }
3. Server:
   a. Validate API key (business secret)
   b. Look up ascnd_attr cookie equivalent using visitor_id → get attribution
   c. If attribution found & within window:
      - Calculate commission: amount * (program.commission_rate / 100)
      - INSERT INTO conversions (...)
      - Return { status: "attributed", commission_amount: 9.80 }
   d. If no attribution:
      - Return { status: "unattributed" }
```

**API Key Authentication for Conversions:** Each business gets a secret API key at registration. The conversion endpoint requires this key via `Authorization: Bearer {api_key}` header. This keeps the endpoint public (no user session needed) but secure.

### 6.5 Recurring Commission Model

This is the core differentiator. Most affiliate platforms treat recurring as an afterthought. Ascnd models it natively.

```
Initial purchase (month 1):
  conversion_1: {
    amount: 49.00,
    commission_amount: 9.80 (20%),
    is_recurring: false,
    parent_conversion_id: null,
    customer_id: "cus_123"
  }

Month 2 renewal:
  Business sends POST /api/v1/track/conversion with:
    { customer_id: "cus_123", amount: 49.00, is_recurring: true }
  
  Server:
    1. Find conversion_1 by customer_id + program_id (the original)
    2. Check: program.recurring_months is NULL (lifetime) OR months_since(conversion_1.created_at) < recurring_months
    3. Create conversion_2:
       { amount: 49.00, commission_amount: 9.80, is_recurring: true,
         parent_conversion_id: conversion_1.id }
```

**Deduplication:** For recurring conversions, the server checks if a conversion for the same `customer_id` + `program_id` + same calendar month already exists. If so, it returns the existing conversion (idempotent).

**Cap enforcement:** If `program.recurring_months = 12`, the 13th renewal is not commissioned. The affiliate is notified in the dashboard when a recurring stream is approaching its cap.

### 6.6 JavaScript Snippet (Optional, Simpler Integration)

For businesses that can't build server-side webhook integration, we provide a 2-line JS snippet:

```html
<script src="https://ascnd.com/ascnd.js" data-program-id="prog_abc"></script>
```

The snippet:
1. Reads `ascnd_vid` cookie
2. On successful signup (business triggers `window.ascnd.track({ customer_id, amount })`):
3. Sends the conversion POST with the visitor_id automatically

This makes integration a copy-paste for non-technical founders.

---

## 7. Component Tree

### 7.1 Business Dashboard

```
<BusinessDashboardLayout>
  <Sidebar>
    <Logo />
    <NavItem to="/dashboard" icon={Home} label="Dashboard" />
    <NavItem to="/programs" icon={Layers} label="Programs" />
    <NavItem to="/payouts" icon={DollarSign} label="Payouts" />
    <NavItem to="/settings" icon={Settings} label="Settings" />
    <UserMenu />
  </Sidebar>
  
  <MainContent>
    // Route: /dashboard
    <DashboardHome>
      <KpiGrid>
        <KpiCard title="Affiliate Revenue" value="$12,450" trend="+18%" />
        <KpiCard title="Active Affiliates" value="47" trend="+5 this month" />
        <KpiCard title="Conversion Rate" value="3.2%" trend="+0.4%" />
        <KpiCard title="Pending Payouts" value="$2,100" />
      </KpiGrid>
      <RevenueChart />            // line chart: revenue over time
      <TopAffiliatesTable />      // top 10 affiliates by revenue
      <RecentConversionsTable />  // last 20 conversions
    </DashboardHome>
    
    // Route: /programs
    <ProgramsList>
      <PageHeader>
        <h1>Programs</h1>
        <CreateProgramButton />  // opens modal/drawer
      </PageHeader>
      <ProgramCard />*           // one per program: name, rate, affiliate count, revenue
    </ProgramsList>
    
    // Route: /programs/:id
    <ProgramDetail>
      <Tabs>
        <Tab label="Overview">
          <ProgramStats />       // clicks, conversions, revenue, EPC
          <RevenueChart />
        </Tab>
        <Tab label="Affiliates">
          <AffiliateRoster>
            <AffiliateRow />*    // name, status, clicks, conversions, revenue, actions
          </AffiliateRoster>
          <PendingApplications>   // affiliates awaiting approval
            <ApplicationRow />*
          </PendingApplications>
        </Tab>
        <Tab label="Links">
          <LinksList>
            <LinkRow />*         // short_code, destination, clicks, conversions
          </LinksList>
        </Tab>
        <Tab label="Settings">
          <ProgramSettingsForm>
            <Field name="name" />
            <Field name="commission_rate" type="number" />
            <Field name="commission_type" type="select" />
            <Field name="recurring_months" type="number" />
            <Field name="cookie_days" type="number" />
            <Field name="min_payout" type="number" />
            <Field name="signup_url" type="url" />
          </ProgramSettingsForm>
        </Tab>
      </Tabs>
    </ProgramDetail>
    
    // Route: /payouts
    <PayoutsPage>
      <PayoutsList>
        <PayoutRow />*           // affiliate name, amount, period, status, action
      </PayoutsList>
      <CreatePayoutButton />
    </PayoutsPage>
    
    // Route: /settings
    <BusinessSettings>
      <ProfileForm />
      <ApiKeySection />          // show/copy API key for conversion tracking
      <IntegrationSnippet />     // copy-paste JS snippet code
    </BusinessSettings>
  </MainContent>
</BusinessDashboardLayout>
```

### 7.2 Affiliate Dashboard

```
<AffiliateDashboardLayout>
  <Sidebar>
    <Logo />
    <NavItem to="/dashboard" icon={Home} label="Dashboard" />
    <NavItem to="/programs" icon={Layers} label="Programs" />
    <NavItem to="/links" icon={Link} label="My Links" />
    <NavItem to="/earnings" icon={DollarSign} label="Earnings" />
    <NavItem to="/payouts" icon={Bank} label="Payouts" />
    <NavItem to="/settings" icon={Settings} label="Settings" />
    <UserMenu />
  </Sidebar>
  
  <MainContent>
    // Route: /dashboard
    <DashboardHome>
      <KpiGrid>
        <KpiCard title="Total Earnings" value="$3,240" />
        <KpiCard title="Clicks (30d)" value="1,203" />
        <KpiCard title="Conversions (30d)" value="38" />
        <KpiCard title="EPC" value="$2.69" />     // earnings per click
      </KpiGrid>
      <EarningsChart />           // line chart: monthly earnings
      <PerformanceByProgram />    // bar chart or table
    </DashboardHome>
    
    // Route: /programs
    <ProgramsPage>
      <Tabs>
        <Tab label="My Programs">
          <MyProgramsList>
            <ProgramCard />*      // program name, my earnings, clicks, conversions, EPC
          </MyProgramsList>
        </Tab>
        <Tab label="Discover">
          <ProgramsDirectory>    // Phase 2 placeholder — list of available programs
            <ProgramCard />*     // name, commission rate, description, "Apply" button
          </ProgramsDirectory>
        </Tab>
      </Tabs>
    </ProgramsPage>
    
    // Route: /links
    <LinksPage>
      <PageHeader>
        <h1>My Links</h1>
        <CreateLinkButton />     // opens modal: select program, optional custom URL
      </PageHeader>
      <LinksList grouped by program>
        <LinkCard>
          <ShortCodeDisplay />   // ascnd.com/r/abc123 with copy button
          <DestinationUrl />
          <LinkStats />          // clicks, conversions, revenue
        </LinkCard>
      </LinksList>
    </LinksPage>
    
    // Route: /earnings
    <EarningsPage>
      <EarningsSummary />
      <CommissionsTable>
        <CommissionRow />*       // date, program, amount, commission, status
      </CommissionsTable>
      <Filters />                // date range, program, status
    </EarningsPage>
    
    // Route: /payouts
    <PayoutsPage>
      <PayoutsList>
        <PayoutRow />*           // date, amount, period, status
      </PayoutsList>
    </PayoutsPage>
    
    // Route: /settings
    <AffiliateSettings>
      <ProfileForm />
      <PaymentDetails />         // payment email, method (for future Stripe integration)
    </AffiliateSettings>
  </MainContent>
</AffiliateDashboardLayout>
```

### 7.3 Auth Pages

```
<AuthLayout>
  // Route: /login
  <LoginPage>
    <LoginForm />
    <Link to="/register">Create account</Link>
  </LoginPage>
  
  // Route: /register
  <RegisterPage>
    <AccountTypeSelector />     // "I'm a Business" | "I'm an Affiliate"
    <RegisterForm />            // fields change based on type
  </RegisterPage>
</AuthLayout>
```

### 7.4 Shared/Reusable Components

```
components/
├── ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Modal.tsx
│   ├── Tabs.tsx
│   ├── Badge.tsx
│   ├── Table.tsx              // generic table with sorting
│   ├── KpiCard.tsx
│   ├── PageHeader.tsx
│   ├── EmptyState.tsx
│   └── LoadingSpinner.tsx
├── charts/
│   ├── LineChart.tsx           // thin wrapper around a lightweight chart lib
│   └── BarChart.tsx
├── CopyButton.tsx              // click-to-copy with feedback
└── StatusBadge.tsx             // color-coded: pending/approved/rejected/confirmed/paid
```

---

## 8. Security & Auth

### Session Management

- Sessions stored as **signed cookies** (HMAC-SHA256), not JWTs.
- Cookie attributes: `httpOnly`, `SameSite=Lax`, `Secure` (in production), `Path=/`.
- Session data stored server-side in the `sessions` table:
  ```sql
  CREATE TABLE sessions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    user_type  TEXT NOT NULL,  -- 'business' | 'affiliate'
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  ```
- Session duration: 7 days, with sliding expiration on activity.

### API Key for Conversion Endpoint

- Each business gets a `secret_api_key` (generated at registration, rotatable in settings).
- The conversion POST endpoint requires `Authorization: Bearer {api_key}`.
- This keeps conversion tracking secure without requiring user sessions from external systems.

### Rate Limiting

- Conversion endpoint: 100 req/min per API key (prevent abuse).
- Click tracking endpoint: 1000 req/min per IP (public endpoint, high volume expected).
- Auth endpoints: 10 req/min per IP (brute force protection).

### CSRF

- SPA with `SameSite=Lax` cookies is inherently CSRF-safe for same-origin requests.
- Conversion endpoint uses Bearer token, not cookies — not CSRF-vulnerable.

---

## 9. Phase 2 Considerations

Items intentionally deferred but designed with the schema to accommodate:

| Feature | Schema Readiness |
|---|---|
| **Two-tier affiliate model** | Add `parent_affiliate_id` to `affiliates`; add `tier` column to `conversions`. Ascnd's own 40%/10% program becomes a special program with tiered rates. |
| **Marketplace discovery** | `programs` table already has `is_active`; adding a `listed_in_marketplace` boolean and search filters is additive. |
| **Automated payouts (Stripe)** | Add `stripe_connect_id` to `affiliates`; add webhook handler for payout status updates. |
| **Postgres migration** | Swap Drizzle driver from `better-sqlite3` to `postgres-js`. Schema is dialect-agnostic. |
| **Email notifications** | Add events table + background job queue. Conversion events trigger emails to affiliates. |
| **Multi-tenant teams** | Add `team_members` table. Business can invite team members with role-based access. |
| **Vanity domains** | Add `custom_domain` to `programs`. CNAME-based, requires DNS validation. |

---

## Appendix A: Onboarding Flow (Launch in Minutes)

The critical path from landing to first affiliate link:

```
1. Visit ascnd.com → "Start free" button
2. Register as a Business (email, password, company name)
3. Land on /programs → empty state: "Create your first affiliate program"
4. Modal opens: enter program name + commission rate (2 fields!)
5. Program created → redirected to program detail
6. Copy JS snippet or API key from Settings tab
7. Done. Share signup URL. Affiliates can now apply.
```

**Time to first program:** under 2 minutes. Every other setting (cookie window, recurring cap, min payout) has sensible defaults and can be changed later.

---

## Appendix B: Ascnd's Own Affiliate Program (Phase 2)

Ascnd will eat its own dogfood with a two-tier affiliate program:

- **Tier 1 (40%):** Affiliates who directly refer businesses to Ascnd earn 40% of that business's subscription revenue for 12 months.
- **Tier 2 (10%):** Affiliates earn 10% from sub-affiliates they recruit, for 12 months.

This is tracked as a special internal program in the same `programs` table, proving the platform works for Ascnd itself. Schema support (two-tier) is deferred to Phase 2 but noted here for context.

---

*End of Phase 1 Architecture document.*
