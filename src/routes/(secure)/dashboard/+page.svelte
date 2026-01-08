<script lang="ts">
	import { goto } from '$app/navigation';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import { getDefaultRoute } from '@/constants';
	import { onMount } from 'svelte';

	let { data } = $props();

	// Redirect to role-specific dashboard on mount
	onMount(() => {
		if (data?.user?.role) {
			const targetRoute = getDefaultRoute(data.user.role);
			if (targetRoute !== '/dashboard') {
				goto(targetRoute, { replaceState: true });
			}
		}
	});
</script>

<div class="flex min-h-svh items-center justify-center">
	<div class="flex flex-col items-center gap-4">
		<Spinner class="size-8" />
		<p class="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
	</div>
</div>
