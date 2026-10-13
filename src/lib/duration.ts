/** Limite di una singola registrazione o task: 24 ore. */
export const MAX_DURATION_MINUTES = 1440;

/** Messaggio d'errore unico per i campi durata. */
export const DURATION_ERROR =
	'Durata non valida. Scrivi i minuti (20) oppure ore e minuti (1:30 o 1h30), al massimo 24 h.';

/**
 * Converte un testo in minuti. Accetta `90`, `1:30`, `1h30`, `1.5h`, `45m`.
 * Ritorna `null` se il testo non è valido o il risultato è fuori da 1–1440.
 */
export function parseDuration(input: string): number | null {
	const raw = input.trim().toLowerCase().replace(/\s+/g, '');
	if (!raw) return null;

	let minutes: number;
	let match: RegExpExecArray | null;

	if ((match = /^(\d+)$/.exec(raw))) {
		minutes = Number(match[1]);
	} else if ((match = /^(\d+):([0-5]\d)$/.exec(raw))) {
		minutes = Number(match[1]) * 60 + Number(match[2]);
	} else if ((match = /^(\d+)h(\d{1,2})(?:m|min)?$/.exec(raw))) {
		const remainder = Number(match[2]);
		if (remainder > 59) return null;
		minutes = Number(match[1]) * 60 + remainder;
	} else if ((match = /^(\d+(?:[.,]\d+)?)h$/.exec(raw))) {
		minutes = Math.round(Number(match[1].replace(',', '.')) * 60);
	} else if ((match = /^(\d+)(?:m|min)$/.exec(raw))) {
		minutes = Number(match[1]);
	} else {
		return null;
	}

	if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_DURATION_MINUTES) return null;
	return minutes;
}

/**
 * `90` → `1 h 30 min`. Il numero e la sua unità sono legati da uno spazio non separabile
 * (U+00A0): "1 h" e "30 min" non si spezzano mai a capo, il testo può andare a capo solo fra
 * le due quantità.
 */
export function formatDuration(minutes: number): string {
	const total = Math.max(0, Math.round(minutes));
	if (total === 0) return '0\u00a0min';
	const h = Math.floor(total / 60);
	const m = total % 60;
	if (h === 0) return `${m}\u00a0min`;
	if (m === 0) return `${h}\u00a0h`;
	return `${h}\u00a0h ${m}\u00a0min`;
}

/** Valore da usare per precompilare un campo durata: `90` → `1:30`, `20` → `20`. */
export function formatDurationInput(minutes: number): string {
	const total = Math.max(0, Math.round(minutes));
	if (total < 60) return String(total);
	const h = Math.floor(total / 60);
	const m = total % 60;
	return `${h}:${String(m).padStart(2, '0')}`;
}
