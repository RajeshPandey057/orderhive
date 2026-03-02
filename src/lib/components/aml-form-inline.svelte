<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { toast } from 'svelte-sonner';
	import Loader2 from '~icons/lucide/loader-2';
	import { submitAMLForm } from '../../routes/(secure)/agent/sales-tracker/aml.remote';

	let {
		open = $bindable(false),
		buyerData
	}: {
		open?: boolean;
		buyerData?: { firstName?: string; lastName?: string; email?: string; phone?: string };
	} = $props();

	// Pre-fill form data from buyer if available
	$effect(() => {
		if (buyerData && open) {
			submitAMLForm.fields.fullName.set(
				`${buyerData.firstName || ''} ${buyerData.lastName || ''}`.trim()
			);
			submitAMLForm.fields.emailAddress.set(buyerData.email || '');
			submitAMLForm.fields.contactNo.set(buyerData.phone || '');
		}
	});
</script>

<Sheet.Root bind:open>
	<Sheet.Content class="w-full overflow-y-auto p-4 sm:max-w-2xl">
		<Sheet.Header>
			<Sheet.Title>AML/KYC Form - Know Your Customer</Sheet.Title>
			<Sheet.Description>
				Complete all required fields to generate and send the AML form via DocuSign.
			</Sheet.Description>
		</Sheet.Header>

		<form
			class="flex flex-col gap-6 py-6"
			{...submitAMLForm.enhance(async ({ submit }) => {
				await submit();

				const issues = submitAMLForm.fields.allIssues();
				if (issues && issues.length > 0) {
					toast.error('Please fix all validation errors before submitting.');
					return;
				}

				toast.success('AML form submitted successfully!');
				open = false;
			})}
		>
			<!-- Date and Reference -->
			<Field.Set>
				<Field.Legend class="text-base font-semibold">Date and Reference</Field.Legend>
				<Field.Group class="grid grid-cols-2 gap-4">
					<Field.Field>
						<Field.Label>Date</Field.Label>
						<Input {...submitAMLForm.fields.date.as('text')} placeholder="e.g., 01 March 2026" />
						{#each submitAMLForm.fields.date.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
					<Field.Field>
						<Field.Label>Reference No.</Field.Label>
						<Input {...submitAMLForm.fields.referenceNo.as('text')} placeholder="REF-001" />
						{#each submitAMLForm.fields.referenceNo.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
				</Field.Group>
			</Field.Set>

			<!-- Personal Identity Information -->
			<Field.Set>
				<Field.Legend class="text-base font-semibold">Personal Identity Information</Field.Legend>
				<Field.Group class="space-y-4">
					<Field.Field>
						<Field.Label>Full Name (as per passport)</Field.Label>
						<Input {...submitAMLForm.fields.fullName.as('text')} placeholder="Full legal name" />
						{#each submitAMLForm.fields.fullName.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label>Passport/ID No.</Field.Label>
							<Input {...submitAMLForm.fields.passportIdNo.as('text')} placeholder="ID number" />
							{#each submitAMLForm.fields.passportIdNo.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Nationality</Field.Label>
							<Input {...submitAMLForm.fields.nationality.as('text')} placeholder="Country" />
							{#each submitAMLForm.fields.nationality.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
					<div class="grid grid-cols-3 gap-4">
						<Field.Field>
							<Field.Label>Date of Birth</Field.Label>
							<Input {...submitAMLForm.fields.dateOfBirth.as('text')} placeholder="DD/MM/YYYY" />
							{#each submitAMLForm.fields.dateOfBirth.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Marital Status</Field.Label>
							<Input
								{...submitAMLForm.fields.maritalStatus.as('text')}
								placeholder="Single/Married"
							/>
							{#each submitAMLForm.fields.maritalStatus.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Gender</Field.Label>
							<Input {...submitAMLForm.fields.gender.as('text')} placeholder="Male/Female" />
							{#each submitAMLForm.fields.gender.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
				</Field.Group>
			</Field.Set>

			<!-- Address and Contact Details -->
			<Field.Set>
				<Field.Legend class="text-base font-semibold">Address and Contact Details</Field.Legend>
				<Field.Group class="space-y-4">
					<Field.Field>
						<Field.Label>Resident Address</Field.Label>
						<Textarea
							{...submitAMLForm.fields.residentAddress.as('text')}
							placeholder="Current address"
						/>
						{#each submitAMLForm.fields.residentAddress.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
					<Field.Field>
						<Field.Label>Permanent Address</Field.Label>
						<Textarea
							{...submitAMLForm.fields.permanentAddress.as('text')}
							placeholder="Permanent address"
						/>
						{#each submitAMLForm.fields.permanentAddress.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label>Contact No.</Field.Label>
							<Input
								{...submitAMLForm.fields.contactNo.as('text')}
								placeholder="+971 XX XXX XXXX"
							/>
							{#each submitAMLForm.fields.contactNo.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Email Address</Field.Label>
							<Input
								{...submitAMLForm.fields.emailAddress.as('email')}
								placeholder="email@example.com"
							/>
							{#each submitAMLForm.fields.emailAddress.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
				</Field.Group>
			</Field.Set>

			<!-- Business and Occupational Details -->
			<Field.Set>
				<Field.Legend class="text-base font-semibold"
					>Business and Occupational Details</Field.Legend
				>
				<Field.Group class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label>Occupation</Field.Label>
							<Input {...submitAMLForm.fields.occupation.as('text')} placeholder="Job title" />
							{#each submitAMLForm.fields.occupation.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Company Name</Field.Label>
							<Input {...submitAMLForm.fields.companyName.as('text')} placeholder="Company name" />
							{#each submitAMLForm.fields.companyName.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
					<Field.Field>
						<Field.Label>Business Address</Field.Label>
						<Textarea
							{...submitAMLForm.fields.businessAddress.as('text')}
							placeholder="Business address"
						/>
						{#each submitAMLForm.fields.businessAddress.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label>Nature of Business</Field.Label>
							<Input
								{...submitAMLForm.fields.natureOfBusiness.as('text')}
								placeholder="Business type"
							/>
							{#each submitAMLForm.fields.natureOfBusiness.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Give Details (Optional)</Field.Label>
							<Input
								{...submitAMLForm.fields.giveDetails.as('text')}
								placeholder="Additional details"
							/>
							{#each submitAMLForm.fields.giveDetails.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
				</Field.Group>
			</Field.Set>

			<!-- Financial Details -->
			<Field.Set>
				<Field.Legend class="text-base font-semibold">Financial Details</Field.Legend>
				<Field.Group class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label>Annual Gross Income</Field.Label>
							<Input
								{...submitAMLForm.fields.annualGrossIncome.as('text')}
								placeholder="e.g., AED 500,000"
							/>
							{#each submitAMLForm.fields.annualGrossIncome.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Source of Funds</Field.Label>
							<Input
								{...submitAMLForm.fields.sourceOfFunds.as('text')}
								placeholder="e.g., Salary, Business"
							/>
							{#each submitAMLForm.fields.sourceOfFunds.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label>Purpose of Transaction</Field.Label>
							<Input
								{...submitAMLForm.fields.purposeOfTransaction.as('text')}
								placeholder="e.g., Investment"
							/>
							{#each submitAMLForm.fields.purposeOfTransaction.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Customer Name</Field.Label>
							<Input
								{...submitAMLForm.fields.financialCustomerName.as('text')}
								placeholder="Customer name"
							/>
							{#each submitAMLForm.fields.financialCustomerName.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
				</Field.Group>
			</Field.Set>

			<!-- Additional Questions -->
			<Field.Set>
				<Field.Legend class="text-base font-semibold">Additional Questions</Field.Legend>
				<Field.Group class="space-y-4">
					<Field.Field>
						<Field.Label>Is this your first property transaction?</Field.Label>
						<RadioGroup.Root
							value={submitAMLForm.fields.firstPropertyTransaction.value()}
							onValueChange={(v) =>
								submitAMLForm.fields.firstPropertyTransaction.set(v as 'Yes' | 'No')}
						>
							<div class="flex items-center gap-6">
								<div class="flex items-center gap-2">
									<RadioGroup.Item value="yes" id="first-yes" />
									<Label for="first-yes">Yes</Label>
								</div>
								<div class="flex items-center gap-2">
									<RadioGroup.Item value="no" id="first-no" />
									<Label for="first-no">No</Label>
								</div>
							</div>
						</RadioGroup.Root>
						{#each submitAMLForm.fields.firstPropertyTransaction.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
					<Field.Field>
						<Field.Label>Previous transactions details (Optional)</Field.Label>
						<Textarea
							{...submitAMLForm.fields.previousTransactionsDetails.as('text')}
							placeholder="Details of previous property transactions"
						/>
						{#each submitAMLForm.fields.previousTransactionsDetails.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
					<Field.Field>
						<Field.Label>Transaction for yourself or another?</Field.Label>
						<Input
							{...submitAMLForm.fields.transactionFor.as('text')}
							placeholder="Self/Third Party"
						/>
						{#each submitAMLForm.fields.transactionFor.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
					<Field.Field>
						<Field.Label>Third party details (Optional)</Field.Label>
						<Textarea
							{...submitAMLForm.fields.thirdPartyDetails.as('text')}
							placeholder="Details if transaction is for third party"
						/>
						{#each submitAMLForm.fields.thirdPartyDetails.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
					<Field.Field>
						<Field.Label>Politically Exposed Person or related individual?</Field.Label>
						<RadioGroup.Root
							value={submitAMLForm.fields.pepRelated.value()}
							onValueChange={(v) => submitAMLForm.fields.pepRelated.set(v as 'Yes' | 'No')}
						>
							<div class="flex items-center gap-6">
								<div class="flex items-center gap-2">
									<RadioGroup.Item value="yes" id="pep-yes" />
									<Label for="pep-yes">Yes</Label>
								</div>
								<div class="flex items-center gap-2">
									<RadioGroup.Item value="no" id="pep-no" />
									<Label for="pep-no">No</Label>
								</div>
							</div>
						</RadioGroup.Root>
						{#each submitAMLForm.fields.pepRelated.issues() as issue, i (i)}
							<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
						{/each}
					</Field.Field>
				</Field.Group>
			</Field.Set>

			<!-- Declaration -->
			<Field.Set>
				<Field.Legend class="text-base font-semibold">Declaration</Field.Legend>
				<Field.Group class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label>Customer Name</Field.Label>
							<Input
								{...submitAMLForm.fields.customerName.as('text')}
								placeholder="Customer name"
							/>
							{#each submitAMLForm.fields.customerName.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Customer Signature</Field.Label>
							<Input
								{...submitAMLForm.fields.customerSignature.as('text')}
								placeholder="Type name for signature"
							/>
							{#each submitAMLForm.fields.customerSignature.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label>Sales Agent Name</Field.Label>
							<Input
								{...submitAMLForm.fields.salesAgentName.as('text')}
								placeholder="Sales agent name"
							/>
							{#each submitAMLForm.fields.salesAgentName.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label>Sales Agent Signature</Field.Label>
							<Input
								{...submitAMLForm.fields.salesAgentSignature.as('text')}
								placeholder="Type name for signature"
							/>
							{#each submitAMLForm.fields.salesAgentSignature.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
				</Field.Group>
			</Field.Set>

			<!-- Submit Button -->
			<div class="flex gap-3 pt-4">
				<Button type="submit" class="flex-1" disabled={!!submitAMLForm.pending}>
					{#if submitAMLForm.pending}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Generating...
					{:else}
						Generate & Send AML Form
					{/if}
				</Button>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
			</div>

			{#each submitAMLForm.fields.allIssues() as issue, i (i)}
				<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
			{/each}
		</form>
	</Sheet.Content>
</Sheet.Root>
