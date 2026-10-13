import { beforeEach, describe, expect, it } from 'vitest';
import { createDb, type Db } from '#lib/server/db.js';
import {
	addManualEntry,
	addQuickEntry,
	createClient,
	createQuickTask,
	createSession,
	deleteClient,
	deleteQuickTask,
	deleteSession,
	getDayTotals,
	getTimer,
	listActivitySuggestions,
	listEntries,
	listPeriodEntries,
	listDeletedEntries,
	listQuickTasks,
	restoreEntry,
	setClientArchived,
	softDeleteEntry,
	startTimer,
	stopTimer,
	updateEntry,
	updateQuickTask,
	validateSession
} from '#lib/server/repo.js';

let db: Db;

function seed() {
	const rossi = createClient(db, 'Rossi');
	const bianchi = createClient(db, 'Bianchi');
	const assistenza = createQuickTask(db, {
		clientId: rossi.id,
		name: 'Assistenza',
		durationMinutes: 20
	});
	const turni = createQuickTask(db, {
		clientId: rossi.id,
		name: 'Controllo turni',
		durationMinutes: 60
	});
	return { rossi, bianchi, assistenza, turni };
}

beforeEach(() => {
	db = createDb(':memory:');
});

describe('migrazione iniziale', () => {
	it('crea tutte e cinque le tabelle', () => {
		const tables = db.$client
			.prepare(`select name from sqlite_master where type = 'table' order by name`)
			.all() as { name: string }[];

		expect(tables.map((row) => row.name)).toEqual(
			expect.arrayContaining(['clients', 'entries', 'quick_tasks', 'sessions', 'timer'])
		);
	});
});

describe('task rapide', () => {
	it('registra due volte la stessa task come due righe e doppio totale', () => {
		const { assistenza } = seed();

		addQuickEntry(db, { taskId: assistenza.id, day: '2026-10-12' });
		addQuickEntry(db, { taskId: assistenza.id, day: '2026-10-12' });

		const entries = listEntries(db, '2026-10-12');
		expect(entries).toHaveLength(2);
		expect(getDayTotals(db, '2026-10-12').totalMinutes).toBe(40);
	});

	it('somma le task di clienti diversi', () => {
		const { assistenza, turni } = seed();

		addQuickEntry(db, { taskId: assistenza.id, day: '2026-10-12' });
		addQuickEntry(db, { taskId: turni.id, day: '2026-10-12' });

		const totals = getDayTotals(db, '2026-10-12');
		expect(totals.totalMinutes).toBe(80);
		expect(totals.byClient).toEqual([
			{ clientId: totals.byClient[0].clientId, clientName: 'Rossi', minutes: 80 }
		]);
	});

	it('copia il totale in Gestione senza toccare la task', () => {
		const { assistenza } = seed();
		const entry = addQuickEntry(db, { taskId: assistenza.id, day: '2026-10-12' });

		updateEntry(db, entry.id, {
			clientId: entry.clientId,
			activity: entry.activity,
			durationMinutes: 30
		});

		expect(getDayTotals(db, '2026-10-12').totalMinutes).toBe(30);
		expect(listQuickTasks(db)[0].durationMinutes).toBe(20);
	});

	it('non modifica le registrazioni passate quando la task cambia', () => {
		const { assistenza } = seed();
		addQuickEntry(db, { taskId: assistenza.id, day: '2026-10-12' });

		updateQuickTask(db, assistenza.id, { name: 'Assistenza rinominata', durationMinutes: 45 });

		const entries = listEntries(db, '2026-10-12');
		expect(entries[0].activity).toBe('Assistenza');
		expect(getDayTotals(db, '2026-10-12').totalMinutes).toBe(20);
	});

	it('elimina una task conservando le registrazioni già fatte', () => {
		const { assistenza } = seed();
		addQuickEntry(db, { taskId: assistenza.id, day: '2026-10-12' });

		deleteQuickTask(db, assistenza.id);

		expect(listQuickTasks(db, { activeOnly: true }).map((task) => task.name)).toEqual([
			'Controllo turni'
		]);
		expect(getDayTotals(db, '2026-10-12').totalMinutes).toBe(20);
	});

	it('rifiuta due task omonime dello stesso cliente, ignorando il maiuscolo', () => {
		const { rossi } = seed();
		createQuickTask(db, { clientId: rossi.id, name: 'Formazione', durationMinutes: 15 });

		expect(() =>
			createQuickTask(db, { clientId: rossi.id, name: ' formazione ', durationMinutes: 15 })
		).toThrowError(/già una task/);
	});

	it('nasconde le task dei clienti archiviati', () => {
		const { bianchi } = seed();
		createQuickTask(db, { clientId: bianchi.id, name: 'Ufficio', durationMinutes: 30 });

		setClientArchived(db, bianchi.id, true);

		expect(listQuickTasks(db, { activeOnly: true }).map((task) => task.clientName)).toEqual([
			'Rossi',
			'Rossi'
		]);
		expect(listQuickTasks(db, { activeOnly: false })).toHaveLength(3);
	});
});

