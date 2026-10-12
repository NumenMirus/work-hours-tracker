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

	@media (pointer: coarse) {
		.btn {
			min-height: var(--control-h-coarse);
		}
	}

	.btn:active:not(:disabled) {
		transform: translateY(1px);
	}

	.btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.primary {
		background: var(--primary);
		color: var(--primary-ink);
		border-color: var(--primary);
	}

	.primary:hover:not(:disabled) {
		background: var(--primary-hover);
		border-color: var(--primary-hover);
	}

	.secondary {
		background: var(--surface);
		color: var(--ink);
		border-color: var(--border-strong);
	}

	.secondary:hover:not(:disabled) {
		background: var(--surface-2);
	}

	.ghost {
		background: transparent;
		color: var(--muted);
	}

	.ghost:hover:not(:disabled) {
		background: var(--surface-2);
		color: var(--ink);
	}

	.danger {
		background: var(--danger);
		color: var(--primary-ink);
		border-color: var(--danger);
	}

	/* Il mix con `--ink` scurisce in tema chiaro e illumina in tema scuro: l'hover va
	   sempre nella direzione della luce, senza perdere il contrasto con `--primary-ink`. */
	.danger:hover:not(:disabled) {
		background: color-mix(in oklch, var(--danger) 85%, var(--ink));
		border-color: color-mix(in oklch, var(--danger) 85%, var(--ink));
	}
</style>
