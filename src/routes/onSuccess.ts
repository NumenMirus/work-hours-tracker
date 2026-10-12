import type { SubmitFunction } from '$app/forms';

/**
 * Compone un `SubmitFunction` con un effetto da eseguire **solo** sul risultato di successo,
 * mantenendo l'ordine: prima l'effetto, poi `next` (che mostra il toast e fa il reload).
 *
 * Serve perché `withToast()` può restituire una `Promise`: per usarla in un form è
 * necessario attenderla prima di poter richiamare la callback con `opts`.
 */
export function onSuccess(base: SubmitFunction, effect: () => void): SubmitFunction {
	return async (input) => {
		const next = await base(input);
		if (!next) return;
		return async (opts) => {
			if (opts.result.type === 'success') effect();
			await next(opts);
		};
	};
}