describe('clienti', () => {
	it('rifiuta nomi duplicati ignorando il maiuscolo', () => {
		createClient(db, 'Rossi');
		expect(() => createClient(db, 'ROSSI')).toThrowError(/Esiste già un cliente/);
	});

	it('non elimina un cliente con task', () => {
		const { rossi } = seed();
		expect(() => deleteClient(db, rossi.id)).toThrowError(/archivialo/);
	});

	it('corregge una registrazione di un cliente archiviato ma non la sposta su un archiviato', () => {
		const { rossi, bianchi } = seed();
		const entry = addManualEntry(db, {
			day: '2026-10-12',
			clientId: rossi.id,
			activity: 'Riunione',
			durationMinutes: 15
		});
		setClientArchived(db, rossi.id, true);
		setClientArchived(db, bianchi.id, true);

		const updated = updateEntry(db, entry.id, {
			clientId: rossi.id,
			activity: 'Riunione',
			durationMinutes: 45
		});
		expect(updated.durationMinutes).toBe(45);
		expect(getDayTotals(db, '2026-10-12').totalMinutes).toBe(45);

		expect(() =>
			updateEntry(db, entry.id, {
				clientId: bianchi.id,
				activity: 'Riunione',
				durationMinutes: 45
			})
		).toThrowError(/archiviato/);
	});

	it('non elimina un cliente con registrazioni, neppure eliminate', () => {
		const { rossi, assistenza } = seed();
		const entry = addQuickEntry(db, { taskId: assistenza.id, day: '2026-10-12' });
		softDeleteEntry(db, entry.id);

		expect(() => deleteClient(db, rossi.id)).toThrowError(/archivialo/);
	});

	it('elimina un cliente senza task né registrazioni', () => {
		const rossi = createClient(db, 'Rossi');
		deleteClient(db, rossi.id);
		expect(listQuickTasks(db, { activeOnly: false })).toHaveLength(0);
	});
});

