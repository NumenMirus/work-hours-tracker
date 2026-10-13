<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import ConfirmButton from '#lib/components/ConfirmButton.svelte';
	import { withToast } from '#lib/enhance.js';
	import type { ClientWithUsage } from '#lib/server/repo.js';
	import TextField from './TextField.svelte';

	interface Props {
		client: ClientWithUsage;
		/** Errore dell'action su questa riga: `in_use` sull'eliminazione, `duplicate` sulla rinomina. */
		error: string | null;
		field?: string | null;
	}

	let { client, error, field = null }: Props = $props();

	let editing = $state(false);
	let name = $state('');

	const nameError = $derived(field === 'name' ? error : null);
	// Come per le task: senza il form aperto l'errore di rinomina resta visibile sulla riga.
	const rowError = $derived(error && (!field || !editing) ? error : null);

	function open() {
		name = client.name;
		editing = true;
	}

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

<li class="row" class:archived={client.archived}>
	{#if editing}
		<form method="POST" action="?/renameClient" class="edit" use:enhance={save}>
			<input type="hidden" name="id" value={client.id} />
			<TextField
				id="client-{client.id}-name"
				name="name"
				label="Nome cliente"
				bind:value={name}
				error={nameError}
				maxlength={80}
				required
				onkeydown={onKeydown}
			/>
			<div class="actions">
				<Button type="submit" variant="primary">Salva</Button>
				<Button variant="ghost" onclick={() => (editing = false)}>Annulla</Button>
			</div>
		</form>
	{:else}
		<div class="summary">
			<span class="name">{client.name}</span>
			{#if client.archived}
				<span class="tag">Archiviato</span>
			{/if}
			<span class="usage">
				{client.taskCount} task · {client.entryCount}
				{client.entryCount === 1 ? 'registrazione' : 'registrazioni'}
			</span>
		</div>
		<div class="actions">
			<Button onclick={open} aria-label="Rinomina {client.name}">Rinomina</Button>
			<form
				method="POST"
				action={client.archived ? '?/unarchiveClient' : '?/archiveClient'}
				use:enhance
			>
				<input type="hidden" name="id" value={client.id} />
				<Button type="submit">
					{client.archived ? 'Ripristina' : 'Archivia'}
				</Button>
			</form>
			<ConfirmButton
				label="Elimina"
				formAction="?/deleteClient"
				id={client.id}
				ariaLabel="Elimina {client.name}"
				confirmAriaLabel="Conferma eliminazione di {client.name}"
				onenhance={withToast({ focus: 'next', reset: false })}
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
		overflow-wrap: anywhere;
	}

	.archived .name {
		color: var(--muted);
	}

	.tag {
		padding: 0 var(--space-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		color: var(--muted);
	}

	.usage {
		font-size: var(--text-sm);
		color: var(--muted);
	}

	.edit {
		display: flex;
		flex: 1 1 100%;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-3) var(--space-4);
	}

	.edit :global(.field) {
		flex: 1 1 14rem;
	}

	.actions {
		display: flex;
		flex: none;
		align-items: center;
		gap: var(--space-2);
		margin-left: auto;
	}

	.error {
		flex: 1 0 100%;
		font-size: var(--text-sm);
		color: var(--danger);
	}
</style>
