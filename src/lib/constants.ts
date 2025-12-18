import { dev } from '$app/environment';

export const SESSION_TOKEN = 'ind-leads-session-token';
export const HOUR_IN_SECONDS = 60 * 55;
export const WEEK_IN_SECONDS = 60 * 60 * 24 * 7;
export const WEEK_IN_MILLISECONDS = 60 * 60 * 24 * 7 * 1000;
export const options = { path: '/', httpOnly: true, secure: !dev, age: WEEK_IN_SECONDS };
