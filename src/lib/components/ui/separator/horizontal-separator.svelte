<script lang="ts">
	import { cn } from '@/utils';

	interface Props {
		text?: string;
		class?: string;
	}

	let { text, class: className }: Props = $props();
</script>

<div class={cn('relative flex h-full items-center', className)}>
	<!-- Line -->
	<div class="h-full w-px bg-border"></div>

	{#if text}
		<!-- Text -->
		<span
			class="
        absolute left-1/2 -translate-x-1/2
        bg-background px-2 text-xs whitespace-nowrap
        text-muted-foreground
      "
		>
			{text}
		</span>
	{/if}
</div>
