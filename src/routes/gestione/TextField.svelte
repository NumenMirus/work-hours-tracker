<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'class' | 'type'> {
		id: string;
		label: string;
		value?: string;
		error?: string | null;
	}

	let { id, label, value = $bindable(''), error = null, ...rest }: Props = $props();

	const errorId = $derived(`${id}-error`);
	const described = $derived(error ? errorId : undefined);
</script>

<div class="field">
	<label for={id}>{label}</label>
	<input
		{id}
		type="text"
		autocomplete="off"
		bind:value
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={described || undefined}
		class:invalid={error !== null}
		{...rest}
	/>
	{#if error}
		<p class="error" id={errorId}>{error}</p>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	label {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--muted);
	}

	input {
		width: 100%;
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		background: var(--surface);
		color: var(--ink);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-size: var(--text-base);
		transition:
			border-color var(--dur-fast) var(--ease-out),
			background-color var(--dur-fast) var(--ease-out);
	}

	input::placeholder {
		color: var(--muted);
	}

	input:hover {
		background: var(--surface-2);
	}

	input:focus-visible {
		border-color: var(--primary);
	}

	input.invalid {
		border-color: var(--danger);
	}

	.error {
		font-size: var(--text-sm);
		color: var(--danger);
	}
</style>
