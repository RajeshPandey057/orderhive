<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Separator from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { firekitAuth, firekitUser } from 'svelte-firekit';
	import { toast } from 'svelte-sonner';
	import Calendar from '~icons/lucide/calendar';
	import CircleUser from '~icons/lucide/circle-user';
	import Fingerprint from '~icons/lucide/fingerprint';
	import Loader2 from '~icons/lucide/loader-2';
	import LogOut from '~icons/lucide/log-out';
	import Mail from '~icons/lucide/mail';
	import ShieldCheck from '~icons/lucide/shield-check';
	import User from '~icons/lucide/user';

	// Form state using $state rune
	let displayName = $state('');

	// Loading state
	let updatingProfile = $state(false);
	let loggingOut = $state(false);

	// Sync with user data when it changes
	$effect(() => {
		// Initialize only if empty and user data exists
		if (!displayName && firekitUser.displayName) displayName = firekitUser.displayName;
	});

	async function updateProfile() {
		if (!displayName.trim()) {
			toast.error('Display name cannot be empty');
			return;
		}

		updatingProfile = true;
		try {
			await firekitUser.updateDisplayName(displayName);
			toast.success('Profile updated successfully!');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update profile');
		} finally {
			updatingProfile = false;
		}
	}

	async function handleLogout() {
		loggingOut = true;
		try {
			await firekitAuth.signOut();
			toast.success('Logged out successfully!');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to logout');
			loggingOut = false;
		}
	}
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
	<div class="flex w-full items-center gap-2 px-4">
		<div class="flex items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator.Root orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<h1 class="text-2xl font-medium">Profile Settings</h1>
		</div>
	</div>
</header>

<div class="mx-auto grid grid-cols-2 gap-2 p-6">
	<!-- Profile Overview Card -->
	<Card.Root>
		<div class="flex items-center gap-6 px-6 pb-0">
			<div class="relative">
				{#if firekitUser.photoURL}
					<img
						src={firekitUser.photoURL}
						alt={firekitUser.displayName || 'User'}
						class="size-24 rounded-full border-4 border-muted object-cover shadow-sm"
					/>
				{:else}
					<div
						class="flex size-24 items-center justify-center rounded-full border-4 border-muted bg-muted text-muted-foreground shadow-sm"
					>
						<CircleUser class="size-12" />
					</div>
				{/if}
				{#if !firekitUser.isEmailVerified}
					<div
						class="absolute -top-1 -right-1 size-6 rounded-full border-2 border-card bg-yellow-500"
						title="Email not verified"
					></div>
				{/if}
			</div>
			<div class="flex-1">
				<h2 class="text-2xl font-semibold">{firekitUser.displayName || 'User'}</h2>
				<a href="mailto:{firekitUser.email}" class="text-sm text-muted-foreground hover:underline">
					{firekitUser.email}
				</a>
				{#if !firekitUser.isEmailVerified}
					<p class="mt-2 text-xs text-yellow-600 dark:text-yellow-500">
						⚠️ Email not verified. Please check your inbox.
					</p>
				{/if}
			</div>
			<Button onclick={handleLogout} disabled={loggingOut} variant="destructive" class="w-fit">
				{#if loggingOut}
					<Loader2 class="mr-2 size-4 animate-spin" />
					Signing out...
				{:else}
					<LogOut class="mr-2 size-4" />
					Sign Out
				{/if}
			</Button>
		</div>
	</Card.Root>

	<!-- Account Information Card -->
	<Card.Root class="row-span-2">
		<div class="px-6 pb-0">
			<div class="flex items-center gap-2">
				<User class="size-5 text-muted-foreground" />
				<h3 class="text-lg font-semibold">Account Information</h3>
			</div>
			<p class="mt-1 text-sm text-muted-foreground">
				Your account details and authentication information
			</p>
		</div>
		<div class="space-y-4 px-6 pb-6">
			<div class="space-y-2">
				<Label>
					<div class="flex items-center gap-2">
						<Mail class="size-4" />
						Email Address
					</div>
				</Label>
				<div
					class="flex h-10 w-full items-center rounded-lg border border-border/70 bg-background px-3 text-sm"
				>
					{#if firekitUser.email}
						<a href="mailto:{firekitUser.email}" class="hover:underline">
							{firekitUser.email}
						</a>
					{:else}
						Not set
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<Label>
					<div class="flex items-center gap-2">
						<Fingerprint class="size-4" />
						User ID (UID)
					</div>
				</Label>
				<div
					class="flex h-10 w-full items-center rounded-lg border border-border/70 bg-background px-3 font-mono text-xs"
				>
					{firekitUser.uid || 'Not available'}
				</div>
			</div>

			<div class="space-y-2">
				<Label>
					<div class="flex items-center gap-2">
						<ShieldCheck class="size-4" />
						Email Verification Status
					</div>
				</Label>
				<div
					class="flex h-10 w-full items-center gap-2 rounded-lg border border-border/70 bg-background px-3 text-sm"
				>
					{#if firekitUser.isEmailVerified}
						<span class="flex items-center gap-2 text-green-600 dark:text-green-500">
							<ShieldCheck class="size-4" />
							Verified
						</span>
					{:else}
						<span class="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
							<ShieldCheck class="size-4" />
							Not Verified
						</span>
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<Label>
					<div class="flex items-center gap-2">
						<Calendar class="size-4" />
						Authentication Method
					</div>
				</Label>
				<div
					class="flex h-10 w-full items-center rounded-lg border border-border/70 bg-background px-3 text-sm"
				>
					Google Sign-In
				</div>
			</div>

			<p class="pt-2 text-xs text-muted-foreground">
				These details are managed by your Google account and cannot be changed here. Contact support
				if you need assistance.
			</p>
		</div>
	</Card.Root>
	<!-- Profile Information Card -->
	<Card.Root>
		<div class="px-6 pb-0">
			<div class="flex items-center gap-2">
				<CircleUser class="size-5 text-muted-foreground" />
				<h3 class="text-lg font-semibold">Profile Information</h3>
			</div>
			<p class="mt-1 text-sm text-muted-foreground">Update your display name</p>
		</div>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				updateProfile();
			}}
			class="space-y-4 px-6 pb-6"
		>
			<div class="space-y-2">
				<Label for="displayName">Display Name</Label>
				<Input
					id="displayName"
					type="text"
					bind:value={displayName}
					placeholder="Enter your display name"
					disabled={updatingProfile}
				/>
			</div>

			<Button type="submit" disabled={updatingProfile || !displayName.trim()} class="w-full">
				{#if updatingProfile}
					<Loader2 class="mr-2 size-4 animate-spin" />
					Updating...
				{:else}
					Save Changes
				{/if}
			</Button>
		</form>
	</Card.Root>
</div>
