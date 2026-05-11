import { holidaysCollection, serializeHoliday } from '$lib/server/hr';

export async function load() {
	const currentYear = new Date().getFullYear();
	const snap = await holidaysCollection.where('year', '==', currentYear).get();
	const holidays = snap.docs
		.map((doc) => serializeHoliday(doc.id, doc.data()))
		.sort((a, b) => a.date.localeCompare(b.date));

	return { holidays, currentYear };
}
