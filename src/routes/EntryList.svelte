<script lang="ts">
	import { tick } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { quartOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { enhance, type SubmitFunction } from '$app/forms';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { Client, DayTotals, EntryView } from '#lib/types.js';
	import { withToast } from '#lib/enhance.js';
	import { formatDuration, formatDurationInput } from '#lib/duration.js';
	import Button from '#lib/components/Button.svelte';

	interface Props {
		day: string;
		entries: EntryView[];
		/** Registrazioni eliminate del giorno, recuperabili dopo la chiusura del toast. */
		deletedEntries: EntryView[];
		clients: Client[];
		totals: DayTotals;
		form: { action?: string; error?: string; field?: string; id?: number } | null;
	}

	let { day, entries, deletedEntries, clients, totals, form }: Props = $props();

	/**
	 * Una giornata normale ha qualche decina di righe; con migliaia (un bug o un client
	 * impazzito) renderle tutte blocca la pagina a ogni tocco. Il totale resta quello vero, calcolato
	 * dal server su tutte le righe: qui se ne mostrano le più recenti e il resto su richiesta.
	 */
	const VISIBLE_LIMIT = 100;
	let showAll = $state(false);
	const visibleEntries = $derived(showAll ? entries : entries.slice(0, VISIBLE_LIMIT));

	let editingId = $state<number | null>(null);
	let editClientId = $state<number | null>(null);
	let editActivity = $state('');
	let editDuration = $state('');
	let durationInput = $state<HTMLInputElement | null>(null);

	const inDuration = () => (prefersReducedMotion.current ? 0 : 200);
	const outDuration = () => (prefersReducedMotion.current ? 0 : 150);
	const inTransition = () => ({ y: -6, duration: inDuration(), easing: quartOut });
	const outTransition = () => ({ duration: outDuration() });

	const rowError = $derived(
		form?.action === 'updateEntry' && form?.id === editingId ? (form.error ?? null) : null
	);
	const editFieldError = (field: string) => (rowError && form?.field === field ? rowError : null);

	async function startEdit(entry: EntryView) {
		editingId = entry.id;
		editClientId = entry.clientId;
		editActivity = entry.activity;
		editDuration = formatDurationInput(entry.durationMinutes);
		await tick();
		durationInput?.focus();
		durationInput?.select();
	}

	function cancelEdit() {
		editingId = null;
		editClientId = null;
		editActivity = '';
		editDuration = '';
	}

	/** Esc annulla la modifica e restituisce il focus alla riga, senza toccare i dati. */
	function onEditKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			cancelEdit();
		}
	}

	/** Salva e chiude la riga di modifica; in errore il form resta aperto con il messaggio. */
	const enhanceUpdate =
		(): SubmitFunction =>
		() =>
		async ({ result, update }) => {
			await update();
			if (result.type === 'success') cancelEdit();
		};
</script>

