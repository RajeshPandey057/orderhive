<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Separator from '$lib/components/ui/separator';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import * as Tabs from '$lib/components/ui/tabs';
	import { firekitUser } from 'svelte-firekit';
	import { toast } from 'svelte-sonner';
	import { updateMyProfile, uploadMyDocument } from '../hr/hr.remote';

	let { data } = $props<{ data: { employee: Employee | null } }>();

	const employee = $derived(data.employee);
	let saving = $state(false);
	let selectedDocumentKind = $state<EmployeeDocumentKind>('passport');
	let selectedFileName = $state('');
	let uploading = $state(false);

	function profileFromEmployee(employee: Employee | null) {
		return {
			mobileNumber: employee?.mobileNumber ?? '',
			countryCode: employee?.countryCode ?? '+971',
			personalEmail: employee?.personalEmail ?? '',
			maritalStatus: employee?.maritalStatus ?? '',
			spouseName: employee?.spouseName ?? '',
			fatherName: employee?.fatherName ?? '',
			motherName: employee?.motherName ?? '',
			addressUAE: employee?.addressUAE ?? '',
			homeCountryAddress: employee?.homeCountryAddress ?? '',
			emergencyContactName: employee?.emergencyContactName ?? '',
			emergencyContactNumber: employee?.emergencyContactNumber ?? '',
			emergencyRelationship: employee?.emergencyRelationship ?? '',
			nationality: employee?.nationality ?? '',
			gender: employee?.gender ?? '',
			dateOfBirth: employee?.dateOfBirth ?? '',
			visaType: employee?.visaType ?? '',
			visaEndingDate: employee?.visaEndingDate ?? '',
			fresherOrExperienced: employee?.fresherOrExperienced ?? ''
		};
	}

	let profile = $state(profileFromEmployee(null));
	let syncedProfileKey = $state('');

	const documentKinds: { value: EmployeeDocumentKind; label: string }[] = [
		{ value: 'offerLetter', label: 'Offer Letter' },
		{ value: 'passport', label: 'Passport' },
		{ value: 'visitOrResidenceVisa', label: 'Visit/Residence Visa' },
		{ value: 'nationalId', label: 'National ID' },
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

	$effect(() => {
		const nextKey = `${employee?.email ?? ''}:${employee?.updatedAt ?? ''}`;
		if (nextKey !== syncedProfileKey) {
			profile = profileFromEmployee(employee);
			syncedProfileKey = nextKey;
		}
	});

	async function saveProfile() {
		saving = true;
		try {
			await updateMyProfile(profile);
			toast.success('Profile saved');
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to save profile');
		} finally {
			saving = false;
		}
	}

	function money(value?: number) {
		return value === undefined ? '-' : value.toLocaleString();
	}

	const uploadDocumentForm = uploadMyDocument.enhance(async ({ submit }) => {
		uploading = true;
		try {
			await submit();
			const issues = uploadMyDocument.fields.allIssues();
			if (!issues?.length) {
				selectedFileName = '';
				toast.success('Document uploaded');
				await invalidateAll();
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to upload document');
		} finally {
			uploading = false;
		}
	});

	$effect(() => {
		uploadMyDocument.fields.kind.set(selectedDocumentKind);
	});

	function handleDocumentFile(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		selectedFileName = file?.name ?? '';
		uploadMyDocument.fields.file.set(file);
	}
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
	<div class="flex w-full items-center gap-2 px-4">
		<div class="flex items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator.Root orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<h1 class="text-2xl font-medium">Profile</h1>
		</div>
	</div>
</header>

<div class="space-y-6 bg-white p-6 text-[#222626]">
	<div>
		<h2 class="text-2xl leading-8 font-medium">
			{employee?.name || firekitUser.displayName || 'Employee Profile'}
		</h2>
		<p class="text-[13px] leading-5 text-[#687976]">ID: {employee?.code || 'Not assigned'}</p>
	</div>

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
						<Label>Work Email</Label><Input
							value={employee?.email || firekitUser.email || '-'}
							disabled
						/>
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
					<div class="space-y-1 md:col-span-2">
						<Label>Mobile Number</Label>
						<div class="flex gap-2">
							<Select.Root type="single" bind:value={profile.countryCode}>
								<Select.Trigger class="h-8 w-28 shrink-0"
									>{profile.countryCode || '+971'}</Select.Trigger
								>
								<Select.Content>
									<Select.Item value="+971">+971</Select.Item>
									<Select.Item value="+91">+91</Select.Item>
									<Select.Item value="+1">+1</Select.Item>
									<Select.Item value="+44">+44</Select.Item>
									<Select.Item value="+966">+966</Select.Item>
								</Select.Content>
							</Select.Root>
							<Input
								class="h-8 flex-1"
								bind:value={profile.mobileNumber}
								placeholder="Enter mobile number"
							/>
						</div>
					</div>
					<div class="space-y-1">
						<Label>Personal Email</Label><Input type="email" bind:value={profile.personalEmail} />
					</div>
					<div class="space-y-1">
						<Label>Marital Status</Label>
						<Select.Root type="single" bind:value={profile.maritalStatus}>
							<Select.Trigger>{profile.maritalStatus || 'Select status'}</Select.Trigger>
							<Select.Content>
								<Select.Item value="single">Single</Select.Item>
								<Select.Item value="married">Married</Select.Item>
								<Select.Item value="divorced">Divorced</Select.Item>
								<Select.Item value="widowed">Widowed</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					{#if profile.maritalStatus === 'married'}
						<div class="space-y-1">
							<Label>Spouse Name</Label><Input bind:value={profile.spouseName} />
						</div>
					{/if}
					<div class="space-y-1">
						<Label>Father&apos;s Name</Label><Input bind:value={profile.fatherName} />
					</div>
					<div class="space-y-1">
						<Label>Mother&apos;s Name</Label><Input bind:value={profile.motherName} />
					</div>
					<div class="space-y-1 md:col-span-2">
						<Label>Address in UAE</Label><Input bind:value={profile.addressUAE} />
					</div>
					<div class="space-y-1 md:col-span-2">
						<Label>Home Country Address</Label><Input bind:value={profile.homeCountryAddress} />
					</div>
					<div class="space-y-1">
						<Label>Emergency Contact Name</Label><Input bind:value={profile.emergencyContactName} />
					</div>
					<div class="space-y-1">
						<Label>Emergency Contact Number</Label><Input
							bind:value={profile.emergencyContactNumber}
						/>
					</div>
					<div class="space-y-1">
						<Label>Relationship With Above</Label><Input
							bind:value={profile.emergencyRelationship}
						/>
					</div>
				</div>
				<div class="mt-6 flex justify-end">
					<Button
						class="h-8 border border-black/5 bg-[#222626] text-sm text-white"
						onclick={saveProfile}
						disabled={saving}
					>
						{saving ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</div>
		</Tabs.Content>

		<Tabs.Content value="document-details" class="mt-4">
			<div class="space-y-4 rounded-md border border-[#EBEEEE] bg-white p-6">
				<h3 class="mb-4 text-base font-medium">Document Metadata</h3>
				<form {...uploadDocumentForm} class="rounded-md border border-[#EBEEEE] bg-[#FBF9F8] p-4">
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div class="space-y-1">
							<Label>Document Type</Label>
							<Select.Root type="single" bind:value={selectedDocumentKind}>
								<Select.Trigger
									>{documentKinds.find((kind) => kind.value === selectedDocumentKind)
										?.label}</Select.Trigger
								>
								<Select.Content>
									{#each documentKinds as kind (kind.value)}
										<Select.Item value={kind.value}>{kind.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<input type="hidden" {...uploadMyDocument.fields.kind.as('text')} />
						</div>
						<div class="space-y-1 md:col-span-2">
							<Label for="document-file">Upload File</Label>
							<Input id="document-file" type="file" onchange={handleDocumentFile} />
							{#if selectedFileName}
								<p class="text-[13px] text-[#687976]">{selectedFileName}</p>
							{/if}
							{#each uploadMyDocument.fields.file.issues() as issue, i (i)}
								<p class="text-[13px] text-[#DC2626]">{issue.message}</p>
							{/each}
						</div>
					</div>
					<div class="mt-4 flex justify-end">
						<Button
							type="submit"
							class="h-8 border border-black/5 bg-[#222626] text-sm text-white"
							disabled={uploading}
						>
							{uploading ? 'Uploading...' : 'Upload Document'}
						</Button>
					</div>
				</form>

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
									<div class="font-medium text-[#222626]">
										{documentKinds.find((item) => item.value === kind)?.label ?? kind}
									</div>
									<div class="truncate text-[#687976]">{file.name}</div>
								</a>
							{/if}
						{/each}
					</div>
				{/if}

				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div class="space-y-1">
						<Label>Nationality</Label><Input bind:value={profile.nationality} />
					</div>
					<div class="space-y-1">
						<Label>Gender</Label>
						<Select.Root type="single" bind:value={profile.gender}>
							<Select.Trigger>{profile.gender || 'Select gender'}</Select.Trigger>
							<Select.Content>
								<Select.Item value="male">Male</Select.Item>
								<Select.Item value="female">Female</Select.Item>
								<Select.Item value="other">Other</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-1">
						<Label>Date of Birth</Label><Input type="date" bind:value={profile.dateOfBirth} />
					</div>
					<div class="space-y-1">
						<Label>Type of Visa</Label><Input bind:value={profile.visaType} />
					</div>
					<div class="space-y-1">
						<Label>Visa Ending Date</Label><Input type="date" bind:value={profile.visaEndingDate} />
					</div>
					<div class="space-y-1">
						<Label>Fresher or Experienced</Label><Input bind:value={profile.fresherOrExperienced} />
					</div>
				</div>
				<div class="mt-6 flex justify-end">
					<Button
						class="h-8 border border-black/5 bg-[#222626] text-sm text-white"
						onclick={saveProfile}
						disabled={saving}
					>
						{saving ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>
