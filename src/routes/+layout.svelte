<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import SEO from '@/components/seo.svelte';
	import Sonner from '@/components/ui/sonner/sonner.svelte';
	import { FirebaseApp } from 'svelte-firekit';
	import './layout.css';
	import {
		PUBLIC_FIREBASE_API_KEY,
		PUBLIC_FIREBASE_AUTH_DOMAIN,
		PUBLIC_FIREBASE_PROJECT_ID,
		PUBLIC_FIREBASE_STORAGE_BUCKET,
		PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
		PUBLIC_FIREBASE_APP_ID,
		PUBLIC_FIREBASE_MEASUREMENT_ID
	} from '$env/static/public';

	const firebaseConfig = {
		apiKey: PUBLIC_FIREBASE_API_KEY,
		authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
		projectId: PUBLIC_FIREBASE_PROJECT_ID,
		storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
		messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
		appId: PUBLIC_FIREBASE_APP_ID,
		measurementId: PUBLIC_FIREBASE_MEASUREMENT_ID
	};

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
<FirebaseApp config={firebaseConfig}>
	{@render children()}
</FirebaseApp>
<Sonner richColors />
