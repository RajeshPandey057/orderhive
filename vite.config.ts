import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig(({ isSsrBuild }) => ({
	build: {
		rollupOptions: {
			output: {
				// Only split chunks in the client build — skipping for SSR prevents firebase-admin
				// (a CJS package using __dirname) from being bundled into the ESM server output.
				manualChunks: isSsrBuild
					? undefined
					: (id) => {
							// trailing slash ensures firebase-admin is NOT matched
							if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
								return 'firebase';
							}
							if (id.includes('node_modules/layerchart/') || id.includes('node_modules/d3-')) {
								return 'charts';
							}
						}
			}
		}
	},
	ssr: {
		external: [
			'firebase-admin',
			'firebase-admin/app',
			'firebase-admin/auth',
			'firebase-admin/firestore',
			'firebase-admin/storage',
			'@google-cloud/firestore',
			'@grpc/grpc-js'
		]
	},
	plugins: [
		enhancedImages(),
		tailwindcss(),
		sveltekit(),
		devtoolsJson(),
		Icons({ compiler: 'svelte', autoInstall: true })
	]
}));
