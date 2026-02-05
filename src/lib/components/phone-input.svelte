<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import {
		AsYouType,
		getCountries,
		getCountryCallingCode,
		isValidPhoneNumber,
		type CountryCode
	} from 'libphonenumber-js';
	import AlertCircleIcon from '~icons/lucide/alert-circle';
	import CheckCircleIcon from '~icons/lucide/check-circle';

	interface Props {
		value?: string;
		country?: string;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		showCountrySelect?: boolean;
		class?: string;
	}

	let {
		value = $bindable(''),
		country = $bindable('AE'),
		placeholder = '050 588 3469',
		disabled = false,
		required = false,
		showCountrySelect = true,
		class: className = ''
	}: Props = $props();

	// Get all available countries
	const countries = getCountries();

	/** Convert country code to flag emoji */
	const getCountryFlag = (countryCode: string): string => {
		const codePoints = countryCode
			.toUpperCase()
			.split('')
			.map((char) => 127397 + char.charCodeAt(0));
		return String.fromCodePoint(...codePoints);
	};

	/** Format phone number using AsYouType */
	const formatAsYouType = (input: string, countryCode: string): string => {
		if (!input) return '';
		const formatter = new AsYouType(countryCode as CountryCode);
		return formatter.input(input);
	};

	/** Count digits up to a position in a string */
	const countDigitsUpTo = (str: string, position: number): number => {
		let count = 0;
		for (let i = 0; i < position && i < str.length; i++) {
			if (/\d/.test(str[i])) count++;
		}
		return count;
	};

	/** Find position in string where digit count matches */
	const findPositionByDigitCount = (str: string, digitCount: number): number => {
		let count = 0;
		for (let i = 0; i < str.length; i++) {
			if (/\d/.test(str[i])) {
				count++;
				if (count === digitCount) return i + 1;
			}
		}
		return str.length;
	};

	// Check if phone number is valid
	const isValid = $derived.by(() => {
		if (!value.trim()) return false;
		try {
			return isValidPhoneNumber(value, country as CountryCode);
		} catch {
			return false;
		}
	});

	// Get country calling code
	const countryCallingCode = $derived.by(() => {
		try {
			return `+${getCountryCallingCode(country as CountryCode)}`;
		} catch {
			return '';
		}
	});

	/** Handle input change with AsYouType formatting */
	const handleInput = (e: Event) => {
		const input = e.target as HTMLInputElement;
		const inputEvent = e as InputEvent;
		const cursorPosition = input.selectionStart || 0;
		const oldValue = value;
		const newRawValue = input.value;

		// Check if this is a deletion
		const isDeleting =
			inputEvent.inputType?.includes('delete') || newRawValue.length < oldValue.length;

		// Count digits before cursor in the raw input
		const digitsBeforeCursor = countDigitsUpTo(newRawValue, cursorPosition);

		// Format the new value
		const formatted = formatAsYouType(newRawValue, country);
		value = formatted;

		// Calculate new cursor position based on digit count
		requestAnimationFrame(() => {
			let newPosition: number;

			if (isDeleting) {
				// For deletion, place cursor at the position matching digit count
				newPosition = findPositionByDigitCount(formatted, digitsBeforeCursor);
			} else {
				// For insertion, place cursor after the digit we just typed
				newPosition = findPositionByDigitCount(formatted, digitsBeforeCursor);
			}

			// Ensure cursor doesn't go past the end
			newPosition = Math.min(newPosition, formatted.length);
			input.setSelectionRange(newPosition, newPosition);
		});
	};

	/** Handle keydown for special cases */
	const handleKeyDown = (e: KeyboardEvent) => {
		const input = e.target as HTMLInputElement;
		const cursorPosition = input.selectionStart || 0;
		const selectionEnd = input.selectionEnd || 0;

		// If there's a selection, let default behavior handle it
		if (cursorPosition !== selectionEnd) return;

		// Handle backspace on formatting characters (spaces, dashes, parentheses)
		if (e.key === 'Backspace' && cursorPosition > 0) {
			const charBefore = value[cursorPosition - 1];
			if (!/\d/.test(charBefore)) {
				// Find the previous digit and delete it
				let digitPos = cursorPosition - 1;
				while (digitPos > 0 && !/\d/.test(value[digitPos - 1])) {
					digitPos--;
				}
				if (digitPos > 0) {
					e.preventDefault();
					const newValue = value.slice(0, digitPos - 1) + value.slice(cursorPosition);
					const formatted = formatAsYouType(newValue, country);
					value = formatted;

					const digitsBeforeCursor = countDigitsUpTo(value, digitPos - 1);
					requestAnimationFrame(() => {
						const newPosition = findPositionByDigitCount(formatted, digitsBeforeCursor);
						input.setSelectionRange(newPosition, newPosition);
					});
				}
			}
		}

		// Handle delete on formatting characters
		if (e.key === 'Delete' && cursorPosition < value.length) {
			const charAfter = value[cursorPosition];
			if (!/\d/.test(charAfter)) {
				// Find the next digit and delete it
				let digitPos = cursorPosition;
				while (digitPos < value.length && !/\d/.test(value[digitPos])) {
					digitPos++;
				}
				if (digitPos < value.length) {
					e.preventDefault();
					const newValue = value.slice(0, cursorPosition) + value.slice(digitPos + 1);
					const formatted = formatAsYouType(newValue, country);
					value = formatted;

					const digitsBeforeCursor = countDigitsUpTo(value, cursorPosition);
					requestAnimationFrame(() => {
						const newPosition = findPositionByDigitCount(formatted, digitsBeforeCursor);
						input.setSelectionRange(newPosition, newPosition);
					});
				}
			}
		}
	};

	/** Handle paste event */
	const handlePaste = (e: ClipboardEvent) => {
		e.preventDefault();
		const pastedText = e.clipboardData?.getData('text') || '';
		// Clean and format pasted text
		const cleaned = pastedText.replace(/[^\d+]/g, '');
		value = formatAsYouType(cleaned, country);
	};

	// Watch for country changes via effect
	let previousCountry = $state(country);
	$effect(() => {
		if (country !== previousCountry) {
			previousCountry = country;
			// Reformat current value with new country
			if (value.trim()) {
				const digits = value.replace(/[^\d+]/g, '');
				value = formatAsYouType(digits, country);
			}
		}
	});
