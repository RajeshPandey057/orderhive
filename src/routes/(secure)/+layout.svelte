<script lang="ts">
	import type { Snippet } from 'svelte';
	import { AuthGuard } from 'svelte-firekit';

	interface Props {
		children?: Snippet;
	}
	let { children }: Props = $props();
</script>

<AuthGuard requireAuth={true} redirectTo="/">
	<h1>layout</h1>
	{@render children?.()}
</AuthGuard>
