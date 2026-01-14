// services/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { createOrUpdateUser } from "./userService";

const googleProvider = new GoogleAuthProvider();

// Helper function to convert Firebase errors to user-friendly messages
const getErrorMessage = (error: any): string => {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code === 'auth/email-already-in-use') {
    return 'This email is already registered. Please sign in instead.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters.';
  }
  if (code === 'auth/user-not-found') {
    return 'No account found with this email. Please sign up first.';
  }
  if (code === 'auth/wrong-password') {
    return 'Incorrect password. Please try again.';
  }
  if (code === 'auth/invalid-credential') {
    return 'Invalid email or password. Please try again.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many failed attempts. Please try again later.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in popup was closed. Please try again.';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Sign-in was cancelled. Please try again.';
  }

  return message || 'An error occurred. Please try again.';
};

export const authService = {
  // Register with email and password
  async register(email: string, password: string, fullName: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore with unidropID
      await createOrUpdateUser(userCredential.user, { fullName, email });
      
      return { user: userCredential.user, error: null };
    } catch (error: any) {
      return { user: null, error: getErrorMessage(error) };
    }
  },

  // Login with email and password
  async login(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Update last login time (user document should already exist, but create if it doesn't)
      await createOrUpdateUser(userCredential.user);
      
      return { user: userCredential.user, error: null };
    } catch (error: any) {
      return { user: null, error: getErrorMessage(error) };
    }
  },

  // Sign in with Google
  async signInWithGoogle(): Promise<{ user: User | null; error: string | null }> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Create or update user document in Firestore with unidropID
      await createOrUpdateUser(result.user);
      
      return { user: result.user, error: null };
    } catch (error: any) {
      return { user: null, error: getErrorMessage(error) };
    }
  },

  // Sign out
  async logout(): Promise<void> {
    await signOut(auth);
  },

  // Reset password
  async resetPassword(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  // Subscribe to auth state changes
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  },

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  },
};
