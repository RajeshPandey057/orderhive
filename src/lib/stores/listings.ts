import { writable } from 'svelte/store';

const listingsStore = writable<Listing[]>([]);

function addListing(listing: Listing) {
	listingsStore.update((current) => [listing, ...current]);
}

function clearListings() {
	listingsStore.set([]);
}

export { listingsStore, addListing, clearListings };
