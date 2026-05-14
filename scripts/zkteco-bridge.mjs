#!/usr/bin/env node
/**
 * ZKTeco SA40 Local Bridge Script
 *
 * PURPOSE:
 *   Connects to the SA40 device over TCP/IP on the local office network,
 *   pulls all stored attendance records, and POSTs them to the cloud app's
 *   ADMS endpoint — the same one the device uses for its HTTP push.
 *
 * USE CASES:
 *   - One-time historical data backfill when you first set up the integration
 *   - Manual on-demand sync if the device lost connectivity and missed push events
 *   - Troubleshooting / verifying device data
 *
 * PREREQUISITES:
 *   Run this script from a machine on the SAME local network as the SA40 device.
 *   Install zklib-ts:  pnpm add -D zklib-ts   (or npm install zklib-ts)
 *
 * USAGE:
 *   node scripts/zkteco-bridge.mjs \
 *     --device-ip 192.168.1.100 \
 *     --device-port 4370 \
 *     --server https://yourapp.com/iclock/cdata \
 *     --device-sn BBMNK123456789
 *
 *   Or set env vars instead of flags:
 *     ZKTECO_DEVICE_IP, ZKTECO_DEVICE_PORT, ZKTECO_SERVER_URL, ZKTECO_DEVICE_SN
 *   (ZKTECO_SERVER_URL should point to the full /iclock/cdata URL)
 */

import { parseArgs } from 'node:util';

// ---------- CLI argument parsing ----------
const { values: args } = parseArgs({
	options: {
		'device-ip': { type: 'string' },
		'device-port': { type: 'string', default: '4370' },
		server: { type: 'string' },
		'device-sn': { type: 'string' },
		help: { type: 'boolean', short: 'h' }
	},
	strict: false
});

if (args['help']) {
	console.log(`
ZKTeco SA40 Local Bridge
Usage:
  node scripts/zkteco-bridge.mjs \\
    --device-ip 192.168.1.100 \\
    --device-port 4370 \\
    --server https://yourapp.com/api/zkteco/iclock/cdata \\
    --device-sn BBMNK123456789

Env vars (alternative to flags):
  ZKTECO_DEVICE_IP     — SA40 device IP on local network
  ZKTECO_DEVICE_PORT   — TCP port (default 4370)
  ZKTECO_SERVER_URL    — full URL to /iclock/cdata on your cloud app
  ZKTECO_DEVICE_SN     — device serial number
`);
	process.exit(0);
}

const deviceIp = args['device-ip'] ?? process.env.ZKTECO_DEVICE_IP;
const devicePort = parseInt(args['device-port'] ?? process.env.ZKTECO_DEVICE_PORT ?? '4370');
const serverUrl = args['server'] ?? process.env.ZKTECO_SERVER_URL;
const deviceSn = args['device-sn'] ?? process.env.ZKTECO_DEVICE_SN ?? 'bridge';

if (!deviceIp || !serverUrl) {
	console.error('ERROR: --device-ip and --server are required.');
	console.error('Run with --help for usage information.');
	process.exit(1);
}

console.log(`[Bridge] Connecting to SA40 at ${deviceIp}:${devicePort} ...`);

// ---------- ZKTeco device connection ----------
// Dynamic import so the script gives a helpful error if zklib-ts is not installed
let ZKLib;
try {
	const mod = await import('zklib-ts');
	ZKLib = mod.default ?? mod.ZKLib ?? mod;
} catch {
	console.error('ERROR: zklib-ts is not installed.');
	console.error('Install it with:  pnpm add -D zklib-ts');
	process.exit(1);
}

const device = new ZKLib(deviceIp, devicePort, 5200, 5000);

try {
	await device.createSocket();
	console.log('[Bridge] Connected to device.');

	// Pull all stored attendance logs
	const result = await device.getAttendances();
	const logs = Array.isArray(result) ? result : (result?.data ?? []);
	console.log(`[Bridge] Retrieved ${logs.length} attendance record(s) from device.`);

	if (logs.length === 0) {
		console.log('[Bridge] Nothing to push. Done.');
		await device.disconnect();
		process.exit(0);
	}

	// Convert device log format to iClock push format lines
	// zklib-ts returns: { uid, id (userId), state (inOutMode), time (Date), type (verifyType) }
	const lines = logs
		.map((log) => {
			const ts = log.time instanceof Date ? log.time : new Date(log.time);
			if (isNaN(ts.getTime())) return null;
			const timestamp = ts.toISOString().replace('T', ' ').substring(0, 19);
			const userId = String(log.id ?? log.uid ?? '');
			const inOutMode = Number(log.state ?? 0);
			const verifyType = Number(log.type ?? 1);
			return `${userId}\t${timestamp}\t${inOutMode}\t${verifyType}\t0\t0\t0\t0\t0\t0`;
		})
		.filter(Boolean);

	if (lines.length === 0) {
		console.log('[Bridge] No valid records to push after formatting. Done.');
		await device.disconnect();
		process.exit(0);
	}

	// POST to the cloud ADMS endpoint using the same format as device push
	const postUrl = `${serverUrl}?SN=${encodeURIComponent(deviceSn)}&table=ATTLOG&Stamp=0`;
	console.log(`[Bridge] Pushing ${lines.length} records to ${postUrl} ...`);

	const response = await fetch(postUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'text/plain' },
		body: lines.join('\n')
	});

	const responseText = await response.text();
	if (!response.ok) {
		console.error(`[Bridge] Server responded with HTTP ${response.status}: ${responseText}`);
		process.exit(1);
	}

	console.log(`[Bridge] Server response: ${responseText}`);
	console.log('[Bridge] Sync complete.');

	await device.disconnect();
} catch (err) {
	console.error('[Bridge] Error:', err?.message ?? err);
	try {
		await device.disconnect();
	} catch {
		/* ignore */
	}
	process.exit(1);
}
