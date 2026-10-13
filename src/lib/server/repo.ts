import { createHash, randomBytes } from 'node:crypto';
import { and, asc, desc, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import type { Client, DayTotals, EntryView, QuickTask, TimerState } from '#lib/types.js';
import { MAX_DURATION_MINUTES } from '#lib/duration.js';
import { isValidDay } from '#lib/day.js';
import type { Db } from '#lib/server/db.js';
import { DomainError } from '#lib/server/errors.js';
import { clients, entries, quickTasks, sessions, timer } from '#lib/server/schema.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ACTIVITY_MAX_LENGTH = 120;
const NAME_MAX_LENGTH = 80;
const MAX_SUGGESTIONS = 50;

/**
 * Selezione di una registrazione: il nome del cliente arriva dal join, perché
 * l'attività e la durata sono uno snapshot mentre il cliente è ancora vivo.
 */
const entrySelection = {
	id: entries.id,
	day: entries.day,
	clientId: entries.clientId,
	clientName: clients.name,
	activity: entries.activity,
	durationMinutes: entries.durationMinutes,
	source: entries.source,
	measuredMinutes: entries.measuredMinutes,
	createdAt: entries.createdAt
};

function normalizeName(value: string, label: string): string {
	const name = value.trim().replace(/\s+/g, ' ');
	if (!name || name.length > NAME_MAX_LENGTH) {
		throw new DomainError(
			'invalid',
			`Il ${label} deve avere fra 1 e ${NAME_MAX_LENGTH} caratteri.`
		);
	}
	return name;
}

function normalizeActivity(value: string): string {
	const activity = value.trim().replace(/\s+/g, ' ');
	if (!activity || activity.length > ACTIVITY_MAX_LENGTH) {
		throw new DomainError(
			'invalid',
			`L'attività deve avere fra 1 e ${ACTIVITY_MAX_LENGTH} caratteri.`
		);
	}
	return activity;
}

function normalizeDuration(value: number): number {
	const minutes = Math.round(value);
	if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_DURATION_MINUTES) {
		throw new DomainError(
			'invalid',
			`La durata deve essere compresa fra 1 e ${MAX_DURATION_MINUTES} minuti.`
		);
	}
	return minutes;
}

function normalizeDay(value: string): string {
	if (!isValidDay(value)) throw new DomainError('invalid', 'Giorno non valido.');
	return value;
}

function toClient(row: { id: number; name: string; archivedAt: string | null }): Client {
	return { id: row.id, name: row.name, archived: row.archivedAt !== null };
}

function toQuickTask(row: {
	id: number;
	clientId: number;
	clientName: string;
	name: string;
	durationMinutes: number;
}): QuickTask {
	return {
		id: row.id,
		clientId: row.clientId,
		clientName: row.clientName,
		name: row.name,
		durationMinutes: row.durationMinutes
	};
}

/* ------------------------------------------------------------------ clienti */

export function listClients(db: Db, options: { includeArchived?: boolean } = {}): Client[] {
	const query = db.select().from(clients).$dynamic();
	const rows = (
		options.includeArchived
			? query.orderBy(asc(sql`lower(${clients.name})`))
			: query.where(isNull(clients.archivedAt)).orderBy(asc(sql`lower(${clients.name})`))
	).all();
	return rows.map(toClient);
}

export interface ClientWithUsage extends Client {
	taskCount: number;
	entryCount: number;
}

export function listClientsWithUsage(db: Db): ClientWithUsage[] {
	return db
		.select({
			id: clients.id,
			name: clients.name,
			archivedAt: clients.archivedAt,
			taskCount: sql<number>`(select count(*) from ${quickTasks} where ${quickTasks.clientId} = ${clients.id})`,
			entryCount: sql<number>`(select count(*) from ${entries} where ${entries.clientId} = ${clients.id})`
		})
		.from(clients)
		.orderBy(asc(sql`lower(${clients.name})`))
		.all()
		.map((row) => ({ ...toClient(row), taskCount: row.taskCount, entryCount: row.entryCount }));
}

