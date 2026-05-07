<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';

	let period = $state('this-week');

	const myAttendanceRows = $derived([
		{
			sr: 1,
			date: '05/02/2026',
			punchIn: '09:00',
			punchOut: '17:00',
			totalHours: '08:00',
			overtime: '00:00',
			shortBy: '00:00'
		},
		{
			sr: 2,
			date: '04/02/2026',
			punchIn: '08:50',
			punchOut: '17:00',
			totalHours: '08:10',
			overtime: '00:30',
			shortBy: '00:00'
		},
		{
			sr: 3,
			date: '03/02/2026',
			punchIn: '09:30',
			punchOut: '17:30',
			totalHours: '08:00',
			overtime: '01:00',
			shortBy: '00:00'
		},
		{
			sr: 4,
			date: '02/02/2026',
			punchIn: '09:45',
			punchOut: '18:00',
			totalHours: '08:00',
			overtime: '00:00',
			shortBy: '00:00'
		}
	]);
</script>

<div class="flex flex-col gap-6 bg-white p-6 text-[#222626]">
	<div class="rounded-md border border-[#EBEEEE] bg-white p-6">
		<div class="mb-4 flex items-center justify-between gap-3">
			<h1 class="text-2xl leading-8 font-medium text-[#222626]">Attendance</h1>
			<Select.Root type="single" bind:value={period}>
				<Select.Trigger
					class="h-8 w-[140px] border border-[#D4D9D9] bg-white text-[13px] leading-5 text-[#222626] focus-visible:outline-none focus-visible:border-[#F04C06] focus-visible:ring-2 focus-visible:ring-[#FFD3A8]"
				>
					{period === 'this-week' ? 'This week' : period}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="this-week">This week</Select.Item>
					<Select.Item value="last-week">Last week</Select.Item>
					<Select.Item value="this-month">This month</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>

		<div class="flex gap-2">
			<div class="min-w-0 flex-1 basis-0 rounded-md border border-[#EBEEEE] bg-white p-3">
				<p class="text-[13px] leading-5 text-[#687976]">On time rate</p>
				<div class="mt-3 text-2xl leading-8 font-medium text-[#222626]">97%</div>
			</div>

			<div class="min-w-0 flex-1 basis-0 rounded-md border border-[#EBEEEE] bg-white p-3">
				<p class="text-[13px] leading-5 text-[#687976]">Total working days</p>
				<div class="mt-3 text-2xl leading-8 font-medium text-[#222626]">5</div>
			</div>

			<div class="min-w-0 flex-1 basis-0 rounded-md border border-[#EBEEEE] bg-white p-3">
				<p class="text-[13px] leading-5 text-[#687976]">Weekly Off</p>
				<div class="mt-3 text-2xl leading-8 font-medium text-[#222626]">2</div>
			</div>

			<div class="min-w-0 flex-1 basis-0 rounded-md border border-[#EBEEEE] bg-white p-3">
				<p class="text-[13px] leading-5 text-[#687976]">Present</p>
				<div class="mt-3 text-2xl leading-8 font-medium text-[#222626]">5</div>
			</div>

			<div class="min-w-0 flex-1 basis-0 rounded-md border border-[#EBEEEE] bg-white p-3">
				<p class="text-[13px] leading-5 text-[#687976]">Leaves</p>
				<div class="mt-3 text-2xl leading-8 font-medium text-[#222626]">0</div>
			</div>

			<div class="min-w-0 flex-1 basis-0 rounded-md border border-[#EBEEEE] bg-white p-3">
				<p class="text-[13px] leading-5 text-[#687976]">Holidays</p>
				<div class="mt-3 text-2xl leading-8 font-medium text-[#222626]">0</div>
			</div>
		</div>
	</div>

	<div class="overflow-hidden rounded-md border border-[#EBEEEE] bg-white">
		<Table>
			<TableHeader>
				<TableRow class="bg-[#FBF9F8]">
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Sr....</TableHead>
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Date</TableHead>
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Punch In time</TableHead>
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Punch out time</TableHead>
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Total Hours</TableHead>
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Overtime</TableHead>
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Short by</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{#each myAttendanceRows as row}
					<TableRow class="h-[52px]">
						<TableCell class="text-[13px] leading-5 font-normal text-[#222626]">{row.sr}</TableCell>
						<TableCell class="text-[13px] leading-5 font-normal text-[#222626]">{row.date}</TableCell>
						<TableCell class="text-[13px] leading-5 font-normal text-[#222626]">{row.punchIn}</TableCell>
						<TableCell class="text-[13px] leading-5 font-normal text-[#222626]">{row.punchOut}</TableCell>
						<TableCell class="text-[13px] leading-5 font-normal text-[#222626]">{row.totalHours}</TableCell>
						<TableCell class="text-[13px] leading-5 font-normal text-[#222626]">{row.overtime}</TableCell>
						<TableCell class="text-[13px] leading-5 font-normal text-[#222626]">{row.shortBy}</TableCell>
					</TableRow>
				{/each}
			</TableBody>
		</Table>
	</div>
</div>
