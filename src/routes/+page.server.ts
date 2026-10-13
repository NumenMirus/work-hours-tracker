import { fail, redirect, type ActionFailure } from '@sveltejs/kit';
import { APP_TIME_ZONE } from '$app/env/private';
import { getDb } from '#lib/server/db.js';
import { DomainError } from '#lib/server/errors.js';
import {
	addManualEntry,
	addQuickEntry,
	discardTimer,
	getDayTotals,
	listActivitySuggestions,
	listClients,
	listDeletedEntries,
	listEntries,
	listQuickTasks,
	restoreEntry,
	softDeleteEntry,
	startTimer,
	stopTimer,
	updateEntry
} from '#lib/server/repo.js';
import { addDays, formatDayLabel, isValidDay, todayIn } from '#lib/day.js';
import { DURATION_ERROR, formatDuration, parseDuration } from '#lib/duration.js';
import type { QuickTask } from '#lib/types.js';
import type { Actions, PageServerLoad } from './$types';

/** Payload di errore restituito con `fail`: la pagina lo legge dalla prop `form`. */
interface DayActionError {
	action: string;
	error: string;
	field?: string;
	id?: number;
}

function statusFor(code: DomainError['code']): number {
	switch (code) {
		case 'not_found':
			return 404;
		case 'duplicate':
		case 'in_use':
		case 'timer_running':
		case 'archived':
		case 'no_timer':
			return 409;
		default:
			return 400;
	}
}

/** Traduce un `DomainError` nel `fail` con lo status giusto; rilancia il resto. */
function failWith(
	action: string,
	error: unknown,
	extra: { field?: string; id?: number } = {}
): ActionFailure<DayActionError> {
	if (error instanceof DomainError) {
		return fail(statusFor(error.code), { action, error: error.message, ...extra });
	}
	throw error;
}

function readDay(form: FormData): string | null {
	const day = String(form.get('day') ?? '');
	return isValidDay(day) ? day : null;
}

function readId(form: FormData, name: string): number | null {
	const value = Number(form.get(name));
	return Number.isInteger(value) && value > 0 ? value : null;
}

function readClientId(form: FormData): number | null {
	return readId(form, 'clientId');
}

function readActivity(form: FormData): string {
	return String(form.get('activity') ?? '');
}

export const load: PageServerLoad = async ({ url }) => {
	const db = getDb();
	const today = todayIn(APP_TIME_ZONE);
	const requested = url.searchParams.get('d');
	if (requested !== null && !isValidDay(requested)) redirect(307, '/');
	const day = requested ?? today;

	const clients = listClients(db);
	const entries = listEntries(db, day);

	// I gruppi seguono l'ordine di `listQuickTasks`: per cliente, poi per nome.
	const groups = new Map<number, { clientId: number; clientName: string; tasks: QuickTask[] }>();
	for (const task of listQuickTasks(db, { activeOnly: true })) {
		const group = groups.get(task.clientId);
		if (group) group.tasks.push(task);
		else
			groups.set(task.clientId, {
				clientId: task.clientId,
				clientName: task.clientName,
				tasks: [task]
			});
	}

	return {
		day,
		today,
		isToday: day === today,
		label: formatDayLabel(day, today),
		prevDay: addDays(day, -1),
		nextDay: addDays(day, 1),
		quickGroups: [...groups.values()],
		clients,
		entries,
		deletedEntries: listDeletedEntries(db, day),
		totals: getDayTotals(db, day),
		suggestions: listActivitySuggestions(db),
		defaultClientId: entries[0]?.clientId ?? clients[0]?.id ?? null
	};
};

