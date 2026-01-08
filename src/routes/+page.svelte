<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Field, FieldDescription, FieldGroup } from '$lib/components/ui/field/index.js';
	import Logo from '$lib/svg/logo.svelte';
	import { cn } from '$lib/utils.js';
	import { firekitAuth, firekitUser } from 'svelte-firekit';
	import { toast } from 'svelte-sonner';
	import DeviconGoogle from '~icons/devicon/google';
	import SvgLoader from '~icons/svg-spinners/gooey-balls-2';
	import { authenticatedRedirect } from './auth.remote';

	let loading = $state(false);
	let hasRedirected = $state(false);

	// Show error from URL params (from server redirect)
	$effect(() => {
		const error = page.url.searchParams.get('error');
		if (error) {
			toast.error('Access Denied', {
				description: decodeURIComponent(error),
				duration: 8000
			});
			// Clear the error from URL
			const url = new URL(page.url);
			url.searchParams.delete('error');
			history.replaceState({}, '', url);
		}
	});

	async function onclick() {
		try {
			loading = true;
			// Sign in with Google
			await firekitAuth.signInWithGoogle();
		} catch (error) {
			console.error('Authentication failed:', error);
			toast.error('Login failed', {
				description: 'Could not sign in with Google. Please try again.'
			});
			loading = false;
		}
	}

	// Handle authentication after sign-in
	$effect(() => {
		if (hasRedirected) return;
		if (
			!firekitUser.initialized ||
			!firekitUser.uid ||
			!firekitUser.email ||
			!firekitAuth.getCurrentUser()?.uid
		)
			return;

		// User is logged in, authenticate with server
		hasRedirected = true;
		loading = true;

		authenticatedRedirect({ uid: firekitUser.uid, email: firekitUser.email })
			.then(async (result) => {
				if (result?.success && result.redirectUrl) {
					// Redirect to dashboard
					goto(result.redirectUrl);
				} else {
					// Auth failed - sign out and show error
					toast.error('Access Denied', {
						description: result?.error || 'You are not authorized to access this application.',
						duration: 8000
					});
					await firekitAuth.signOut();
					hasRedirected = false;
					loading = false;
				}
			})
			.catch(async (err: Error) => {
				console.error('Auth redirect error:', err);
				toast.error('Error', {
					description: 'Something went wrong. Please try again.'
				});
				await firekitAuth.signOut();
				hasRedirected = false;
				loading = false;
			});
	});
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
