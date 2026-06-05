<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';

	interface Props {
		value?: number | string;
		onValueChange?: (value: number | string) => void;
		disabled?: boolean;
	}

	let { value = $bindable(5), onValueChange, disabled = false }: Props = $props();

	const percentages = [5, 10, 20];
	let customInput = $state('');
	const numericValue = $derived(
		typeof value === 'number' ? value : value === '' ? Number.NaN : Number(value)
	);
	const selectedPreset = $derived(
		Number.isFinite(numericValue) && percentages.includes(numericValue) ? numericValue : null
	);
	const isCustom = $derived(
		!disabled && Number.isFinite(numericValue) && selectedPreset === null && numericValue > 0
	);

	const handlePercentageClick = (pct: number) => {
		if (disabled) return;
		value = pct;
		customInput = '';
		onValueChange?.(pct);
	};

	const sanitizePercentage = (inputValue: string) => {
		const normalized = inputValue.replace(/[^\d.]/g, '');
		const [whole = '', ...decimalParts] = normalized.split('.');
		const decimal = decimalParts.join('');
		return decimalParts.length > 0 ? `${whole}.${decimal}` : whole;
	};

	const handleCustomInput = (e: Event) => {
		if (disabled) return;
		const input = e.target as HTMLInputElement;
		const nextValue = sanitizePercentage(input.value);
		const numericNextValue = Number(nextValue);

		customInput =
			nextValue && Number.isFinite(numericNextValue) && numericNextValue > 100 ? '100' : nextValue;

		value = customInput === '' ? 0 : Number(customInput);
		onValueChange?.(value);
	};

	$effect(() => {
		if (disabled) {
			customInput = '';
			return;
		}

		customInput = isCustom ? String(value) : '';
	});
</script>

<div class="flex w-full flex-col gap-3">
	<div class="flex flex-wrap items-center gap-3">
		<div class="flex w-fit items-center rounded-md border border-muted-foreground/20 bg-muted/30">
			{#each percentages as pct (pct)}
				<button
					type="button"
					{disabled}
					class={`min-w-14 rounded px-3 py-2 text-sm font-medium transition ${
						(disabled ? pct === 5 : selectedPreset === pct)
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
	</div>

	<div class="flex w-full flex-col gap-1.5">
		<span class="text-xs font-medium text-muted-foreground">Manual paid %</span>
		<div class="flex items-center gap-2">
			<Input
				type="text"
				inputmode="decimal"
				placeholder="e.g. 12"
				value={customInput}
				oninput={handleCustomInput}
				{disabled}
				class={`min-h-11 w-full min-w-0 rounded-lg bg-background text-base font-normal ${
					disabled ? 'cursor-not-allowed opacity-60' : ''
				}`}
			/>
			<span class="shrink-0 text-sm font-normal text-foreground">Paid</span>
		</div>
	</div>
</div>
