<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import { toast } from 'svelte-sonner';
	import { createLeaveRequest, reviewLeaveRequest } from '../hr/hr.remote';

	let {
		data
	}: {
		data: {
			myRequests: LeaveRequest[];
			teamRequests: LeaveRequest[];
			isAdmin: boolean;
			stats: { used: number; balance: number; onProbation: boolean };
		};
	} = $props();

	let submitting = $state(false);
	let processingId = $state('');
	let leaveForm = $state({
		type: 'Casual',
		startDate: '',
		endDate: '',
		reason: ''
	});

	async function submitLeave() {
		submitting = true;
		try {
			await createLeaveRequest(leaveForm);
			toast.success('Leave request submitted');
			leaveForm = { type: 'Casual', startDate: '', endDate: '', reason: '' };
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to submit leave request');
		} finally {
			submitting = false;
		}
	}

	async function handleAction(id: string, status: 'approved' | 'rejected') {
		processingId = id;
		try {
			await reviewLeaveRequest({ id, status });
			toast.success(`Leave ${status}`);
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to update leave request');
		} finally {
			processingId = '';
		}
	}

	function formatStatus(status: LeaveStatus) {
		return status[0].toUpperCase() + status.slice(1);
	}
</script>

<div class="flex flex-col gap-6 bg-white p-6 text-[#222626]">
	<div class="flex items-center gap-2">
		<Sidebar.Trigger class="-ms-1" />
		<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
		<div>
			<h1 class="text-2xl leading-8 font-medium">Leave Management</h1>
			<p class="text-[13px] leading-5 text-[#687976]">
				Manage leave requests, balances, and approvals.
			</p>
		</div>
	</div>

	<Tabs.Root value="my-leave">
		<Tabs.List>
			<Tabs.Trigger value="my-leave">My Leave</Tabs.Trigger>
			{#if data.isAdmin}
				<Tabs.Trigger value="team-requests">Team Requests</Tabs.Trigger>
			{/if}
		</Tabs.List>

		<Tabs.Content value="my-leave" class="mt-4 space-y-6">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<Card class="border-[#EBEEEE] shadow-none">
					<CardHeader class="pb-2">
						<CardTitle class="text-[13px] leading-5 font-normal text-[#687976]"
							>Accrued Balance</CardTitle
						>
					</CardHeader>
					<CardContent>
						<div class="text-2xl leading-8 font-medium text-[#222626]">{data.stats.balance}</div>
						<p class="text-[13px] leading-5 text-[#687976]">1 day/month after probation</p>
					</CardContent>
				</Card>
				<Card class="border-[#EBEEEE] shadow-none">
					<CardHeader class="pb-2">
						<CardTitle class="text-[13px] leading-5 font-normal text-[#687976]"
							>Used This Year</CardTitle
						>
					</CardHeader>
					<CardContent>
						<div class="text-2xl leading-8 font-medium text-[#222626]">{data.stats.used}</div>
					</CardContent>
				</Card>
				<Card class="border-[#EBEEEE] shadow-none">
					<CardHeader class="pb-2">
						<CardTitle class="text-[13px] leading-5 font-normal text-[#687976]">Status</CardTitle>
					</CardHeader>
					<CardContent>
						<Badge variant={data.stats.onProbation ? 'outline' : 'secondary'}>
							{data.stats.onProbation ? 'Probation (0 Balance)' : 'Permanent'}
						</Badge>
					</CardContent>
				</Card>
			</div>

			<Card class="border-[#EBEEEE] shadow-none">
				<CardHeader>
					<CardTitle>Request Leave</CardTitle>
					<CardDescription>Submit a new leave request for approval.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div class="space-y-2">
							<Label>Type</Label>
							<Input bind:value={leaveForm.type} class="h-8 border-[#D4D9D9]" />
						</div>
						<div class="space-y-2">
							<Label>Start Date</Label>
							<Input type="date" bind:value={leaveForm.startDate} class="h-8 border-[#D4D9D9]" />
						</div>
						<div class="space-y-2">
							<Label>End Date</Label>
							<Input type="date" bind:value={leaveForm.endDate} class="h-8 border-[#D4D9D9]" />
						</div>
					</div>
					<div class="space-y-2">
						<Label>Reason</Label>
						<Input
							placeholder="Brief reason for leave"
							bind:value={leaveForm.reason}
							class="h-8 border-[#D4D9D9]"
						/>
					</div>
					<Button
						disabled={data.stats.onProbation || submitting}
						class="h-8 border border-black/5 bg-[#222626] text-sm text-white"
						onclick={submitLeave}
					>
						{submitting ? 'Submitting...' : 'Submit Request'}
					</Button>
				</CardContent>
			</Card>

			<Card class="border-[#EBEEEE] shadow-none">
				<CardHeader>
					<CardTitle>My Requests</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="rounded-md border border-[#EBEEEE] bg-white">
						<Table>
							<TableHeader>
								<TableRow class="bg-[#FBF9F8]">
									<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Type</TableHead>
									<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Dates</TableHead>
									<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Days</TableHead>
									<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#if data.myRequests.length === 0}
									<TableRow
										><TableCell colspan={4} class="h-24 text-center text-[13px] text-[#687976]"
											>No requests yet.</TableCell
										></TableRow
									>
								{:else}
									{#each data.myRequests as req (req.id)}
										<TableRow>
											<TableCell class="text-[13px]">{req.type}</TableCell>
											<TableCell class="text-[13px]">{req.startDate} to {req.endDate}</TableCell>
											<TableCell class="text-[13px]">{req.days}</TableCell>
											<TableCell>
												<Badge
													variant={req.status === 'approved'
														? 'secondary'
														: req.status === 'pending'
															? 'outline'
															: 'destructive'}
												>
													{formatStatus(req.status)}
												</Badge>
											</TableCell>
										</TableRow>
									{/each}
								{/if}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</Tabs.Content>

		{#if data.isAdmin}
			<Tabs.Content value="team-requests" class="mt-4">
				<div class="rounded-md border border-[#EBEEEE] bg-white">
					<Table>
						<TableHeader>
							<TableRow class="bg-[#FBF9F8]">
								<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Employee</TableHead>
								<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Type</TableHead>
								<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Dates</TableHead>
								<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Status</TableHead>
								<TableHead class="h-9 text-right text-[13px] font-normal text-[#687976]"
									>Actions</TableHead
								>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#if data.teamRequests.length === 0}
								<TableRow>
									<TableCell colspan={5} class="h-24 text-center text-[13px] text-[#687976]"
										>No leave requests found.</TableCell
									>
								</TableRow>
							{:else}
								{#each data.teamRequests as req (req.id)}
									<TableRow>
										<TableCell class="text-[13px] font-medium">{req.employeeName}</TableCell>
										<TableCell class="text-[13px]">{req.type}</TableCell>
										<TableCell class="text-[13px]">{req.startDate} to {req.endDate}</TableCell>
										<TableCell>
											<Badge
												variant={req.status === 'approved'
													? 'secondary'
													: req.status === 'pending'
														? 'outline'
														: 'destructive'}
											>
												{formatStatus(req.status)}
											</Badge>
										</TableCell>
										<TableCell class="text-right">
											{#if req.status === 'pending'}
												<Button
													variant="ghost"
													size="sm"
													class="h-6 border border-[#EBEEEE] text-xs"
													disabled={processingId === req.id}
													onclick={() => handleAction(req.id, 'approved')}
												>
													Approve
												</Button>
												<Button
													variant="ghost"
													size="sm"
													class="h-6 border border-[#EBEEEE] text-xs text-[#DC2626]"
													disabled={processingId === req.id}
													onclick={() => handleAction(req.id, 'rejected')}
												>
													Reject
												</Button>
											{:else}
												<span class="text-xs text-muted-foreground">Processed</span>
											{/if}
										</TableCell>
									</TableRow>
								{/each}
							{/if}
						</TableBody>
					</Table>
				</div>
			</Tabs.Content>
		{/if}
	</Tabs.Root>
</div>
