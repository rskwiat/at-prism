import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const uploads = sqliteTable('uploads', {
  id: text('id').primaryKey(),
  userDid: text('user_did').notNull(),
  title: text('title').notNull(),
  description: text('description').default(''),
  s3Key: text('s3_key').notNull(),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  isPublic: integer('is_public', { mode: 'boolean' }).default(true).notNull(),
  isListed: integer('is_listed', { mode: 'boolean' }).default(true).notNull(),
  blueskyPostUri: text('bluesky_post_uri'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const likes = sqliteTable('likes', {
  uploadId: text('upload_id').notNull().references(() => uploads.id, { onDelete: 'cascade' }),
  userDid: text('user_did').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  pk: uniqueIndex('likes_pk').on(table.uploadId, table.userDid),
}));

export const users = sqliteTable('users', {
  did: text('did').primaryKey(),
  handle: text('handle').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userDid: text('user_did').notNull(),
  handle: text('handle').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});