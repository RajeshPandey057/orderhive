<script lang="ts">
	import SecurePageHeader from '$lib/components/secure-page-header.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import LayoutDashboard from '~icons/lucide/layout-dashboard';
	import ReceiptText from '~icons/lucide/receipt-text';
</script>

<SecurePageHeader title="Sales Dashboard" description="Admin control panel landing page." />

<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
	<div class="flex min-h-100 items-center justify-center rounded-xl bg-muted/50">
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon">
					<LayoutDashboard class="h-8 w-8" />
				</Empty.Media>
				<Empty.Title>Sales Dashboard</Empty.Title>
				<Empty.Description>
					Use the control panel menu to manage deals, listings, teams, attendance, and learning.
				</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button href="/admin/all-sales" variant="outline">
					<ReceiptText class="size-4" />
					View All Sales/Deals
				</Button>
			</Empty.Content>
		</Empty.Root>
	</div>
</div>
