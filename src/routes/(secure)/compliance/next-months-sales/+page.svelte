<script lang="ts">
	import { page } from '$app/state';
	import { getRoleContext } from '@/auth/role.svelte';

	const roleManager = getRoleContext();
</script>

<div class="flex flex-col gap-4 p-6">
	<h1 class="text-3xl font-bold">Next Month's Sales</h1>
	<p class="text-muted-foreground">
		Current Role: <span class="font-semibold text-foreground">{roleManager.role}</span>
		>
	</p>
	<p class="text-muted-foreground">
		Current URL: <span class="font-mono text-sm text-foreground">{page.url.pathname}</span>
	</p>
</div>
