<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { setRoleContext, type AccessType } from '$lib/auth/role.svelte';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import Sonner from '@/components/ui/sonner/sonner.svelte';
	import { AuthGuard, firekitAuth, firekitDocOnce, firekitUser } from 'svelte-firekit';
	import { toast } from 'svelte-sonner';

	let { children } = $props();

	// Initialize role context
	const roleManager = setRoleContext();

	// Track if we've started fetching
	let shouldFetch = $state(false);
	let roleHandled = $state(false);

	// Create reactive document reference - only when we should fetch
	let roleDoc = $derived(
		shouldFetch && firekitUser.email
			? firekitDocOnce<{ accessType: AccessType }>(`roles/${firekitUser.email}`)
			: null
	);

	// Initialize role when user is available
	$effect(() => {
		if (!firekitUser.initialized || !firekitUser.email) return;
		if (roleManager.initialized && roleManager.email === firekitUser.email) return;
		if (shouldFetch) return;

		// Try to load from localStorage first
		const loadedFromStorage = roleManager.initFromStorage();

		// If loaded from storage and email matches, we're done
		if (loadedFromStorage && roleManager.email === firekitUser.email) {
			roleHandled = true;
			return;
		}

		// Start fetching from Firestore
		roleManager.setLoading(true);
		shouldFetch = true;
	});

	// Watch the roleDoc for changes
	$effect(() => {
		if (!roleDoc || roleHandled) return;

		// Still loading
		if (roleDoc.loading) {
			console.log('Loading role document...');
			return;
		}

		// Handle error
		if (roleDoc.error) {
			console.error('Error fetching role:', roleDoc.error);
			roleHandled = true;
			handleNoRole();
			return;
		}

		// Document loaded
		console.log('Role doc exists:', roleDoc.exists);
		console.log('Role doc data:', roleDoc.data);

		if (roleDoc.exists && roleDoc.data?.accessType) {
			roleManager.setRole(roleDoc.data.accessType, firekitUser.email!);
			roleHandled = true;
		} else {
			// No role found
			roleHandled = true;
			handleNoRole();
		}
	});

	async function handleNoRole() {
		roleManager.clear();
		toast.error('Account Not Found', {
			description: `Your account (${firekitUser.email}) is not added to the system. Please reach out to IND Global admin to get your email added.`,
			duration: 8000
		});
		await firekitAuth.signOut();
		goto('/');
	}

	// Track the last path we checked to avoid repeated checks
	let lastCheckedPath = $state('');

	// Route protection - check if user can access current route
	$effect(() => {
		if (!roleManager.initialized || roleManager.loading) return;

		const currentPath = page.url.pathname;

		// Skip if we already checked this path
		if (currentPath === lastCheckedPath) return;
		lastCheckedPath = currentPath;

		// Skip protection for common routes
		if (currentPath === '/dashboard' || currentPath === '/profile') return;

		// Check if user can access this route
		if (!roleManager.canAccessRoute(currentPath)) {
			toast.error('Access Denied', {
				description: 'You do not have permission to access this page.',
				duration: 5000
			});
			// Redirect to their default route
			goto(roleManager.getDefaultRoute());
		}
	});
</script>

<AuthGuard requireAuth={true} redirectTo="/">
	{#if roleManager.loading || !roleManager.initialized}
		<div class="flex min-h-svh items-center justify-center">
			<div class="flex flex-col items-center gap-4">
				<Spinner class="size-8" />
				<p class="text-sm text-muted-foreground">Loading your workspace...</p>
			</div>
		</div>
	{:else}
		<Sidebar.Provider>
			<AppSidebar />
			<Sidebar.Inset>
				{@render children?.()}
			</Sidebar.Inset>
		</Sidebar.Provider>
	{/if}
	<Sonner richColors />
</AuthGuard>