export function createClient(db: Db, name: string): Client {
	const clean = normalizeName(name, 'nome del cliente');
	const existing = db
		.select({ id: clients.id })
		.from(clients)
		.where(sql`lower(${clients.name}) = lower(${clean})`)
		.get();
	if (existing) throw new DomainError('duplicate', 'Esiste già un cliente con questo nome.');

	const row = db.insert(clients).values({ name: clean }).returning().get();
	return toClient(row);
}

export function renameClient(db: Db, id: number, name: string): Client {
	const clean = normalizeName(name, 'nome del cliente');
	const current = db.select().from(clients).where(eq(clients.id, id)).get();
	if (!current) throw new DomainError('not_found', 'Cliente non trovato.');

	const clash = db
		.select({ id: clients.id })
		.from(clients)
		.where(and(ne(clients.id, id), sql`lower(${clients.name}) = lower(${clean})`))
		.get();
	if (clash) throw new DomainError('duplicate', 'Esiste già un cliente con questo nome.');

	const row = db.update(clients).set({ name: clean }).where(eq(clients.id, id)).returning().get();
	return toClient(row);
}

export function setClientArchived(db: Db, id: number, archived: boolean): Client {
	const current = db.select().from(clients).where(eq(clients.id, id)).get();
	if (!current) throw new DomainError('not_found', 'Cliente non trovato.');

	const row = db
		.update(clients)
		.set({ archivedAt: archived ? new Date().toISOString() : null })
		.where(eq(clients.id, id))
		.returning()
		.get();
	return toClient(row);
}

export function deleteClient(db: Db, id: number): void {
	const current = db.select().from(clients).where(eq(clients.id, id)).get();
	if (!current) throw new DomainError('not_found', 'Cliente non trovato.');

	const used =
		db
			.select({ id: quickTasks.id })
			.from(quickTasks)
			.where(eq(quickTasks.clientId, id))
			.limit(1)
			.get() ??
		db.select({ id: entries.id }).from(entries).where(eq(entries.clientId, id)).limit(1).get() ??
		db.select({ id: timer.id }).from(timer).where(eq(timer.clientId, id)).limit(1).get();

	if (used) {
		throw new DomainError(
			'in_use',
			'Il cliente ha task o registrazioni: archivialo invece di eliminarlo.'
		);
	}

	db.delete(clients).where(eq(clients.id, id)).run();
}

/* --------------------------------------------------------------- task rapide */

export function listQuickTasks(db: Db, options: { activeOnly?: boolean } = {}): QuickTask[] {
	const query = db
		.select({
			id: quickTasks.id,
			clientId: quickTasks.clientId,
			clientName: clients.name,
			name: quickTasks.name,
			durationMinutes: quickTasks.durationMinutes
		})
		.from(quickTasks)
		.innerJoin(clients, eq(quickTasks.clientId, clients.id))
		.$dynamic();

	const rows = (options.activeOnly ? query.where(isNull(clients.archivedAt)) : query)
		.orderBy(asc(sql`lower(${clients.name})`), asc(sql`lower(${quickTasks.name})`))
		.all();

	return rows.map(toQuickTask);
}

export function createQuickTask(
	db: Db,
	input: { clientId: number; name: string; durationMinutes: number }
): QuickTask {
	const name = normalizeName(input.name, 'nome della task');
	const durationMinutes = normalizeDuration(input.durationMinutes);
	const client = db.select().from(clients).where(eq(clients.id, input.clientId)).get();
	if (!client) throw new DomainError('not_found', 'Cliente non trovato.');
	if (client.archivedAt !== null) {
		throw new DomainError('archived', 'Il cliente è archiviato: ripristinalo per aggiungere task.');
	}

	const clash = db
		.select({ id: quickTasks.id })
		.from(quickTasks)
		.where(
			and(eq(quickTasks.clientId, input.clientId), sql`lower(${quickTasks.name}) = lower(${name})`)
		)
		.get();
	if (clash) {
		throw new DomainError('duplicate', 'Questo cliente ha già una task con questo nome.');
	}

	const row = db
		.insert(quickTasks)
		.values({ clientId: input.clientId, name, durationMinutes })
		.returning()
		.get();
	return {
		id: row.id,
		clientId: row.clientId,
		clientName: client.name,
		name: row.name,
		durationMinutes: row.durationMinutes
	};
}

