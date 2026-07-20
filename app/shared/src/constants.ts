export const SESSION_COOKIE = "ascnd_session";
export const VISITOR_COOKIE = "ascnd_vid";
export const ATTR_COOKIE = "ascnd_attr";

export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
export const DEFAULT_COOKIE_DAYS = 30;
export const DEFAULT_MIN_PAYOUT = 50;
export const DEFAULT_COMMISSION_TYPE = "recurring";

export const ACCOUNT_TYPES = ["business", "affiliate"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const PROGRAM_AFFILIATE_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;
export type ProgramAffiliateStatus =
  (typeof PROGRAM_AFFILIATE_STATUSES)[number];

export const CONVERSION_STATUSES = [
  "pending",
  "confirmed",
  "rejected",
  "refunded",
] as const;
export type ConversionStatus = (typeof CONVERSION_STATUSES)[number];

export const COMMISSION_TYPES = ["one_time", "recurring"] as const;
export type CommissionType = (typeof COMMISSION_TYPES)[number];

export const PAYOUT_STATUSES = ["pending", "paid"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];
