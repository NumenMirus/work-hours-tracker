<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import ConfirmButton from '#lib/components/ConfirmButton.svelte';
	import DurationField from '#lib/components/DurationField.svelte';
	import { formatDuration, formatDurationInput } from '#lib/duration.js';
	import type { QuickTask } from '#lib/types.js';
	import TextField from './TextField.svelte';

	interface Props {
		task: QuickTask;
		/** Errore dell'action su questa riga, mostrato sotto la riga. */
		error: string | null;
		/** Campo indicato dall'errore: `name` o `duration`. */
		field?: string | null;
	}

	let { task, error, field = null }: Props = $props();

	let editing = $state(false);
	let name = $state('');
	let duration = $state('');

	const nameError = $derived(field === 'name' ? error : null);
	const durationError = $derived(field === 'duration' ? error : null);
	// Un errore che punta a un campo va dentro quel campo; senza form aperto (pagina ricaricata
	// dopo un invio senza JavaScript) l'errore va comunque mostrato, sulla riga.
	const rowError = $derived(error && (!field || !editing) ? error : null);

	function open() {
		name = task.name;
		duration = formatDurationInput(task.durationMinutes);
		editing = true;
	}

	/** Alla riuscita il form si chiude: la riga mostra già i valori nuovi. */
	const save: SubmitFunction =
		() =>
		async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') editing = false;
		};

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && editing) {
			event.preventDefault();
			editing = false;
		}
	}
</script>

<li class="row">
	{#if editing}
		<form method="POST" action="?/updateTask" class="edit" use:enhance={save}>
			<input type="hidden" name="id" value={task.id} />
			<TextField
				id="task-{task.id}-name"
				name="name"
				label="Nome"
				bind:value={name}
				error={nameError}
				maxlength={80}
				required
				onkeydown={onKeydown}
			/>
			<div class="duration-cell">
				<DurationField
					id="task-{task.id}-duration"
					name="duration"
					label="Durata"
					bind:value={duration}
					error={durationError}
					required
					onkeydown={onKeydown}
				/>
			</div>
			<p class="client" id="task-{task.id}-client">Cliente: {task.clientName}</p>
			<div class="actions">
				<Button type="submit" variant="primary">Salva</Button>
				<Button variant="ghost" onclick={() => (editing = false)}>Annulla</Button>
			</div>
		</form>
	{:else}
		<div class="summary">
			<span class="name">{task.name}</span>
			<span class="duration num">+{formatDuration(task.durationMinutes)}</span>
		</div>
		<div class="actions">
			<Button onclick={open} aria-label="Modifica {task.name}">Modifica</Button>
			<ConfirmButton
				label="Elimina"
				formAction="?/deleteTask"
				id={task.id}
				ariaLabel="Elimina {task.name}"
			/>
		</div>
	{/if}
	{#if rowError}
		<p class="error">{rowError}</p>
	{/if}
</li>

<style>
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3) var(--space-4);
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.row:last-child {
		border-bottom: none;
	}

	.summary {
		display: flex;
		flex: 1 1 16rem;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-2) var(--space-3);
		min-width: 0;
	}

	.name {
		font-weight: 500;
	}

	.duration {
		font-weight: 600;
		color: var(--primary);
	}

	.edit {
		display: flex;
		flex: 1 1 100%;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-3) var(--space-4);
	}

	.edit :global(.field) {
		flex: 1 1 12rem;
	}

	.duration-cell {
		flex: 0 0 10ch;
	}

	.client {
		flex: 0 1 auto;
		padding-bottom: var(--space-3);
		font-size: var(--text-sm);
		color: var(--muted);
	}

	.actions {
		display: flex;
		flex: none;
		align-items: center;
		gap: var(--space-2);
		margin-left: auto;
	}

	.edit .actions {
		margin-left: 0;
	}

	.error {
		flex: 1 0 100%;
		font-size: var(--text-sm);
		color: var(--danger);
	}
</style>
