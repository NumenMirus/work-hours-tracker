import { describe, expect, it } from 'vitest';
import {
	formatDuration,
	formatDurationInput,
	MAX_DURATION_MINUTES,
	parseDuration
} from '#lib/duration.js';

describe('parseDuration', () => {
	it('accetta minuti semplici', () => {
		expect(parseDuration('20')).toBe(20);
		expect(parseDuration('1')).toBe(1);
		expect(parseDuration(' 45 ')).toBe(45);
	});

	it('accetta h:mm', () => {
		expect(parseDuration('1:30')).toBe(90);
		expect(parseDuration('0:05')).toBe(5);
		expect(parseDuration('2:00')).toBe(120);
	});

	it('accetta 1h30 e 1h30m', () => {
		expect(parseDuration('1h30')).toBe(90);
		expect(parseDuration('1h30m')).toBe(90);
		expect(parseDuration('1H05MIN')).toBe(65);
	});

	it('accetta ore decimali', () => {
		expect(parseDuration('1.5h')).toBe(90);
		expect(parseDuration('1,5h')).toBe(90);
		expect(parseDuration('0.25h')).toBe(15);
	});

	it('accetta minuti con suffisso', () => {
		expect(parseDuration('30m')).toBe(30);
		expect(parseDuration('30min')).toBe(30);
	});

	it('rispetta i limiti 1 e 1440', () => {
		expect(parseDuration('1')).toBe(1);
		expect(parseDuration(String(MAX_DURATION_MINUTES))).toBe(MAX_DURATION_MINUTES);
		expect(parseDuration('24h')).toBe(MAX_DURATION_MINUTES);
	});

	it('rifiuta valori fuori range', () => {
		expect(parseDuration('0')).toBeNull();
		expect(parseDuration('0:00')).toBeNull();
		expect(parseDuration('1441')).toBeNull();
		expect(parseDuration('25h')).toBeNull();
		expect(parseDuration('-20')).toBeNull();
	});

	it('rifiuta formati non validi', () => {
		expect(parseDuration('1:60')).toBeNull();
		expect(parseDuration('1h60')).toBeNull();
		expect(parseDuration('abc')).toBeNull();
		expect(parseDuration('')).toBeNull();
		expect(parseDuration('20 minuti')).toBeNull();
		expect(parseDuration('1:2:3')).toBeNull();
	});
});

describe('formatDuration', () => {
	it('formatta le durate in italiano', () => {
		expect(formatDuration(0)).toBe('0\u00a0min');
		expect(formatDuration(20)).toBe('20\u00a0min');
		expect(formatDuration(60)).toBe('1\u00a0h');
		expect(formatDuration(80)).toBe('1\u00a0h 20\u00a0min');
		expect(formatDuration(1440)).toBe('24\u00a0h');
	});

	it('lega ogni numero alla sua unità: si può andare a capo solo fra le due quantità', () => {
		const text = formatDuration(80);
		expect(text.split(' ')).toEqual(['1\u00a0h', '20\u00a0min']);
	});
});

describe('formatDurationInput', () => {
	it('usa i minuti sotto l’ora e h:mm sopra', () => {
		expect(formatDurationInput(20)).toBe('20');
		expect(formatDurationInput(59)).toBe('59');
		expect(formatDurationInput(60)).toBe('1:00');
		expect(formatDurationInput(80)).toBe('1:20');
		expect(formatDurationInput(1440)).toBe('24:00');
	});
});
