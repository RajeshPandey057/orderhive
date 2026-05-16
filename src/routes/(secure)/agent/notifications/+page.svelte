<script lang="ts">
	import { page } from '$app/state';
	import SecurePageHeader from '$lib/components/secure-page-header.svelte';

	let { data } = $props();
</script>

<SecurePageHeader title="Notifications" />

<div class="flex flex-col gap-4 p-6">
	<p class="text-muted-foreground">
		Current Role: <span class="font-semibold text-foreground">{data?.user?.role}</span>
		>
	</p>
	<p class="text-muted-foreground">
		Current URL: <span class="font-mono text-sm text-foreground">{page.url.pathname}</span>
	</p>
</div>
