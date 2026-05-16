<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Tabs from '$lib/components/ui/tabs';

	let { employee }: { employee: Employee | null } = $props();

	const documentKinds: { value: EmployeeDocumentKind; label: string }[] = [
		{ value: 'offerLetter', label: 'Offer Letter' },
		{ value: 'passport', label: 'Passport' },
		{ value: 'visitOrResidenceVisa', label: 'Visit/Residence Visa' },
		{ value: 'nationalId', label: 'National / Emirates ID' },
		{ value: 'educationalCertificates', label: 'Educational Certificates' },
		{ value: 'passportSizePhoto', label: 'Passport Size Photo' },
		{ value: 'lastThreeMonthsSalarySlips', label: 'Last 3 Months Salary Slips' },
		{ value: 'relievingLetter', label: 'Relieving Letter' },
		{ value: 'experienceLetter', label: 'Experience Letter' },
		{ value: 'signedNdaFile', label: 'Signed NDA File' }
	];

	const documentEntries: [EmployeeDocumentKind, EmployeeStoredFile][] = $derived(
		Object.entries(employee?.documents ?? {}) as [EmployeeDocumentKind, EmployeeStoredFile][]
	);

	function money(value?: number) {
		return value === undefined ? '-' : value.toLocaleString();
	}

	function documentLabel(kind: EmployeeDocumentKind) {
		return documentKinds.find((item) => item.value === kind)?.label ?? kind;
	}
</script>

<div class="flex h-full max-h-screen w-full flex-col bg-white p-6 text-[#222626]">
	<div class="pb-4">
		<h2 class="text-2xl leading-8 font-medium">{employee?.name || 'Employee Profile'}</h2>
		<p class="text-[13px] leading-5 text-[#687976]">ID: {employee?.code || 'Not assigned'}</p>
	</div>
	<div class="border-t border-[#EBEEEE]"></div>

	<div class="min-h-0 flex-1 overflow-auto py-6">
		<Tabs.Root value="employment-details">
			<Tabs.List class="rounded-lg bg-[#F1F1F1] p-0.5">
				<Tabs.Trigger value="employment-details">Employment Details</Tabs.Trigger>
				<Tabs.Trigger value="basic-details">Basic Details</Tabs.Trigger>
				<Tabs.Trigger value="document-details">Document Details</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="employment-details" class="mt-4">
				<div class="rounded-md border border-[#EBEEEE] bg-white p-6">
					<h3 class="mb-4 text-base font-medium">Employment Details</h3>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div class="space-y-1">
							<Label>Employee Code</Label><Input value={employee?.code || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Work Email</Label><Input value={employee?.email || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Access Role</Label><Input
								value={employee?.accessType?.replaceAll('-', ' ') || 'No access'}
								disabled
							/>
						</div>
						<div class="space-y-1">
							<Label>Department</Label><Input value={employee?.department || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Designation</Label><Input value={employee?.designation || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Status</Label><Input value={employee?.status || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Reporting Manager Email</Label><Input
								value={employee?.reportingManagerEmail || '-'}
								disabled
							/>
						</div>
						<div class="space-y-1">
							<Label>Senior Manager Email</Label><Input
								value={employee?.seniorManagerEmail || '-'}
								disabled
							/>
						</div>
						<div class="space-y-1">
							<Label>DOJ</Label><Input value={employee?.doj || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Probation Ending Date</Label><Input
								value={employee?.probationEndingDate || '-'}
								disabled
							/>
						</div>
						<div class="space-y-1">
							<Label>Location</Label><Input value={employee?.location || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Compensation AED</Label><Input
								value={money(employee?.compensationAED)}
								disabled
							/>
						</div>
						<div class="space-y-1">
							<Label>Compensation INR</Label><Input
								value={money(employee?.compensationINR)}
								disabled
							/>
						</div>
						<div class="space-y-1">
							<Label>Last Working Day</Label><Input
								value={employee?.lastWorkingDay || '-'}
								disabled
							/>
						</div>
					</div>
				</div>
			</Tabs.Content>

			<Tabs.Content value="basic-details" class="mt-4">
				<div class="rounded-md border border-[#EBEEEE] bg-white p-6">
					<h3 class="mb-4 text-base font-medium">Basic Details</h3>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div class="space-y-1">
							<Label>Mobile Number</Label><Input
								value={`${employee?.countryCode ?? '+971'} ${employee?.mobileNumber ?? ''}`.trim()}
								disabled
							/>
						</div>
						<div class="space-y-1">
							<Label>Personal Email</Label><Input value={employee?.personalEmail || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Marital Status</Label><Input value={employee?.maritalStatus || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Spouse Name</Label><Input value={employee?.spouseName || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Father&apos;s Name</Label><Input
								value={employee?.fatherName || '-'}
								disabled
							/>
						</div>
						<div class="space-y-1">
							<Label>Mother&apos;s Name</Label><Input
								value={employee?.motherName || '-'}
								disabled
							/>
						</div>
						<div class="space-y-1 md:col-span-2">
							<Label>Address in UAE</Label><Input value={employee?.addressUAE || '-'} disabled />
						</div>
						<div class="space-y-1 md:col-span-2">
							<Label>Home Country Address</Label><Input
								value={employee?.homeCountryAddress || '-'}
								disabled
							/>
						</div>
						<div class="space-y-1">
							<Label>Emergency Contact Name</Label><Input
								value={employee?.emergencyContactName || '-'}
								disabled
							/>
						</div>
						<div class="space-y-1">
							<Label>Emergency Contact Number</Label><Input
								value={employee?.emergencyContactNumber || '-'}
								disabled
							/>
						</div>
						<div class="space-y-1">
							<Label>Relationship With Above</Label><Input
								value={employee?.emergencyRelationship || '-'}
								disabled
							/>
						</div>
					</div>
				</div>
			</Tabs.Content>

			<Tabs.Content value="document-details" class="mt-4">
				<div class="space-y-4 rounded-md border border-[#EBEEEE] bg-white p-6">
					<h3 class="text-base font-medium">Document Details</h3>
					{#if documentEntries.length > 0}
						<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
							{#each documentEntries as [kind, file] (kind)}
								{#if file}
									<a
										href={file.downloadURL}
										target="_blank"
										rel="noopener noreferrer"
										class="rounded-md border border-[#EBEEEE] p-3 text-[13px] hover:bg-[#FBF9F8]"
									>
										<div class="font-medium text-[#222626]">{documentLabel(kind)}</div>
										<div class="truncate text-[#687976]">{file.name}</div>
									</a>
								{/if}
							{/each}
						</div>
					{:else}
						<div
							class="rounded-md border border-[#EBEEEE] p-6 text-center text-[13px] text-[#687976]"
						>
							No documents uploaded.
						</div>
					{/if}

					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div class="space-y-1">
							<Label>Nationality</Label><Input value={employee?.nationality || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Gender</Label><Input value={employee?.gender || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Date of Birth</Label><Input value={employee?.dateOfBirth || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Type of Visa</Label><Input value={employee?.visaType || '-'} disabled />
						</div>
						<div class="space-y-1">
							<Label>Visa Ending Date</Label><Input
								value={employee?.visaEndingDate || '-'}
								disabled
							/>
						</div>
						<div class="space-y-1">
							<Label>Fresher or Experienced</Label><Input
								value={employee?.fresherOrExperienced || '-'}
								disabled
							/>
						</div>
					</div>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</div>
