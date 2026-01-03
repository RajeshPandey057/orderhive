<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';

	interface Props {
		value?: number | string;
		onValueChange?: (value: number | string) => void;
		disabled?: boolean;
	}

	let { value = $bindable(5), onValueChange, disabled = false }: Props = $props();

	const percentages = [5, 10, 20];

	const handlePercentageClick = (pct: number) => {
		value = pct;
		onValueChange?.(pct);
	};

	const handleCustomChange = (e: Event) => {
		const input = e.target as HTMLInputElement;
		value = input.value ? Number(input.value) : 0;
		onValueChange?.(value);
	};

	const isCustom = value && !percentages.includes(Number(value));
</script>

<div class="flex items-center gap-2">
	<div class="flex items-center rounded border border-muted-foreground/20 bg-muted/30">
		{#each percentages as pct (pct)}
			<button
				type="button"
				{disabled}
				class={`rounded px-2 py-1 text-sm font-medium transition ${
					(disabled ? pct === 5 : value === pct)
						? 'bg-foreground text-background shadow-sm'
						: 'bg-transparent text-foreground/70 hover:bg-muted/50'
				} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
				onclick={() => handlePercentageClick(pct)}
			>
				{pct}%
			</button>
		{/each}
	</div>

	<span class="text-sm font-medium text-muted-foreground">OR</span>

	<Input
		type="number"
		placeholder="Custom Value"
		value={isCustom ? value : ''}
		onchange={handleCustomChange}
		{disabled}
		class={`w-30 [appearance:textfield] rounded-lg bg-background text-sm font-normal [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
			disabled ? 'cursor-not-allowed opacity-60' : ''
		}`}
	/>

	<span class="text-sm font-normal">Paid</span>
</div>
