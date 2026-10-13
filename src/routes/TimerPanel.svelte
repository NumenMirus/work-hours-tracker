<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import type { Client, TimerState } from '#lib/types.js';
	import { withToast } from '#lib/enhance.js';
	import { onSuccess } from './onSuccess.js';
	import { formatDuration, formatDurationInput } from '#lib/duration.js';
	import Button from '#lib/components/Button.svelte';
	import ConfirmButton from '#lib/components/ConfirmButton.svelte';
	import DurationField from '#lib/components/DurationField.svelte';
	import RunningClock from '#lib/components/RunningClock.svelte';

	interface Props {
		timer: TimerState | null;
		/** Giorno mostrato, per capire se il timer conta su un giorno diverso. */
		day: string;
		/** Etichetta del giorno del timer quando è diverso da quello visualizzato. */
		timerDayLabel: string | null;
		clients: Client[];
		suggestions: string[];
		defaultClientId: number | null;
		form: { action?: string; error?: string; field?: string } | null;
	}

	let { timer, day, timerDayLabel, clients, suggestions, defaultClientId, form }: Props = $props();

	let starting = $state(false);
	let stopping = $state(false);
	// Finché l'utente non sceglie, il cliente segue i dati (ultimo registrato o primo attivo).
	let chosenClientId = $state<number | null>(null);
	const clientId = $derived(chosenClientId ?? defaultClientId);
	let activity = $state('');
	let duration = $state('');

	function chooseClient(event: Event) {
		chosenClientId = Number((event.currentTarget as HTMLSelectElement).value);
	}

	/** Istanti di inizio per calcolare i minuti misurati senza aspettare il reload. */
	const startedAtMs = $derived(timer ? Date.parse(timer.startedAt) : 0);

	let nowMs = $state(0);

	$effect(() => {
		if (!timer) return;
		const tick = () => (nowMs = Date.now());
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	});

	const measuredMinutes = $derived(
		nowMs === 0 ? 1 : Math.max(1, Math.round((nowMs - startedAtMs) / 60000))
	);

	const startError = $derived(form?.action === 'startTimer' ? (form.error ?? null) : null);
	const stopError = $derived(form?.action === 'stopTimer' ? (form.error ?? null) : null);
	const startFieldError = (field: string) =>
		startError && form?.field === field ? startError : null;

	/** "Ferma" non registra: rivela il form con la durata misurata, correggibile. */
	function revealStop() {
		stopping = true;
		duration = formatDurationInput(Math.min(measuredMinutes, 1440));
		starting = false;
	}

	function backToTimer() {
		stopping = false;
		duration = '';
	}

	const enhanceStart = (): SubmitFunction =>
		onSuccess(withToast({ reset: false }), () => {
			starting = false;
			activity = '';
		});
</script>

