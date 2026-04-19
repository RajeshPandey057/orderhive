# Listing Feature — Session Notes

Last updated: 2026-04-19

---

## What Has Been Implemented

### 1. Remote Form Action

**File:** `src/routes/(secure)/listing/listing-management/listing.remote.ts`

Fully implemented using SvelteKit `$app/server` `form()` remote function with Zod validation.

- Generates listing ID via Firestore counter transaction → `LST-YYYYMMDD-XXXX`
- Uploads files in parallel via `uploadFileWithLink` from `$lib/server/firebase`
- Saves to `firestore.collection('listings').doc(listingId)`
- Redirects to `/listing/listing-management` on success

### 2. Add Listing UI

**File:** `src/lib/components/add-listing-sheet.svelte`

Fully wired to `createListing` from `listing.remote.ts`. Key implementation details:

- Client-side `validate()` runs before `submit()` for instant feedback
- Media files (photos/videos) are injected into hidden `<input type="file">` elements via `DataTransfer` before submit
- `saving = $state(false)` local state controls the Save button — NOT `createListing.pending` (see bug fix below)
- The Internal/Portal toggle is uncommented and functional

### 3. Portal Listings Page

**File:** `src/routes/(portal)/listings/+page.server.ts`

Loads all listings from Firestore and filters/sorts in JS:

```ts
const snap = await firestore.collection('listings').get();
// ...map docs...
const portalListings = listings
  .filter((l) => l.listingType === 'portal')
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
return { firestoreListings: portalListings };
```

**Why not Firestore compound query:** `where('listingType', '==', 'portal').orderBy('createdAt', 'desc')` requires a composite index that wasn't created. JS filter avoids the index requirement entirely.

---

## Firestore Document Shape (Actual — as saved by listing.remote.ts)

```ts
{
  id: string;                       // e.g. "LST-20260419-0001"
  listingType: 'internal' | 'portal';

  // Flat client fields (not nested)
  clientName: string;               // `${firstName} ${lastName}`
  clientPhone: string;
  clientEmail: string;

  // Property fields (flat, not nested)
  developer: string;
  community?: string;
  project: string;
  unitNo: string;
  propertyType: 'apartment' | 'townhouse' | 'villa' | 'commercial' | 'plot';
  bedroomType?: string;
  commercialSubType?: 'office' | 'warehouse';
  propertySize?: number;
  plotArea?: number;
  builtUpArea?: number;
  grossFloorArea?: number;

  // Address (nested object, all fields optional)
  propertyAddress: {
    addressLine1?: string;
    addressLine2?: string;
    buildingName?: string;
    street?: string;
    area?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    landmark?: string;
  };

  // File name shortcuts (for quick display in tables/lists)
  titleDeedFileName: string | null;
  passportFileName: string | null;
  emiratesIdFileName: string | null;

  // Media array for gallery rendering
  mediaAssets: { type: 'photo' | 'video'; fileName: string }[];

  // Pricing
  buyingPrice: number;
  liquidityInvested: number;
  sellingPrice: number;

  // Agent assignment
  listedByEmails: string[];

  // Full attachment metadata (for downloads / compliance)
  attachments: {
    titleDeed: UploadedFile | null;
    passport: UploadedFile | null;
    emiratesId: UploadedFile | null;
    pictures: UploadedFile[];
    videos: UploadedFile[];
  };

  createdByUid: string;
  createdByEmail: string;
  createdAt: FieldValue;   // serverTimestamp()
  updatedAt: FieldValue;
}
```

> **Note:** The suggested shape in the original doc used nested `clientDetails` and `propertyDetails` objects. The actual implementation is flat for most fields except `propertyAddress` and `attachments`. Do not change the shape without a migration.

`UploadedFile` follows the same metadata shape as `sales.remote.ts` → `uploadFileWithLink` return value, with an added `original` object:

```ts
{
  ...uploadedResult,
  original: { name, size, type, lastModified }
}
```

---

## Form Schema (listing.remote.ts — Zod)

FormData field names used in the `<form>`:

| Field                    | Type                       | Notes                                   |
| ------------------------ | -------------------------- | --------------------------------------- |
| `createdByUid`           | string                     | hidden input                            |
| `createdByEmail`         | string                     | hidden input                            |
| `listingType`            | `'internal'` \| `'portal'` | hidden input; driven by toggle          |
| `firstName`              | string                     | —                                       |
| `lastName`               | string                     | —                                       |
| `clientPhone`            | string                     | —                                       |
| `clientEmail`            | string                     | —                                       |
| `developer`              | string                     | hidden input; set by popover combobox   |
| `community`              | string?                    | —                                       |
| `project`                | string                     | —                                       |
| `unitNo`                 | string                     | —                                       |
| `propertyType`           | enum                       | —                                       |
| `bedroomType`            | enum?                      | conditional                             |
| `commercialSubType`      | enum?                      | conditional                             |
| `propertySize`           | number?                    | coerced                                 |
| `plotArea`               | number?                    | coerced                                 |
| `builtUpArea`            | number?                    | coerced                                 |
| `grossFloorArea`         | number?                    | coerced                                 |
| `addressLine1..landmark` | string?                    | optional address fields                 |
| `titleDeedFile`          | File?                      | file input                              |
| `passportFile`           | File?                      | file input                              |
| `emiratesIdFile`         | File?                      | file input                              |
| `pictureFiles`           | File[]                     | hidden multi-file, set via DataTransfer |
| `videoFiles`             | File[]                     | hidden multi-file, set via DataTransfer |
| `buyingPrice`            | number                     | coerced                                 |
| `liquidityInvested`      | number                     | coerced                                 |
| `sellingPrice`           | number                     | coerced                                 |
| `listedByEmails`         | string[]                   | multiple hidden inputs with same name   |

