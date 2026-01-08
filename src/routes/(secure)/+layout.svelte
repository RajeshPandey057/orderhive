<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Sonner from '@/components/ui/sonner/sonner.svelte';
	import { AuthGuard } from 'svelte-firekit';

	let { children, data } = $props();
</script>

<AuthGuard requireAuth={true} redirectTo="/">
	<Sidebar.Provider>
		<AppSidebar {data} />
		<Sidebar.Inset>
			{@render children?.()}
		</Sidebar.Inset>
	</Sidebar.Provider>
	<Sonner richColors />
</AuthGuard>
