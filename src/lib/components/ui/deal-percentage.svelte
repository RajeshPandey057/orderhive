<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	interface Props {
		value?: number | string;
		onValueChange?: (value: number | string) => void;
		disabled?: boolean;
		placeholder?: string;
	}

	let {
		value = $bindable(''),
		onValueChange,
		disabled = false,
		placeholder = 'Custom Value'
	}: Props = $props();

	const presets = [5, 10, 20];
	let customInput = $state('');
	let selectedPreset = $derived.by(() => {
		const numValue = typeof value === 'string' ? parseFloat(value) : value;
		return presets.includes(numValue) ? numValue : null;
	});

	const handlePresetClick = (preset: number) => {
		value = preset;
		customInput = '';
		onValueChange?.(preset);
	};

	const handleCustomChange = (e: Event) => {
		const input = e.target as HTMLInputElement;
		customInput = input.value;
		const numValue = parseFloat(input.value);
		value = isNaN(numValue) ? input.value : numValue;
		onValueChange?.(value);
	};
</script>

<div class="flex flex-wrap items-center gap-2">
	{#each presets as preset (preset)}
		<Button
			type="button"
			variant={selectedPreset === preset ? 'default' : 'outline'}
			size="sm"
			class="min-w-12"
			{disabled}
			onclick={() => handlePresetClick(preset)}
		>
			{preset}%
		</Button>
	{/each}

	<span class="text-sm font-medium text-muted-foreground">OR</span>

	<Input
		type="number"
		{placeholder}
		value={customInput}
		onchange={handleCustomChange}
		oninput={handleCustomChange}
		{disabled}
		class="w-32"
		min="0"
		step="0.01"
	/>

	<span class="text-sm font-medium text-foreground">Paid</span>
</div>
