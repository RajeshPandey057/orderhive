<script lang="ts">
	let {
		title,
		description = ''
	}: {
		title: string;
		description?: string;
	} = $props();
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
	<div class="flex w-full items-center gap-2 px-4">
		<div>
			<h1 class="text-2xl font-medium">{title}</h1>
			{#if description}
				<p class="text-[13px] leading-5 text-[#687976]">{description}</p>
			{/if}
		</div>
	</div>
</header>
