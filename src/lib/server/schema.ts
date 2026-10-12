import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

export const clients = sqliteTable(
	'clients',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		archivedAt: text('archived_at'),
		createdAt: text('created_at').notNull().default(now)
	},
	(t) => [
		uniqueIndex('clients_name_nocase').on(sql`lower(${t.name})`),
		check('clients_name_length', sql`length(trim(${t.name})) between 1 and 80`)
	]
);

export const quickTasks = sqliteTable(
	'quick_tasks',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		clientId: integer('client_id')
			.notNull()
			.references(() => clients.id, { onDelete: 'restrict' }),
		name: text('name').notNull(),
		durationMinutes: integer('duration_minutes').notNull(),
		createdAt: text('created_at').notNull().default(now)
	},
	(t) => [
		index('quick_tasks_client_id').on(t.clientId),
		uniqueIndex('quick_tasks_client_name_nocase').on(t.clientId, sql`lower(${t.name})`),
		check('quick_tasks_name_length', sql`length(trim(${t.name})) between 1 and 80`),
		check('quick_tasks_duration_range', sql`${t.durationMinutes} between 1 and 1440`)
	]
);

export const entries = sqliteTable(
	'entries',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		day: text('day').notNull(),
		clientId: integer('client_id')
			.notNull()
			.references(() => clients.id, { onDelete: 'restrict' }),
		activity: text('activity').notNull(),
		durationMinutes: integer('duration_minutes').notNull(),
		source: text('source').notNull().$type<'quick' | 'manual' | 'timer'>(),
		quickTaskId: integer('quick_task_id').references(() => quickTasks.id, {
			onDelete: 'set null'
		}),
		/** Solo per `source = 'timer'`: durata misurata all'avvio, conservata dopo eventuali correzioni. */
		measuredMinutes: integer('measured_minutes'),
		createdAt: text('created_at').notNull().default(now),
		updatedAt: text('updated_at').notNull().default(now),
		deletedAt: text('deleted_at')
	},
	(t) => [
		index('entries_day').on(t.day),
		check('entries_day_format', sql`${t.day} glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`),
		check('entries_activity_length', sql`length(trim(${t.activity})) between 1 and 120`),
		check('entries_duration_range', sql`${t.durationMinutes} between 1 and 1440`)
	]
);

export const timer = sqliteTable(
	'timer',
	{
		id: integer('id').primaryKey(),
		clientId: integer('client_id')
			.notNull()
			.references(() => clients.id, { onDelete: 'restrict' }),
		activity: text('activity').notNull(),
		day: text('day').notNull(),
		startedAt: text('started_at').notNull()
	},
	(t) => [
		check('timer_singleton', sql`id = 1`),
		check('timer_activity_length', sql`length(trim(${t.activity})) between 1 and 120`)
	]
);

export const sessions = sqliteTable('sessions', {
	tokenHash: text('token_hash').primaryKey(),
	expiresAt: text('expires_at').notNull()
});

export type ClientRow = typeof clients.$inferSelect;
export type QuickTaskRow = typeof quickTasks.$inferSelect;
export type EntryRow = typeof entries.$inferSelect;
export type TimerRow = typeof timer.$inferSelect;
