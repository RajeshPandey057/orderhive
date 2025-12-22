<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Field, FieldDescription, FieldGroup } from '$lib/components/ui/field/index.js';
	import Logo from '$lib/svg/logo.svelte';
	import { cn } from '$lib/utils.js';
	import { firekitAuth, firekitUser } from 'svelte-firekit';
	import DeviconGoogle from '~icons/devicon/google';
	import SvgLoader from '~icons/svg-spinners/gooey-balls-2';
	let loading = $state(false);
	async function onclick() {
		try {
			// Sign in with Google
			loading = true;
			if (firekitUser.initialized && !firekitUser.uid) {
				await firekitAuth.signInWithGoogle();
				goto('/dashboard');
			}
		} catch (error) {
			console.error('Authentication failed:', error);
		}
	}
</script>

<div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
	<div class="flex w-full max-w-sm flex-col gap-6">
		<div class={cn('flex flex-col gap-6')}>
			<Card.Root>
				<Card.Header class="text-center">
					<Card.Title class="mx-auto my-4"
						><a href="##">
							<Logo />
						</a></Card.Title
					>
					<Card.Description>Login with your @indglobal Google account</Card.Description>
				</Card.Header>
				<Card.Content>
					<form>
						<FieldGroup>
							<Field>
								<Button variant="outline" type="button" {onclick}>
									{#if firekitUser.loading || !firekitUser.initialized || loading}
										<SvgLoader />
									{:else}
										<DeviconGoogle />
										Login with Google{/if}
								</Button>
							</Field>
						</FieldGroup>
					</form>
				</Card.Content>
			</Card.Root>
			<FieldDescription class="px-6 text-center">
				By clicking continue, you agree to our <a href="##">Terms of Service</a>
				and <a href="##">Privacy Policy</a>.
			</FieldDescription>
		</div>
	</div>
</div>
