const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `true` se la stringa è un giorno `YYYY-MM-DD` reale nel calendario. */
export function isValidDay(value: string): boolean {
	const match = DAY_RE.exec(value);
	if (!match) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (month < 1 || month > 12 || day < 1 || day > 31) return false;
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
}

/** Aritmetica sui giorni in UTC, così il fuso non sposta mai la data. */
export function addDays(day: string, amount: number): string {
	const match = DAY_RE.exec(day);
	if (!match) throw new Error(`Giorno non valido: ${day}`);
	const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	date.setUTCDate(date.getUTCDate() + amount);
	return date.toISOString().slice(0, 10);
}

/** Il giorno corrente nel fuso indicato, in formato `YYYY-MM-DD`. */
export function todayIn(timeZone: string): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

/** Etichetta lunga in italiano; l'anno compare solo se diverso da quello di `today`. */
export function formatDayLabel(day: string, today: string): string {
	const match = DAY_RE.exec(day);
	if (!match) throw new Error(`Giorno non valido: ${day}`);
	const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	const label = new Intl.DateTimeFormat('it-IT', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC'
	}).format(date);

	const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
	const todayMatch = DAY_RE.exec(today);
	if (todayMatch && todayMatch[1] !== match[1]) return `${capitalized} ${match[1]}`;
	return capitalized;
}
