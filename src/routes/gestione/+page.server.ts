import { fail } from '@sveltejs/kit';
import { DURATION_ERROR, parseDuration } from '#lib/duration.js';
import { getDb } from '#lib/server/db.js';
import { DomainError, type DomainErrorCode } from '#lib/server/errors.js';
import {
	createClient,
	createQuickTask,
	deleteClient,
	deleteQuickTask,
	listClientsWithUsage,
	listQuickTasks,
	renameClient,
	setClientArchived,
	updateQuickTask
} from '#lib/server/repo.js';
import type { Actions, PageServerLoad } from './$types';

/** Dati di ogni errore restituito all'action: la pagina sa dove mostrarlo. */
type Failure = {
	action: string;
	error: string;
	field?: string;
	id?: number;
};

export const load: PageServerLoad = () => {
	const db = getDb();
	return {
		clients: listClientsWithUsage(db),
		tasks: listQuickTasks(db, { activeOnly: false })
	};
};

const CONFLICT_CODES: DomainErrorCode[] = ['duplicate', 'in_use', 'timer_running', 'archived'];

function statusFor(code: DomainErrorCode): number {
	if (code === 'not_found') return 404;
	if (CONFLICT_CODES.includes(code)) return 409;
	return 400;
}

/**
 * Traduce un `DomainError` nel `fail` corrispondente. Gli errori che non sono di dominio
 * si rilanciano: sono bug e non hanno una traduzione utile da mostrare.
 */
function domainFailure(
	error: unknown,
	action: string,
	extra: { field?: string; id?: number } = {}
) {
	if (!(error instanceof DomainError)) throw error;
	return fail(statusFor(error.code), {
		action,
		error: error.message,
		field: error.code === 'archived' ? 'clientId' : extra.field,
		id: extra.id
	} satisfies Failure);
}

/** Durata letta dal form: `20`, `1:30`, `1h30`. Errore unico sul campo `duration`. */
function durationField(data: FormData, action: string, id?: number) {
	const minutes = parseDuration(String(data.get('duration') ?? '').trim());
	if (minutes === null)
		return fail(400, { action, error: DURATION_ERROR, field: 'duration', id } satisfies Failure);
	return minutes;
}

export const actions: Actions = {
	createTask: async ({ request }) => {
		const action = 'createTask';
		const data = await request.formData();
		const clientId = Number(String(data.get('clientId') ?? '').trim());
		if (!Number.isInteger(clientId) || clientId <= 0) {
			return fail(400, {
				action,
				error: 'Scegli un cliente.',
				field: 'clientId'
			} satisfies Failure);
		}
		const durationMinutes = durationField(data, action);
		if (typeof durationMinutes !== 'number') return durationMinutes;

		try {
			createQuickTask(getDb(), {
				clientId,
				name: String(data.get('name') ?? '').trim(),
				durationMinutes
			});
		} catch (error) {
			// `not_found` riguarda il cliente selezionato, tutto il resto il nome.
			const missing =
				error instanceof DomainError && error.code === 'not_found' ? 'clientId' : 'name';
			return domainFailure(error, action, { field: missing });
		}
		return { action, ok: true };
	},

	updateTask: async ({ request }) => {
		const action = 'updateTask';
		const data = await request.formData();
		const id = Number(String(data.get('id') ?? '').trim());
		const durationMinutes = durationField(data, action, id);
		if (typeof durationMinutes !== 'number') return durationMinutes;

		try {
			updateQuickTask(getDb(), id, {
				name: String(data.get('name') ?? '').trim(),
				durationMinutes
			});
		} catch (error) {
			return domainFailure(error, action, { field: 'name', id });
		}
		return { action, ok: true, id };
	},

	deleteTask: async ({ request }) => {
		const action = 'deleteTask';
		const data = await request.formData();
		const id = Number(String(data.get('id') ?? '').trim());

		try {
			deleteQuickTask(getDb(), id);
		} catch (error) {
			return domainFailure(error, action, { id });
		}
		return { action, ok: true, id };
	},

	createClient: async ({ request }) => {
		const action = 'createClient';
		const data = await request.formData();

		try {
			createClient(getDb(), String(data.get('name') ?? '').trim());
		} catch (error) {
			return domainFailure(error, action, { field: 'name' });
		}
		return { action, ok: true };
	},

	renameClient: async ({ request }) => {
		const action = 'renameClient';
		const data = await request.formData();
		const id = Number(String(data.get('id') ?? '').trim());

		try {
			renameClient(getDb(), id, String(data.get('name') ?? '').trim());
		} catch (error) {
			return domainFailure(error, action, { field: 'name', id });
		}
		return { action, ok: true, id };
	},

	archiveClient: async ({ request }) => {
		const action = 'archiveClient';
		const data = await request.formData();
		const id = Number(String(data.get('id') ?? '').trim());

		try {
			setClientArchived(getDb(), id, true);
		} catch (error) {
			return domainFailure(error, action, { id });
		}
		return { action, ok: true, id };
	},

	unarchiveClient: async ({ request }) => {
		const action = 'unarchiveClient';
		const data = await request.formData();
		const id = Number(String(data.get('id') ?? '').trim());

		try {
			setClientArchived(getDb(), id, false);
		} catch (error) {
			return domainFailure(error, action, { id });
		}
		return { action, ok: true, id };
	},

	deleteClient: async ({ request }) => {
		const action = 'deleteClient';
		const data = await request.formData();
		const id = Number(String(data.get('id') ?? '').trim());

		try {
			deleteClient(getDb(), id);
		} catch (error) {
			return domainFailure(error, action, { id });
		}
		return { action, ok: true, id };
	}
};
