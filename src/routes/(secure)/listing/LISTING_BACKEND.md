# Listing Backend Notes

This document captures the backend contract for the Listing feature so it can be wired later without changing the UI behavior.

## Firestore Collection

- Collection: `listings`
- Document id format: `LST-YYYYMMDD-XXXX`
- Recommended index ordering: `createdAt desc`

## Suggested Document Shape

```ts
{
  id: string;
  listingType: 'internal' | 'portal';
  clientDetails: {
    fullName: string;
    mobileNumber: string;
    email: string;
  };
  propertyDetails: {
    developerName: string;
    community?: string;
    projectName: string;
    unitNo: string;
    propertyType: 'apartment' | 'townhouse' | 'villa' | 'commercial' | 'plot';
    bedroomType?: 'studio' | '1bed' | '2bed' | '2bed+maid' | '3bed' | '3bed+maid' | '4bed' | '5bed' | '6-7bed' | 'duplex' | 'penthouse' | 'podium-townhouse';
    commercialSubType?: 'office' | 'warehouse';
    propertySize?: number;
    plotArea?: number;
    builtUpArea?: number;
    grossFloorArea?: number;
  };
  attachments: {
    titleDeedOrQood?: UploadedFile;
    video?: UploadedFile;
    pictures?: UploadedFile;
    floorPlans?: UploadedFile;
    passport?: UploadedFile;
    emiratesId?: UploadedFile;
  };
  pricing: {
    buyingPrice: number;
    liquidityInvested: number;
    sellingPrice: number;
  };
  createdByUid: string;
  createdByEmail: string;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}
```

`UploadedFile` should follow the same metadata shape already used in `sales.remote.ts` via `uploadFileWithLink`.

## Validation Rules (Zod)

Required for all listings:

- Client full name, mobile number, email
- Developer name, project name, unit no, property type
- Buying price, liquidity invested, selling price

Property conditional rules:

- `apartment`: `bedroomType` + `propertySize` required
- `townhouse` or `villa`: `bedroomType` + `plotArea` + `builtUpArea` required
- `commercial`: `commercialSubType` + `propertySize` required
- `commercial` + `warehouse`: `grossFloorArea` required
- `plot`: `plotArea` required

Listing type conditional rules:

- `portal`: `titleDeedOrQood`, `passport`, and `emiratesId` are mandatory
- `internal`: all attachments optional

## File Upload Paths

Use this folder structure:

- `listings/{uid}/{listingId}/title-deed`
- `listings/{uid}/{listingId}/video`
- `listings/{uid}/{listingId}/pictures`
- `listings/{uid}/{listingId}/floor-plans`
- `listings/{uid}/{listingId}/passport`
- `listings/{uid}/{listingId}/emirates-id`

## Future Remote Action

Create a form action similar to the sales implementation:

- File: `src/routes/(secure)/listing/listing-management/listing.remote.ts`
- Parse with Zod
- Upload files using `uploadFileWithLink`
- Save doc in `firestore.collection('listings').doc(listingId)`
- Redirect to `/listing/listing-management`
