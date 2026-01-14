// services/userService.ts
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { User } from "firebase/auth";

// Generate unique unidropID in format UDXXXXX (5 digits)
const generateUnidropID = (): string => {
  const randomNum = Math.floor(10000 + Math.random() * 90000); // 10000-99999
  return `UD${randomNum}`;
};

// Check if unidropID already exists
const unidropIDExists = async (unidropID: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("unidropID", "==", unidropID));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking unidropID:", error);
    return false;
  }
};

// Generate a unique unidropID that doesn't exist
export const generateUniqueUnidropID = async (): Promise<string> => {
  let unidropID = generateUnidropID();
  let exists = await unidropIDExists(unidropID);
  
  // Retry if ID exists (very unlikely but handle it)
  let attempts = 0;
  while (exists && attempts < 10) {
    unidropID = generateUnidropID();
    exists = await unidropIDExists(unidropID);
    attempts++;
  }
  
  if (exists) {
    // Fallback: use timestamp-based ID if all random IDs are taken
    const timestamp = Date.now().toString().slice(-5);
    unidropID = `UD${timestamp}`;
  }
  
  return unidropID;
};

// Create or update user document in Firestore
export const createOrUpdateUser = async (
  user: User,
  additionalData?: { fullName?: string; email?: string }
): Promise<void> => {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // User exists, update if needed
      const existingData = userSnap.data();
      const updateData: any = {
        email: user.email || existingData.email,
        displayName: user.displayName || existingData.displayName || additionalData?.fullName,
        photoURL: user.photoURL || existingData.photoURL,
        lastLogin: new Date(),
      };
      
      // Only update unidropID if it doesn't exist
      if (!existingData.unidropID) {
        updateData.unidropID = await generateUniqueUnidropID();
      }
      
      await setDoc(userRef, updateData, { merge: true });
    } else {
      // New user, create document with unidropID
      const unidropID = await generateUniqueUnidropID();
      
      const userData = {
        uid: user.uid,
        email: user.email || additionalData?.email || "",
        displayName: user.displayName || additionalData?.fullName || "",
        photoURL: user.photoURL || "",
        unidropID: unidropID,
        createdAt: new Date(),
        lastLogin: new Date(),
      };
      
      await setDoc(userRef, userData);
    }
  } catch (error) {
    console.error("Error creating/updating user:", error);
    throw error;
  }
};

// Get user document from Firestore
export const getUserData = async (uid: string): Promise<any | null> => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
};
