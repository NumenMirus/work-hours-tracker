<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import DurationField from '#lib/components/DurationField.svelte';
	import ClientRow from './ClientRow.svelte';
	import TaskRow from './TaskRow.svelte';
	import TextField from './TextField.svelte';
	import type { FormFailure } from './types.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Le action hanno due esiti (successo o fallimento): solo il fallimento porta un errore.
	const failure: FormFailure | null = $derived(
		form && 'error' in form && form.error
			? { action: form.action, error: form.error, field: form.field, id: form.id }
			: null
	);

	const hasClients = $derived(data.clients.length > 0);

	const activeClients = $derived(data.clients.filter((client) => !client.archived));

	/** Task raggruppate per cliente attivo, nell'ordine del load (cliente, poi task). */
	const activeGroups = $derived(
		data.clients
			.filter((client) => !client.archived)
			.map((client) => ({
				client,
				tasks: data.tasks.filter((task) => task.clientId === client.id)
			}))
			.filter((group) => group.tasks.length > 0)
	);

	/** Task dei clienti archiviati: non usabili in giornata, quindi dentro un `<details>`. */
	const archivedGroups = $derived(
		data.clients
			.filter((client) => client.archived)
			.map((client) => ({
				client,
				tasks: data.tasks.filter((task) => task.clientId === client.id)
			}))
			.filter((group) => group.tasks.length > 0)
	);

	// Un errore di riga vale solo per l'action e l'id che lo hanno prodotto.
	const errorFor = (action: string, id: number): string | null =>
		failure?.action === action && failure.id === id ? failure.error : null;

	const fieldFor = (action: string, id: number): string | null =>
		failure?.action === action && failure.id === id ? (failure.field ?? null) : null;

	const clientCreateError = $derived(failure?.action === 'createClient' ? failure.error : null);

	let clientName = $state('');
	let taskName = $state('');
	let taskDuration = $state('');

	// I campi dei form di creazione si svuotano solo al successo: in caso di errore
	// l'utente corregge quello che ha scritto senza riscriverlo.
	const createClient: SubmitFunction =
		() =>
		async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') clientName = '';
		};

	const createTask: SubmitFunction =
		() =>
		async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				taskName = '';
				taskDuration = '';
			}
		};
</script>

<svelte:head>
	<title>Gestione · Registro ore</title>
</svelte:head>