describe('registrazioni', () => {
	it('aggiunge una registrazione manuale', () => {
		const { bianchi } = seed();
		addManualEntry(db, {
			day: '2026-10-12',
			clientId: bianchi.id,
			activity: 'Riunione',
			durationMinutes: 15
		});

		const entries = listEntries(db, '2026-10-12');
		expect(entries[0].source).toBe('manual');
		expect(getDayTotals(db, '2026-10-12').totalMinutes).toBe(15);
	});

	it('soft delete e restore aggiornano il totale', () => {
		const { assistenza } = seed();
		const entry = addQuickEntry(db, { taskId: assistenza.id, day: '2026-10-12' });

		softDeleteEntry(db, entry.id);
		expect(getDayTotals(db, '2026-10-12').totalMinutes).toBe(0);
		expect(listEntries(db, '2026-10-12')).toHaveLength(0);

		restoreEntry(db, entry.id);
		expect(getDayTotals(db, '2026-10-12').totalMinutes).toBe(20);
		expect(listEntries(db, '2026-10-12')).toHaveLength(1);
	});

	it('elenca le registrazioni eliminate del giorno e le toglie dall’elenco quando si ripristinano', () => {
		const { assistenza, turni } = seed();
		const first = addQuickEntry(db, { taskId: assistenza.id, day: '2026-10-12' });
		const second = addQuickEntry(db, { taskId: turni.id, day: '2026-10-12' });
		addQuickEntry(db, { taskId: assistenza.id, day: '2026-10-13' });
		softDeleteEntry(db, first.id);
		softDeleteEntry(db, second.id);

		expect(listDeletedEntries(db, '2026-10-12').map((entry) => entry.id)).toEqual([
			second.id,
			first.id
		]);
		expect(listDeletedEntries(db, '2026-10-13')).toHaveLength(0);

		restoreEntry(db, first.id);
		expect(listDeletedEntries(db, '2026-10-12').map((entry) => entry.id)).toEqual([second.id]);
	});

	it('suggerisce task e attività recenti, senza quelle eliminate né quelle di mesi fa', () => {
		const { rossi, assistenza } = seed();
		const today = new Date().toISOString().slice(0, 10);
		const add = (activity: string, day: string) =>
			addManualEntry(db, { day, clientId: rossi.id, activity, durationMinutes: 10 });

		add('Riunione recente', today);
		add('Archivio vecchio', '2020-01-01');
		softDeleteEntry(db, add('Per errore', today).id);
		addQuickEntry(db, { taskId: assistenza.id, day: today });

		const suggestions = listActivitySuggestions(db);
		expect(suggestions).toContain('Riunione recente');
		expect(suggestions).not.toContain('Archivio vecchio');
		expect(suggestions).not.toContain('Per errore');
		// Un nome che è anche task compare una volta sola, e le task vengono per prime.
		expect(suggestions.filter((name) => name === 'Assistenza')).toHaveLength(1);
		expect(suggestions.indexOf('Assistenza')).toBeLessThan(suggestions.indexOf('Riunione recente'));
	});

	it('rifiuta durate fuori range', () => {
		const { bianchi } = seed();
		expect(() =>
			addManualEntry(db, {
				day: '2026-10-12',
				clientId: bianchi.id,
				activity: 'Riunione',
				durationMinutes: 0
			})
		).toThrowError(/durata/);
		expect(() =>
			addManualEntry(db, {
				day: '2026-10-12',
				clientId: bianchi.id,
				activity: 'Riunione',
				durationMinutes: 1441
			})
		).toThrowError(/durata/);
	});

	it('rifiuta attività vuote o troppo lunghe', () => {
		const { bianchi } = seed();
		expect(() =>
			addManualEntry(db, {
				day: '2026-10-12',
				clientId: bianchi.id,
				activity: '   ',
				durationMinutes: 15
			})
		).toThrowError(/attività/);
		expect(() =>
			addManualEntry(db, {
				day: '2026-10-12',
				clientId: bianchi.id,
				activity: 'a'.repeat(121),
				durationMinutes: 15
			})
		).toThrowError(/attività/);
	});
});