export function updateQuickTask(
	db: Db,
	id: number,
	input: { name: string; durationMinutes: number }
): QuickTask {
	const name = normalizeName(input.name, 'nome della task');
	const durationMinutes = normalizeDuration(input.durationMinutes);
	const current = db.select().from(quickTasks).where(eq(quickTasks.id, id)).get();
	if (!current) throw new DomainError('not_found', 'Task non trovata.');

	const client = db.select().from(clients).where(eq(clients.id, current.clientId)).get();
	if (!client) throw new DomainError('not_found', 'Cliente non trovato.');

	const clash = db
		.select({ id: quickTasks.id })
		.from(quickTasks)
		.where(
			and(
				ne(quickTasks.id, id),
				eq(quickTasks.clientId, current.clientId),
				sql`lower(${quickTasks.name}) = lower(${name})`
			)
		)
		.get();
	if (clash) {
		throw new DomainError('duplicate', 'Questo cliente ha già una task con questo nome.');
	}

	const row = db
		.update(quickTasks)
		.set({ name, durationMinutes })
		.where(eq(quickTasks.id, id))
		.returning()
		.get();
	return {
		id: row.id,
		clientId: row.clientId,
		clientName: client.name,
		name: row.name,
		durationMinutes: row.durationMinutes
	};
}

/** La cancellazione è definitiva: le registrazioni passate conservano il loro snapshot. */
export function deleteQuickTask(db: Db, id: number): void {
	const current = db
		.select({ id: quickTasks.id })
		.from(quickTasks)
		.where(eq(quickTasks.id, id))
		.get();
	if (!current) throw new DomainError('not_found', 'Task non trovata.');
	db.delete(quickTasks).where(eq(quickTasks.id, id)).run();
}

/* ---------------------------------------------------------- registrazioni */

export function listEntries(db: Db, day: string): EntryView[] {
	return db
		.select(entrySelection)
		.from(entries)
		.innerJoin(clients, eq(entries.clientId, clients.id))
		.where(and(eq(entries.day, day), isNull(entries.deletedAt)))
		.orderBy(desc(entries.createdAt), desc(entries.id))
		.all();
}

/** Registrazioni eliminate del giorno, dalla più recente: servono a recuperarle dopo il toast. */
export function listDeletedEntries(db: Db, day: string): EntryView[] {
	return db
		.select(entrySelection)
		.from(entries)
		.innerJoin(clients, eq(entries.clientId, clients.id))
		.where(and(eq(entries.day, day), isNotNull(entries.deletedAt)))
		.orderBy(desc(entries.deletedAt), desc(entries.id))
		.all();
}

export function addQuickEntry(db: Db, input: { taskId: number; day: string }): EntryView {
	const day = normalizeDay(input.day);
	const task = db.select().from(quickTasks).where(eq(quickTasks.id, input.taskId)).get();
	if (!task) throw new DomainError('not_found', 'Task non trovata.');

	const client = db.select().from(clients).where(eq(clients.id, task.clientId)).get();
	if (!client) throw new DomainError('not_found', 'Cliente non trovato.');
	if (client.archivedAt !== null) {
		throw new DomainError(
			'archived',
			'Il cliente è archiviato: ripristinalo per registrare il tempo.'
		);
	}

	const row = db
		.insert(entries)
		.values({
			day,
			clientId: task.clientId,
			activity: task.name,
			durationMinutes: task.durationMinutes,
			source: 'quick',
			quickTaskId: task.id
		})
		.returning({ id: entries.id })
		.get();

	return listEntries(db, day).find((entry) => entry.id === row.id)!;
}

export function addManualEntry(
	db: Db,
	input: { day: string; clientId: number; activity: string; durationMinutes: number }
): EntryView {
	const day = normalizeDay(input.day);
	const activity = normalizeActivity(input.activity);
	const durationMinutes = normalizeDuration(input.durationMinutes);

	const client = db.select().from(clients).where(eq(clients.id, input.clientId)).get();
	if (!client) throw new DomainError('not_found', 'Cliente non trovato.');
	if (client.archivedAt !== null) {
		throw new DomainError(
			'archived',
			'Il cliente è archiviato: ripristinalo per registrare il tempo.'
		);
	}

	const row = db
		.insert(entries)
		.values({
			day,
			clientId: input.clientId,
			activity,
			durationMinutes,
			source: 'manual'
		})
		.returning({ id: entries.id })
		.get();

	return listEntries(db, day).find((entry) => entry.id === row.id)!;
}