{#snippet clientForm()}
	<form method="POST" action="?/createClient" class="row" use:enhance={createClient}>
		<TextField
			id="new-client-name"
			name="name"
			label="Nuovo cliente"
			placeholder="es. Rossi"
			maxlength={80}
			required
			bind:value={clientName}
			error={clientCreateError}
		/>
		<Button type="submit" variant="primary">Crea cliente</Button>
	</form>
{/snippet}

{#snippet clientList()}
	<ul class="list">
		{#each data.clients as client (client.id)}
			<ClientRow
				{client}
				error={errorFor('renameClient', client.id) ??
					errorFor('deleteClient', client.id) ??
					errorFor('archiveClient', client.id) ??
					errorFor('unarchiveClient', client.id)}
				field={fieldFor('renameClient', client.id)}
			/>
		{/each}
	</ul>
{/snippet}

<div class="page">
	<!-- Senza anagrafica le task non hanno a chi appartenere: si parte dai clienti. -->
	{#if !hasClients}
		<section aria-labelledby="clients-heading">
			<h2 id="clients-heading">Clienti</h2>
			{@render clientForm()}
			<p class="empty">Nessun cliente. Creane uno: ogni task rapida appartiene a un cliente.</p>
		</section>

		<section aria-labelledby="tasks-heading">
			<h2 id="tasks-heading">Task rapide</h2>
			<p class="empty">Crea prima un cliente: ogni task rapida appartiene a un cliente.</p>
		</section>
	{:else}
		<section aria-labelledby="tasks-heading">
			<h2 id="tasks-heading">Task rapide</h2>
			<p class="hint">
				Un tocco in Giornata aggiunge la durata della task al giorno che stai guardando. Eliminare
				una task non cancella le registrazioni già fatte.
			</p>
			{#if activeClients.length === 0}
				<p class="empty">Tutti i clienti sono archiviati. Ripristinane uno per creare task.</p>
			{/if}
			<form
				method="POST"
				action="?/createTask"
				class="row"
				use:enhance={createTask}
				hidden={activeClients.length === 0}
			>
				<div class="field">
					<label for="task-client">Cliente</label>
					<select
						id="task-client"
						name="clientId"
						value={activeClients[0]?.id ?? ''}
						required
						aria-invalid={failure?.action === 'createTask' && failure.field === 'clientId'
							? 'true'
							: undefined}
						aria-describedby={failure?.action === 'createTask' && failure.field === 'clientId'
							? 'task-client-error'
							: undefined}
					>
						{#each activeClients as client (client.id)}
							<option value={client.id}>{client.name}</option>
						{/each}
					</select>
					{#if failure?.action === 'createTask' && failure.field === 'clientId'}
						<p class="error" id="task-client-error">{failure.error}</p>
					{/if}
				</div>
				<TextField
					id="task-name"
					name="name"
					label="Nome"
					placeholder="es. Assistenza"
					maxlength={80}
					required
					bind:value={taskName}
					error={failure?.action === 'createTask' && failure.field === 'name'
						? failure.error
						: null}
				/>
				<div class="duration-cell">
					<DurationField
						id="task-duration"
						name="duration"
						label="Durata"
						required
						bind:value={taskDuration}
						error={failure?.action === 'createTask' && failure.field === 'duration'
							? failure.error
							: null}
					/>
				</div>
				<Button type="submit" variant="primary">Aggiungi task</Button>
			</form>

			{#if activeGroups.length === 0}
				<p class="empty">
					Nessuna task rapida. Creane una qui sopra, ad esempio Assistenza +20 min.
				</p>
			{:else}
				{#each activeGroups as group (group.client.id)}
					<div class="group">
						<h3>{group.client.name}</h3>
						<ul class="list">
							{#each group.tasks as task (task.id)}
								<TaskRow
									{task}
									error={errorFor('updateTask', task.id) ?? errorFor('deleteTask', task.id)}
									field={fieldFor('updateTask', task.id)}
								/>
							{/each}
						</ul>
					</div>
				{/each}
			{/if}

			{#if archivedGroups.length > 0}
				<details>
					<summary>Clienti archiviati</summary>
					{#each archivedGroups as group (group.client.id)}
						<div class="group">
							<h3>{group.client.name}</h3>
							<ul class="list">
								{#each group.tasks as task (task.id)}
									<TaskRow
										{task}
										error={errorFor('updateTask', task.id) ?? errorFor('deleteTask', task.id)}
										field={fieldFor('updateTask', task.id)}
									/>
								{/each}
							</ul>
						</div>
					{/each}
				</details>
			{/if}
		</section>

		<section aria-labelledby="clients-heading">
			<h2 id="clients-heading">Clienti</h2>
			{@render clientForm()}
			{@render clientList()}
			<p class="hint">
				Un cliente con task o registrazioni non si elimina: archivialo e sparisce dalla Giornata.
			</p>
		</section>
	{/if}

	<p class="back"><a href={resolve('/')}>Torna alla giornata</a></p>
</div>

<style>
	.page {
		max-width: 60rem;
		margin: 0 auto;
		padding: var(--space-6) var(--space-5) var(--space-8);
		display: flex;
		flex-direction: column;
		gap: var(--space-7);
	}

	section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	h2 {
		font-size: var(--text-lg);
		font-weight: 600;
	}

	h3 {
		font-size: var(--text-base);
		font-weight: 600;
		margin-bottom: var(--space-2);
		overflow-wrap: anywhere;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-3) var(--space-4);
	}

	.row :global(.field) {
		flex: 1 1 14rem;
	}

	.duration-cell {
		flex: 0 0 17ch;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	label {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--muted);
	}

	select {
		width: 100%;
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		background: var(--surface);
		color: var(--ink);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-size: var(--text-base);
		font-family: inherit;
	}

	select:hover {
		background: var(--surface-2);
	}

	select:focus-visible {
		border-color: var(--primary);
	}

	.group {
		margin-bottom: var(--space-5);
	}

	.list {
		list-style: none;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	details {
		margin-top: var(--space-2);
	}

	summary {
		cursor: pointer;
		min-height: var(--control-h);
		display: flex;
		align-items: center;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--muted);
	}

	details[open] summary {
		margin-bottom: var(--space-3);
	}

	.hint,
	.empty {
		font-size: var(--text-sm);
		/* Testo corrente: misura di lettura 45–75 caratteri, non tutta la larghezza della pagina. */
		max-width: 68ch;
		color: var(--muted);
	}

	.error {
		font-size: var(--text-sm);
		color: var(--danger);
	}

	.back {
		font-size: var(--text-sm);
	}

	@media (max-width: 640px) {
		.page {
			padding: var(--space-5) var(--space-4) var(--space-7);
			gap: var(--space-6);
		}

		.row {
			flex-direction: column;
			align-items: stretch;
		}

		/* In colonna il flex-basis diventerebbe un'altezza: i campi prendono quella del contenuto. */
		.row :global(.field),
		.duration-cell {
			flex: 0 0 auto;
		}
	}
</style>
