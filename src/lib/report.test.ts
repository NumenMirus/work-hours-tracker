import { describe, expect, it } from 'vitest';
import { buildCsv, currentMonth, parsePeriod, previousMonth, summarizeReport } from './report.js';
import type { EntryView } from './types.js';

function entry(partial: Partial<EntryView> & Pick<EntryView, 'id' | 'day'>): EntryView {
	return {
		clientId: 1,
		clientName: 'Rossi',
		activity: 'Assistenza',
		durationMinutes: 20,
		source: 'quick',
		measuredMinutes: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		...partial
	};
}

describe('parsePeriod', () => {
	const today = '2026-10-14';

	it('senza parametri usa il mese in corso fino a oggi', () => {
		const { period, error } = parsePeriod(new URLSearchParams(), today);
		expect(period).toEqual({ from: '2026-10-01', to: '2026-10-14', clientId: null });
		expect(error).toBeNull();
	});

	it('legge periodo e cliente, ignora valori non validi', () => {
		const ok = parsePeriod(new URLSearchParams('dal=2026-09-01&al=2026-09-30&cliente=7'), today);
		expect(ok.period).toEqual({ from: '2026-09-01', to: '2026-09-30', clientId: 7 });

		const bad = parsePeriod(new URLSearchParams('dal=2026-02-30&al=boh&cliente=abc'), today);
		expect(bad.period).toEqual({ from: '2026-10-01', to: '2026-10-14', clientId: null });
	});

	it('con estremi invertiti torna al mese in corso e segnala l’errore', () => {
		const { period, error } = parsePeriod(
			new URLSearchParams('dal=2026-09-30&al=2026-09-01'),
			today
		);
		expect(period.from).toBe('2026-10-01');
		expect(error).not.toBeNull();
	});
});

describe('mesi', () => {
	it('mese scorso per intero, anche a cavallo d’anno e in anno bisestile', () => {
		expect(previousMonth('2026-10-14')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
		expect(previousMonth('2026-01-05')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
		expect(previousMonth('2024-03-10')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
		expect(currentMonth('2026-10-14')).toEqual({ from: '2026-10-01', to: '2026-10-14' });
	});
});

describe('summarizeReport', () => {
	it('somma per cliente e per giorno senza perdere minuti', () => {
		const rows = [
			entry({ id: 1, day: '2026-10-01', durationMinutes: 20 }),
			entry({ id: 2, day: '2026-10-01', clientId: 2, clientName: 'Bianchi', durationMinutes: 40 }),
			entry({ id: 3, day: '2026-10-02', durationMinutes: 60 })
		];
		const summary = summarizeReport(rows);
		expect(summary.totalMinutes).toBe(120);
		expect(summary.byClient.map((c) => [c.clientName, c.minutes])).toEqual([
			['Bianchi', 40],
			['Rossi', 80]
		]);
		expect(summary.byDay.map((d) => [d.day, d.minutes, d.entries.length])).toEqual([
			['2026-10-01', 60, 2],
			['2026-10-02', 60, 1]
		]);
	});
});

describe('buildCsv', () => {
	it('produce BOM, separatore ;, CRLF, ore decimali con virgola e totali', () => {
		const csv = buildCsv([
			entry({ id: 1, day: '2026-10-01', durationMinutes: 80 }),
			entry({ id: 2, day: '2026-10-02', clientId: 2, clientName: 'Bianchi', durationMinutes: 15 })
		]);
		expect(csv.startsWith('\uFEFFData;Cliente;Attività;Minuti;Ore\r\n')).toBe(true);
		const lines = csv.slice(1).split('\r\n');
		expect(lines[1]).toBe('2026-10-01;Rossi;Assistenza;80;1,33');
		expect(lines).toContain('Totale;Bianchi;;15;0,25');
		expect(lines).toContain('Totale;Tutti i clienti;;95;1,58');
	});

	it('protegge dalle formule e dal separatore dentro i testi', () => {
		const csv = buildCsv([
			entry({ id: 1, day: '2026-10-01', activity: '=SOMMA(A1)' }),
			entry({ id: 2, day: '2026-10-01', activity: 'Rossi; "urgente"' })
		]);
		expect(csv).toContain(";'=SOMMA(A1);");
		expect(csv).toContain(';"Rossi; ""urgente""";');
	});
});
