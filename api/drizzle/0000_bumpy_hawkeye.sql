CREATE TABLE `likes` (
	`upload_id` text NOT NULL,
	`user_did` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`upload_id`) REFERENCES `uploads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `likes_pk` ON `likes` (`upload_id`,`user_did`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_did` text NOT NULL,
	`handle` text NOT NULL,
	`display_name` text,
	`avatar_url` text,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_did` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '',
	`s3_key` text NOT NULL,
	`url` text NOT NULL,
	`thumbnail_url` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`is_listed` integer DEFAULT true NOT NULL,
	`bluesky_post_uri` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