export function updateEntry(
	db: Db,
	id: number,
	input: { clientId: number; activity: string; durationMinutes: number }
): EntryView {
	const activity = normalizeActivity(input.activity);
	const durationMinutes = normalizeDuration(input.durationMinutes);

	const current = db.select().from(entries).where(eq(entries.id, id)).get();
	if (!current || current.deletedAt !== null) {
		throw new DomainError('not_found', 'Registrazione non trovata.');
	}

	const client = db.select().from(clients).where(eq(clients.id, input.clientId)).get();
	if (!client) throw new DomainError('not_found', 'Cliente non trovato.');
	// Si può correggere una registrazione di un cliente archiviato finché resta su quel cliente;
	// spostarla su un cliente archiviato no.
	if (client.archivedAt !== null && input.clientId !== current.clientId) {
		throw new DomainError(
			'archived',
			'Il cliente è archiviato: ripristinalo per spostare la registrazione su di lui.'
		);
	}

	// La correzione non tocca la task di origine né la durata misurata dal timer.
	db.update(entries)
		.set({
			clientId: input.clientId,
			activity,
			durationMinutes,
			updatedAt: new Date().toISOString()
		})
		.where(eq(entries.id, id))
		.run();

	return getEntry(db, id);
}

export function softDeleteEntry(db: Db, id: number): EntryView {
	const current = db
		.select({ id: entries.id, deletedAt: entries.deletedAt })
		.from(entries)
		.where(eq(entries.id, id))
		.get();
	if (!current || current.deletedAt !== null) {
		throw new DomainError('not_found', 'Registrazione non trovata.');
	}

	db.update(entries)
		.set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
		.where(eq(entries.id, id))
		.run();

	return getEntry(db, id);
}

export function restoreEntry(db: Db, id: number): EntryView {
	const current = db
		.select({ id: entries.id, deletedAt: entries.deletedAt })
		.from(entries)
		.where(eq(entries.id, id))
		.get();
	if (!current || current.deletedAt === null) {
		throw new DomainError('not_found', 'Registrazione non trovata.');
	}

	db.update(entries)
		.set({ deletedAt: null, updatedAt: new Date().toISOString() })
		.where(eq(entries.id, id))
		.run();

	return getEntry(db, id);
}

/** Lettura di una singola registrazione, eliminata o no: serve dopo soft delete/restore. */
function getEntry(db: Db, id: number): EntryView {
	const row = db
		.select(entrySelection)
		.from(entries)
		.innerJoin(clients, eq(entries.clientId, clients.id))
		.where(eq(entries.id, id))
		.get();
	if (!row) throw new DomainError('not_found', 'Registrazione non trovata.');
	return row;
}

export function getDayTotals(db: Db, day: string): DayTotals {
	const byClient = db
		.select({
			clientId: entries.clientId,
			clientName: clients.name,
			minutes: sql<number>`coalesce(sum(${entries.durationMinutes}), 0)`
		})
		.from(entries)
		.innerJoin(clients, eq(entries.clientId, clients.id))
		.where(and(eq(entries.day, day), isNull(entries.deletedAt)))
		.groupBy(entries.clientId, clients.name)
		.orderBy(asc(sql`lower(${clients.name})`))
		.all();

	return {
		totalMinutes: byClient.reduce((total, row) => total + row.minutes, 0),
		byClient
	};
}

/** Nomi di attività già usati: prima le task, poi le ultime registrazioni. */
export function listActivitySuggestions(db: Db): string[] {
	const taskNames = db
		.selectDistinct({ name: quickTasks.name })
		.from(quickTasks)
		.orderBy(asc(sql`lower(${quickTasks.name})`))
		.all()
		.map((row) => row.name);

	// Le 30 attività distinte più recenti: `max(created_at)` per groupare sul testo.
	const recentActivities = db
		.select({ activity: entries.activity, lastAt: sql<string>`max(${entries.createdAt})` })
		.from(entries)
		.groupBy(entries.activity)
		.orderBy(desc(sql`max(${entries.createdAt})`))
		.limit(30)
		.all()
		.map((row) => row.activity);

	const seen = new Set<string>();
	const suggestions: string[] = [];
	for (const name of [...taskNames, ...recentActivities]) {
		const key = name.trim().toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		suggestions.push(name);
		if (suggestions.length === MAX_SUGGESTIONS) break;
	}
	return suggestions;
}

