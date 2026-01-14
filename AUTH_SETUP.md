# Firebase Authentication Setup

This app uses Firebase Authentication for user login and registration. Follow these steps to enable authentication:

## 1. Enable Authentication Methods in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `unidrop-aliss`
3. Navigate to **Authentication** in the left sidebar
4. Click **Get Started** if you haven't enabled Authentication yet

## 2. Enable Email/Password Authentication

1. In the Authentication page, click on **Sign-in method** tab
2. Click on **Email/Password**
3. Enable the first toggle (Email/Password)
4. Optionally enable "Email link (passwordless sign-in)" if desired
5. Click **Save**

## 3. Enable Google Sign-In

1. Still in the **Sign-in method** tab
2. Click on **Google**
3. Enable the toggle
4. Select a support email (your email)
5. Click **Save**

**Note:** For Google sign-in to work in production, you'll need to:
- Add authorized domains in Firebase Console (Authentication > Settings > Authorized domains)
- Configure OAuth consent screen in Google Cloud Console if needed

## 4. Configure Authorized Domains

1. In Authentication, go to **Settings** tab
2. Scroll to **Authorized domains**
3. Make sure `localhost` is listed (it should be by default)
4. Add your production domain when deploying

## 5. Firestore Security Rules

Update your Firestore security rules to require authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Parcels collection - users can only read/write their own parcels
    match /parcels/{parcelId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.uid == request.resource.data.userId);
    }
    
    // Hubs collection - public read, authenticated write
    match /hubs/{hubId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Testing

Once configured, you can:

1. **Register a new account** using email/password
2. **Sign in** with existing credentials
3. **Sign in with Google** (if enabled)
4. **Reset password** using the "Forgot Password?" link
5. **Sign out** from the profile page

## User Data

When a user registers:
- Their account is created in Firebase Authentication
- You can store additional user data (like full name) in Firestore if needed
- The user's `uid` is available throughout the app via `useAuth()` hook

## Features

- ✅ Email/Password registration and login
- ✅ Google Sign-In
- ✅ Password reset
- ✅ Persistent authentication (users stay logged in)
- ✅ Protected routes (main app only accessible when authenticated)
- ✅ User profile display with photo and email
