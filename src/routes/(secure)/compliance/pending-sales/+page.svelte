<script lang="ts">
	import { page } from '$app/state';
	import { useRole } from '$lib/auth/roles.svelte';

	const roleContext = useRole();
</script>

<div class="flex flex-col gap-4 p-6">
	<h1 class="text-3xl font-bold">Pending Sales</h1>
	<p class="text-muted-foreground">
		Current Role: <span class="font-semibold text-foreground">{roleContext().role?.accessType}</span
		>
	</p>
	<p class="text-muted-foreground">
		Current URL: <span class="font-mono text-sm text-foreground">{page.url.pathname}</span>
	</p>
</div>
