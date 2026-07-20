CREATE TABLE `affiliates` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`bio` text,
	`website` text,
	`payment_email` text NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	`updated_at` text DEFAULT '(datetime(''now''))' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `affiliates_email_unique` ON `affiliates` (`email`);--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`company_name` text NOT NULL,
	`website` text,
	`logo_url` text,
	`api_key` text NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	`updated_at` text DEFAULT '(datetime(''now''))' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `businesses_email_unique` ON `businesses` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `businesses_api_key_unique` ON `businesses` (`api_key`);--> statement-breakpoint
CREATE TABLE `clicks` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`affiliate_id` text NOT NULL,
	`program_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`referrer` text,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `links`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_clicks_visitor` ON `clicks` (`visitor_id`,`program_id`);--> statement-breakpoint
CREATE INDEX `idx_clicks_affiliate` ON `clicks` (`affiliate_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `conversions` (
	`id` text PRIMARY KEY NOT NULL,
	`click_id` text,
	`program_id` text NOT NULL,
	`affiliate_id` text NOT NULL,
	`business_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`order_id` text,
	`amount` real NOT NULL,
	`commission_amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`is_recurring` integer DEFAULT 0 NOT NULL,
	`parent_conversion_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	`updated_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	FOREIGN KEY (`click_id`) REFERENCES `clicks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_conversion_id`) REFERENCES `conversions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_conversions_affiliate` ON `conversions` (`affiliate_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_conversions_business` ON `conversions` (`business_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_conversions_program` ON `conversions` (`program_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_conversions_parent` ON `conversions` (`parent_conversion_id`);--> statement-breakpoint
CREATE TABLE `links` (
	`id` text PRIMARY KEY NOT NULL,
	`program_affiliate_id` text NOT NULL,
	`destination_url` text NOT NULL,
	`short_code` text NOT NULL,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	FOREIGN KEY (`program_affiliate_id`) REFERENCES `program_affiliates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `links_short_code_unique` ON `links` (`short_code`);--> statement-breakpoint
CREATE TABLE `payout_items` (
	`id` text PRIMARY KEY NOT NULL,
	`payout_id` text NOT NULL,
	`conversion_id` text NOT NULL,
	FOREIGN KEY (`payout_id`) REFERENCES `payouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`conversion_id`) REFERENCES `conversions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payout_conversion` ON `payout_items` (`conversion_id`);--> statement-breakpoint
CREATE TABLE `payouts` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`affiliate_id` text NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`paid_at` text,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `program_affiliates` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`affiliate_id` text NOT NULL,
	`unique_code` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	`updated_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `program_affiliates_unique_code_unique` ON `program_affiliates` (`unique_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_program_affiliate` ON `program_affiliates` (`program_id`,`affiliate_id`);--> statement-breakpoint
CREATE TABLE `programs` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`commission_rate` real NOT NULL,
	`commission_type` text DEFAULT 'recurring' NOT NULL,
	`recurring_months` integer,
	`cookie_days` integer DEFAULT 30 NOT NULL,
	`min_payout` real DEFAULT 50 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`signup_url` text,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	`updated_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`user_type` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL
);
