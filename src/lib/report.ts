import { addDays, isValidDay } from './day.js';
import type { EntryView } from './types.js';

/** Periodo del consuntivo: estremi inclusi, `clientId` null = tutti i clienti. */
export interface ReportPeriod {
	from: string;
	to: string;
	clientId: number | null;
}

export interface ReportSummary {
	totalMinutes: number;
	byClient: { clientId: number; clientName: string; minutes: number }[];
	byDay: { day: string; minutes: number; entries: EntryView[] }[];
}

export const PERIOD_ERROR = 'Il giorno iniziale non può essere dopo quello finale.';

/** Dal primo del mese di `today` fino a `today`. */
export function currentMonth(today: string): { from: string; to: string } {
	return { from: `${today.slice(0, 8)}01`, to: today };
}

/** Il mese precedente a quello di `today`, per intero. */
export function previousMonth(today: string): { from: string; to: string } {
	const lastOfPrevious = addDays(`${today.slice(0, 8)}01`, -1);
	return { from: `${lastOfPrevious.slice(0, 8)}01`, to: lastOfPrevious };
}

/**
 * Legge il periodo dai parametri dell'URL. Valori assenti o non validi ricadono sul mese in
 * corso; se gli estremi sono invertiti si torna al mese in corso e si segnala l'errore.
 */
export function parsePeriod(
	params: URLSearchParams,
	today: string
): { period: ReportPeriod; error: string | null } {
	const defaults = currentMonth(today);
	const rawFrom = params.get('dal') ?? '';
	const rawTo = params.get('al') ?? '';
	const from = isValidDay(rawFrom) ? rawFrom : defaults.from;
	const to = isValidDay(rawTo) ? rawTo : defaults.to;
	const rawClient = params.get('cliente') ?? '';
	const clientId = /^\d{1,9}$/.test(rawClient) ? Number(rawClient) : null;

	if (from > to) return { period: { ...defaults, clientId }, error: PERIOD_ERROR };
	return { period: { from, to, clientId }, error: null };
}

/** Totali per cliente e per giorno. `rows` deve essere già ordinato (giorno, cliente, inserimento). */
export function summarizeReport(rows: EntryView[]): ReportSummary {
	const clientTotals = new Map<number, { clientId: number; clientName: string; minutes: number }>();
	const byDay: ReportSummary['byDay'] = [];
	let totalMinutes = 0;

	for (const row of rows) {
		totalMinutes += row.durationMinutes;

		const client = clientTotals.get(row.clientId) ?? {
			clientId: row.clientId,
			clientName: row.clientName,
			minutes: 0
		};
		client.minutes += row.durationMinutes;
		clientTotals.set(row.clientId, client);

		let day = byDay.at(-1);
		if (day?.day !== row.day) {
			day = { day: row.day, minutes: 0, entries: [] };
			byDay.push(day);
		}
		day.minutes += row.durationMinutes;
		day.entries.push(row);
	}

	const byClient = [...clientTotals.values()].sort((a, b) =>
		a.clientName.localeCompare(b.clientName, 'it', { sensitivity: 'base' })
	);
	return { totalMinutes, byClient, byDay };
}

/** Ore decimali con la virgola italiana: `80` → `1,33`. */
export function formatHoursDecimal(minutes: number): string {
	return (minutes / 60).toFixed(2).replace('.', ',');
}

/**
 * Una cella CSV. Fra virgolette se contiene separatore, virgolette o a capo; se inizia con
 * `= + - @` o un tab/ritorno a capo il foglio di calcolo la leggerebbe come formula, quindi
 * si antepone un apice.
 */
function cell(value: string): string {
	const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
	return /[;"\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/**
 * CSV per Excel/LibreOffice in italiano: separatore `;`, BOM UTF-8 (senza, Excel rovina gli
 * accenti), fine riga CRLF. Prima le registrazioni, poi i totali per cliente e il totale generale.
 */
export function buildCsv(rows: EntryView[]): string {
	const summary = summarizeReport(rows);
	const line = (cols: string[]) => cols.map(cell).join(';');

	const lines = [line(['Data', 'Cliente', 'Attività', 'Minuti', 'Ore'])];
	for (const row of rows) {
		lines.push(
			line([
				row.day,
				row.clientName,
				row.activity,
				String(row.durationMinutes),
				formatHoursDecimal(row.durationMinutes)
			])
		);
	}

	lines.push('');
	for (const client of summary.byClient) {
		lines.push(
			line([
				'Totale',
				client.clientName,
				'',
				String(client.minutes),
				formatHoursDecimal(client.minutes)
			])
		);
	}
	lines.push(
		line([
			'Totale',
			'Tutti i clienti',
			'',
			String(summary.totalMinutes),
			formatHoursDecimal(summary.totalMinutes)
		])
	);

	return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** Query string dei parametri del periodo (`dal`, `al`, `cliente`): date e numeri, niente da codificare. */
export function periodQuery(period: ReportPeriod): string {
	const client = period.clientId === null ? '' : `&cliente=${period.clientId}`;
	return `dal=${period.from}&al=${period.to}${client}`;
}
