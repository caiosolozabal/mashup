'use client';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Ensure firebase is initialized before auth is imported
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

// Define user roles - to be expanded
export type UserRole = 'admin' | 'partner' | 'dj' | 'finance' | 'manager' | 'producer' | null;

interface AuthContextType {
  user: User | null;
  // TODO: Add userDetails which includes role from Firestore
  // userDetails: UserDetails | null; 
  loading: boolean;
  role: UserRole; // Placeholder for role logic
}

// Placeholder for UserDetails which would come from Firestore
// interface UserDetails {
//   uid: string;
//   email: string | null;
//   displayName: string | null;
//   role: UserRole;
// }

export const AuthContext = createContext<AuthContextType>({
  user: null,
  // userDetails: null,
  loading: true,
  role: null, 
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  // const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null); // Example role state

  useEffect(() => {
    if (!auth) { // Prevent errors if firebase auth is not initialized
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // TODO: Fetch user role from Firestore based on currentUser.uid
        // For now, simulate role detection or set a default
        // const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        // if (userDoc.exists()) {
        //   setUserDetails(userDoc.data() as UserDetails);
        //   setRole(userDoc.data().role);
        // } else {
        //   // Handle case where user exists in Auth but not Firestore (e.g. new registration step)
        //   setRole(null); 
        // }
        // Simulating role for now:
        if (currentUser.email?.includes('admin')) setRole('admin');
        else if (currentUser.email?.includes('dj')) setRole('dj');
        else setRole(null); // Default or unassigned role
      } else {
        // setUserDetails(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({
    user,
    // userDetails,
    loading,
    role
  }), [user, /*userDetails,*/ loading, role]);

  if (loading && typeof window !== 'undefined' && !auth) {
    // Special case if Firebase takes a moment to init on client
     return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg font-semibold">Initializing Firebase...</p>
      </div>
    );
  }


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
