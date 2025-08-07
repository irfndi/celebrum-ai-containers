CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`telegram_id` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`username` text,
	`language_code` text,
	`email` text,
	`role` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_active_at` integer,
	`settings` text DEFAULT '{}',
	`api_limits` text DEFAULT '{}',
	`trading_preferences` text DEFAULT '{}',
	`account_balance` text DEFAULT '0.00',
	`beta_expires_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_id_unique` ON `users` (`telegram_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `user_username_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`telegram_id` text NOT NULL,
	`username` text,
	`changed_at` integer DEFAULT (unixepoch()) NOT NULL,
	`change_source` text DEFAULT 'telegram_update' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`symbol` text NOT NULL,
	`exchange_1` text,
	`exchange_2` text,
	`price_1` real,
	`price_2` real,
	`profit_percentage` real NOT NULL,
	`confidence` real NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `opportunities_type_idx` ON `opportunities` (`type`);--> statement-breakpoint
CREATE INDEX `opportunities_symbol_idx` ON `opportunities` (`symbol`);--> statement-breakpoint
CREATE INDEX `opportunities_active_idx` ON `opportunities` (`is_active`);--> statement-breakpoint
CREATE INDEX `opportunities_expires_idx` ON `opportunities` (`expires_at`);--> statement-breakpoint
CREATE TABLE `positions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`symbol` text NOT NULL,
	`type` text NOT NULL,
	`strategy` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`quantity` real NOT NULL,
	`entry_price` real NOT NULL,
	`exit_price` real,
	`stop_loss` real,
	`take_profit` real,
	`leverage` integer DEFAULT 1,
	`fees` real DEFAULT 0,
	`pnl` real DEFAULT 0,
	`exchange_id` text NOT NULL,
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`closed_at` integer
);
--> statement-breakpoint
CREATE INDEX `positions_user_id_idx` ON `positions` (`user_id`);--> statement-breakpoint
CREATE INDEX `positions_status_idx` ON `positions` (`status`);--> statement-breakpoint
CREATE INDEX `positions_symbol_idx` ON `positions` (`symbol`);--> statement-breakpoint
CREATE TABLE `trading_strategies` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`settings` text DEFAULT '{}',
	`performance` text DEFAULT '{}',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trading_strategies_user_id_idx` ON `trading_strategies` (`user_id`);--> statement-breakpoint
CREATE INDEX `trading_strategies_type_idx` ON `trading_strategies` (`type`);--> statement-breakpoint
CREATE INDEX `trading_strategies_active_idx` ON `trading_strategies` (`is_active`);--> statement-breakpoint
CREATE TABLE `invitation_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer,
	`max_uses` integer,
	`current_uses` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`purpose` text
);
--> statement-breakpoint
CREATE INDEX `idx_invitation_codes_code` ON `invitation_codes` (`code`);--> statement-breakpoint
CREATE INDEX `idx_invitation_codes_expires_at` ON `invitation_codes` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_invitation_codes_is_active` ON `invitation_codes` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_invitation_codes_created_by` ON `invitation_codes` (`created_by`);--> statement-breakpoint
CREATE TABLE `invitation_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`invitation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`telegram_id` integer NOT NULL,
	`used_at` integer DEFAULT (unixepoch()) NOT NULL,
	`beta_expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_invitation_usage_user_beta` ON `invitation_usage` (`user_id`,`beta_expires_at`);