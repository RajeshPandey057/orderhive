<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { toast } from 'svelte-sonner';
	import Building from '~icons/lucide/building';
	import Hammer from '~icons/lucide/hammer';
	import Pencil from '~icons/lucide/pencil';
	import Plus from '~icons/lucide/plus';
	import Save from '~icons/lucide/save';
	import Traffic from '~icons/lucide/traffic-cone';
	import { createSale } from './sales.remote';

	let dealType = $state<string>();
	let developer = $state<string>();
	let sheetOpen = $state(false);

	// Sync the select values with form fields
	$effect(() => {
		if (dealType) {
			createSale.fields.dealType.set(dealType as 'off-plan' | 'on-plan' | 'resell');
		}
	});

	$effect(() => {
		if (developer) {
			createSale.fields.developer.set(developer);
		}
	});

	const dealTypes = [
		{ value: 'off-plan', label: 'Off Plan' },
		{ value: 'on-plan', label: 'On Plan' },
		{ value: 'resell', label: 'Resell' }
	];
	const developers = [
		{ value: 'emmar', label: 'Emmar' },
		{ value: 'danube', label: 'Danube' },
		{ value: 'sobha-realty', label: 'Sobha Realty' },
		{ value: 'dubai-properties', label: 'Dubai Properties' },
		{ value: 'arada', label: 'Arada' },
		{ value: 'deyaar', label: 'Deyaar' },
		{ value: 'aldar', label: 'Aldar' },
		{ value: 'ellington', label: 'Ellington' },
		{ value: 'damac', label: 'Damac' },
		{ value: 'omniyat', label: 'Omniyat' },
		{ value: 'nakheel', label: 'Nakheel' },
		{ value: 'binghatti', label: 'Binghatti' },
		{ value: 'meras', label: 'Meras' }
	];

	const dealTypeLabel = $derived(
		dealTypes.find((d) => d.value === dealType)?.label ?? 'Choose deal'
	);
	const developerLabel = $derived(
		developers.find((d) => d.value === developer)?.label ?? 'Select Developer'
	);
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
	<div class="flex w-full items-center justify-between gap-2 px-4">
		<div class="flex items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<h1 class="text-2xl font-medium">Sales Tracker</h1>
		</div>
		<Sheet.Root bind:open={sheetOpen}>
			<Sheet.Trigger class={buttonVariants({ variant: 'default' })}>
				<Plus />
				<p class="text-sm">Add Sale</p>
			</Sheet.Trigger>
			<Sheet.Content side="right" class="w-150 max-w-150 overflow-y-auto sm:w-150 sm:max-w-150">
				<form
					{...createSale.enhance(async ({ form, submit }) => {
						try {
							await submit();
							form.reset();

							toast.success('Sale created successfully!');
						} catch {
							toast.error('Failed to create sale');
						}
					})}
				>
					<div
						class="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-6"
					>
						<Sheet.Title class="text-2xl font-medium">Add Sale</Sheet.Title>
						<div class="flex flex-row gap-2">
							<Sheet.Close class={buttonVariants({ variant: 'outline', size: 'sm' })}>
								<Pencil class="mr-2 h-4 w-4" /> Save as Draft
							</Sheet.Close>
							<Button type="submit" size="sm" disabled={!!createSale.pending}>
								<Save class="mr-2 h-4 w-4" />
								{createSale.pending ? 'Saving...' : 'Save'}
							</Button>
						</div>
					</div>

					<div class="flex flex-col gap-8 p-6">
						<!-- Client Details Section -->
						<Field.Set>
							<Field.Legend class="text-lg font-medium">Client Details</Field.Legend>
							<Field.Group>
								<div class="grid grid-cols-3 gap-4">
									<Field.Field>
										<Input {...createSale.fields.firstName.as('text')} placeholder="First Name" />
										{#each createSale.fields.firstName.issues() as issue, i (i)}
											<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
										{/each}
									</Field.Field>
									<Field.Field>
										<Input {...createSale.fields.lastName.as('text')} placeholder="Last Name" />
										{#each createSale.fields.lastName.issues() as issue, i (i)}
											<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
										{/each}
									</Field.Field>
									<Field.Field>
										<Input {...createSale.fields.email.as('email')} placeholder="Email" />
										{#each createSale.fields.email.issues() as issue, i (i)}
											<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
										{/each}
									</Field.Field>
								</div>

								<div class="flex gap-2">
									<Input id="countryCode" class="w-32" disabled value="+971" />
									<Field.Field class="flex-1">
										<Input {...createSale.fields.phone.as('tel')} placeholder="00000 00000" />
										{#each createSale.fields.phone.issues() as issue, i (i)}
											<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
										{/each}
									</Field.Field>
								</div>
							</Field.Group>
						</Field.Set>

						<!-- Project Details Section -->
						<Field.Set>
							<Field.Legend class="text-lg font-medium">Project Details</Field.Legend>

							<Field.Group>
								<div class="grid grid-cols-3 gap-4">
									<Field.Field id="dealType">
										<Select.Root type="single" bind:value={dealType}>
											<Select.Trigger id="dealype">
												<div class="flex items-center gap-2">
													<Traffic />
													{dealTypeLabel}
												</div>
											</Select.Trigger>
											<Select.Content>
												{#each dealTypes as dealType (dealType.value)}
													<Select.Item {...dealType} />
												{/each}
											</Select.Content>
										</Select.Root>
										<input type="hidden" {...createSale.fields.dealType.as('text')} />
										{#each createSale.fields.dealType.issues() as issue, i (i)}
											<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
										{/each}
									</Field.Field>
									<Field.Field id="developer">
										<Select.Root type="single" bind:value={developer}>
											<Select.Trigger id="developer">
												<div class="flex items-center gap-2">
													<Hammer />
													{developerLabel}
												</div>
											</Select.Trigger>
											<Select.Content>
												{#each developers as developer (developer.value)}
													<Select.Item {...developer} />
												{/each}
											</Select.Content>
										</Select.Root>
										<input type="hidden" {...createSale.fields.developer.as('text')} />
										{#each createSale.fields.developer.issues() as issue, i (i)}
											<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
										{/each}
									</Field.Field>
									<Field.Field>
										<InputGroup.Root id="property">
											<InputGroup.Input
												{...createSale.fields.property.as('text')}
												placeholder="Select Property"
											/>
											<InputGroup.Addon>
												<Building />
											</InputGroup.Addon>
										</InputGroup.Root>
										{#each createSale.fields.property.issues() as issue, i (i)}
											<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
										{/each}
									</Field.Field>
								</div>

								<div class="grid grid-cols-2 gap-4">
									<Field.Field>
										<Input {...createSale.fields.unitNo.as('text')} placeholder="🏠 Unit No" />
										{#each createSale.fields.unitNo.issues() as issue, i (i)}
											<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
										{/each}
									</Field.Field>
									<Field.Field>
										<Input
											{...createSale.fields.unitValue.as('text')}
											placeholder="💰 Unit Value"
										/>

										{#each createSale.fields.unitValue.issues() as issue, i (i)}
											<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
										{/each}
									</Field.Field>
								</div>
							</Field.Group>
						</Field.Set>
					</div>
				</form>
			</Sheet.Content>
		</Sheet.Root>
	</div>
</header>
<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
	<div class="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min"></div>
</div>
