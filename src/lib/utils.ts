import { clsx, type ClassValue } from 'clsx';
import dayjs from 'dayjs';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getInitials(fullName: string) {
	if (!fullName || fullName.trim() === '') {
		return 'US';
	}
	const allNames = fullName.trim().split(' ');
	return ((allNames.at(0)?.charAt(0) ?? 'U') + (allNames.at(-1)?.charAt(0) ?? 'S')).toUpperCase();
}

export function formatDateDDMmmYYYY(dateStr: string | null | undefined): string {
	if (!dateStr) return '-';
	const d = dayjs(dateStr);
	if (!d.isValid()) return '-';
	return d.format('DD-MMM-YYYY');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
