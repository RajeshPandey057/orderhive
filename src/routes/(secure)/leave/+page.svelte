<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
    import * as Tabs from '$lib/components/ui/tabs';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';

	let leaveRequests = $state([
		{ id: 1, name: 'John Doe', type: 'Casual', start: '2026-05-01', end: '2026-05-02', status: 'Pending', reason: 'Family event' },
		{ id: 2, name: 'Jane Smith', type: 'Casual', start: '2026-04-20', end: '2026-04-20', status: 'Approved', reason: 'Medical' }
	]);

    let employeeStats = {
        accrued: 4,
        used: 1,
        balance: 3,
        onProbation: false
    };

	function handleAction(id: number, status: 'Approved' | 'Rejected') {
		const index = leaveRequests.findIndex((r) => r.id === id);
		leaveRequests[index].status = status;
	}
</script>

<div class="flex flex-col gap-6 bg-white p-6 text-[#222626]">
	<div>
		<h1 class="text-2xl leading-8 font-medium">Leave Management</h1>
		<p class="text-[13px] leading-5 text-[#687976]">Manage leave requests, balances, and accruals.</p>
	</div>

	<Tabs.Root value="my-leave">
		<Tabs.List>
			<Tabs.Trigger value="my-leave">My Leave</Tabs.Trigger>
			<Tabs.Trigger value="team-requests">Team Requests (Manager)</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="my-leave" class="mt-4 space-y-6">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<Card class="border-[#EBEEEE] shadow-none">
					<CardHeader class="pb-2">
						<CardTitle class="text-[13px] leading-5 font-normal text-[#687976]">Accrued Balance</CardTitle>
					</CardHeader>
					<CardContent>
						<div class="text-2xl leading-8 font-medium text-[#222626]">
							{employeeStats.onProbation ? 0 : employeeStats.balance}
						</div>
						<p class="text-[13px] leading-5 text-[#687976]">+1 day/month accrual</p>
					</CardContent>
				</Card>
				<Card class="border-[#EBEEEE] shadow-none">
					<CardHeader class="pb-2">
						<CardTitle class="text-[13px] leading-5 font-normal text-[#687976]">Used This Year</CardTitle>
					</CardHeader>
					<CardContent>
						<div class="text-2xl leading-8 font-medium text-[#222626]">{employeeStats.used}</div>
					</CardContent>
				</Card>
				<Card class="border-[#EBEEEE] shadow-none">
					<CardHeader class="pb-2">
						<CardTitle class="text-[13px] leading-5 font-normal text-[#687976]">Status</CardTitle>
					</CardHeader>
					<CardContent>
						<Badge variant={employeeStats.onProbation ? "outline" : "secondary"}>
                            {employeeStats.onProbation ? "Probation (0 Balance)" : "Permanent"}
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
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div class="space-y-2">
                            <Label>Start Date</Label>
							<Input type="date" class="h-8 border-[#D4D9D9]" />
                        </div>
                        <div class="space-y-2">
                            <Label>End Date</Label>
							<Input type="date" class="h-8 border-[#D4D9D9]" />
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label>Reason</Label>
						<Input placeholder="Brief reason for leave" class="h-8 border-[#D4D9D9]" />
                    </div>
					<Button
						disabled={employeeStats.onProbation}
						class="h-8 border border-black/5 bg-[#222626] text-sm text-white"
					>
						Submit Request
					</Button>
                </CardContent>
            </Card>
		</Tabs.Content>

		<Tabs.Content value="team-requests" class="mt-4">
			<div class="rounded-md border border-[#EBEEEE] bg-white">
				<Table>
					<TableHeader>
						<TableRow class="bg-[#FBF9F8]">
							<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Employee</TableHead>
							<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Type</TableHead>
							<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Dates</TableHead>
							<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Status</TableHead>
							<TableHead class="h-9 text-right text-[13px] leading-5 font-normal text-[#687976]">
								Actions
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each leaveRequests as req}
							<TableRow>
								<TableCell class="text-[13px] leading-5 font-medium">{req.name}</TableCell>
								<TableCell class="text-[13px] leading-5">{req.type}</TableCell>
								<TableCell class="text-[13px] leading-5">{req.start} to {req.end}</TableCell>
								<TableCell>
									<Badge variant={req.status === 'Approved' ? 'secondary' : req.status === 'Pending' ? 'outline' : 'destructive'}>
										{req.status}
									</Badge>
								</TableCell>
								<TableCell class="text-right">
									{#if req.status === 'Pending'}
										<Button
											variant="ghost"
											size="sm"
											class="h-6 border border-[#EBEEEE] text-xs text-[#222626]"
											onclick={() => handleAction(req.id, 'Approved')}
										>
											Approve
										</Button>
										<Button
											variant="ghost"
											size="sm"
											class="h-6 border border-[#EBEEEE] text-xs text-[#DC2626]"
											onclick={() => handleAction(req.id, 'Rejected')}
										>
											Reject
										</Button>
									{:else}
                                        <span class="text-xs text-muted-foreground">Processed</span>
                                    {/if}
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>
