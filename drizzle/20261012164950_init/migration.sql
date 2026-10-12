CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`archived_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	CONSTRAINT "clients_name_length" CHECK(length(trim("name")) between 1 and 80)
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`day` text NOT NULL,
	`client_id` integer NOT NULL,
	`activity` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`source` text NOT NULL,
	`quick_task_id` integer,
	`measured_minutes` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`deleted_at` text,
	CONSTRAINT `fk_entries_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_entries_quick_task_id_quick_tasks_id_fk` FOREIGN KEY (`quick_task_id`) REFERENCES `quick_tasks`(`id`) ON DELETE SET NULL,
	CONSTRAINT "entries_day_format" CHECK("day" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "entries_activity_length" CHECK(length(trim("activity")) between 1 and 120),
	CONSTRAINT "entries_duration_range" CHECK("duration_minutes" between 1 and 1440)
);
--> statement-breakpoint
CREATE TABLE `quick_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`client_id` integer NOT NULL,
	`name` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	CONSTRAINT `fk_quick_tasks_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT,
	CONSTRAINT "quick_tasks_name_length" CHECK(length(trim("name")) between 1 and 80),
	CONSTRAINT "quick_tasks_duration_range" CHECK("duration_minutes" between 1 and 1440)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `timer` (
	`id` integer PRIMARY KEY,
	`client_id` integer NOT NULL,
	`activity` text NOT NULL,
	`day` text NOT NULL,
	`started_at` text NOT NULL,
	CONSTRAINT `fk_timer_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT,
	CONSTRAINT "timer_singleton" CHECK(id = 1),
	CONSTRAINT "timer_activity_length" CHECK(length(trim("activity")) between 1 and 120)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_name_nocase` ON `clients` (lower("name"));--> statement-breakpoint
CREATE INDEX `entries_day` ON `entries` (`day`);--> statement-breakpoint
CREATE INDEX `quick_tasks_client_id` ON `quick_tasks` (`client_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `quick_tasks_client_name_nocase` ON `quick_tasks` (`client_id`,lower("name"));