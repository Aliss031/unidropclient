# Firebase Setup Guide

This app is now connected to Firebase Firestore. Here's what you need to set up:

## Firestore Collections

You need to create two collections in your Firestore database:

### 1. `parcels` Collection

Each document should have the following fields:

```typescript
{
  trackingNumber: string,      // e.g., "SWIFT-99210"
  courier: string,             // e.g., "FedEx Express"
  sender: string,              // e.g., "Amazon Prime"
  status: string,              // "Pending", "In Transit", "Ready for Collection", "Collected"
  estimatedArrival: Timestamp, // Firestore Timestamp
  collectionPin: string,       // 6-digit PIN, e.g., "492831"
  hubId: string,              // Reference to hub document ID
  userId?: string             // Optional: user ID for filtering
}
```

### 2. `hubs` Collection

Each document should have the following fields:

```typescript
{
  name: string,               // e.g., "Downtown Central Hub"
  address: string,            // e.g., "123 Main St, Metro City"
  lat: number,               // Latitude, e.g., 40.7128
  lng: number,               // Longitude, e.g., -74.0060
  distance: string,           // e.g., "0.8 km"
  status: string             // "Open", "Limited", "Full"
}
```

## Firestore Security Rules

Make sure to set up appropriate security rules. Example:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Parcels collection
    match /parcels/{parcelId} {
      allow read: if true; // Or restrict to authenticated users
      allow write: if request.auth != null; // Only authenticated users can write
    }
    
    // Hubs collection
    match /hubs/{hubId} {
      allow read: if true; // Public read access
      allow write: if request.auth != null; // Only authenticated users can write
    }
  }
}
```

## Sample Data

You can add sample data manually through the Firebase Console or use the following structure:

### Sample Parcel Document:
```json
{
  "trackingNumber": "SWIFT-99210",
  "courier": "FedEx Express",
  "sender": "Amazon Prime",
  "status": "Ready for Collection",
  "estimatedArrival": "2024-01-15T10:30:00Z",
  "collectionPin": "492831",
  "hubId": "h1"
}
```

### Sample Hub Document:
```json
{
  "name": "Downtown Central Hub",
  "address": "123 Main St, Metro City",
  "lat": 40.7128,
  "lng": -74.0060,
  "distance": "0.8 km",
  "status": "Open"
}
```

## Features

- **Real-time Updates**: The app uses Firestore's `onSnapshot` to get real-time updates when parcels or hubs change
- **Automatic Loading**: Data loads automatically when the app starts
- **Fallback Handling**: The app gracefully handles empty collections and loading states

## Next Steps

1. Go to your Firebase Console: https://console.firebase.google.com
2. Select your project: `unidrop-aliss`
3. Navigate to Firestore Database
4. Create the `parcels` and `hubs` collections
5. Add sample documents using the structure above
6. The app will automatically display the data!
