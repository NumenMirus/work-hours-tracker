<script lang="ts">
	import { formatDayLabel } from '#lib/day.js';
	import type { PageProps } from './$types';
	import DayHeader from './DayHeader.svelte';
	import QuickTasks from './QuickTasks.svelte';
	import ManualEntryForm from './ManualEntryForm.svelte';
	import TimerPanel from './TimerPanel.svelte';
	import EntryList from './EntryList.svelte';

	let { data, form }: PageProps = $props();

	const timer = $derived(data.timer);
	const timerDayLabel = $derived(
		timer && timer.day !== data.day ? formatDayLabel(timer.day, data.today) : null
	);
</script>

<svelte:head>
	<title>{data.label} · Registro ore</title>
</svelte:head>

<div class="page">
	<DayHeader
		day={data.day}
		label={data.label}
		isToday={data.isToday}
		prevDay={data.prevDay}
		nextDay={data.nextDay}
		totalMinutes={data.totals.totalMinutes}
	/>

	<div class="grid">
		<div class="column">
			<QuickTasks day={data.day} groups={data.quickGroups} hasClients={data.clients.length > 0} />

			{#if data.clients.length > 0}
				<ManualEntryForm
					day={data.day}
					clients={data.clients}
					suggestions={data.suggestions}
					defaultClientId={data.defaultClientId}
					{form}
				/>
			{/if}

			<!-- Un timer già in corso va sempre fermabile, anche se il suo cliente è stato archiviato; senza clienti attivi non se ne avvia uno nuovo. -->
			{#if timer || data.clients.length > 0}
				<TimerPanel
					{timer}
					day={data.day}
					{timerDayLabel}
					clients={data.clients}
					suggestions={data.suggestions}
					defaultClientId={data.defaultClientId}
					{form}
				/>
			{/if}
		</div>

		<div class="column">
			<EntryList
				day={data.day}
				entries={data.entries}
				deletedEntries={data.deletedEntries}
				clients={data.clients}
				totals={data.totals}
				{form}
			/>
		</div>
	</div>
</div>

<style>
	.page {
		max-width: 1120px;
		margin: 0 auto;
		padding: var(--space-4) var(--space-4) var(--space-8);
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-6);
	}

	.column {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		min-width: 0;
	}

	@media (min-width: 768px) {
		.grid {
			grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
			gap: var(--space-6);
			align-items: start;
		}
	}

	@media (min-width: 960px) {
		.page {
			padding: var(--space-5) var(--space-5) var(--space-8);
		}

		.grid {
			gap: var(--space-7);
		}
	}
</style>