<section aria-labelledby="entries-title">
	<div class="head">
		<h2 id="entries-title">Registrazioni</h2>
		{#if totals.byClient.length > 1}
			<p class="breakdown">
				{totals.byClient
					.map((row) => `${row.clientName} ${formatDuration(row.minutes)}`)
					.join(' · ')}
			</p>
		{/if}
		<!-- Il toast chiude da solo dopo l'annullamento: qui confermiamo cosa è successo. -->
		{#if form?.action === 'undoAdd'}
			<p class="status" role="status">Aggiunta annullata.</p>
		{/if}
	</div>

	{#if entries.length === 0}
		<div class="empty">
			<p>Nessuna registrazione per questo giorno. Tocca una task rapida per aggiungere tempo.</p>
		</div>
	{:else}
		<ul class="list">
			{#each visibleEntries as entry (entry.id)}
				<li
					class="row"
					in:fly={inTransition()}
					out:fade={outTransition()}
					class:editing={editingId === entry.id}
				>
					{#if editingId === entry.id}
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<form
							method="POST"
							action={`?d=${day}&/updateEntry`}
							class="edit"
							use:enhance={enhanceUpdate()}
							onkeydown={onEditKeydown}
						>
							<input type="hidden" name="id" value={entry.id} />
							<input type="hidden" name="day" value={day} />

							<div class="edit-field client">
								<label for="edit-client-{entry.id}">Cliente</label>
								<select
									id="edit-client-{entry.id}"
									name="clientId"
									bind:value={editClientId}
									required
									aria-invalid={editFieldError('clientId') ? 'true' : undefined}
								>
									{#if !clients.some((client) => client.id === entry.clientId)}
										<option value={entry.clientId}>{entry.clientName} (archiviato)</option>
									{/if}
									{#each clients as client (client.id)}
										<option value={client.id}>{client.name}</option>
									{/each}
								</select>
							</div>

							<div class="edit-field">
								<label for="edit-activity-{entry.id}">Attività</label>
								<input
									id="edit-activity-{entry.id}"
									name="activity"
									type="text"
									maxlength="120"
									required
									bind:value={editActivity}
									aria-invalid={editFieldError('activity') ? 'true' : undefined}
								/>
							</div>

							<div class="edit-field duration">
								<label for="edit-duration-{entry.id}">Durata</label>
								<input
									bind:this={durationInput}
									id="edit-duration-{entry.id}"
									name="duration"
									type="text"
									inputmode="text"
									autocomplete="off"
									required
									bind:value={editDuration}
									aria-invalid={editFieldError('duration') ? 'true' : undefined}
									aria-describedby={editFieldError('duration')
										? `edit-duration-error-${entry.id}`
										: undefined}
								/>
								{#if editFieldError('duration')}
									<p class="error num" id="edit-duration-error-{entry.id}">{rowError}</p>
								{/if}
							</div>

							<div class="edit-actions">
								<Button type="submit" variant="primary">Salva</Button>
								<Button type="button" variant="ghost" onclick={cancelEdit}>Annulla</Button>
							</div>
						</form>
					{:else}
						<div class="info">
							<span class="activity">{entry.activity}</span>
							<span class="meta">
								{entry.clientName}{#if entry.source === 'timer'}
									· timer{/if}{#if entry.measuredMinutes !== null && entry.measuredMinutes !== entry.durationMinutes}&nbsp;(misurati
									{formatDuration(entry.measuredMinutes)}){/if}
							</span>
						</div>

						<span class="amount num">{formatDuration(entry.durationMinutes)}</span>

						<div class="actions">
							<button
								type="button"
								class="icon"
								onclick={() => startEdit(entry)}
								aria-label="Modifica {entry.activity}"
							>
								<Pencil size={18} stroke-width={1.75} aria-hidden="true" />
							</button>
							<form
								method="POST"
								action={`?d=${day}&/deleteEntry`}
								use:enhance={withToast({ focus: 'next' })}
							>
								<input type="hidden" name="id" value={entry.id} />
								<button type="submit" class="icon" aria-label="Elimina {entry.activity}">
									<Trash2 size={18} stroke-width={1.75} aria-hidden="true" />
								</button>
							</form>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		{#if entries.length > visibleEntries.length}
			<div class="more">
				<Button type="button" variant="secondary" onclick={() => (showAll = true)}>
					Mostra le altre {entries.length - visibleEntries.length} registrazioni
				</Button>
			</div>
		{/if}
	{/if}

	<!-- Il toast chiude da solo: qui le eliminate restano recuperabili, anche solo da tastiera. -->
	{#if deletedEntries.length > 0}
		<details class="deleted">
			<summary>Eliminate ({deletedEntries.length})</summary>
			<ul class="deleted-list">
				{#each deletedEntries as entry (entry.id)}
					<li>
						<span class="deleted-info">
							<span class="deleted-activity">{entry.activity}</span>
							<span class="meta">{entry.clientName} · {formatDuration(entry.durationMinutes)}</span>
						</span>
						<form
							method="POST"
							action={`?d=${day}&/restoreEntry`}
							use:enhance={withToast({ focus: 'next' })}
						>
							<input type="hidden" name="id" value={entry.id} />
							<Button type="submit" variant="ghost" aria-label="Ripristina {entry.activity}">
								Ripristina
							</Button>
						</form>
					</li>
				{/each}
			</ul>
		</details>
	{/if}
</section>

<style>
	.head {
		margin-bottom: var(--space-3);
	}

	h2 {
		font-size: var(--text-lg);
	}

	.breakdown {
		margin-top: var(--space-1);
		font-size: var(--text-sm);
		color: var(--muted);
		overflow-wrap: anywhere;
	}

	.status {
		margin-top: var(--space-1);
		font-size: var(--text-sm);
		color: var(--primary);
	}

	.list {
		list-style: none;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: var(--surface);
	}

	.row + .row {
		border-top: 1px solid var(--border);
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.activity {
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	.meta {
		font-size: var(--text-sm);
		color: var(--muted);
		overflow-wrap: anywhere;
	}

	.amount {
		font-weight: 600;
		white-space: nowrap;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		flex: none;
	}

	/* Le azioni di riga compaiono al passaggio del mouse o del focus solo se il dispositivo è
	   davvero a puntatore fine: un portatile con schermo touch (any-pointer: coarse) le tiene
	   sempre visibili, perché con il dito non esiste hover. */
	@media (hover: hover) and (pointer: fine) and (not (any-pointer: coarse)) {
		.actions {
			opacity: 0;
			transition: opacity var(--dur-fast) var(--ease-out);
		}

		.row:hover .actions,
		.row:focus-within .actions {
			opacity: 1;
		}
	}

	.icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--control-h);
		height: var(--control-h);
		border-radius: var(--radius-sm);
		color: var(--muted);
		transition:
			background-color var(--dur-fast) var(--ease-out),
			color var(--dur-fast) var(--ease-out);
	}

	.icon:active {
		background: var(--surface-2);
		color: var(--ink);
	}

	@media (hover: hover) {
		.icon:hover {
			background: var(--surface-2);
			color: var(--ink);
		}
	}

	/* Il form di eliminazione contiene un solo bottone: non aggiunge layout. */
	.actions form {
		display: flex;
	}

	/* Modifica inline: la riga occupa tutta la larghezza e i controlli si dispongono in riga. */
	.edit {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-3);
		width: 100%;
	}

	.edit-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		flex: 1 1 150px;
		min-width: 0;
	}

	.edit-field.client {
		flex: 0 1 180px;
	}

	.edit-field.duration {
		flex: 0 0 auto;
	}

	.edit-field.duration input {
		width: 10ch;
	}

	.edit-field label {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--muted);
	}

	.edit-field select,
	.edit-field input {
		width: 100%;
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		background: var(--bg);
		color: var(--ink);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-size: var(--text-base);
		transition:
			border-color var(--dur-fast) var(--ease-out),
			background-color var(--dur-fast) var(--ease-out);
	}

	.edit-field select:hover,
	.edit-field input:hover {
		background: var(--surface-2);
	}

	.edit-field select:focus-visible,
	.edit-field input:focus-visible {
		border-color: var(--primary);
	}

	.edit-field [aria-invalid='true'] {
		border-color: var(--danger);
	}

	.edit-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex: none;
	}

	.error {
		font-size: var(--text-sm);
		color: var(--danger);
	}

	.empty {
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--muted);
		font-size: var(--text-sm);
	}

	.deleted {
		margin-top: var(--space-4);
		font-size: var(--text-sm);
	}

	.deleted summary {
		display: inline-flex;
		align-items: center;
		min-height: var(--control-h);
		padding: 0 var(--space-2);
		border-radius: var(--radius-sm);
		color: var(--muted);
		cursor: pointer;
	}

	.deleted summary:active {
		background: var(--surface-2);
		color: var(--ink);
	}

	@media (hover: hover) {
		.deleted summary:hover {
			background: var(--surface-2);
			color: var(--ink);
		}
	}

	.deleted-list {
		list-style: none;
		padding: 0;
		margin-top: var(--space-1);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
	}

	.deleted-list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
	}

	.deleted-list li + li {
		border-top: 1px solid var(--border);
	}

	.deleted-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.deleted-activity {
		color: var(--muted);
		text-decoration: line-through;
		overflow-wrap: anywhere;
	}

	.more {
		margin-top: var(--space-3);
	}
</style>
