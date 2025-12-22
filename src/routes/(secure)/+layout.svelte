<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { AuthGuard } from 'svelte-firekit';
	let { children } = $props();
</script>

<AuthGuard requireAuth={true} redirectTo="/">
	<Sidebar.Provider>
		<AppSidebar />
		<Sidebar.Inset>
			{@render children?.()}
		</Sidebar.Inset>
	</Sidebar.Provider>
</AuthGuard>
