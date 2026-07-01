<script lang="ts">
	import EditSaleSheet from '$lib/components/edit-sale-sheet.svelte';
	import SecurePageHeader from '$lib/components/secure-page-header.svelte';

	let { data } = $props();
</script>

<SecurePageHeader title="Edit Sale" />

<EditSaleSheet sale={data.sale} userRole={data?.user?.role} />
