<script lang="ts">
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import FileSearch from '~icons/lucide/file-search';
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
	<div class="flex w-full items-center gap-2 px-4">
		<div class="flex items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<h1 class="text-2xl font-medium">View Listings</h1>
		</div>
	</div>
</header>

<div class="flex flex-1 items-center justify-center p-4 pt-0">
	<div class="flex min-h-100 w-full items-center justify-center rounded-xl bg-muted/50">
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon">
					<FileSearch class="h-8 w-8" />
				</Empty.Media>
				<Empty.Title>View Listings Coming Soon</Empty.Title>
				<Empty.Description>This page is intentionally blank for now.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	</div>
</div>
