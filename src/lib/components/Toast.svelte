<script lang="ts">
	import { fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { enhance } from '$app/forms';
	import {
		toastState,
		dismissToast,
		pauseToastTimer,
		resumeToastTimer
	} from '#lib/toast.svelte.js';

	const duration = () => (prefersReducedMotion.current ? 0 : 200);
</script>

<!-- Contenitore sempre montato: `role="status"` annuncia il cambio di testo senza toccare il focus. -->
<div class="toast-region" role="status" aria-live="polite">
	{#if toastState.current}
		{@const toast = toastState.current}
		<!-- svelte-ignore a11y_no_static_element_interactions -- il toast non è interattivo: i gestori servono solo a sospendere il timer di chiusura mentre lo si legge. -->
		<div
			class="toast"
			transition:fly={{ y: 8, duration: duration() }}
			onmouseenter={pauseToastTimer}
			onmouseleave={resumeToastTimer}
			onfocusin={pauseToastTimer}
			onfocusout={(event) => {
				// Riprendi solo quando il focus esce davvero dal toast, non quando passa fra i suoi figli.
				const next = event.relatedTarget;
				if (next instanceof Node && event.currentTarget.contains(next)) return;
				resumeToastTimer();
			}}
		>
			<span class="message">{toast.message}</span>
			{#if toast.action}
				<form
					method="POST"
					action={toast.action.formAction}
					class="action"
					use:enhance={() =>
						async ({ update }) => {
							dismissToast();
							await update();
						}}
				>
					<input type="hidden" name="id" value={toast.action.entryId} />
					<button type="submit">{toast.action.label}</button>
				</form>
			{/if}
		</div>
	{/if}
</div>

<style>
	.toast-region {
		position: fixed;
		z-index: var(--z-toast);
		inset: auto var(--space-4) var(--space-4);
		display: flex;
		justify-content: center;
		pointer-events: none;
	}

	.toast {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: var(--space-4);
		max-width: 100%;
		padding: var(--space-3) var(--space-4);
		background: var(--ink);
		color: var(--bg);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-toast);
		font-size: var(--text-sm);
	}

	.message {
		min-width: 0;
	}

	.action {
		flex: none;
	}

	.action button {
		font-weight: 600;
		color: var(--bg);
		text-decoration: underline;
		text-underline-offset: 2px;
		min-height: var(--control-h);
	}

	@media (min-width: 960px) {
		.toast-region {
			inset: auto var(--space-5) var(--space-5) auto;
			justify-content: flex-end;
		}

		.toast {
			width: 360px;
		}
	}
</style>
