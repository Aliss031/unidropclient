// services/firebaseService.ts
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Parcel, ParcelStatus, Hub } from "../types";

// Convert Firestore timestamp to string
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toLocaleString();
  }
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleString();
  }
  return String(timestamp);
};

// Convert Firestore document to Parcel
const docToParcel = (doc: any): Parcel => {
  const data = doc.data();
  return {
    id: doc.id,
    trackingNumber: data.trackingNumber || '',
    courier: data.courier || '',
    sender: data.sender || '',
    status: data.status as ParcelStatus || ParcelStatus.PENDING,
    estimatedArrival: formatTimestamp(data.estimatedArrival) || data.estimatedArrival || '',
    collectionPin: data.collectionPin || '',
    hubId: data.hubId || '',
  };
};

// Convert Firestore document to Hub
const docToHub = (doc: any): Hub => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name || '',
    address: data.address || '',
    lat: data.lat || 0,
    lng: data.lng || 0,
    distance: data.distance || '',
    status: data.status || 'Open',
  };
};

// Parcels Service
export const parcelsService = {
  // Get all parcels for a user
  async getParcels(userId?: string): Promise<Parcel[]> {
    try {
      const parcelsRef = collection(db, "parcels");
      let q;
      
      if (userId) {
        q = query(parcelsRef, where("userId", "==", userId));
      } else {
        q = query(parcelsRef);
      }
      
      const querySnapshot = await getDocs(q);
      const parcels = querySnapshot.docs.map(docToParcel);
      // Sort by estimatedArrival in memory (more reliable than Firestore orderBy)
      return parcels.sort((a, b) => {
        const dateA = new Date(a.estimatedArrival).getTime();
        const dateB = new Date(b.estimatedArrival).getTime();
        return dateB - dateA; // Descending order
      });
    } catch (error) {
      console.error("Error fetching parcels:", error);
      return [];
    }
  },

  // Get a single parcel by ID
  async getParcelById(parcelId: string): Promise<Parcel | null> {
    try {
      const parcelRef = doc(db, "parcels", parcelId);
      const parcelSnap = await getDoc(parcelRef);
      
      if (parcelSnap.exists()) {
        return docToParcel(parcelSnap);
      }
      return null;
    } catch (error) {
      console.error("Error fetching parcel:", error);
      return null;
    }
  },

  // Subscribe to parcels changes (real-time)
  subscribeToParcels(
    userId: string | undefined,
    callback: (parcels: Parcel[]) => void
  ): () => void {
    const parcelsRef = collection(db, "parcels");
    let q;
    
    if (userId) {
      q = query(parcelsRef, where("userId", "==", userId));
    } else {
      q = query(parcelsRef);
    }
    
    return onSnapshot(q, (querySnapshot) => {
      const parcels = querySnapshot.docs.map(docToParcel);
      // Sort by estimatedArrival in memory
      const sorted = parcels.sort((a, b) => {
        const dateA = new Date(a.estimatedArrival).getTime();
        const dateB = new Date(b.estimatedArrival).getTime();
        return dateB - dateA; // Descending order
      });
      callback(sorted);
    }, (error) => {
      console.error("Error in parcels subscription:", error);
      callback([]);
    });
  },

  // Add a new parcel
  async addParcel(parcel: Omit<Parcel, "id">): Promise<string | null> {
    try {
      const parcelsRef = collection(db, "parcels");
      const parcelData: any = { ...parcel };
      
      // Convert estimatedArrival string to Timestamp if needed
      if (parcel.estimatedArrival) {
        try {
          const date = new Date(parcel.estimatedArrival);
          if (!isNaN(date.getTime())) {
            parcelData.estimatedArrival = Timestamp.fromDate(date);
          }
        } catch (e) {
          // Keep as string if conversion fails
          parcelData.estimatedArrival = parcel.estimatedArrival;
        }
      }
      
      const docRef = await addDoc(parcelsRef, parcelData);
      return docRef.id;
    } catch (error) {
      console.error("Error adding parcel:", error);
      return null;
    }
  },

  // Update parcel status
  async updateParcelStatus(parcelId: string, status: ParcelStatus): Promise<boolean> {
    try {
      const parcelRef = doc(db, "parcels", parcelId);
      await updateDoc(parcelRef, { status });
      return true;
    } catch (error) {
      console.error("Error updating parcel:", error);
      return false;
    }
  },
};

// Hubs Service
export const hubsService = {
  // Get all hubs
  async getHubs(): Promise<Hub[]> {
    try {
      const hubsRef = collection(db, "hubs");
      const querySnapshot = await getDocs(hubsRef);
      return querySnapshot.docs.map(docToHub);
    } catch (error) {
      console.error("Error fetching hubs:", error);
      return [];
    }
  },

  // Get a single hub by ID
  async getHubById(hubId: string): Promise<Hub | null> {
    try {
      const hubRef = doc(db, "hubs", hubId);
      const hubSnap = await getDoc(hubRef);
      
      if (hubSnap.exists()) {
        return docToHub(hubSnap);
      }
      return null;
    } catch (error) {
      console.error("Error fetching hub:", error);
      return null;
    }
  },

  // Subscribe to hubs changes (real-time)
  subscribeToHubs(callback: (hubs: Hub[]) => void): () => void {
    const hubsRef = collection(db, "hubs");
    return onSnapshot(hubsRef, (querySnapshot) => {
      const hubs = querySnapshot.docs.map(docToHub);
      callback(hubs);
    });
  },
};
