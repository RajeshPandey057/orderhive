<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { toast } from 'svelte-sonner';
	import Loader2 from '~icons/lucide/loader-2';
	import { submitReferralAgreement } from '../../routes/(secure)/agent/sales-tracker/referral.remote';

	let {
		open = $bindable(false),
		buyerData
	}: {
		open?: boolean;
		buyerData?: { firstName?: string; lastName?: string; email?: string };
	} = $props();

	// Pre-fill form data with defaults
	$effect(() => {
		if (open) {
			submitReferralAgreement.fields.agencyName.set('I N D GLOBAL REAL ESTATE L.L.C');
			submitReferralAgreement.fields.tradeLicense.set('1232144');
			submitReferralAgreement.fields.firstPartyName.set('I N D GLOBAL REAL ESTATE L.LC');
			submitReferralAgreement.fields.firstPartySignature.set('Meet Shah');

			// Pre-fill buyer data if available
			if (buyerData) {
				const fullName = `${buyerData.firstName || ''} ${buyerData.lastName || ''}`.trim();
				submitReferralAgreement.fields.referrerName.set(fullName);
				submitReferralAgreement.fields.secondPartyName.set(fullName);
				submitReferralAgreement.fields.referrerEmail.set(buyerData.email || '');
			}

			// Set current date
			const today = new Date();
			const formattedDate = today.toLocaleDateString('en-GB', {
				day: '2-digit',
				month: 'short',
				year: 'numeric'
			});
			submitReferralAgreement.fields.agreementDate.set(formattedDate);
			submitReferralAgreement.fields.firstPartyDate.set(formattedDate);
			submitReferralAgreement.fields.secondPartyDate.set(formattedDate);
		}
	});
</script>

