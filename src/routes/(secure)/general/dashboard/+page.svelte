<script lang="ts">
	import SecurePageHeader from '$lib/components/secure-page-header.svelte';

	let { data } = $props();

	const firstName = $derived(data.user?.email?.split('@')[0] ?? 'there');
</script>

<SecurePageHeader title="Dashboard" />

<div class="flex flex-col gap-6 p-6">
	<div>
		<h2 class="text-xl font-semibold">Welcome, {firstName}!</h2>
		<p class="text-muted-foreground mt-1">Here's a quick overview of what you can access.</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<a
			href="/my-attendance"
			class="bg-card border rounded-lg p-5 hover:border-primary transition-colors"
		>
			<h3 class="font-semibold">My Attendance</h3>
			<p class="text-muted-foreground text-sm mt-1">View your attendance history and punch records.</p>
		</a>

		<a
			href="/leave"
			class="bg-card border rounded-lg p-5 hover:border-primary transition-colors"
		>
			<h3 class="font-semibold">My Leaves</h3>
			<p class="text-muted-foreground text-sm mt-1">Apply for leave and track your leave balance.</p>
		</a>

		<a
			href="/holidays"
			class="bg-card border rounded-lg p-5 hover:border-primary transition-colors"
		>
			<h3 class="font-semibold">Holiday Calendar</h3>
			<p class="text-muted-foreground text-sm mt-1">View upcoming public holidays and office closures.</p>
		</a>
	</div>
</div>
