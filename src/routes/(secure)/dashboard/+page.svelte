<script lang="ts">
	import { goto } from '$app/navigation';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import { getRoleContext } from '@/auth/role.svelte';
	import { onMount } from 'svelte';

	const roleManager = getRoleContext();

	// Redirect to role-specific dashboard on mount
	onMount(() => {
		const targetRoute = roleManager.getDefaultRoute();
		if (targetRoute !== '/dashboard') {
			goto(targetRoute, { replaceState: true });
		}
	});
</script>

<div class="flex min-h-svh items-center justify-center">
	<div class="flex flex-col items-center gap-4">
		<Spinner class="size-8" />
		<p class="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
	</div>
</div>
