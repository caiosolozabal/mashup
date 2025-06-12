import type { UserRole } from '@/context/AuthContext'; // Assuming UserRole is here or define it

// Example UserDetails structure, to be refined
export interface UserDetails {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  // other app-specific user fields
}

export interface Event {
  id: string;
  date: Date; // or Timestamp for Firestore
  name: string;
  venue: string;
  client: string;
  totalValue: number;
  downPayment: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  accountReceived: string; // Bank account identifier or name
  assignedDJs: string[]; // Array of DJ UIDs or names
  // other event fields
  createdAt: Date; // or Timestamp
  updatedAt: Date; // or Timestamp
}

export interface DJPayment {
  id: string;
  djId: string;
  eventId: string;
  amount: number;
  percentage: number; // DJ's cut percentage
  status: 'pending' | 'paid';
  paymentDate?: Date; // or Timestamp
  proofUrl?: string; // Link to Firebase Storage for payment slip
  settlementGeneratedAt?: Date; // or Timestamp
  notes?: string;
}

export interface GuestList {
  id: string;
  eventId: string;
  promoterId?: string; // UID of promoter/birthday person
  name: string; // List name, e.g., "John's Birthday List"
  guests: Guest[];
}

export interface Guest {
  id: string; // or use array index if not needing unique ID before adding
  name: string;
  value: number; // Price
  type: 'standard' | 'vip' | 'courtesy';
  checkInTime?: Date; // or Timestamp
  checkedInBy?: string; // UID of lister
  addedAt: Date; // or Timestamp
}

// Add other types as needed, e.g., for Documents, Financial Settlements, etc.
