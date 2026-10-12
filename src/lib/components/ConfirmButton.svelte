<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance, type SubmitFunction } from '$app/forms';
	import Button from './Button.svelte';

	interface Props {
		/** Etichetta del primo passo. */
		label: string;
		/** Etichetta del secondo passo. */
		confirmLabel?: string;
		/** Action del form a cui invia, es. `?d=2026-10-12&/deleteTask`. */
		formAction: string;
		/** Valore del campo nascosto `id`. */
		id: number;
		/** Secondi prima di tornare allo stato iniziale. */
		timeout?: number;
		variant?: 'danger' | 'ghost';
		ariaLabel?: string;
		class?: string;
		/** Campi nascosti aggiuntivi da passare al form. */
		children?: Snippet;
		/** `use:enhance` da applicare al form, tipicamente `withToast()`. */
		onenhance?: SubmitFunction;
	}

	let {
		label,
		confirmLabel = 'Conferma',
		formAction,
		id,
		timeout = 4,
		variant = 'ghost',
		ariaLabel = undefined,
		class: className = '',
		children,
		onenhance
	}: Props = $props();

	let confirming = $state(false);

	$effect(() => {
		if (!confirming) return;
		const timer = setTimeout(() => (confirming = false), timeout * 1000);
		return () => clearTimeout(timer);
	});
</script>

<!-- Eliminazione in due passi inline: il primo tocco arma, il secondo invia. Nessun modale. -->
<form
	method="POST"
	action={formAction}
	class="confirm {className}"
	use:enhance={(input) => {
		confirming = false;
		return onenhance?.(input);
	}}
>
	<input type="hidden" name="id" value={id} />
	{@render children?.()}
	<Button
		type={confirming ? 'submit' : 'button'}
		variant={confirming ? 'danger' : variant}
		aria-label={ariaLabel}
		onclick={() => (confirming = true)}
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
