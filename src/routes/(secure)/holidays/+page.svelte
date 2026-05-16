<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Calendar } from '$lib/components/ui/calendar';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Calendar as CalendarIcon, Plus, Trash2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { createHoliday, deleteHoliday } from '../hr/hr.remote';

	let { data } = $props<{ data: { holidays: Holiday[]; currentYear: number } }>();

	let isAddDialogOpen = $state(false);
	let saving = $state(false);
	let deletingId = $state('');
	let newHoliday = $state({
		name: '',
		date: '',
		type: 'mandatory'
	});

	const holidays = $derived(data.holidays ?? []);

	function formatDate(date: string) {
		return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	async function addHoliday() {
		saving = true;
		try {
			await createHoliday({
				name: newHoliday.name,
				date: newHoliday.date,
				type: newHoliday.type as 'mandatory' | 'optional'
			});
			toast.success('Holiday saved');
			isAddDialogOpen = false;
			newHoliday = { name: '', date: '', type: 'mandatory' };
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to save holiday');
		} finally {
			saving = false;
		}
	}

	async function removeHoliday(id: string) {
		deletingId = id;
		try {
			await deleteHoliday({ id });
			toast.success('Holiday deleted');
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to delete holiday');
		} finally {
			deletingId = '';
		}
	}
</script>

<div class="flex flex-col gap-6 bg-white p-6 text-[#222626]">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<div>
				<h1 class="text-2xl leading-8 font-medium">Holiday Management {data.currentYear}</h1>
				<p class="text-[13px] leading-5 text-[#687976]">
					Manage company holidays and keep leave/attendance calendars aligned.
				</p>
			</div>
		</div>
		<Button
			onclick={() => (isAddDialogOpen = true)}
			class="h-8 border border-black/5 bg-[#222626] px-3 text-sm text-white"
		>
			<Plus class="mr-2 h-4 w-4" />
			Add Holiday
		</Button>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<Card class="border-[#EBEEEE] shadow-none lg:col-span-1">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<CalendarIcon class="h-4 w-4" />
					Calendar View
				</CardTitle>
				<CardDescription
					>{holidays.length} holiday{holidays.length === 1 ? '' : 's'} configured.</CardDescription
				>
			</CardHeader>
			<CardContent>
				<Calendar type="single" class="rounded-md border" />
			</CardContent>
		</Card>

		<Card class="border-[#EBEEEE] shadow-none lg:col-span-2">
			<CardHeader>
				<CardTitle>Holiday List</CardTitle>
				<CardDescription>Upcoming holidays for the current calendar year.</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					{#if holidays.length === 0}
						<div
							class="rounded-md border border-[#EBEEEE] p-6 text-center text-[13px] text-[#687976]"
						>
							No holidays have been added yet.
						</div>
					{:else}
						{#each holidays as holiday (holiday.id)}
							<div class="flex items-center justify-between rounded-md border border-[#EBEEEE] p-4">
								<div class="flex items-center gap-4">
									<div
										class="flex h-12 w-12 flex-col items-center justify-center rounded-md bg-[#FBF9F8] text-[#222626]"
									>
										<span class="text-xs font-bold uppercase">
											{new Date(`${holiday.date}T00:00:00`).toLocaleString('en-US', {
												month: 'short'
											})}
										</span>
										<span class="text-lg font-bold"
											>{new Date(`${holiday.date}T00:00:00`).getDate()}</span
										>
									</div>
									<div>
										<h4 class="font-semibold">{holiday.name}</h4>
										<div class="flex items-center gap-2">
											<Badge
												variant={holiday.type === 'mandatory' ? 'secondary' : 'outline'}
												class="capitalize"
											>
												{holiday.type}
											</Badge>
											<span class="text-xs text-muted-foreground">{formatDate(holiday.date)}</span>
										</div>
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									class="border border-[#EBEEEE]"
									disabled={deletingId === holiday.id}
									onclick={() => removeHoliday(holiday.id)}
								>
									<Trash2 class="h-4 w-4 text-[#DC2626]" />
								</Button>
							</div>
						{/each}
					{/if}
				</div>
			</CardContent>
		</Card>
	</div>
</div>

<Dialog.Root bind:open={isAddDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Add New Holiday</Dialog.Title>
			<Dialog.Description>Create a holiday for the company calendar.</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="h-name">Holiday Name</Label>
				<Input
					id="h-name"
					bind:value={newHoliday.name}
					class="h-8 border-[#D4D9D9]"
					placeholder="e.g. Eid Al Fitr"
				/>
			</div>
			<div class="space-y-2">
				<Label for="h-date">Date</Label>
				<Input id="h-date" type="date" bind:value={newHoliday.date} class="h-8 border-[#D4D9D9]" />
			</div>
			<div class="space-y-2">
				<Label for="h-type">Type</Label>
				<select
					id="h-type"
					class="flex h-8 w-full rounded-md border border-[#D4D9D9] bg-white px-3 py-1 text-[13px] leading-5 text-[#222626]"
					bind:value={newHoliday.type}
				>
					<option value="mandatory">Mandatory</option>
					<option value="optional">Optional</option>
				</select>
			</div>
		</div>
		<Dialog.Footer>
			<Button
				variant="outline"
				class="h-8 border-[#EBEEEE] text-sm text-[#222626]"
				onclick={() => (isAddDialogOpen = false)}>Cancel</Button
			>
			<Button
				class="h-8 border border-black/5 bg-[#222626] text-sm text-white"
				onclick={addHoliday}
				disabled={saving}
			>
				{saving ? 'Saving...' : 'Save Holiday'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
