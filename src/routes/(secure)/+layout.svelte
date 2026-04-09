<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Sonner from '@/components/ui/sonner/sonner.svelte';
	import { AuthGuard } from 'svelte-firekit';
	import { dev } from '$app/environment';

	let { children, data } = $props();
</script>

{#if dev}
	<Sidebar.Provider>
		<AppSidebar {data} />
		<Sidebar.Inset>
			{@render children?.()}
		</Sidebar.Inset>
	</Sidebar.Provider>
	<Sonner richColors />
{:else}
	<AuthGuard requireAuth={true} redirectTo="/">
		<Sidebar.Provider>
			<AppSidebar {data} />
			<Sidebar.Inset>
				{@render children?.()}
			</Sidebar.Inset>
		</Sidebar.Provider>
		<Sonner richColors />
	</AuthGuard>
{/if}
