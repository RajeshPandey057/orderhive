<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Field, FieldDescription, FieldGroup } from '$lib/components/ui/field/index.js';
	import Logo from '$lib/svg/logo.svelte';
	import { cn } from '$lib/utils.js';
	import DeviconGoogle from '~icons/devicon/google';

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
								<Button variant="outline" href="/admin/dashboard">
									<DeviconGoogle />
									Login with Google (Demo)
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
