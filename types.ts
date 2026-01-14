
export enum ParcelStatus {
  PENDING = 'Pending',
  IN_TRANSIT = 'In Transit',
  READY = 'Ready for Collection',
  COLLECTED = 'Collected'
}

export interface Parcel {
  id: string;
  trackingNumber: string;
  courier: string;
  sender: string;
  status: ParcelStatus;
  estimatedArrival: string;
  collectionPin: string;
  hubId: string;
}

export interface Hub {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: string;
  status: 'Open' | 'Full' | 'Limited';
  hours?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type View = 'home' | 'parcels' | 'parcel-detail' | 'hubs' | 'hub-detail' | 'support' | 'profile' | 'notifications' | 'settings' | 'personal-info' | 'default-hub';

export interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}
