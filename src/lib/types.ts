export type EntrySource = 'quick' | 'manual' | 'timer';

export interface Client {
	id: number;
	name: string;
	archived: boolean;
}

export interface QuickTask {
	id: number;
	clientId: number;
	clientName: string;
	name: string;
	durationMinutes: number;
}

export interface EntryView {
	id: number;
	day: string;
	clientId: number;
	clientName: string;
	activity: string;
	durationMinutes: number;
	source: EntrySource;
	/** Solo per le registrazioni da timer: durata misurata originale, prima di eventuali correzioni. */
	measuredMinutes: number | null;
	createdAt: string;
}

export interface DayTotals {
	totalMinutes: number;
	byClient: { clientId: number; clientName: string; minutes: number }[];
}

export interface TimerState {
	clientId: number;
	clientName: string;
	activity: string;
	/** Giorno (YYYY-MM-DD) a cui verrà attribuita la registrazione. */
	day: string;
	/** Istante di avvio, ISO 8601 UTC. */
	startedAt: string;
}