/* -------------------------------------------------------------------- timer */

export function getTimer(db: Db): TimerState | null {
	const row = db
		.select({
			clientId: timer.clientId,
			clientName: clients.name,
			activity: timer.activity,
			day: timer.day,
			startedAt: timer.startedAt
		})
		.from(timer)
		.innerJoin(clients, eq(timer.clientId, clients.id))
		.where(eq(timer.id, 1))
		.get();

	return row ?? null;
}

export function startTimer(
	db: Db,
	input: { clientId: number; activity: string; day: string; startedAt: string }
): TimerState {
	const activity = normalizeActivity(input.activity);
	const day = normalizeDay(input.day);

	const client = db.select().from(clients).where(eq(clients.id, input.clientId)).get();
	if (!client) throw new DomainError('not_found', 'Cliente non trovato.');
	if (client.archivedAt !== null) {
		throw new DomainError(
			'archived',
			'Il cliente è archiviato: ripristinalo per avviare il timer.'
		);
	}
	if (getTimer(db)) throw new DomainError('timer_running', "C'è già un timer in corso.");

	db.insert(timer)
		.values({ id: 1, clientId: input.clientId, activity, day, startedAt: input.startedAt })
		.run();

	return {
		clientId: input.clientId,
		clientName: client.name,
		activity,
		day,
		startedAt: input.startedAt
	};
}

export function stopTimer(
	db: Db,
	input: { durationMinutes: number; stoppedAt: string }
): EntryView {
	const durationMinutes = normalizeDuration(input.durationMinutes);

	return db.transaction((tx) => {
		const current = tx.select().from(timer).where(eq(timer.id, 1)).get();
		if (!current) throw new DomainError('no_timer', 'Nessun timer in corso.');

		const client = tx.select().from(clients).where(eq(clients.id, current.clientId)).get();
		if (!client) throw new DomainError('not_found', 'Cliente non trovato.');

		const elapsed = Date.parse(input.stoppedAt) - Date.parse(current.startedAt);
		const measuredMinutes = Math.max(1, Math.round(elapsed / 60000));

		const inserted = tx
			.insert(entries)
			.values({
				day: current.day,
				clientId: current.clientId,
				activity: current.activity,
				durationMinutes,
				source: 'timer',
				measuredMinutes
			})
			.returning({ id: entries.id })
			.get();

		tx.delete(timer).where(eq(timer.id, 1)).run();

		const row = tx
			.select(entrySelection)
			.from(entries)
			.innerJoin(clients, eq(entries.clientId, clients.id))
			.where(eq(entries.id, inserted.id))
			.get();
		if (!row) throw new DomainError('not_found', 'Registrazione non trovata.');
		return row;
	});
}

export function discardTimer(db: Db): void {
	db.delete(timer).where(eq(timer.id, 1)).run();
}

/* ---------------------------------------------------------------- sessioni */

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

/** Crea la sessione e restituisce il token in chiaro, da mettere nel cookie. */
export function createSession(db: Db): string {
	const token = randomBytes(32).toString('base64url');
	db.delete(sessions)
		.where(sql`${sessions.expiresAt} <= ${new Date().toISOString()}`)
		.run();
	db.insert(sessions)
		.values({
			tokenHash: hashToken(token),
			expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
		})
		.run();
	return token;
}

export function validateSession(db: Db, token: string | undefined): boolean {
	if (!token) return false;
	const row = db
		.select({ expiresAt: sessions.expiresAt })
		.from(sessions)
		.where(eq(sessions.tokenHash, hashToken(token)))
		.get();
	if (!row) return false;

	if (row.expiresAt <= new Date().toISOString()) {
		db.delete(sessions)
			.where(eq(sessions.tokenHash, hashToken(token)))
			.run();
		return false;
	}
	return true;
}

export function deleteSession(db: Db, token: string | undefined): void {
	if (!token) return;
	db.delete(sessions)
		.where(eq(sessions.tokenHash, hashToken(token)))
		.run();
}
