import { z } from "zod";

// Auth
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  account_type: z.enum(["business", "affiliate"]),
  company_name: z.string().min(1).max(255).optional(),
  website: z.string().url().optional().or(z.literal("")),
  payment_email: z.string().email().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Business
export const businessUpdateSchema = z.object({
  company_name: z.string().min(1).max(255).optional(),
  website: z.string().url().optional().or(z.literal("")),
  logo_url: z.string().url().optional().or(z.literal("")),
});

// Program
export const programCreateSchema = z.object({
  name: z.string().min(1).max(255),
  commission_rate: z.number().min(0).max(100),
  description: z.string().optional(),
  commission_type: z.enum(["one_time", "recurring"]).optional(),
  recurring_months: z.number().int().positive().optional().nullable(),
  cookie_days: z.number().int().min(1).max(365).optional(),
  min_payout: z.number().min(0).optional(),
  signup_url: z.string().url().optional().or(z.literal("")),
});

export const programUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  commission_rate: z.number().min(0).max(100).optional(),
  commission_type: z.enum(["one_time", "recurring"]).optional(),
  recurring_months: z.number().int().positive().optional().nullable(),
  cookie_days: z.number().int().min(1).max(365).optional(),
  min_payout: z.number().min(0).optional(),
  signup_url: z.string().url().optional().or(z.literal("")),
});

// Affiliate
export const affiliateUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  bio: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  payment_email: z.string().email().optional(),
});

// Link
export const linkCreateSchema = z.object({
  program_id: z.string().min(1),
  destination_url: z.string().url().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
});

// Program affiliate management
export const affiliateApprovalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});
