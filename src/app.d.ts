import 'unplugin-icons/types/svelte';
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	type APIResponse<T = object> = { success: false; error: string } | { success: true; data: T };
	namespace Superforms {
		type Message = { type: 'error' | 'success' | 'warning'; text: string };
	}
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
