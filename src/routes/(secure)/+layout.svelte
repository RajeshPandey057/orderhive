<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { navigating } from '$app/state';
	import { AuthGuard } from 'svelte-firekit';

	let { children, data } = $props();
</script>

<AuthGuard requireAuth={true} redirectTo="/">
	<Sidebar.Provider open={false}>
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
		height: 2px;
		width: 100%;
		overflow: hidden;
		background: transparent;
	}

	.nav-bar {
		height: 100%;
		width: 40%;
		min-width: 120px;
		background: var(--color-primary);
		opacity: 0.85;
		animation: nav-slide 1.1s ease-in-out infinite;
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