<Sheet.Root bind:open>
	<Sheet.Content class="w-full overflow-y-auto p-4 sm:max-w-2xl">
		<Sheet.Header>
			<Sheet.Title>Referral Agreement</Sheet.Title>
			<Sheet.Description>
				Complete all required fields to generate and send the referral agreement via DocuSign.
			</Sheet.Description>
		</Sheet.Header>

		<form
			class="flex flex-col gap-6 py-6"
			{...submitReferralAgreement.enhance(async ({ submit }) => {
				await submit();

				const issues = submitReferralAgreement.fields.allIssues();
				if (issues && issues.length > 0) {
					toast.error('Please fix all validation errors before submitting.');
					return;
				}

				toast.success('Referral agreement submitted successfully!');
				open = false;
			})}
		>
			<!-- Agreement Header -->
			<Field.Set>
				<Field.Legend class="text-base font-semibold">Agreement Information</Field.Legend>
				<Field.Group class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label>Serial Number</Field.Label>
							<Input {...submitReferralAgreement.fields.srNo.as('text')} placeholder="e.g., 619" />
							{#each submitReferralAgreement.fields.srNo.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Agreement Date</Field.Label>
							<Input
								{...submitReferralAgreement.fields.agreementDate.as('text')}
								placeholder="19th Feb 2026"
							/>
							{#each submitReferralAgreement.fields.agreementDate.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
					<Field.Field>
						<Field.Label>Real Estate Agency Name</Field.Label>
						<Input
							{...submitReferralAgreement.fields.agencyName.as('text')}
							placeholder="Agency name"
						/>
						{#each submitReferralAgreement.fields.agencyName.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
					<Field.Field>
						<Field.Label>Trade License Number</Field.Label>
						<Input
							{...submitReferralAgreement.fields.tradeLicense.as('text')}
							placeholder="Trade license"
						/>
						{#each submitReferralAgreement.fields.tradeLicense.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
				</Field.Group>
			</Field.Set>

			<!-- Referrer Information -->
			<Field.Set>
				<Field.Legend class="text-base font-semibold">Referrer Information</Field.Legend>
				<Field.Group class="space-y-4">
					<Field.Field>
						<Field.Label>Referrer Name</Field.Label>
						<Input
							{...submitReferralAgreement.fields.referrerName.as('text')}
							placeholder="Full name"
						/>
						{#each submitReferralAgreement.fields.referrerName.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label>EID Number</Field.Label>
							<Input
								{...submitReferralAgreement.fields.eidNo.as('text')}
								placeholder="784-1979-7049306-6"
							/>
							{#each submitReferralAgreement.fields.eidNo.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Nationality</Field.Label>
							<Input
								{...submitReferralAgreement.fields.referrerNationality.as('text')}
								placeholder="Country"
							/>
							{#each submitReferralAgreement.fields.referrerNationality.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
				</Field.Group>
			</Field.Set>

			<!-- Referral Details -->
			<Field.Set>
				<Field.Legend class="text-base font-semibold">Referral Details</Field.Legend>
				<Field.Group class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label>Referral Fee Percentage</Field.Label>
							<Input
								{...submitReferralAgreement.fields.referralFeePct.as('text')}
								placeholder="e.g., 2%"
							/>
							{#each submitReferralAgreement.fields.referralFeePct.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Property Name</Field.Label>
							<Input
								{...submitReferralAgreement.fields.propertyName.as('text')}
								placeholder="e.g., Terra Woods by Emaar"
							/>
							{#each submitReferralAgreement.fields.propertyName.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
				</Field.Group>
			</Field.Set>

			<!-- First Party (IND Global) -->
			<Field.Set>
				<Field.Legend class="text-base font-semibold">First Party (IND Global)</Field.Legend>
				<Field.Group class="space-y-4">
					<Field.Field>
						<Field.Label>First Party Name</Field.Label>
						<Input
							{...submitReferralAgreement.fields.firstPartyName.as('text')}
							placeholder="Company name"
						/>
						{#each submitReferralAgreement.fields.firstPartyName.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label>First Party Signature</Field.Label>
							<Input
								{...submitReferralAgreement.fields.firstPartySignature.as('text')}
								placeholder="Type name for signature"
							/>
							{#each submitReferralAgreement.fields.firstPartySignature.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>First Party Date</Field.Label>
							<Input
								{...submitReferralAgreement.fields.firstPartyDate.as('text')}
								placeholder="19 Feb 2026"
							/>
							{#each submitReferralAgreement.fields.firstPartyDate.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
				</Field.Group>
			</Field.Set>

			<!-- Second Party (Referrer) -->
			<Field.Set>
				<Field.Legend class="text-base font-semibold">Second Party (Referrer)</Field.Legend>
				<Field.Group class="space-y-4">
					<Field.Field>
						<Field.Label>Second Party Name</Field.Label>
						<Input
							{...submitReferralAgreement.fields.secondPartyName.as('text')}
							placeholder="Referrer name"
						/>
						{#each submitReferralAgreement.fields.secondPartyName.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label>Second Party Signature</Field.Label>
							<Input
								{...submitReferralAgreement.fields.secondPartySignature.as('text')}
								placeholder="Type name for signature"
							/>
							{#each submitReferralAgreement.fields.secondPartySignature.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Second Party Date</Field.Label>
							<Input
								{...submitReferralAgreement.fields.secondPartyDate.as('text')}
								placeholder="19 Feb 2026"
							/>
							{#each submitReferralAgreement.fields.secondPartyDate.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
				</Field.Group>
			</Field.Set>

			<!-- Hidden email field for form-kit -->
			<input class="sr-only" {...submitReferralAgreement.fields.referrerEmail.as('text')} />

			<!-- Submit Button -->
			<div class="flex gap-3 pt-4">
				<Button type="submit" class="flex-1" disabled={!!submitReferralAgreement.pending}>
					{#if submitReferralAgreement.pending}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Sending Referral Agreement via email...
					{:else}
						Generate & Send Referral Agreement
					{/if}
				</Button>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
			</div>

			{#each submitReferralAgreement.fields.allIssues() as issue, i (i)}
				<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
			{/each}
		</form>
	</Sheet.Content>
</Sheet.Root>
