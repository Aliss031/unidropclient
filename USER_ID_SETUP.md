# User ID (unidropID) Setup

## Overview

Each user in the system is automatically assigned a unique `unidropID` in the format `UDXXXXX` (where XXXXX is a 5-digit number) when they register. This ID is stored in the `users` collection in Firestore.

## How It Works

1. **On Registration**: When a user registers (via email/password or Google), a unique `unidropID` is automatically generated and stored in their user document.

2. **ID Generation**: 
   - Format: `UDXXXXX` (e.g., `UD12345`, `UD78901`)
   - The 5-digit number is randomly generated between 10000-99999
   - The system checks for duplicates and regenerates if needed
   - Fallback uses timestamp if all random IDs are taken (extremely rare)

3. **Storage**: The `unidropID` is stored in the `users` collection under each user's document (keyed by their Firebase Auth UID).

## Firestore Structure

### `users` Collection

Each document ID is the Firebase Auth UID, and contains:

```typescript
{
  uid: string,              // Firebase Auth UID (same as document ID)
  email: string,            // User's email
  displayName: string,      // User's display name
  photoURL: string,         // User's profile photo URL
  unidropID: string,         // Unique ID in format "UDXXXXX"
  createdAt: Timestamp,      // When the user was created
  lastLogin: Timestamp       // Last login time
}
```

## Example

When a user registers:
- Firebase Auth creates user with UID: `abc123xyz`
- System generates unidropID: `UD45678`
- Firestore document created at: `users/abc123xyz`
- Document contains: `{ uid: "abc123xyz", unidropID: "UD45678", ... }`

## Accessing unidropID

You can retrieve a user's `unidropID` using the `getUserData` function:

```typescript
import { getUserData } from './services/userService';

const userData = await getUserData(user.uid);
const unidropID = userData?.unidropID; // e.g., "UD45678"
```

## Security Rules

Make sure your Firestore security rules allow users to read their own data:

```javascript
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

## Notes

- The `unidropID` is generated once per user and never changes
- If a user document already exists (e.g., from a previous login), the system will only add the `unidropID` if it's missing
- The system handles duplicate ID generation automatically
- All authentication methods (email/password and Google) create/update user documents with `unidropID`
