/**
 * Stato globale del toast: uno solo visibile alla volta, con chiusura automatica
 * e pausa su hover/focus.
 */

export interface ToastAction {
	/** Etichetta dell'azione, es. "Annulla" o "Ripristina". */
	label: string;
	/** Action a cui il form del toast invia, es. `?d=2026-10-12&/deleteEntry`. */
	formAction: string;
	/** Valore del campo nascosto `id` inviato dal form. */
	entryId: number;
}

export interface ToastData {
	message: string;
	action?: ToastAction;
}

export const TOAST_DURATION = 6000;

export const toastState = $state<{ current: ToastData | null }>({ current: null });

let timer: ReturnType<typeof setTimeout> | null = null;
let remaining = TOAST_DURATION;
let startedAt = 0;

function clearTimer() {
	if (timer !== null) {
		clearTimeout(timer);
		timer = null;
	}
}

export function showToast(data: ToastData): void {
	clearTimer();
	remaining = TOAST_DURATION;
	toastState.current = data;
	schedule();
}

export function dismissToast(): void {
	clearTimer();
	toastState.current = null;
}

/** Sospende la chiusura automatica (hover o focus dentro il toast). */
export function pauseToastTimer(): void {
	if (timer === null) return;
	clearTimer();
	remaining = Math.max(0, TOAST_DURATION - (Date.now() - startedAt));
}

/** Riprende la chiusura automatica con il tempo residuo. */
export function resumeToastTimer(): void {
	if (toastState.current === null || remaining <= 0) {
		dismissToast();
		return;
	}
	schedule();
}

function schedule(): void {
	startedAt = Date.now();
	timer = setTimeout(() => {
		timer = null;
		toastState.current = null;
	}, remaining);
}
