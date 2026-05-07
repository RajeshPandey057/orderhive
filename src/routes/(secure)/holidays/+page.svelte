<script lang="ts">
	import { Calendar } from '$lib/components/ui/calendar';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Plus, Trash2, Calendar as CalendarIcon } from '@lucide/svelte';

	let holidays = $state([
		{ id: 1, date: new Date(2026, 0, 1), name: "New Year's Day", type: 'Mandatory' },
		{ id: 2, date: new Date(2026, 2, 14), name: 'Holi', type: 'Mandatory' },
		{ id: 3, date: new Date(2026, 7, 15), name: 'Janmashtami', type: 'Mandatory' },
		{ id: 4, date: new Date(2026, 9, 20), name: 'Dussehra', type: 'Mandatory' },
		{ id: 5, date: new Date(2026, 10, 8), name: 'Diwali', type: 'Mandatory' },
		{ id: 6, date: new Date(2026, 11, 25), name: 'Christmas', type: 'Optional' }
	]);

	let isAddDialogOpen = $state(false);
	let newHoliday = $state({ name: '', date: new Date(2026, 0, 1), type: 'Mandatory' });

	function addHoliday() {
		holidays = [...holidays, { ...newHoliday, id: Date.now() }];
		isAddDialogOpen = false;
	}

	function removeHoliday(id: number) {
		holidays = holidays.filter((h) => h.id !== id);
	}

    // Helper to format date
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
</script>

<div class="flex flex-col gap-6 bg-white p-6 text-[#222626]">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl leading-8 font-medium">Holiday Management 2026</h1>
			<p class="text-[13px] leading-5 text-[#687976]">
				Manage company holidays and multi-day roster updates.
			</p>
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
				<CardTitle>Calendar View</CardTitle>
				<CardDescription>Visual representation of company holidays.</CardDescription>
			</CardHeader>
			<CardContent>
				<Calendar
					class="rounded-md border"
				/>
			</CardContent>
		</Card>

		<Card class="border-[#EBEEEE] shadow-none lg:col-span-2">
			<CardHeader>
				<CardTitle>Holiday List</CardTitle>
				<CardDescription>Upcoming holidays for the 2026 calendar year.</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					{#each holidays.sort((a, b) => a.date.getTime() - b.date.getTime()) as holiday}
						<div class="flex items-center justify-between rounded-md border border-[#EBEEEE] p-4">
							<div class="flex items-center gap-4">
								<div class="flex h-12 w-12 flex-col items-center justify-center rounded-md bg-[#FBF9F8] text-[#222626]">
									<span class="text-xs font-bold uppercase">{holiday.date.toLocaleString('en-US', { month: 'short' })}</span>
									<span class="text-lg font-bold">{holiday.date.getDate()}</span>
								</div>
								<div>
									<h4 class="font-semibold">{holiday.name}</h4>
									<div class="flex items-center gap-2">
										<Badge variant={holiday.type === 'Mandatory' ? 'secondary' : 'outline'}>
											{holiday.type}
										</Badge>
										<span class="text-xs text-muted-foreground">{formatDate(holiday.date)}</span>
									</div>
								</div>
							</div>
							<Button variant="ghost" size="icon" class="border border-[#EBEEEE]" onclick={() => removeHoliday(holiday.id)}>
								<Trash2 class="h-4 w-4 text-[#DC2626]" />
							</Button>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	</div>
</div>

<Dialog.Root bind:open={isAddDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Add New Holiday</Dialog.Title>
			<Dialog.Description>Create a new holiday for the 2026 roster.</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="h-name">Holiday Name</Label>
				<Input id="h-name" bind:value={newHoliday.name} class="h-8 border-[#D4D9D9]" placeholder="e.g. Eid Al Fitr" />
			</div>
			<div class="space-y-2">
				<Label>Date</Label>
				<Input type="date" bind:value={newHoliday.date} class="h-8 border-[#D4D9D9]" />
			</div>
			<div class="space-y-2">
				<Label>Type</Label>
				<select class="flex h-8 w-full rounded-md border border-[#D4D9D9] bg-white px-3 py-1 text-[13px] leading-5 text-[#222626]" bind:value={newHoliday.type}>
					<option value="Mandatory">Mandatory</option>
					<option value="Optional">Optional</option>
				</select>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" class="h-8 border-[#EBEEEE] text-sm text-[#222626]" onclick={() => (isAddDialogOpen = false)}>Cancel</Button>
			<Button class="h-8 border border-black/5 bg-[#222626] text-sm text-white" onclick={addHoliday}>Save Holiday</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
