<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import SEO from '@/components/seo.svelte';
	import Sonner from '@/components/ui/sonner/sonner.svelte';
	import { FirebaseApp } from 'svelte-firekit';
	import './layout.css';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<SEO
	title="Latest Financial News & AI Insights"
	description="Stay updated with the latest financial news, market trends, and AI-powered analysis. Polygram delivers expert coverage on stocks, investments, and global finance."
	image="/images/financial-news/ai-insights.webp"
/>
<FirebaseApp>
	{@render children()}
</FirebaseApp>
<Sonner richColors />