### Validation Rules (superRefine)

| Condition                                 | Required fields                                              |
| ----------------------------------------- | ------------------------------------------------------------ |
| `propertyType === 'apartment'`            | `bedroomType`, `propertySize`                                |
| `propertyType === 'townhouse' \| 'villa'` | `bedroomType`, `plotArea`, `builtUpArea`                     |
| `propertyType === 'commercial'`           | `commercialSubType`, `propertySize`                          |
| `commercial` + `warehouse`                | also `grossFloorArea`                                        |
| `propertyType === 'plot'`                 | `plotArea`                                                   |
| `listingType === 'portal'`                | `titleDeedFile`, `passportFile`, `emiratesIdFile` (size > 0) |

---

## File Upload Paths

```
listings/{createdByUid}/{listingId}/title-deed
listings/{createdByUid}/{listingId}/passport
listings/{createdByUid}/{listingId}/emirates-id
listings/{createdByUid}/{listingId}/pictures   ← each photo
listings/{createdByUid}/{listingId}/video      ← each video
```

No floor-plans upload is implemented yet in the remote action (schema field doesn't exist).

---

## Bugs Fixed This Session

### Bug 1: Portal listings page showing 0 results

**Root cause:** Compound Firestore query `where('listingType', '==', 'portal').orderBy('createdAt', 'desc')` silently failed — requires a composite index that was never created.  
**Fix:** Changed to plain `.get()` + JS `.filter()` + `.sort()` in `+page.server.ts`.

### Bug 2: Internal/Portal toggle not appearing in the Add Property form

**Root cause:** The listing type toggle section was wrapped in `<!-- ... -->` comments.  
**Fix:** Uncommented the toggle section in `add-listing-sheet.svelte`.

### Bug 3: "Saving..." button stuck after client-side validation failure

**Root cause:** `createListing.pending` is set to `true` by the SvelteKit framework the moment the form submits. When `validate()` returns `false`, the `enhance` callback returns early without calling `submit()` — so the framework never gets the signal to clear `pending`. Result: button permanently stuck in disabled "Saving..." state.  
**Fix:** Replaced `createListing.pending` with a local `let saving = $state(false)`. The saving flag is only set inside the enhance callback after validation passes, and is always cleared in a `finally` block:

```svelte
saving = true;
try {
  await submit();
  const issues = createListing.fields.allIssues();
  if (!issues?.length) {
    form.reset(); open = false;
    toast.success('Property listing added');
    resetForm();
  }
} catch {
  toast.error('Failed to add listing. Please try again.');
} finally {
  saving = false;
}
```

---

## Known Pre-existing Linting Warnings

Three `Each block should have a key` compile warnings exist in `add-listing-sheet.svelte` at:

- Line ~348: `{#each listedByEmails.map(...)` — hidden inputs
- Lines ~615, ~637: `{#each apartmentBedroomTypes}` and `{#each villaTownhouseBedroomTypes}` — `<option>` elements

These are non-blocking but should be keyed when convenient.

---

## Current State

| Item                                  | Status                                                              |
| ------------------------------------- | ------------------------------------------------------------------- |
| `listing.remote.ts` form action       | ✅ Implemented                                                      |
| `add-listing-sheet.svelte` form UI    | ✅ Implemented                                                      |
| Internal/Portal toggle                | ✅ Visible and functional                                           |
| Saving state bug                      | ✅ Fixed                                                            |
| Portal listings page query            | ✅ Fixed (JS filter)                                                |
| Portal listing in Firestore           | ❌ None saved yet (all existing docs are `listingType: 'internal'`) |
| `/listings` portal page showing cards | ❌ 0 results (no portal-type docs exist)                            |
| Floor plans upload                    | ❌ Not in schema                                                    |
| Listing edit/delete                   | ❌ Not implemented                                                  |
| Draft / Save as Draft                 | ❌ Button exists in UI but has no action                            |

---

## What Needs to Happen Next

1. **Save a portal listing** — requires uploading Title Deed, Passport, Emirates ID files + all required fields. Once one portal listing is saved, the `/listings` page will display it.
2. **Floor plans field** — add `floorPlansFile` field to the Zod schema and upload to `${basePath}/floor-plans`.
3. **Save as Draft** — currently a styled button with no action. Needs a separate `saveDraft` form or a `isDraft: true` flag.
4. **Listing detail page** — `/listing/listing-management/[id]` probably needs a view/edit sheet.
5. **Composite Firestore index** — if query performance becomes an issue at scale, add a composite index on `listingType ASC, createdAt DESC` in Firebase console to allow the direct compound query instead of JS filter.