</script>

<div class="flex flex-col gap-2">
	<Label for="phone" class="text-sm font-medium">Phone Number</Label>

	<div class="flex gap-2">
		{#if showCountrySelect}
			<Select type="single" bind:value={country} {disabled}>
				<SelectTrigger id="country" class="w-[120px] shrink-0">
					<span class="flex items-center gap-2">
						<span class="text-lg leading-none">{getCountryFlag(country)}</span>
						<span class="text-sm text-muted-foreground">{countryCallingCode}</span>
					</span>
				</SelectTrigger>
				<SelectContent class="max-h-60">
					{#each countries as countryCode (countryCode)}
						{@const code = (() => {
							try {
								return `+${getCountryCallingCode(countryCode)}`;
							} catch {
								return '';
							}
						})()}
						<SelectItem value={countryCode}>
							<span class="flex items-center gap-2">
								<span class="text-lg leading-none">{getCountryFlag(countryCode)}</span>
								<span class="font-medium">{countryCode}</span>
								<span class="text-muted-foreground">{code}</span>
							</span>
						</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		{/if}

		<Input
			id="phone"
			type="tel"
			{value}
			{placeholder}
			{disabled}
			{required}
			class={[
				className,
				'flex-1',
				isValid && value.length > 0 && 'border-green-600 focus-visible:ring-green-600'
			]}
			oninput={handleInput}
			onkeydown={handleKeyDown}
			onpaste={handlePaste}
			aria-label="Phone number"
		/>
	</div>

	<div class="flex items-center gap-2 text-sm">
		{#if value.length > 0}
			{#if isValid}
				<CheckCircleIcon class="size-4 text-green-600" />
				<span class="text-green-600">Valid phone number</span>
			{:else}
				<AlertCircleIcon class="size-4 text-amber-600" />
				<span class="text-amber-600">Invalid phone number</span>
			{/if}
		{:else}
			<span class="text-muted-foreground">Enter a phone number</span>
		{/if}
	</div>
</div>
