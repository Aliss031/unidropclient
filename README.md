<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1XNIxRkkUuhVwDWzF3Pf9cC38CKIZjv_i

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the root directory and add your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```
   Get your API key from: https://aistudio.google.com/app/apikey

3. **Firebase Setup**: 
   - The app is already configured with Firebase (see `lib/firebase.ts`)
   - **Enable Authentication**: See [AUTH_SETUP.md](./AUTH_SETUP.md) for enabling email/password and Google sign-in
   - **Create Firestore Collections**: You need to create `parcels` and `hubs` collections
   - See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed Firestore instructions

4. Run the app:
   ```bash
   npm run dev
   ```

The app will be available at http://localhost:3000

## Firebase Integration

This app uses Firebase for both authentication and data storage.

### Authentication
- **Email/Password** registration and login
- **Google Sign-In** support
- **Password Reset** functionality
- See [AUTH_SETUP.md](./AUTH_SETUP.md) for setup instructions

### Firestore Database
The Firebase configuration is already set up in `lib/firebase.ts`. 

**Important:** Make sure to:
1. Enable Authentication methods (Email/Password and Google) in Firebase Console
2. Create the `parcels` and `hubs` collections in your Firestore database
3. Add sample data (see FIREBASE_SETUP.md for structure)
4. Configure Firestore security rules appropriately (see AUTH_SETUP.md)

The app will automatically:
- Show login/register pages when not authenticated
- Load and display data from Firebase in real-time when authenticated
- Filter parcels by user ID for personalized experience