export const actions: Actions = {
	addQuick: async ({ request }) => {
		const db = getDb();
		const form = await request.formData();
		const day = readDay(form);
		const taskId = readId(form, 'taskId');
		if (!day || taskId === null) {
			return fail(400, { action: 'addQuick', error: 'Task non valida.' });
		}
		try {
			const entry = addQuickEntry(db, { taskId, day });
			return {
				toast: {
					message: `${entry.activity} +${formatDuration(entry.durationMinutes)} · ${entry.clientName}`,
					action: { label: 'Annulla', formAction: `?d=${day}&/undoAdd`, entryId: entry.id }
				}
			};
		} catch (error) {
			return failWith('addQuick', error);
		}
	},

	addManual: async ({ request }) => {
		const db = getDb();
		const form = await request.formData();
		const day = readDay(form);
		const clientId = readClientId(form);
		const activity = readActivity(form);
		if (!day || clientId === null) {
			return fail(400, { action: 'addManual', error: 'Scegli un cliente.', field: 'clientId' });
		}
		const minutes = parseDuration(String(form.get('duration') ?? ''));
		if (minutes === null) {
			return fail(400, { action: 'addManual', error: DURATION_ERROR, field: 'duration' });
		}
		if (!activity.trim()) {
			return fail(400, {
				action: 'addManual',
				error: "Indica l'attività svolta.",
				field: 'activity'
			});
		}
		try {
			const entry = addManualEntry(db, { day, clientId, activity, durationMinutes: minutes });
			return {
				toast: {
					message: `${entry.activity} ${formatDuration(entry.durationMinutes)} aggiunta`,
					action: { label: 'Annulla', formAction: `?d=${day}&/undoAdd`, entryId: entry.id }
				}
			};
		} catch (error) {
			return failWith('addManual', error, { field: 'activity' });
		}
	},

	updateEntry: async ({ request }) => {
		const db = getDb();
		const form = await request.formData();
		const id = readId(form, 'id');
		if (id === null) {
			return fail(404, { action: 'updateEntry', error: 'Registrazione non trovata.' });
		}
		const clientId = readClientId(form);
		const activity = readActivity(form);
		if (clientId === null) {
			return fail(400, {
				action: 'updateEntry',
				error: 'Scegli un cliente.',
				field: 'clientId',
				id
			});
		}
		const minutes = parseDuration(String(form.get('duration') ?? ''));
		if (minutes === null) {
			return fail(400, { action: 'updateEntry', error: DURATION_ERROR, field: 'duration', id });
		}
		if (!activity.trim()) {
			return fail(400, {
				action: 'updateEntry',
				error: "Indica l'attività svolta.",
				field: 'activity',
				id
			});
		}
		try {
			updateEntry(db, id, { clientId, activity, durationMinutes: minutes });
			return { updatedId: id };
		} catch (error) {
			return failWith('updateEntry', error, { id });
		}
	},

	deleteEntry: async ({ request }) => {
		const db = getDb();
		const form = await request.formData();
		const id = readId(form, 'id');
		if (id === null) {
			return fail(404, { action: 'deleteEntry', error: 'Registrazione non trovata.' });
		}
		try {
			const entry = softDeleteEntry(db, id);
			return {
				toast: {
					message: 'Registrazione eliminata',
					action: {
						label: 'Ripristina',
						formAction: `?d=${entry.day}&/restoreEntry`,
						entryId: entry.id
					}
				}
			};
		} catch (error) {
			return failWith('deleteEntry', error, { id });
		}
	},

	/** Annullamento dell'aggiunta dal toast: elimina e non propone un ripristino. */
	undoAdd: async ({ request }) => {
		const db = getDb();
		const form = await request.formData();
		const id = readId(form, 'id');
		if (id === null) {
			return fail(404, { action: 'undoAdd', error: 'Registrazione non trovata.' });
		}
		try {
			softDeleteEntry(db, id);
			return { action: 'undoAdd', undone: true };
		} catch (error) {
			return failWith('undoAdd', error, { id });
		}
	},

	restoreEntry: async ({ request }) => {
		const db = getDb();
		const form = await request.formData();
		const id = readId(form, 'id');
		if (id === null) {
			return fail(404, { action: 'restoreEntry', error: 'Registrazione non trovata.' });
		}
		try {
			restoreEntry(db, id);
			return { toast: { message: 'Registrazione ripristinata' } };
		} catch (error) {
			return failWith('restoreEntry', error, { id });
		}
	},

	startTimer: async ({ request }) => {
		const db = getDb();
		const form = await request.formData();
		const clientId = readClientId(form);
		if (clientId === null) {
			return fail(400, { action: 'startTimer', error: 'Scegli un cliente.', field: 'clientId' });
		}
		const activity = readActivity(form);
		if (!activity.trim()) {
			return fail(400, {
				action: 'startTimer',
				error: "Indica l'attività da misurare.",
				field: 'activity'
			});
		}
		try {
			// Il timer nasce solo da una scelta esplicita: giorno di oggi e istante correnti.
			const timer = startTimer(db, {
				clientId,
				activity,
				day: todayIn(APP_TIME_ZONE),
				startedAt: new Date().toISOString()
			});
			return { startedAt: timer.startedAt };
		} catch (error) {
			return failWith('startTimer', error, { field: 'activity' });
		}
	},

	stopTimer: async ({ request }) => {
		const db = getDb();
		const form = await request.formData();
		const minutes = parseDuration(String(form.get('duration') ?? ''));
		if (minutes === null) {
			return fail(400, { action: 'stopTimer', error: DURATION_ERROR, field: 'duration' });
		}
		try {
			const entry = stopTimer(db, {
				durationMinutes: minutes,
				stoppedAt: new Date().toISOString()
			});
			return {
				toast: {
					message: `${entry.activity} ${formatDuration(entry.durationMinutes)} registrata`
				}
			};
		} catch (error) {
			return failWith('stopTimer', error, { field: 'duration' });
		}
	},

	discardTimer: async () => {
		try {
			discardTimer(getDb());
			return { discarded: true };
		} catch (error) {
			return failWith('discardTimer', error);
		}
	}
};
