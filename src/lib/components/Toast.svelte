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

	let actionForm = $state<HTMLFormElement | null>(null);
	// La scorciatoia dipende dalla piattaforma. Il toast esiste solo dopo un'azione dell'utente,
	// cioè nel browser: non c'è rischio di discordanza con l'HTML renderizzato dal server.
	const shortcutHint = $derived(
		typeof navigator === 'undefined'
			? ''
			: /Mac|iPhone|iPad/.test(navigator.platform)
				? '⌘Z'
				: 'Ctrl+Z'
	);

	function isEditable(target: EventTarget | null): boolean {
		return (
			target instanceof HTMLElement &&
			(target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
		);
	}

	/**
	 * Ctrl/⌘+Z esegue l'azione del toast (Annulla/Ripristina) senza dover raggiungere il pulsante:
	 * da tastiera il toast è l'ultimo elemento della pagina e sparisce dopo pochi secondi.
	 * Dentro un campo di testo resta l'annullamento nativo del browser.
	 */
	function onWindowKeydown(event: KeyboardEvent) {
		if (!actionForm || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'z') return;
		if (!(event.ctrlKey || event.metaKey) || isEditable(event.target)) return;
		event.preventDefault();
		actionForm.requestSubmit();
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<!-- Contenitore sempre montato: `role="status"` annuncia il cambio di testo senza toccare il focus. -->
<div class="toast-region" role="status" aria-live="polite">
	{#if toastState.current}
		{@const toast = toastState.current}
		<!-- Il toast non è interattivo: i gestori servono solo a sospendere il timer di chiusura mentre lo si legge. -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
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
					bind:this={actionForm}
					method="POST"
					action={toast.action.formAction}
					class="action"
					use:enhance={() => {
						// Il focus era altrove (pagina o scorciatoia): dopo l'azione ci si torna.
						const previous = document.activeElement;
						return async ({ update }) => {
							dismissToast();
							await update();
							if (
								previous instanceof HTMLElement &&
								previous.isConnected &&
								previous !== document.body
							) {
								previous.focus({ preventScroll: true });
							}
						};
					}}
				>
					<input type="hidden" name="id" value={toast.action.entryId} />
					<button type="submit" aria-keyshortcuts="Control+Z Meta+Z">
						{toast.action.label}
						{#if shortcutHint}<span class="hint" aria-hidden="true">{shortcutHint}</span>{/if}
					</button>
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

	/* Promemoria della scorciatoia: inline-block per non ereditare la sottolineatura del bottone. */
	.hint {
		display: inline-block;
		margin-left: var(--space-2);
		font-weight: 400;
		font-size: var(--text-xs);
		text-decoration: none;
	}

	@media (hover: none) {
		.hint {
			display: none;
		}
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
