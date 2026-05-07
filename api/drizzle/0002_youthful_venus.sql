PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_likes` (
	`upload_id` text NOT NULL,
	`user_did` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`upload_id`) REFERENCES `uploads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_did`) REFERENCES `users`(`did`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_likes`("upload_id", "user_did", "created_at") SELECT "upload_id", "user_did", "created_at" FROM `likes`;--> statement-breakpoint
DROP TABLE `likes`;--> statement-breakpoint
ALTER TABLE `__new_likes` RENAME TO `likes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `likes_pk` ON `likes` (`upload_id`,`user_did`);--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_did` text NOT NULL,
	`handle` text NOT NULL,
	`display_name` text,
	`avatar_url` text,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_did`) REFERENCES `users`(`did`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "user_did", "handle", "display_name", "avatar_url", "access_token", "refresh_token", "expires_at", "created_at") SELECT "id", "user_did", "handle", "display_name", "avatar_url", "access_token", "refresh_token", "expires_at", "created_at" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
CREATE TABLE `__new_uploads` (
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_did`) REFERENCES `users`(`did`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_uploads`("id", "user_did", "title", "description", "s3_key", "url", "thumbnail_url", "mime_type", "size_bytes", "width", "height", "is_public", "is_listed", "bluesky_post_uri", "created_at") SELECT "id", "user_did", "title", "description", "s3_key", "url", "thumbnail_url", "mime_type", "size_bytes", "width", "height", "is_public", "is_listed", "bluesky_post_uri", "created_at" FROM `uploads`;--> statement-breakpoint
DROP TABLE `uploads`;--> statement-breakpoint
ALTER TABLE `__new_uploads` RENAME TO `uploads`;