<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

	interface Props extends HTMLButtonAttributes {
		variant?: Variant;
		type?: 'button' | 'submit' | 'reset';
		children: Snippet;
	}

	let {
		variant = 'secondary',
		type = 'button',
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

<button {type} class="btn {variant} {className}" {...rest}>
	{@render children()}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: var(--control-h);
		padding: 0 var(--space-4);
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-weight: 500;
		line-height: 1;
		white-space: nowrap;
		transition:
			background-color var(--dur-fast) var(--ease-out),
			border-color var(--dur-fast) var(--ease-out),
			color var(--dur-fast) var(--ease-out),
			opacity var(--dur-fast) var(--ease-out),
			transform var(--dur-fast) var(--ease-out);
	}

	.btn:active:not(:disabled) {
		transform: translateY(1px);
	}

	.btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	/* In attesa di risposta ma ancora focalizzabile: l'invio è già stato scartato lato script. */
	.btn[aria-disabled='true'] {
		opacity: 0.7;
		cursor: progress;
	}

	.primary {
		background: var(--primary);
		color: var(--primary-ink);
		border-color: var(--primary);
	}

	/* Su touch :hover resta attaccato dopo il tocco: l'hover vale solo dove esiste, il feedback
	   di pressione (:active) vale ovunque. */
	.primary:active:not(:disabled) {
		background: var(--primary-hover);
		border-color: var(--primary-hover);
	}

	@media (hover: hover) {
		.primary:hover:not(:disabled) {
			background: var(--primary-hover);
			border-color: var(--primary-hover);
		}
	}

	.secondary {
		background: var(--surface);
		color: var(--ink);
		border-color: var(--border-strong);
	}

	.secondary:active:not(:disabled) {
		background: var(--surface-2);
	}

	@media (hover: hover) {
		.secondary:hover:not(:disabled) {
			background: var(--surface-2);
		}
	}

	.ghost {
		background: transparent;
		color: var(--muted);
	}

	.ghost:active:not(:disabled) {
		background: var(--surface-2);
		color: var(--ink);
	}

	@media (hover: hover) {
		.ghost:hover:not(:disabled) {
			background: var(--surface-2);
			color: var(--ink);
		}
	}

	.danger {
		background: var(--danger);
		color: var(--primary-ink);
		border-color: var(--danger);
	}

	/* Il mix con `--ink` scurisce in tema chiaro e illumina in tema scuro: l'hover va
	   sempre nella direzione della luce, senza perdere il contrasto con `--primary-ink`. */
	.danger:active:not(:disabled) {
		background: color-mix(in oklch, var(--danger) 85%, var(--ink));
		border-color: color-mix(in oklch, var(--danger) 85%, var(--ink));
	}

	@media (hover: hover) {
		.danger:hover:not(:disabled) {
			background: color-mix(in oklch, var(--danger) 85%, var(--ink));
			border-color: color-mix(in oklch, var(--danger) 85%, var(--ink));
		}
	}
</style>
