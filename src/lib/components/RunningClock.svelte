<script lang="ts">
	interface Props {
		/** ISO 8601 UTC dell'avvio. */
		startedAt: string;
		/** `lg` per il pannello del timer, `sm` per la pillola nell'header. */
		size?: 'sm' | 'lg';
	}

	let { startedAt, size = 'lg' }: Props = $props();

	let now = $state(0);

	$effect(() => {
		const tick = () => (now = Date.now());
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	});

	const elapsed = $derived(Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000)));
	const parts = $derived({
		hours: Math.floor(elapsed / 3600),
		minutes: Math.floor((elapsed % 3600) / 60),
		seconds: elapsed % 60
	});
</script>

<span class="clock num {size}" aria-label="Timer in corso da {parts.hours}h {parts.minutes}m"
	>{String(parts.hours).padStart(2, '0')}:{String(parts.minutes).padStart(2, '0')}:{String(
		parts.seconds
	).padStart(2, '0')}</span
>

<style>
	.clock {
		font-weight: 600;
		color: var(--live-text);
	}

	.sm {
		font-size: var(--text-sm);
	}

	.lg {
		font-size: var(--text-2xl);
		line-height: var(--text-2xl-lh);
	}
</style>
