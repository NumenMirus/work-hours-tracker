<script lang="ts">
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>Accesso · Registro ore</title>
</svelte:head>

<main class="login">
	<form method="POST" class="card">
		<h1>Registro ore</h1>
		<p class="hint">Accesso riservato. Inserisci la password per entrare.</p>

		<div class="field">
			<label for="password">Password</label>
			<!-- Pagina con un solo campo: il focus iniziale è l'azione attesa. -->
			<!-- svelte-ignore a11y_autofocus -->
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
				autofocus
				aria-invalid={form?.error ? 'true' : undefined}
				aria-describedby={form?.error ? 'password-error' : undefined}
			/>
			{#if form?.error}
				<p id="password-error" class="error" aria-live="polite">{form.error}</p>
			{/if}
		</div>

		<button type="submit" class="btn btn-primary">Entra</button>
	</form>
</main>

<style>
	.login {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: var(--space-5);
	}

	.card {
		width: 100%;
		max-width: 380px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-6);
	}

	h1 {
		margin: 0;
		font-size: var(--text-xl);
		line-height: var(--text-xl-lh);
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--ink);
	}

	.hint {
		margin: var(--space-2) 0 0;
		font-size: var(--text-sm);
		line-height: var(--text-sm-lh);
		color: var(--muted);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-top: var(--space-5);
	}

	label {
		font-size: var(--text-sm);
		line-height: var(--text-sm-lh);
		font-weight: 500;
		color: var(--ink);
	}

	input {
		width: 100%;
		height: var(--control-h);
		padding: 0 var(--space-3);
		font: inherit;
		color: var(--ink);
		background: var(--bg);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
	}

	input:hover {
		border-color: var(--ink);
	}

	.error {
		margin: 0;
		font-size: var(--text-sm);
		line-height: var(--text-sm-lh);
		color: var(--danger);
	}

	.btn {
		width: 100%;
		margin-top: var(--space-5);
		height: var(--control-h);
		font: inherit;
		font-weight: 500;
		color: var(--primary-ink);
		background: var(--primary);
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background-color var(--dur-fast) var(--ease-out);
	}

	@media (hover: hover) {
		.btn:hover {
			background: var(--primary-hover);
		}
	}

	.btn:active {
		background: var(--primary-hover);
	}
</style>
