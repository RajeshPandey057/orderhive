import adapter from '@sveltejs/adapter-auto';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

const isNodeBuild = process.env.NODE_BUILD === 'true';

/** @type {import('@sveltejs/kit').Config} */
export default {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), mdsvex()],
	vitePlugin: {
		inspector: {
			toggleKeyCombo: 'meta-shift',
			showToggleButton: 'active',
			toggleButtonPos: 'top-right'
		}
	},
	kit: {
		// Use adapter-node in Docker/Cloud Run so `build/` is emitted for Node runtime.
		adapter: isNodeBuild ? adapterNode() : adapter(),
		alias: {
			'@': 'src/lib'
		},
		experimental: { remoteFunctions: true }
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	},
	extensions: ['.svelte', '.svx']
};