describe('timer', () => {
	it('ferma il timer creando una sola entry con i minuti misurati', () => {
		const { rossi } = seed();
		startTimer(db, {
			clientId: rossi.id,
			activity: 'Analisi',
			day: '2026-10-12',
			startedAt: '2026-10-12T09:00:00.000Z'
		});
		expect(getTimer(db)?.activity).toBe('Analisi');

		const entry = stopTimer(db, {
			durationMinutes: 10,
			stoppedAt: '2026-10-12T09:01:00.000Z'
		});

		expect(entry.source).toBe('timer');
		expect(entry.durationMinutes).toBe(10);
		expect(entry.measuredMinutes).toBe(1);
		expect(listEntries(db, '2026-10-12')).toHaveLength(1);
		expect(getTimer(db)).toBeNull();
	});

	it('conserva i minuti misurati anche correggendo la durata', () => {
		const { rossi } = seed();
		startTimer(db, {
			clientId: rossi.id,
			activity: 'Analisi',
			day: '2026-10-12',
			startedAt: '2026-10-12T09:00:00.000Z'
		});
		const entry = stopTimer(db, { durationMinutes: 10, stoppedAt: '2026-10-12T09:01:00.000Z' });

		const updated = updateEntry(db, entry.id, {
			clientId: entry.clientId,
			activity: entry.activity,
			durationMinutes: 30
		});

		expect(updated.durationMinutes).toBe(30);
		expect(updated.measuredMinutes).toBe(1);
		expect(updated.source).toBe('timer');
	});

	it('rifiuta un secondo timer mentre il primo è attivo', () => {
		const { rossi, bianchi } = seed();
		startTimer(db, {
			clientId: rossi.id,
			activity: 'Analisi',
			day: '2026-10-12',
			startedAt: '2026-10-12T09:00:00.000Z'
		});

		expect(() =>
			startTimer(db, {
				clientId: bianchi.id,
				activity: 'Riunione',
				day: '2026-10-12',
				startedAt: '2026-10-12T10:00:00.000Z'
			})
		).toThrowError(/timer in corso/);
	});

	it('ferma sul giorno in cui è stato avviato', () => {
		const { rossi } = seed();
		startTimer(db, {
			clientId: rossi.id,
			activity: 'Analisi',
			day: '2026-10-11',
			startedAt: '2026-10-11T23:30:00.000Z'
		});
		const entry = stopTimer(db, { durationMinutes: 45, stoppedAt: '2026-10-12T00:15:00.000Z' });

		expect(entry.day).toBe('2026-10-11');
		expect(entry.measuredMinutes).toBe(45);
	});

	it('rifiuta di fermare un timer assente', () => {
		expect(() =>
			stopTimer(db, { durationMinutes: 10, stoppedAt: '2026-10-12T09:01:00.000Z' })
		).toThrowError(/già stato fermato/);
	});
});

describe('sessioni', () => {
	it('valida un token appena creato e lo rifiuta dopo la cancellazione', () => {
		const token = createSession(db);
		expect(validateSession(db, token)).toBe(true);

		deleteSession(db, token);
		expect(validateSession(db, token)).toBe(false);
	});

	it('rifiuta token assenti o inventati', () => {
		expect(validateSession(db, undefined)).toBe(false);
		expect(validateSession(db, 'token-inventato')).toBe(false);
	});
});

describe('listPeriodEntries', () => {
	it('include gli estremi, esclude fuori periodo ed eliminate, filtra per cliente', () => {
		const { rossi, bianchi, assistenza } = seed();
		addQuickEntry(db, { taskId: assistenza.id, day: '2026-09-30' });
		addQuickEntry(db, { taskId: assistenza.id, day: '2026-10-01' });
		const ultimo = addQuickEntry(db, { taskId: assistenza.id, day: '2026-10-31' });
		addQuickEntry(db, { taskId: assistenza.id, day: '2026-11-01' });
		const eliminata = addQuickEntry(db, { taskId: assistenza.id, day: '2026-10-15' });
		softDeleteEntry(db, eliminata.id);
		addManualEntry(db, {
			day: '2026-10-15',
			clientId: bianchi.id,
			activity: 'Riunione',
			durationMinutes: 30
		});

		const all = listPeriodEntries(db, { from: '2026-10-01', to: '2026-10-31', clientId: null });
		expect(all.map((e) => e.day)).toEqual(['2026-10-01', '2026-10-15', '2026-10-31']);
		expect(all.at(-1)?.id).toBe(ultimo.id);

		const soloRossi = listPeriodEntries(db, {
			from: '2026-10-01',
			to: '2026-10-31',
			clientId: rossi.id
		});
		expect(soloRossi.map((e) => e.clientName)).toEqual(['Rossi', 'Rossi']);
	});
});
