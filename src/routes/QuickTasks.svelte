<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { resolve } from '$app/paths';
	import Check from '@lucide/svelte/icons/check';
	import type { QuickTask } from '#lib/types.js';
	import { withToast } from '#lib/enhance.js';
	import { formatDuration } from '#lib/duration.js';
	import { onSuccess } from './onSuccess.js';

	interface QuickGroup {
		clientId: number;
		clientName: string;
		tasks: QuickTask[];
	}

	interface Props {
		day: string;
		groups: QuickGroup[];
		/** Nessun cliente attivo: la sezione invite a creane uno invece di listare task. */
		hasClients: boolean;
	}

	let { day, groups, hasClients }: Props = $props();

	let addedTaskId = $state<number | null>(null);
	let resetTimer: ReturnType<typeof setTimeout> | null = null;

	function flash(taskId: number) {
		addedTaskId = taskId;
		if (resetTimer !== null) clearTimeout(resetTimer);
		resetTimer = setTimeout(() => (addedTaskId = null), 1000);
	}

	$effect(() => () => {
		if (resetTimer !== null) clearTimeout(resetTimer);
	});

	/**
	 * Ogni tocco è una registrazione: il bottone non si disabilita mai durante l'invio,
	 * quindi il form non ha bisogno di stato di attesa. Il feedback è solo visivo.
	 */
	const enhanceQuick = (taskId: number): SubmitFunction =>
		onSuccess(withToast(), () => flash(taskId));
</script>

<section aria-labelledby="quick-tasks-title">
	<h2 id="quick-tasks-title">Task rapide</h2>

	{#if !hasClients}
		<div class="empty">
			<p>Per iniziare, crea un cliente e le tue task rapide.</p>
			<a href={resolve('/gestione')}>Vai a Gestione</a>
		</div>
	{:else if groups.length === 0}
		<div class="empty">
			<p>Nessuna task rapida. Creane una in Gestione, ad esempio Assistenza +20 min.</p>
		</div>
	{:else}
		{#each groups as group (group.clientId)}
			<div class="group">
				<h3>{group.clientName}</h3>
				<div class="tasks">
					{#each group.tasks as task (task.id)}
						<form method="POST" action={`?d=${day}&/addQuick`} use:enhance={enhanceQuick(task.id)}>
							<input type="hidden" name="taskId" value={task.id} />
							<input type="hidden" name="day" value={day} />
							<button type="submit" class:added={addedTaskId === task.id}>
								<span class="name">{task.name}</span>
								{#if addedTaskId === task.id}
									<span class="added">
										<Check size={14} stroke-width={2} aria-hidden="true" />
										Aggiunto
									</span>
								{:else}
									<span class="duration num">+{formatDuration(task.durationMinutes)}</span>
								{/if}
							</button>
						</form>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</section>

<style>
	h2 {
		font-size: var(--text-lg);
	}

	.group {
		margin-top: var(--space-4);
	}

	.group h3 {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--muted);
		margin-bottom: var(--space-2);
	}

	.tasks {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	button {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		gap: 2px;
		min-height: 52px;
		min-width: 132px;
		padding: var(--space-2) var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: 8px;
		text-align: left;
		transition:
			background-color var(--dur-fast) var(--ease-out),
			border-color var(--dur-fast) var(--ease-out);
	}

	button:hover {
		background: var(--surface-2);
	}

	button.added {
		background: var(--primary-soft);
		border-color: var(--primary);
	}

	.name {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--ink);
	}

	.duration {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--primary);
	}

	.added {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--primary);
	}

	.empty {
		margin-top: var(--space-2);
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--muted);
		font-size: var(--text-sm);
	}

	.empty p {
		margin-bottom: var(--space-2);
	}
</style>
