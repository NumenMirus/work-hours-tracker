<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Button from './Button.svelte';

	/** Tempo prima che lo stato "Conferma" torni a quello iniziale. */
	const CONFIRM_WINDOW_MS = 4000;
	interface Props {
		/** Etichetta del primo passo. */
		label: string;
		/** Etichetta del secondo passo. */
		confirmLabel?: string;
		/** Action del form a cui invia, es. `?d=2026-10-12&/deleteTask`. */
		formAction: string;
		/** Valore del campo nascosto `id`. */
		id: number;
		variant?: 'danger' | 'ghost';
		ariaLabel?: string;
		/** `use:enhance` da applicare al form, tipicamente `withToast()`. */
		onenhance?: SubmitFunction;
	}

	let {
		label,
		confirmLabel = 'Conferma',
		formAction,
		id,
		variant = 'ghost',
		ariaLabel = undefined,
		onenhance
	}: Props = $props();

	let confirming = $state(false);

	$effect(() => {
		if (!confirming) return;
		const timer = setTimeout(() => (confirming = false), CONFIRM_WINDOW_MS);
		return () => clearTimeout(timer);
	});
</script>

<!-- Eliminazione in due passi inline: il primo tocco arma, il secondo invia. Nessun modale. -->
<form
	method="POST"
	action={formAction}
	class="confirm"
	use:enhance={(input) => {
		confirming = false;
		return onenhance?.(input);
	}}
>
	<input type="hidden" name="id" value={id} />
	<Button
		type="button"
		variant={confirming ? 'danger' : variant}
		aria-label={ariaLabel}
		onclick={(event) => {
			if (!confirming) {
				confirming = true;
				return;
			}
			// Il tipo resta "button": cambiarlo a "submit" dentro lo stesso click farebbe partire
			// l'invio al primo tocco. Il secondo tocco invia esplicitamente.
			event.currentTarget.form?.requestSubmit();
		}}
	>
		{confirming ? confirmLabel : label}
	</Button>
</form>

<style>
	.confirm {
		display: inline-flex;
		align-items: center;
	}
</style>
