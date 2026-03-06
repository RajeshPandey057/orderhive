import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig({
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
});
