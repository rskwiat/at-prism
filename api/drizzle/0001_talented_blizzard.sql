CREATE TABLE `users` (
	`did` text PRIMARY KEY NOT NULL,
	`handle` text NOT NULL,
	`display_name` text,
	`avatar_url` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
