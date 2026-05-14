/**
 * ZKTeco iClock getrequest endpoint
 *
 * The SA40 device polls GET /iclock/getrequest periodically to check whether
 * the server has any pending commands (e.g. sync user list, reboot device).
 * Responding with "OK" tells the device there are no pending commands.
 */
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	return new Response('OK', { headers: { 'Content-Type': 'text/plain' } });
};
