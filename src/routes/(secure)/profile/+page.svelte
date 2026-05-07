<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Separator from '$lib/components/ui/separator';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import * as Tabs from '$lib/components/ui/tabs';
	import { firekitUser } from 'svelte-firekit';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import PaperclipIcon from '@lucide/svelte/icons/paperclip';
	import XIcon from '@lucide/svelte/icons/x';

	const employmentDetails = {
		employeeCode: 'INDG0001',
		workEmail: firekitUser.email || '',
		role: 'Agent',
		department: 'Sales',
		designation: 'Property Consultant',
		status: 'Active',
		reportingManagerEmail: 'manager@indglobalrealty.ae',
		seniorManagerEmail: 'senior.manager@indglobalrealty.ae',
		doj: '2026-04-01',
		probationEndingDate: '2026-10-01',
		location: 'Dubai - Business Bay',
		compensationAED: '8000',
		compensationINR: '180000',
		lastWorkingDay: ''
	};

	let basicDetails = $state({
		mobileNumber: '',
		countryCode: '+971',
		personalEmail: '',
		maritalStatus: '',
		spouseName: '',
		fatherName: '',
		motherName: '',
		addressUAE: '',
		homeCountryAddress: '',
		emergencyContactName: '',
		emergencyContactNumber: '',
		emergencyRelationship: ''
	});

	let documents = $state({
		offerLetter: null as File | null,
		passport: null as File | null,
		visitOrResidenceVisa: null as File | null,
		nationality: '',
		nationalId: null as File | null,
		educationalCertificates: null as File | null,
		passportSizePhoto: null as File | null,
		gender: '',
		dateOfBirth: '',
		visaType: '',
		visaEndingDate: '',
		fresherOrExperienced: '',
		lastThreeMonthsSalarySlips: null as File | null,
		relievingLetter: null as File | null,
		experienceLetter: null as File | null,
		signedNdaFile: null as File | null
	});

	function saveEmploymentDetails() {
		console.log('Employment details saved');
	}

	function saveBasicDetails() {
		console.log('Basic details saved', basicDetails);
	}

	function saveDocuments() {
		console.log('Documents saved', documents);
	}

	function onFileChange(key: keyof typeof documents, event: Event) {
		const input = event.target as HTMLInputElement;
		documents[key] = input.files?.[0] || null;
	}

	function clearFile(key: keyof typeof documents) {
		documents[key] = null;
	}

	function formatFileSize(bytes?: number) {
		if (!bytes) return '';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
		<h2 class="text-2xl leading-8 font-medium">{firekitUser.displayName || 'Employee Profile'}</h2>
		<p class="text-[13px] leading-5 text-[#687976]">ID: {employmentDetails.employeeCode}</p>
	</div>

	<Tabs.Root value="employment-details">
		<Tabs.List class="rounded-lg bg-[#F1F1F1] p-0.5">
			<Tabs.Trigger value="employment-details">Employment Details</Tabs.Trigger>
			<Tabs.Trigger value="basic-details">Basic Details</Tabs.Trigger>
			<Tabs.Trigger value="document-upload">Document Upload</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="employment-details" class="mt-4">
			<div class="rounded-md border border-[#EBEEEE] bg-white p-6">
				<h3 class="mb-4 text-base font-medium">Employment Details (HR Filled)</h3>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div class="space-y-1"><Label>Employee Code</Label><Input value={employmentDetails.employeeCode} disabled /></div>
					<div class="space-y-1"><Label>Work Email</Label><Input value={employmentDetails.workEmail} disabled /></div>
					<div class="space-y-1"><Label>Role</Label><Input value={employmentDetails.role} disabled /></div>
					<div class="space-y-1"><Label>Department</Label><Input value={employmentDetails.department} disabled /></div>
					<div class="space-y-1"><Label>Designation</Label><Input value={employmentDetails.designation} disabled /></div>
					<div class="space-y-1"><Label>Status</Label><Input value={employmentDetails.status} disabled /></div>
					<div class="space-y-1"><Label>Reporting Manager Email</Label><Input value={employmentDetails.reportingManagerEmail} disabled /></div>
					<div class="space-y-1"><Label>Senior Manager Email</Label><Input value={employmentDetails.seniorManagerEmail} disabled /></div>
					<div class="space-y-1"><Label>DOJ</Label><Input value={employmentDetails.doj} disabled /></div>
					<div class="space-y-1"><Label>Probation Ending Date</Label><Input value={employmentDetails.probationEndingDate} disabled /></div>
					<div class="space-y-1"><Label>Location</Label><Input value={employmentDetails.location} disabled /></div>
					<div class="space-y-1"><Label>Compensation AED</Label><Input value={employmentDetails.compensationAED} disabled /></div>
					<div class="space-y-1"><Label>Compensation INR</Label><Input value={employmentDetails.compensationINR} disabled /></div>
					<div class="space-y-1"><Label>Last Working Day</Label><Input value={employmentDetails.lastWorkingDay || '-'} disabled /></div>
				</div>
				<div class="mt-6 flex justify-end">
					<Button class="h-8 border border-black/5 bg-[#222626] text-sm text-white" onclick={saveEmploymentDetails}>
						Save Changes
					</Button>
				</div>
			</div>
		</Tabs.Content>

		<Tabs.Content value="basic-details" class="mt-4 space-y-4">
			<div class="rounded-md border border-[#EBEEEE] bg-white p-6">
				<h3 class="mb-4 text-base font-medium">Basic Details (To Be Filled By Employee)</h3>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div class="space-y-1 md:col-span-2">
						<Label>Mobile Number</Label>
						<div class="flex gap-2">
							<Select.Root type="single" bind:value={basicDetails.countryCode}>
								<Select.Trigger class="h-8 w-28 shrink-0">{basicDetails.countryCode || '+971'}</Select.Trigger>
								<Select.Content>
									<Select.Item value="+971">+971 (UAE)</Select.Item>
									<Select.Item value="+91">+91 (India)</Select.Item>
									<Select.Item value="+1">+1 (US)</Select.Item>
									<Select.Item value="+44">+44 (UK)</Select.Item>
									<Select.Item value="+966">+966 (Saudi)</Select.Item>
								</Select.Content>
							</Select.Root>
							<Input class="h-8 flex-1" bind:value={basicDetails.mobileNumber} placeholder="Enter mobile number" />
						</div>
					</div>
					<div class="space-y-1"><Label>Personal Email</Label><Input type="email" bind:value={basicDetails.personalEmail} /></div>
					<div class="space-y-1">
						<Label>Marital Status</Label>
						<Select.Root type="single" bind:value={basicDetails.maritalStatus}>
							<Select.Trigger>{basicDetails.maritalStatus || 'Select Marital Status'}</Select.Trigger>
							<Select.Content>
								<Select.Item value="single">Single</Select.Item>
								<Select.Item value="married">Married</Select.Item>
								<Select.Item value="divorced">Divorced</Select.Item>
								<Select.Item value="widowed">Widowed</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					{#if basicDetails.maritalStatus === 'married'}
						<div class="space-y-1"><Label>Spouse Name</Label><Input bind:value={basicDetails.spouseName} /></div>
					{/if}
					<div class="space-y-1"><Label>Father&apos;s Name</Label><Input bind:value={basicDetails.fatherName} /></div>
					<div class="space-y-1"><Label>Mother&apos;s Name</Label><Input bind:value={basicDetails.motherName} /></div>
					<div class="space-y-1 md:col-span-2"><Label>Address in UAE</Label><Input bind:value={basicDetails.addressUAE} /></div>
					<div class="space-y-1 md:col-span-2"><Label>Home Country Address</Label><Input bind:value={basicDetails.homeCountryAddress} /></div>
					<div class="space-y-1"><Label>Emergency Contact Name</Label><Input bind:value={basicDetails.emergencyContactName} /></div>
					<div class="space-y-1"><Label>Emergency Contact Number</Label><Input bind:value={basicDetails.emergencyContactNumber} /></div>
					<div class="space-y-1"><Label>Relationship With Above</Label><Input bind:value={basicDetails.emergencyRelationship} /></div>
				</div>
				<div class="mt-6 flex justify-end">
					<Button class="h-8 border border-black/5 bg-[#222626] text-sm text-white" onclick={saveBasicDetails}>
						Save Changes
					</Button>
				</div>
			</div>
		</Tabs.Content>

		<Tabs.Content value="document-upload" class="mt-4">
			<div class="rounded-md border border-[#EBEEEE] bg-white p-6">
				<h3 class="mb-4 text-base font-medium">Document Upload (To Be Filled By Employee)</h3>
				<div class="space-y-6">
					<div>
						<p class="mb-3 text-sm font-medium text-[#222626]">Upload Required Documents</p>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div class="rounded-md border border-[#EBEEEE] bg-[#FBF9F8] p-3">
								<Label for="offer-letter-file" class="mb-2 block text-[13px]">Offer Letter</Label>
								<label
									for="offer-letter-file"
									class={[
										'flex w-full cursor-pointer rounded-md text-center transition-colors',
										documents.offerLetter?.name
											? 'min-h-0 items-stretch border-0 bg-transparent p-0'
											: 'min-h-[44px] flex-col items-center justify-center border border-dashed border-[#D4D9D9] bg-white p-2'
									]}
								>
									{#if documents.offerLetter?.name}
										<div class="flex w-full items-center justify-between rounded-md border border-[#EBEEEE] bg-white px-2 py-1.5">
											<div class="flex min-w-0 items-center gap-2">
												<FileTextIcon class="size-4 text-[#687976]" />
												<div class="min-w-0 text-left">
													<p class="truncate text-xs text-[#222626]">{documents.offerLetter.name}</p>
													<p class="text-[11px] text-[#687976]">{formatFileSize(documents.offerLetter.size)}</p>
												</div>
											</div>
											<button
												type="button"
												class="rounded p-1 text-[#687976] hover:bg-[#FBF9F8]"
												onclick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													clearFile('offerLetter');
												}}
											>
												<XIcon class="size-3.5" />
											</button>
										</div>
									{:else}
										<p class="inline-flex items-center gap-1 text-xs text-[#687976]">
											<PaperclipIcon class="size-3.5" />
											Click to upload offer letter
										</p>
									{/if}
								</label>
								<Input id="offer-letter-file" class="hidden" type="file" onchange={(e) => onFileChange('offerLetter', e)} />
							</div>

							<div class="rounded-md border border-[#EBEEEE] bg-[#FBF9F8] p-3">
								<Label for="passport-file" class="mb-2 block text-[13px]">Passport</Label>
								<label
									for="passport-file"
									class={[
										'flex w-full cursor-pointer rounded-md text-center transition-colors',
										documents.passport?.name
											? 'min-h-0 items-stretch border-0 bg-transparent p-0'
											: 'min-h-[44px] flex-col items-center justify-center border border-dashed border-[#D4D9D9] bg-white p-2'
									]}
								>
									{#if documents.passport?.name}
										<div class="flex w-full items-center justify-between rounded-md border border-[#EBEEEE] bg-white px-2 py-1.5">
											<div class="flex min-w-0 items-center gap-2">
												<FileTextIcon class="size-4 text-[#687976]" />
												<div class="min-w-0 text-left">
													<p class="truncate text-xs text-[#222626]">{documents.passport.name}</p>
													<p class="text-[11px] text-[#687976]">{formatFileSize(documents.passport.size)}</p>
												</div>
											</div>
											<button type="button" class="rounded p-1 text-[#687976] hover:bg-[#FBF9F8]" onclick={(e) => { e.preventDefault(); e.stopPropagation(); clearFile('passport'); }}>
												<XIcon class="size-3.5" />
											</button>
										</div>
									{:else}
										<p class="inline-flex items-center gap-1 text-xs text-[#687976]">
											<PaperclipIcon class="size-3.5" />
											Click to upload passport
										</p>
									{/if}
								</label>
								<Input id="passport-file" class="hidden" type="file" onchange={(e) => onFileChange('passport', e)} />
							</div>

							<div class="rounded-md border border-[#EBEEEE] bg-[#FBF9F8] p-3">
								<Label for="visa-file" class="mb-2 block text-[13px]">Visit Visa / Residence Visa</Label>
								<label
									for="visa-file"
									class={[
										'flex w-full cursor-pointer rounded-md text-center transition-colors',
										documents.visitOrResidenceVisa?.name
											? 'min-h-0 items-stretch border-0 bg-transparent p-0'
											: 'min-h-[44px] flex-col items-center justify-center border border-dashed border-[#D4D9D9] bg-white p-2'
									]}
								>
									{#if documents.visitOrResidenceVisa?.name}
										<div class="flex w-full items-center justify-between rounded-md border border-[#EBEEEE] bg-white px-2 py-1.5">
											<div class="flex min-w-0 items-center gap-2">
												<FileTextIcon class="size-4 text-[#687976]" />
												<div class="min-w-0 text-left">
													<p class="truncate text-xs text-[#222626]">{documents.visitOrResidenceVisa.name}</p>
													<p class="text-[11px] text-[#687976]">{formatFileSize(documents.visitOrResidenceVisa.size)}</p>
												</div>
											</div>
											<button type="button" class="rounded p-1 text-[#687976] hover:bg-[#FBF9F8]" onclick={(e) => { e.preventDefault(); e.stopPropagation(); clearFile('visitOrResidenceVisa'); }}>
												<XIcon class="size-3.5" />
											</button>
										</div>
									{:else}
										<p class="inline-flex items-center gap-1 text-xs text-[#687976]">
											<PaperclipIcon class="size-3.5" />
											Click to upload visa document
										</p>
									{/if}
								</label>
								<Input id="visa-file" class="hidden" type="file" onchange={(e) => onFileChange('visitOrResidenceVisa', e)} />
							</div>

							<div class="rounded-md border border-[#EBEEEE] bg-[#FBF9F8] p-3">
								<Label for="national-id-file" class="mb-2 block text-[13px]">National ID (Aadhar/PAN)</Label>
								<label
									for="national-id-file"
									class={[
										'flex w-full cursor-pointer rounded-md text-center transition-colors',
										documents.nationalId?.name
											? 'min-h-0 items-stretch border-0 bg-transparent p-0'
											: 'min-h-[44px] flex-col items-center justify-center border border-dashed border-[#D4D9D9] bg-white p-2'
									]}
								>
									{#if documents.nationalId?.name}
										<div class="flex w-full items-center justify-between rounded-md border border-[#EBEEEE] bg-white px-2 py-1.5">
											<div class="flex min-w-0 items-center gap-2">
												<FileTextIcon class="size-4 text-[#687976]" />
												<div class="min-w-0 text-left">
													<p class="truncate text-xs text-[#222626]">{documents.nationalId.name}</p>
													<p class="text-[11px] text-[#687976]">{formatFileSize(documents.nationalId.size)}</p>
												</div>
											</div>
											<button type="button" class="rounded p-1 text-[#687976] hover:bg-[#FBF9F8]" onclick={(e) => { e.preventDefault(); e.stopPropagation(); clearFile('nationalId'); }}>
												<XIcon class="size-3.5" />
											</button>
										</div>
									{:else}
										<p class="inline-flex items-center gap-1 text-xs text-[#687976]">
											<PaperclipIcon class="size-3.5" />
											Click to upload national ID
										</p>
									{/if}
								</label>
								<Input id="national-id-file" class="hidden" type="file" onchange={(e) => onFileChange('nationalId', e)} />
							</div>

							<div class="rounded-md border border-[#EBEEEE] bg-[#FBF9F8] p-3">
								<Label for="education-file" class="mb-2 block text-[13px]">Educational Certificates</Label>
								<label
									for="education-file"
									class={[
										'flex w-full cursor-pointer rounded-md text-center transition-colors',
										documents.educationalCertificates?.name
											? 'min-h-0 items-stretch border-0 bg-transparent p-0'
											: 'min-h-[44px] flex-col items-center justify-center border border-dashed border-[#D4D9D9] bg-white p-2'
									]}
								>
									{#if documents.educationalCertificates?.name}
										<div class="flex w-full items-center justify-between rounded-md border border-[#EBEEEE] bg-white px-2 py-1.5">
											<div class="flex min-w-0 items-center gap-2">
												<FileTextIcon class="size-4 text-[#687976]" />
												<div class="min-w-0 text-left">
													<p class="truncate text-xs text-[#222626]">{documents.educationalCertificates.name}</p>
													<p class="text-[11px] text-[#687976]">{formatFileSize(documents.educationalCertificates.size)}</p>
												</div>
											</div>
											<button type="button" class="rounded p-1 text-[#687976] hover:bg-[#FBF9F8]" onclick={(e) => { e.preventDefault(); e.stopPropagation(); clearFile('educationalCertificates'); }}>
												<XIcon class="size-3.5" />
											</button>
										</div>
									{:else}
										<p class="inline-flex items-center gap-1 text-xs text-[#687976]">
											<PaperclipIcon class="size-3.5" />
											Click to upload certificates
										</p>
									{/if}
								</label>
								<Input id="education-file" class="hidden" type="file" onchange={(e) => onFileChange('educationalCertificates', e)} />
							</div>

							<div class="rounded-md border border-[#EBEEEE] bg-[#FBF9F8] p-3">
								<Label for="photo-file" class="mb-2 block text-[13px]">Passport Size Photo</Label>
								<label
									for="photo-file"
									class={[
										'flex w-full cursor-pointer rounded-md text-center transition-colors',
										documents.passportSizePhoto?.name
											? 'min-h-0 items-stretch border-0 bg-transparent p-0'
											: 'min-h-[44px] flex-col items-center justify-center border border-dashed border-[#D4D9D9] bg-white p-2'
									]}
								>
									{#if documents.passportSizePhoto?.name}
										<div class="flex w-full items-center justify-between rounded-md border border-[#EBEEEE] bg-white px-2 py-1.5">
											<div class="flex min-w-0 items-center gap-2">
												<FileTextIcon class="size-4 text-[#687976]" />
												<div class="min-w-0 text-left">
													<p class="truncate text-xs text-[#222626]">{documents.passportSizePhoto.name}</p>
													<p class="text-[11px] text-[#687976]">{formatFileSize(documents.passportSizePhoto.size)}</p>
												</div>
											</div>
											<button type="button" class="rounded p-1 text-[#687976] hover:bg-[#FBF9F8]" onclick={(e) => { e.preventDefault(); e.stopPropagation(); clearFile('passportSizePhoto'); }}>
												<XIcon class="size-3.5" />
											</button>
										</div>
									{:else}
										<p class="inline-flex items-center gap-1 text-xs text-[#687976]">
											<PaperclipIcon class="size-3.5" />
											Click to upload photo
										</p>
									{/if}
								</label>
								<Input id="photo-file" class="hidden" type="file" onchange={(e) => onFileChange('passportSizePhoto', e)} />
							</div>

							<div class="rounded-md border border-[#EBEEEE] bg-[#FBF9F8] p-3">
								<Label for="salary-slip-file" class="mb-2 block text-[13px]">Last Company 3 Months Salary Slips</Label>
								<label
									for="salary-slip-file"
									class={[
										'flex w-full cursor-pointer rounded-md text-center transition-colors',
										documents.lastThreeMonthsSalarySlips?.name
											? 'min-h-0 items-stretch border-0 bg-transparent p-0'
											: 'min-h-[44px] flex-col items-center justify-center border border-dashed border-[#D4D9D9] bg-white p-2'
									]}
								>
									{#if documents.lastThreeMonthsSalarySlips?.name}
										<div class="flex w-full items-center justify-between rounded-md border border-[#EBEEEE] bg-white px-2 py-1.5">
											<div class="flex min-w-0 items-center gap-2">
												<FileTextIcon class="size-4 text-[#687976]" />
												<div class="min-w-0 text-left">
													<p class="truncate text-xs text-[#222626]">{documents.lastThreeMonthsSalarySlips.name}</p>
													<p class="text-[11px] text-[#687976]">{formatFileSize(documents.lastThreeMonthsSalarySlips.size)}</p>
												</div>
											</div>
											<button type="button" class="rounded p-1 text-[#687976] hover:bg-[#FBF9F8]" onclick={(e) => { e.preventDefault(); e.stopPropagation(); clearFile('lastThreeMonthsSalarySlips'); }}>
												<XIcon class="size-3.5" />
											</button>
										</div>
									{:else}
										<p class="inline-flex items-center gap-1 text-xs text-[#687976]">
											<PaperclipIcon class="size-3.5" />
											Click to upload salary slips
										</p>
									{/if}
								</label>
								<Input id="salary-slip-file" class="hidden" type="file" onchange={(e) => onFileChange('lastThreeMonthsSalarySlips', e)} />
							</div>

							<div class="rounded-md border border-[#EBEEEE] bg-[#FBF9F8] p-3">
								<Label for="relieving-letter-file" class="mb-2 block text-[13px]">Relieving Letter</Label>
								<label
									for="relieving-letter-file"
									class={[
										'flex w-full cursor-pointer rounded-md text-center transition-colors',
										documents.relievingLetter?.name
											? 'min-h-0 items-stretch border-0 bg-transparent p-0'
											: 'min-h-[44px] flex-col items-center justify-center border border-dashed border-[#D4D9D9] bg-white p-2'
									]}
								>
									{#if documents.relievingLetter?.name}
										<div class="flex w-full items-center justify-between rounded-md border border-[#EBEEEE] bg-white px-2 py-1.5">
											<div class="flex min-w-0 items-center gap-2">
												<FileTextIcon class="size-4 text-[#687976]" />
												<div class="min-w-0 text-left">
													<p class="truncate text-xs text-[#222626]">{documents.relievingLetter.name}</p>
													<p class="text-[11px] text-[#687976]">{formatFileSize(documents.relievingLetter.size)}</p>
												</div>
											</div>
											<button type="button" class="rounded p-1 text-[#687976] hover:bg-[#FBF9F8]" onclick={(e) => { e.preventDefault(); e.stopPropagation(); clearFile('relievingLetter'); }}>
												<XIcon class="size-3.5" />
											</button>
										</div>
									{:else}
										<p class="inline-flex items-center gap-1 text-xs text-[#687976]">
											<PaperclipIcon class="size-3.5" />
											Click to upload relieving letter
										</p>
									{/if}
								</label>
								<Input id="relieving-letter-file" class="hidden" type="file" onchange={(e) => onFileChange('relievingLetter', e)} />
							</div>

							<div class="rounded-md border border-[#EBEEEE] bg-[#FBF9F8] p-3">
								<Label for="experience-letter-file" class="mb-2 block text-[13px]">Experience Letter</Label>
								<label
									for="experience-letter-file"
									class={[
										'flex w-full cursor-pointer rounded-md text-center transition-colors',
										documents.experienceLetter?.name
											? 'min-h-0 items-stretch border-0 bg-transparent p-0'
											: 'min-h-[44px] flex-col items-center justify-center border border-dashed border-[#D4D9D9] bg-white p-2'
									]}
								>
									{#if documents.experienceLetter?.name}
										<div class="flex w-full items-center justify-between rounded-md border border-[#EBEEEE] bg-white px-2 py-1.5">
											<div class="flex min-w-0 items-center gap-2">
												<FileTextIcon class="size-4 text-[#687976]" />
												<div class="min-w-0 text-left">
													<p class="truncate text-xs text-[#222626]">{documents.experienceLetter.name}</p>
													<p class="text-[11px] text-[#687976]">{formatFileSize(documents.experienceLetter.size)}</p>
												</div>
											</div>
											<button type="button" class="rounded p-1 text-[#687976] hover:bg-[#FBF9F8]" onclick={(e) => { e.preventDefault(); e.stopPropagation(); clearFile('experienceLetter'); }}>
												<XIcon class="size-3.5" />
											</button>
										</div>
									{:else}
										<p class="inline-flex items-center gap-1 text-xs text-[#687976]">
											<PaperclipIcon class="size-3.5" />
											Click to upload experience letter
										</p>
									{/if}
								</label>
								<Input id="experience-letter-file" class="hidden" type="file" onchange={(e) => onFileChange('experienceLetter', e)} />
							</div>

							<div class="rounded-md border border-[#EBEEEE] bg-[#FBF9F8] p-3 md:col-span-3">
								<Label for="nda-file" class="mb-2 block text-[13px]">Signed NDA File</Label>
								<label
									for="nda-file"
									class={[
										'flex w-full cursor-pointer rounded-md text-center transition-colors',
										documents.signedNdaFile?.name
											? 'min-h-0 items-stretch border-0 bg-transparent p-0'
											: 'min-h-[44px] flex-col items-center justify-center border border-dashed border-[#D4D9D9] bg-white p-2'
									]}
								>
									{#if documents.signedNdaFile?.name}
										<div class="flex w-full items-center justify-between rounded-md border border-[#EBEEEE] bg-white px-2 py-1.5">
											<div class="flex min-w-0 items-center gap-2">
												<FileTextIcon class="size-4 text-[#687976]" />
												<div class="min-w-0 text-left">
													<p class="truncate text-xs text-[#222626]">{documents.signedNdaFile.name}</p>
													<p class="text-[11px] text-[#687976]">{formatFileSize(documents.signedNdaFile.size)}</p>
												</div>
											</div>
											<button type="button" class="rounded p-1 text-[#687976] hover:bg-[#FBF9F8]" onclick={(e) => { e.preventDefault(); e.stopPropagation(); clearFile('signedNdaFile'); }}>
												<XIcon class="size-3.5" />
											</button>
										</div>
									{:else}
										<p class="inline-flex items-center gap-1 text-xs text-[#687976]">
											<PaperclipIcon class="size-3.5" />
											Click to upload signed NDA file
										</p>
									{/if}
								</label>
								<Input id="nda-file" class="hidden" type="file" onchange={(e) => onFileChange('signedNdaFile', e)} />
							</div>
						</div>
					</div>

					<div>
						<p class="mb-3 text-sm font-medium text-[#222626]">Document Metadata</p>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div class="space-y-1"><Label>Nationality</Label><Input bind:value={documents.nationality} /></div>
							<div class="space-y-1">
								<Label>Gender</Label>
								<Select.Root type="single" bind:value={documents.gender}>
									<Select.Trigger>{documents.gender || 'Select Gender'}</Select.Trigger>
									<Select.Content>
										<Select.Item value="male">Male</Select.Item>
										<Select.Item value="female">Female</Select.Item>
										<Select.Item value="other">Other</Select.Item>
									</Select.Content>
								</Select.Root>
							</div>
							<div class="space-y-1"><Label>Date of Birth</Label><Input type="date" bind:value={documents.dateOfBirth} /></div>
							<div class="space-y-1"><Label>Type of Visa</Label><Input placeholder="Visit/Employment" bind:value={documents.visaType} /></div>
							<div class="space-y-1"><Label>Visa Ending Date</Label><Input type="date" bind:value={documents.visaEndingDate} /></div>
							<div class="space-y-1"><Label>Fresher or Experienced</Label><Input bind:value={documents.fresherOrExperienced} /></div>
						</div>
					</div>
				</div>
				<div class="mt-6 flex justify-end">
					<Button class="h-8 border border-black/5 bg-[#222626] text-sm text-white" onclick={saveDocuments}>
						Save Changes
					</Button>
				</div>
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>
