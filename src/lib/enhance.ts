import type { SubmitFunction } from '$app/forms';
import { showToast } from '#lib/toast.svelte.js';
import type { ToastData } from '#lib/toast.svelte.js';

interface ActionResponse {
	toast?: ToastData;
}

/**
 * `use:enhance` di default per i form dell'app: mostra il toast restituito dall'action,
 * segnala gli errori del server e poi lascia fare a `update()` il lavoro (reset + reload).
 * Gli errori di validazione restano inline nella pagina, quindi non generano toast.
 */
export function withToast(opts: { reset?: boolean } = {}): SubmitFunction {
	return () =>
		async ({ result, update }) => {
			if (result.type === 'success') {
				const toast = (result.data as ActionResponse | undefined)?.toast;
				if (toast) showToast(toast);
			} else if (result.type === 'error') {
				showToast({ message: 'Non salvato: errore del server. Riprova.' });
			}
			await update({ reset: opts.reset ?? true });
		};
}
