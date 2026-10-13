import { tick } from 'svelte';
import type { SubmitFunction } from '$app/forms';
import { showToast } from '#lib/toast.svelte.js';
import type { ToastData } from '#lib/toast.svelte.js';

interface ActionResponse {
	toast?: ToastData;
}

/**
 * Dove va il focus dopo l'invio, quando l'utente stava usando la tastiera.
 * - `self`: sul bottone che ha inviato il form (default).
 * - `next`: il form sta in una riga che può sparire (eliminazione): sulla riga vicina,
 *   oppure sul titolo della sezione se non ce ne sono più.
 * - `none`: non toccare il focus.
 */
type FocusTarget = 'self' | 'next' | 'none';

const FOCUSABLE = 'button, a[href], input:not([type="hidden"]), select, textarea';

/**
 * SvelteKit riporta il focus su `body` dopo ogni azione: chi naviga da tastiera dovrebbe
 * ripartire dall'inizio della pagina a ogni registrazione. Qui si memorizza dove stava il
 * focus prima dell'invio e lo si rimette lì a risposta ricevuta. Con mouse o touch il focus
 * non era nel form, quindi non si forza nulla.
 */
function planFocus(
	form: HTMLFormElement,
	submitter: HTMLElement | null,
	target: FocusTarget
): () => void {
	if (target === 'none' || !form.contains(document.activeElement)) return () => {};

	const origin = submitter ?? (document.activeElement as HTMLElement | null);
	const row = form.closest('li');
	const neighbours = [row?.nextElementSibling, row?.previousElementSibling];
	const section = form.closest('section');

	return () => {
		if (target === 'self') {
			if (origin?.isConnected) origin.focus({ preventScroll: true });
			return;
		}
		for (const neighbour of neighbours) {
			const next = neighbour?.isConnected ? neighbour.querySelector<HTMLElement>(FOCUSABLE) : null;
			if (next) {
				next.focus();
				return;
			}
		}
		const heading = section?.querySelector<HTMLElement>('h2');
		if (heading) {
			heading.tabIndex = -1;
			heading.focus();
		}
	};
}

/**
 * `use:enhance` di default per i form dell'app: mostra il toast restituito dall'action,
 * segnala gli errori del server (o l'assenza di rete) e poi lascia fare a `update()` il lavoro
 * (reset + reload) rimettendo il focus dove l'utente lo aveva.
 * Gli errori di validazione restano inline nella pagina, quindi non generano toast.
 */
export function withToast(opts: { reset?: boolean; focus?: FocusTarget } = {}): SubmitFunction {
	return ({ formElement, submitter }) => {
		const restoreFocus = planFocus(formElement, submitter, opts.focus ?? 'self');
		return async ({ result, update }) => {
			if (result.type === 'success') {
				const toast = (result.data as ActionResponse | undefined)?.toast;
				if (toast) showToast(toast);
			} else if (result.type === 'error') {
				showToast({
					message:
						typeof navigator !== 'undefined' && !navigator.onLine
							? 'Non salvato: sei offline. Riprova quando torna la connessione.'
							: 'Non salvato: errore del server. Riprova.'
				});
			}
			await update({ reset: opts.reset ?? true });
			await tick();
			restoreFocus();
		};
	};
}
