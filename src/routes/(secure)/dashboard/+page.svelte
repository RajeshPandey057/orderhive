<script lang="ts">
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AddSaleSheet from './add-sale-sheet.svelte';
</script>

<header class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
	<div class="flex w-full items-center justify-between gap-2 px-4">
		<div class="flex items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<h1 class="text-2xl font-medium">Sales Tracker</h1>
		</div>
		<AddSaleSheet />
	</div>
</header>
<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
	<div class="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min"></div>
</div>
