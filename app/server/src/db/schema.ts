import { sqliteTable, text, real, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// ─── Businesses ────────────────────────────────────────────────────────

export const businesses = sqliteTable("businesses", {
  id: text("id").primaryKey(), // nanoid
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  company_name: text("company_name").notNull(),
  website: text("website"),
  logo_url: text("logo_url"),
  api_key: text("api_key").notNull().unique(), // secret API key for conversion webhook
  created_at: text("created_at").notNull().default("(datetime('now'))"),
  updated_at: text("updated_at").notNull().default("(datetime('now'))"),
});

// ─── Programs ──────────────────────────────────────────────────────────

export const programs = sqliteTable("programs", {
  id: text("id").primaryKey(), // nanoid
  business_id: text("business_id").notNull().references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description"),
  commission_rate: real("commission_rate").notNull(), // e.g. 20.0 = 20%
  commission_type: text("commission_type").notNull().default("recurring"), // 'one_time' | 'recurring'
  recurring_months: integer("recurring_months"), // NULL = lifetime
  cookie_days: integer("cookie_days").notNull().default(30),
  min_payout: real("min_payout").notNull().default(50.0),
  is_active: integer("is_active").notNull().default(1), // boolean
  signup_url: text("signup_url"),
  created_at: text("created_at").notNull().default("(datetime('now'))"),
  updated_at: text("updated_at").notNull().default("(datetime('now'))"),
});

// ─── Affiliates ────────────────────────────────────────────────────────

export const affiliates = sqliteTable("affiliates", {
  id: text("id").primaryKey(), // nanoid
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  name: text("name").notNull(),
  bio: text("bio"),
  website: text("website"),
  payment_email: text("payment_email").notNull(),
  created_at: text("created_at").notNull().default("(datetime('now'))"),
  updated_at: text("updated_at").notNull().default("(datetime('now'))"),
});

// ─── Sessions ──────────────────────────────────────────────────────────

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // nanoid
  user_id: text("user_id").notNull(),
  user_type: text("user_type").notNull(), // 'business' | 'affiliate'
  expires_at: text("expires_at").notNull(),
  created_at: text("created_at").notNull().default("(datetime('now'))"),
});

// ─── Program Affiliates (join table) ───────────────────────────────────

export const programAffiliates = sqliteTable(
  "program_affiliates",
  {
    id: text("id").primaryKey(), // nanoid
    program_id: text("program_id").notNull().references(() => programs.id),
    affiliate_id: text("affiliate_id").notNull().references(() => affiliates.id),
    unique_code: text("unique_code").notNull().unique(), // short code for link generation
    status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
    created_at: text("created_at").notNull().default("(datetime('now'))"),
    updated_at: text("updated_at").notNull().default("(datetime('now'))"),
  },
  (table) => ({
    uniqueProgramAffiliate: uniqueIndex("uq_program_affiliate").on(
      table.program_id,
      table.affiliate_id
    ),
  })
);

// ─── Links ─────────────────────────────────────────────────────────────

export const links = sqliteTable("links", {
  id: text("id").primaryKey(), // nanoid
  program_affiliate_id: text("program_affiliate_id").notNull().references(() => programAffiliates.id),
  destination_url: text("destination_url").notNull(),
  short_code: text("short_code").notNull().unique(), // /r/{short_code}
  utm_source: text("utm_source"),
  utm_medium: text("utm_medium"),
  utm_campaign: text("utm_campaign"),
  created_at: text("created_at").notNull().default("(datetime('now'))"),
});

// ─── Clicks ────────────────────────────────────────────────────────────

export const clicks = sqliteTable(
  "clicks",
  {
    id: text("id").primaryKey(), // nanoid
    link_id: text("link_id").notNull().references(() => links.id),
    affiliate_id: text("affiliate_id").notNull().references(() => affiliates.id),
    program_id: text("program_id").notNull().references(() => programs.id),
    visitor_id: text("visitor_id").notNull(),
    ip_address: text("ip_address"),
    user_agent: text("user_agent"),
    referrer: text("referrer"),
    created_at: text("created_at").notNull().default("(datetime('now'))"),
  },
  (table) => ({
    visitorIdx: index("idx_clicks_visitor").on(table.visitor_id, table.program_id),
    affiliateIdx: index("idx_clicks_affiliate").on(table.affiliate_id, table.created_at),
  })
);

// ─── Conversions ───────────────────────────────────────────────────────

export const conversions = sqliteTable(
  "conversions",
  {
    id: text("id").primaryKey(), // nanoid
    click_id: text("click_id").references(() => clicks.id),
    program_id: text("program_id").notNull().references(() => programs.id),
    affiliate_id: text("affiliate_id").notNull().references(() => affiliates.id),
    business_id: text("business_id").notNull().references(() => businesses.id),
    customer_id: text("customer_id").notNull(),
    order_id: text("order_id"),
    amount: real("amount").notNull(),
    commission_amount: real("commission_amount").notNull(),
    currency: text("currency").notNull().default("USD"),
    is_recurring: integer("is_recurring").notNull().default(0),
    parent_conversion_id: text("parent_conversion_id").references((): any => conversions.id),
    status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'rejected' | 'refunded'
    metadata: text("metadata"),
    created_at: text("created_at").notNull().default("(datetime('now'))"),
    updated_at: text("updated_at").notNull().default("(datetime('now'))"),
  },
  (table) => ({
    affiliateIdx: index("idx_conversions_affiliate").on(table.affiliate_id, table.created_at),
    businessIdx: index("idx_conversions_business").on(table.business_id, table.created_at),
    programIdx: index("idx_conversions_program").on(table.program_id, table.created_at),
    parentIdx: index("idx_conversions_parent").on(table.parent_conversion_id),
  })
);

// ─── Payouts ───────────────────────────────────────────────────────────

export const payouts = sqliteTable("payouts", {
  id: text("id").primaryKey(), // nanoid
  business_id: text("business_id").notNull().references(() => businesses.id),
  affiliate_id: text("affiliate_id").notNull().references(() => affiliates.id),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'paid'
  period_start: text("period_start").notNull(),
  period_end: text("period_end").notNull(),
  paid_at: text("paid_at"),
  created_at: text("created_at").notNull().default("(datetime('now'))"),
});

// ─── Payout Items ──────────────────────────────────────────────────────

export const payoutItems = sqliteTable(
  "payout_items",
  {
    id: text("id").primaryKey(),
    payout_id: text("payout_id").notNull().references(() => payouts.id),
    conversion_id: text("conversion_id").notNull().references(() => conversions.id),
  },
  (table) => ({
    uniqueConversion: uniqueIndex("uq_payout_conversion").on(table.conversion_id),
  })
);
