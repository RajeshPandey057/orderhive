<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { navigating } from '$app/state';
	import { AuthGuard } from 'svelte-firekit';
	import { goto } from '$app/navigation';

	let { children, data } = $props();
</script>

<AuthGuard requireAuth={true} onUnauthorized={() => goto('/')}>
	<Sidebar.Provider open={true}>
		<AppSidebar {data} />
		<Sidebar.Inset>
			<div class="nav-track" aria-hidden="true">
				{#if navigating.to}
					<div class="nav-bar"></div>
				{/if}
			</div>
			{@render children?.()}
		</Sidebar.Inset>
	</Sidebar.Provider>
</AuthGuard>

<style>
	.nav-track {
		position: sticky;
		top: 0;
		z-index: 50;
		height: 6px;
		width: 100%;
		overflow: hidden;
		background: color-mix(in oklab, var(--color-primary) 14%, transparent);
	}

	.nav-bar {
		height: 100%;
		width: 44%;
		min-width: 120px;
		background: var(--color-primary);
		box-shadow: 0 0 14px color-mix(in oklab, var(--color-primary) 70%, transparent);
		animation: nav-slide 0.95s ease-in-out infinite;
		will-change: transform;
	}

	@keyframes nav-slide {
		0% {
			transform: translateX(-160%);
		}
		100% {
			transform: translateX(320%);
		}
	}
</style>
