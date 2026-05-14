#!/usr/bin/env node
/**
 * One-time Employee Seed Script
 *
 * Reads Employee-Details.csv from the project root and upserts each employee
 * into the Firestore `employees` collection using the Firebase Admin SDK.
 *
 * Credentials are loaded from .env.local automatically when run with Bun:
 *   bun scripts/seed-employees.mjs
 *
 * Or with Node 20+ (--env-file flag):
 *   node --env-file=.env.local scripts/seed-employees.mjs
 *
 * Rows where the email column is blank or "-" are skipped and reported.
 * `merge: true` is used so existing HR profile data is not overwritten.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Locate project root ───────────────────────────────────────────────────
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');

// ─── Load Firebase Admin SDK ────────────────────────────────────────────────
// Dynamic import so the env vars are definitely set before cert() is called.
const { cert, getApps, initializeApp } = await import('firebase-admin/app');
const { getFirestore, FieldValue } = await import('firebase-admin/firestore');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// The private key may contain literal newline characters (from the .env file quotes).
// Replace escaped \n sequences just in case the shell expanded them differently.
const privateKey = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
	console.error(
		'❌  Missing Firebase credentials. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in .env.local.'
	);
	process.exit(1);
}

const app =
	getApps().find((a) => a.name === 'seed-app') ??
	initializeApp(
		{
			credential: cert({ projectId, clientEmail, privateKey })
		},
		'seed-app'
	);

const db = getFirestore(app);
const employeesCol = db.collection('employees');

// ─── Parse CSV ──────────────────────────────────────────────────────────────
const csvPath = resolve(projectRoot, 'Employee-Details.csv');
let csvText;
try {
	csvText = readFileSync(csvPath, 'utf-8');
} catch {
	console.error(`❌  Cannot read ${csvPath}`);
	process.exit(1);
}

const lines = csvText
	.split('\n')
	.map((l) => l.trim())
	.filter(Boolean);

// Skip header row
const dataRows = lines.slice(1);

const uploaded = [];
const skipped = [];

for (const line of dataRows) {
	// CSV may have trailing empty columns (e.g., "INDG0001,Name,email,Location,,,,")
	// Split on comma and take only the first 4 columns.
	const cols = line.split(',').map((c) => c.trim());
	const code = cols[0] ?? '';
	const name = cols[1] ?? '';
	const email = cols[2] ?? '';
	const location = cols[3] ?? '';

	if (!code) continue; // completely empty row

	// Validate email
	if (!email || email === '-' || !email.includes('@')) {
		skipped.push({ code, name, email: email || '(empty)', reason: 'Invalid or missing email' });
		continue;
	}

	const normalizedEmail = email.toLowerCase();

	uploaded.push({ code, name, email: normalizedEmail, location });
}

if (uploaded.length === 0) {
	console.log('⚠️  No valid rows to upload.');
	process.exit(0);
}

// ─── Batch upsert (Firestore max 500 ops per batch) ────────────────────────
const BATCH_SIZE = 500;
let totalWritten = 0;

for (let i = 0; i < uploaded.length; i += BATCH_SIZE) {
	const chunk = uploaded.slice(i, i + BATCH_SIZE);
	const batch = db.batch();

	for (const emp of chunk) {
		const docRef = employeesCol.doc(emp.email);
		batch.set(
			docRef,
			{
				code: emp.code,
				name: emp.name,
				email: emp.email,
				location: emp.location,
				status: 'active',
				updatedAt: FieldValue.serverTimestamp()
			},
			{ merge: true } // preserves existing HR profile data
		);
	}

	await batch.commit();
	totalWritten += chunk.length;
	console.log(`  ✓ Batch ${Math.ceil((i + 1) / BATCH_SIZE)}: committed ${chunk.length} employees`);
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────');
console.log(`✅  Uploaded: ${totalWritten} employees`);

if (skipped.length > 0) {
	console.log(`⚠️   Skipped: ${skipped.length} row(s):\n`);
	for (const s of skipped) {
		console.log(`  • [${s.code}] ${s.name} — email: "${s.email}" — ${s.reason}`);
	}
} else {
	console.log(`✅  Skipped:  0`);
}
console.log('─────────────────────────────────────\n');
