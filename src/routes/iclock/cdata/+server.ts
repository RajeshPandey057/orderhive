/**
 * ZKTeco SA40 ADMS / iClock HTTP Push endpoint
 *
 * On the SA40 device: Menu → Communication → Cloud Service Settings
 *   Server Address: <your-app-domain or IP>   (e.g. myapp.com  or  203.0.113.10)
 *   Server Port:    443  (HTTPS) or 80 (HTTP)
 *   Enable cloud service: ON
 *
 * The device hardcodes the path /iclock/cdata — hence this route lives here.
 * It calls:
 *   GET  /iclock/cdata?SN=<serial>&options=all   → handshake / config
 *   POST /iclock/cdata?SN=<serial>&table=ATTLOG  → push attendance records
 *
 * Security: requests are validated against ZKTECO_DEVICE_SN env var.
 * If ZKTECO_DEVICE_SN is not set, validation is skipped (useful during initial setup).
 *
 * Env vars:
 *   ZKTECO_DEVICE_SN    — serial number printed on back of device (e.g. "BBMNK123456789")
 *   ZKTECO_TIMEZONE     — UTC offset for device clock sync (default "4.00" = Dubai UTC+4)
 *   LATE_THRESHOLD_TIME — HH:MM threshold for 'late' status (default "09:00")
 */

import { parseIClockBody, processPunch } from '$lib/server/biometric';
import type { RequestHandler } from './$types';

const ZKTECO_DEVICE_SN = process.env.ZKTECO_DEVICE_SN ?? '';
const ZKTECO_TIMEZONE = process.env.ZKTECO_TIMEZONE ?? '4.00';

/** Validate device serial number if one is configured. */
function isValidDevice(sn: string | null): boolean {
	if (!ZKTECO_DEVICE_SN) return true; // skip during initial setup / SN discovery
	return sn === ZKTECO_DEVICE_SN;
}

/**
 * GET /iclock/cdata
 * Handshake — device calls this on boot and periodically.
 * Responds with plain-text key=value config telling the device how/when to push.
 */
export const GET: RequestHandler = ({ url }) => {
	const sn = url.searchParams.get('SN');
	console.log(`[ZKTeco] GET /iclock/cdata — SN=${sn} options=${url.searchParams.get('options')}`);

	if (!isValidDevice(sn)) {
		console.warn(`[ZKTeco] GET rejected: SN=${sn} does not match ZKTECO_DEVICE_SN`);
		return new Response('Unauthorized', { status: 401 });
	}

	const config = [
		`GET OPTION FROM: ${sn}`,
		'ATTLOGStamp=9999',
		'OPERLOGStamp=9999',
		'ATTPHOTOStamp=9999',
		'ErrorDelay=30',
		'Delay=10',
		'TransTimes=00:00;23:59',
		'TransInterval=1',
		'TransFlag=TransData AttLog',
		`TimeZone=${ZKTECO_TIMEZONE}`,
		'Realtime=1',
		'Encrypt=None'
	].join('\n');

	return new Response(config, {
		headers: { 'Content-Type': 'text/plain' }
	});
};

/**
 * POST /iclock/cdata
 * Device posts attendance records here when table=ATTLOG.
 * Body is plain text: one tab-separated punch per line.
 *   userID \t YYYY-MM-DD HH:mm:ss \t inOutMode \t verifyType \t ...
 */
export const POST: RequestHandler = async ({ url, request }) => {
	const sn = url.searchParams.get('SN');
	const table = url.searchParams.get('table');
	console.log(`[ZKTeco] POST /iclock/cdata — SN=${sn} table=${table}`);

	if (!isValidDevice(sn)) {
		console.warn(`[ZKTeco] POST rejected: SN=${sn} does not match ZKTECO_DEVICE_SN`);
		return new Response('Unauthorized', { status: 401 });
	}

	// Only process attendance log pushes; acknowledge all other tables gracefully
	if (table !== 'ATTLOG') {
		console.log(`[ZKTeco] POST: ignoring table=${table}`);
		return new Response('OK', { headers: { 'Content-Type': 'text/plain' } });
	}

	const body = await request.text();
	console.log(`[ZKTeco] POST body (${body.length} bytes):\n${body}`);

	if (!body.trim()) {
		console.log('[ZKTeco] POST: empty body, nothing to process');
		return new Response('OK: 0', { headers: { 'Content-Type': 'text/plain' } });
	}

	const rawPunches = parseIClockBody(body);
	if (rawPunches.length === 0) {
		console.warn('[ZKTeco] POST: body received but 0 punches parsed — check format above');
		return new Response('OK: 0', { headers: { 'Content-Type': 'text/plain' } });
	}

	let processed = 0;
	for (const raw of rawPunches) {
		try {
			await processPunch({ ...raw, deviceSn: sn ?? 'unknown' });
			processed++;
		} catch (err) {
			console.error('[ZKTeco] Failed to process punch', raw.deviceUserId, raw.timestamp, err);
		}
	}

	// ZKTeco devices expect "OK: <count>" to confirm receipt
	console.log(`[ZKTeco] POST complete: ${processed}/${rawPunches.length} punches processed`);
	return new Response(`OK: ${processed}`, {
		headers: { 'Content-Type': 'text/plain' }
	});
};
