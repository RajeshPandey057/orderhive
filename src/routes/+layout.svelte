<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import SEO from '@/components/seo.svelte';
	import Sonner from '@/components/ui/sonner/sonner.svelte';
	import { FirebaseApp } from 'svelte-firekit';
	import './layout.css';

	let { children } = $props();

	function preventCopy(e: Event) {
		e.preventDefault();
		return false;
	}

	function preventContextMenu(e: Event) {
		e.preventDefault();
		return false;
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:body oncopy={preventCopy} oncut={preventCopy} oncontextmenu={preventContextMenu} />

<SEO
	title="OrderHive - Indglobal Realty Order Management"
	description="Streamline your real estate sales operations with OrderHive. Manage orders, track sales, ensure compliance, and coordinate teams efficiently for Indglobal Realty."
	image="/og.png"
/>
<!-- <ModeWatcher /> -->
<FirebaseApp>
	{@render children()}
</FirebaseApp>
<Sonner richColors />
