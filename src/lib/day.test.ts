import { describe, expect, it } from 'vitest';
import { addDays, formatDayLabel, isValidDay, todayIn } from '#lib/day.js';

describe('isValidDay', () => {
	it('accetta giorni reali in formato YYYY-MM-DD', () => {
		expect(isValidDay('2026-10-12')).toBe(true);
		expect(isValidDay('2024-02-29')).toBe(true);
	});

	it('rifiuta formati e date impossibili', () => {
		expect(isValidDay('')).toBe(false);
		expect(isValidDay('12-10-2026')).toBe(false);
		expect(isValidDay('2026-13-01')).toBe(false);
		expect(isValidDay('2026-02-30')).toBe(false);
		expect(isValidDay('2025-02-29')).toBe(false);
		expect(isValidDay('2026-1-1')).toBe(false);
	});
});

describe('addDays', () => {
	it('sposta avanti e indietro', () => {
		expect(addDays('2026-10-12', 1)).toBe('2026-10-13');
		expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
		expect(addDays('2026-10-12', 0)).toBe('2026-10-12');
	});

	it('attraversa anno e ora legale senza slittamenti', () => {
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
		expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
	});

	it('ai bordi del calendario resta sul giorno di partenza invece di produrre una data non valida', () => {
		expect(addDays('9999-12-31', 1)).toBe('9999-12-31');
		expect(addDays('0100-01-01', -1)).toBe('0100-01-01');
		expect(isValidDay(addDays('9999-12-30', 1))).toBe(true);
	});
});

describe('todayIn', () => {
	it('restituisce il giorno nel fuso richiesto', () => {
		expect(todayIn('UTC')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(todayIn('Pacific/Kiritimati').length).toBe(10);
	});
});

describe('formatDayLabel', () => {
	it('scrive il giorno in italiano con lettera maiuscola', () => {
		expect(formatDayLabel('2026-10-12', '2026-10-12')).toBe('Lunedì 12 ottobre');
	});

	it('aggiunge l’anno solo se diverso da quello di oggi', () => {
		expect(formatDayLabel('2025-03-04', '2026-10-12')).toBe('Martedì 4 marzo 2025');
	});
});
