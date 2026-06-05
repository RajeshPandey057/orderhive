import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';


// [Polygram DOM] — OID stamper (added automatically, do not edit)
import { createHash as __pgHash } from 'crypto';
const __polygramOid = (() => {
  const OID_ATTR = 'data-polygram-id';
  const computeOid = (f, l, c, n) => __pgHash('sha1').update(`${f}:${l}:${c}:${n}`).digest('hex').slice(0, 8);
  const getName = n => n.type === 'JSXIdentifier' ? n.name : n.type === 'JSXMemberExpression' ? `${getName(n.object)}.${n.property.name}` : 'unknown';
  return ({ types: t }) => ({ visitor: { JSXOpeningElement(p, s) {
    if (p.node.attributes.some(a => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name: OID_ATTR }))) return;
    const loc = p.node.loc; if (!loc) return;
    const oid = computeOid(s.filename ?? 'unknown', loc.start.line, loc.start.column, getName(p.node.name));
    p.node.attributes.push(t.jsxAttribute(t.jsxIdentifier(OID_ATTR), t.stringLiteral(oid)));
  }}});
})();

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
