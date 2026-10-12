<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import type { Client } from '#lib/types.js';
	import { withToast } from '#lib/enhance.js';
	import { onSuccess } from './onSuccess.js';
	import Button from '#lib/components/Button.svelte';
	import DurationField from '#lib/components/DurationField.svelte';

	interface Props {
		day: string;
		clients: Client[];
		suggestions: string[];
		defaultClientId: number | null;
		form: { action?: string; error?: string; field?: string } | null;
	}

	let { day, clients, suggestions, defaultClientId, form }: Props = $props();

	let activity = $state('');
	let duration = $state('');
	// Finché l'utente non sceglie, il cliente segue i dati (ultimo registrato o primo attivo).
	let chosenClientId = $state<number | null>(null);
	const clientId = $derived(chosenClientId ?? defaultClientId);

	function chooseClient(event: Event) {
		chosenClientId = Number((event.currentTarget as HTMLSelectElement).value);
	}

	const error = $derived(form?.action === 'addManual' ? (form.error ?? null) : null);
	const fieldError = (field: string) => (error && form?.field === field ? error : null);

	// Dopo l'invio restano il cliente scelto: solo attività e durata si azzerano.
	const enhanceManual = (): SubmitFunction =>
		onSuccess(withToast({ reset: false }), () => {
			activity = '';
			duration = '';
		});
</script>

<section aria-labelledby="manual-title">
	<h2 id="manual-title">Inserimento manuale</h2>

	<form method="POST" action={`?d=${day}&/addManual`} class="row" use:enhance={enhanceManual()}>
		<input type="hidden" name="day" value={day} />

		<div class="client">
			<label for="manual-client">Cliente</label>
			<select
				id="manual-client"
				name="clientId"
				value={clientId ?? ''}
				onchange={chooseClient}
				required
				aria-invalid={fieldError('clientId') ? 'true' : undefined}
				aria-describedby={fieldError('clientId') ? 'manual-client-error' : undefined}
			>
				{#each clients as client (client.id)}
					<option value={client.id}>{client.name}</option>
				{/each}
			</select>
			{#if fieldError('clientId')}
				<p class="error" id="manual-client-error">{error}</p>
			{/if}
		</div>

		<div class="activity">
			<label for="manual-activity">Attività</label>
			<input
				id="manual-activity"
				name="activity"
				type="text"
				autocomplete="off"
				list="activity-suggestions"
				maxlength="120"
				required
				bind:value={activity}
				aria-invalid={fieldError('activity') ? 'true' : undefined}
				aria-describedby={fieldError('activity') ? 'manual-activity-error' : undefined}
			/>
			<datalist id="activity-suggestions">
				{#each suggestions as suggestion (suggestion)}
					<option value={suggestion}></option>
				{/each}
			</datalist>
			{#if fieldError('activity')}
				<p class="error" id="manual-activity-error">{error}</p>
			{/if}
		</div>

		<div class="duration">
			<DurationField
				id="manual-duration"
				name="duration"
				label="Durata"
				bind:value={duration}
				error={fieldError('duration')}
			/>
		</div>

		<div class="submit">
			<Button type="submit" variant="primary">Aggiungi</Button>
		</div>
	</form>
</section>

<style>
	h2 {
		font-size: var(--text-lg);
		margin-bottom: var(--space-3);
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: var(--space-3);
	}

	.client,
	.activity {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		flex: 1 1 160px;
		min-width: 0;
	}

	.activity {
		flex: 2 1 220px;
	}

	label {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--muted);
	}

	select,
	input[type='text'] {
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

	select:hover,
	input[type='text']:hover {
		background: var(--surface-2);
	}

	select:focus-visible,
	input[type='text']:focus-visible {
		border-color: var(--primary);
	}

	select[aria-invalid='true'],
	input[aria-invalid='true'] {
		border-color: var(--danger);
	}

	/* Il campo durata ha una label propria: resta stretto e con l'etichetta sopra. */
	.duration {
		flex: 0 0 auto;
	}

	.duration :global(input) {
		width: 17ch;
	}

	/* Il bottone è allineato in fondo alla riga: la sua altezza è quella del campo vicino. */
	.submit {
		align-self: flex-end;
	}

	.error {
		font-size: var(--text-sm);
		color: var(--danger);
	}
</style>
