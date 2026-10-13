<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';

	const status = $derived(page.status);

	const title = $derived(
		status === 404
			? 'Pagina non trovata'
			: status === 403
				? 'Richiesta rifiutata'
				: status >= 500
					? 'Qualcosa non ha funzionato'
					: 'Richiesta non valida'
	);

	const hint = $derived(
		status === 404
			? 'Il link potrebbe essere sbagliato o la pagina non esiste più.'
			: status === 403
				? "Apri l'app dall'indirizzo HTTPS configurato nel reverse proxy e riprova."
				: status >= 500
					? 'È un errore del server. Riprova tra qualche istante; se continua, guarda i log: journalctl -u registro-ore.'
					: page.error?.message
	);
</script>

<svelte:head>
	<title>{title} · Registro ore</title>
</svelte:head>

<section class="error" aria-labelledby="error-title">
	<p class="code num">Errore {status}</p>
	<h1 id="error-title">{title}</h1>
	<p class="hint">{hint}</p>
	<div class="actions">
		<a class="back" href={resolve('/')}>Torna alla giornata</a>
		{#if status >= 500}
			<Button type="button" variant="secondary" onclick={() => location.reload()}>Riprova</Button>
		{/if}
	</div>
</section>

<style>
	.error {
		max-width: 46ch;
		margin: var(--space-8) auto;
		padding: 0 var(--space-4);
	}

	.code {
		font-size: var(--text-sm);
		color: var(--muted);
	}

	h1 {
		margin-top: var(--space-1);
		font-size: var(--text-xl);
		line-height: var(--text-xl-lh);
		font-weight: 600;
		text-wrap: balance;
	}

	.hint {
		margin-top: var(--space-3);
		color: var(--muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		margin-top: var(--space-5);
	}

	.back {
		display: inline-flex;
		align-items: center;
		min-height: var(--control-h);
		padding: 0 var(--space-4);
		border-radius: var(--radius-sm);
		background: var(--primary);
		color: var(--primary-ink);
		font-size: var(--text-sm);
		font-weight: 500;
		text-decoration: none;
	}

	.back:active {
		background: var(--primary-hover);
	}

	@media (hover: hover) {
		.back:hover {
			background: var(--primary-hover);
		}
	}
</style>