<section id="timer" aria-labelledby="timer-title">
	<h2 id="timer-title">Timer</h2>

	{#if timer}
		<div class="running">
			<div class="running-head">
				<span class="state">In corso</span>
				<span class="what">{timer.clientName} — {timer.activity}</span>
			</div>

			<RunningClock startedAt={timer.startedAt} size="lg" />

			{#if timerDayLabel}
				<p class="other-day">Conta per {timerDayLabel.toLowerCase()}</p>
			{/if}

			{#if stopping}
				<form
					method="POST"
					action={`?d=${day}&/stopTimer`}
					class="stop"
					use:enhance={withToast({ reset: false })}
				>
					<p class="measured">
						Tempo misurato: <span class="num">{formatDuration(measuredMinutes)}</span>
					</p>

					{#if measuredMinutes >= 180}
						<p class="warning">
							Il timer è attivo da {formatDuration(measuredMinutes)}: se l'hai dimenticato acceso,
							correggi la durata prima di registrare.
						</p>
					{/if}

					<DurationField
						id="stop-duration"
						name="duration"
						label="Durata da registrare"
						bind:value={duration}
						error={stopError}
					/>

					<div class="stop-actions">
						<Button type="submit" variant="primary">Registra</Button>
						<Button type="button" variant="ghost" onclick={backToTimer}>Torna al timer</Button>
					</div>
				</form>
			{:else}
				<div class="running-actions">
					<Button type="button" variant="primary" onclick={revealStop}>Ferma</Button>
					<ConfirmButton
						label="Scarta"
						confirmAriaLabel="Conferma: scarta il timer senza registrare"
						formAction={`?d=${day}&/discardTimer`}
						id={1}
						onenhance={withToast()}
					/>
				</div>
			{/if}
		</div>
	{:else if starting}
		<form method="POST" action={`?d=${day}&/startTimer`} class="start" use:enhance={enhanceStart()}>
			<div class="field">
				<label for="timer-client">Cliente</label>
				<select
					id="timer-client"
					name="clientId"
					value={clientId ?? ''}
					onchange={chooseClient}
					required
					aria-invalid={startFieldError('clientId') ? 'true' : undefined}
					aria-describedby={startFieldError('clientId') ? 'timer-client-error' : undefined}
				>
					{#each clients as client (client.id)}
						<option value={client.id}>{client.name}</option>
					{/each}
				</select>
				{#if startFieldError('clientId')}
					<p class="error" id="timer-client-error">{startError}</p>
				{/if}
			</div>

			<div class="field">
				<label for="timer-activity">Attività</label>
				<input
					id="timer-activity"
					name="activity"
					type="text"
					list="timer-suggestions"
					maxlength="120"
					required
					bind:value={activity}
					aria-invalid={startFieldError('activity') ? 'true' : undefined}
					aria-describedby={startFieldError('activity') ? 'timer-activity-error' : undefined}
				/>
				<datalist id="timer-suggestions">
					{#each suggestions as suggestion (suggestion)}
						<option value={suggestion}></option>
					{/each}
				</datalist>
				{#if startFieldError('activity')}
					<p class="error" id="timer-activity-error">{startError}</p>
				{/if}
			</div>

			<div class="start-actions">
				<Button type="submit" variant="primary">Avvia</Button>
				<Button type="button" variant="ghost" onclick={() => (starting = false)}>Annulla</Button>
			</div>
		</form>
	{:else}
		<div class="idle">
			<p class="hint">Misura un'attività mentre la fai. Ricordati di fermarlo.</p>
			<Button type="button" variant="secondary" onclick={() => (starting = true)}>
				Avvia timer…
			</Button>
		</div>
	{/if}
</section>

<style>
	h2 {
		font-size: var(--text-lg);
		margin-bottom: var(--space-3);
	}

	.hint {
		color: var(--muted);
		font-size: var(--text-sm);
		margin-bottom: var(--space-3);
	}

	/* Il pannello del timer è l'unica superficie ambra dell'app. */
	.running {
		padding: var(--space-4);
		background: var(--live-soft);
		border: 1px solid var(--live);
		border-radius: var(--radius-md);
	}

	.running-head {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-bottom: var(--space-2);
	}

	.state {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--live-text);
	}

	.what {
		font-weight: 500;
		color: var(--ink);
	}

	.other-day {
		margin-top: var(--space-1);
		font-size: var(--text-sm);
		color: var(--live-text);
	}

	.running-actions,
	.start-actions,
	.stop-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-4);
	}

	.stop {
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--live);
	}

	.measured {
		margin-bottom: var(--space-3);
		font-size: var(--text-sm);
		color: var(--ink);
	}

	.warning {
		margin-bottom: var(--space-3);
		font-size: var(--text-sm);
		color: var(--live-text);
	}

	.start {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: var(--space-3);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		flex: 1 1 160px;
		min-width: 0;
	}

	.field label {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--muted);
	}

	.field select,
	.field input {
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

	.field select:hover,
	.field input:hover {
		background: var(--surface-2);
	}

	.field select:focus-visible,
	.field input:focus-visible {
		border-color: var(--primary);
	}

	.field [aria-invalid='true'] {
		border-color: var(--danger);
	}

	.start-actions {
		flex-basis: 100%;
	}

	.error {
		font-size: var(--text-sm);
		color: var(--danger);
	}
</style>
