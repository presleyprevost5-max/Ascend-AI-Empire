import type {
  AccountType,
  ProgramAffiliateStatus,
  ConversionStatus,
  CommissionType,
  PayoutStatus,
} from "./constants";

export interface Business {
  id: string;
  email: string;
  company_name: string;
  website: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  commission_rate: number;
  commission_type: CommissionType;
  recurring_months: number | null;
  cookie_days: number;
  min_payout: number;
  is_active: boolean;
  signup_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Affiliate {
  id: string;
  email: string;
  name: string;
  bio: string | null;
  website: string | null;
  payment_email: string;
  created_at: string;
  updated_at: string;
}

export interface ProgramAffiliate {
  id: string;
  program_id: string;
  affiliate_id: string;
  unique_code: string;
  status: ProgramAffiliateStatus;
  created_at: string;
  updated_at: string;
}

export interface Link {
  id: string;
  program_affiliate_id: string;
  destination_url: string;
  short_code: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
}

export interface Click {
  id: string;
  link_id: string;
  affiliate_id: string;
  program_id: string;
  visitor_id: string;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
}

export interface Conversion {
  id: string;
  click_id: string | null;
  program_id: string;
  affiliate_id: string;
  business_id: string;
  customer_id: string;
  order_id: string | null;
  amount: number;
  commission_amount: number;
  currency: string;
  is_recurring: boolean;
  parent_conversion_id: string | null;
  status: ConversionStatus;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  business_id: string;
  affiliate_id: string;
  amount: number;
  status: PayoutStatus;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  created_at: string;
}

export interface PayoutItem {
  id: string;
  payout_id: string;
  conversion_id: string;
}

export interface Session {
  id: string;
  user_id: string;
  user_type: AccountType;
  expires_at: string;
  created_at: string;
}

export interface DashboardKPI {
  total_gmv: number;
  active_affiliates: number;
  conversion_rate: number;
  pending_commissions: number;
}
