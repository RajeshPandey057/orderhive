<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		title: string;
		description: string;
		image?: string;
		canonical?: string;
		schemaType?: 'Website' | 'Organization' | 'LocalBusiness';
		schemaName?: string;
	}

	let {
		title,
		description,
		image = '/images/services/bodyshop.webp',
		canonical,
		schemaType = 'Website',
		schemaName
	}: Props = $props();

	// Generate canonical URL - use provided or current page path
	const canonicalUrl = $derived(canonical || `https://expertscar.ae${page.url.pathname}`);

	// Generate full image URL if relative path provided
	const fullImageUrl = $derived(image.startsWith('http') ? image : `https://expertscar.ae${image}`);

	// Schema name defaults to title if not provided
	const schemaFullName = $derived(schemaName || `${title} | Experts Car Maintenance`);

	// Generate JSON-LD schema as string
	const schemaScript = $derived(
		'<script type="application/ld+json">' +
			JSON.stringify({
				'@context': 'https://schema.org',
				'@type': schemaType,
				name: schemaFullName,
				url: canonicalUrl,
				logo: fullImageUrl
			}) +
			'</scr' +
			'ipt>'
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />

	<!-- Open Graph Tags -->
	<meta property="og:site_name" content="Experts Car Maintenance" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />

	<!-- Twitter Card Tags -->
	<meta property="twitter:domain" content="expertscar.ae" />
	<meta property="twitter:url" content={canonicalUrl} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<!--  eslint-disable-next-line svelte/no-at-html-tags -->
	{@html schemaScript}
</svelte:head>

<!-- JSON-LD Schema -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
