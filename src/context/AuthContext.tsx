
'use client';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Ensure firebase is initialized before auth is imported
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
// import { doc, getDoc } from 'firebase/firestore';
// import { db } from '@/lib/firebase';
// import type { UserDetails } from '@/lib/types';


// Define user roles for Mashup Music
export type UserRole = 'admin' | 'partner' | 'dj' | null;

interface AuthContextType {
  user: User | null;
  // userDetails: UserDetails | null; 
  loading: boolean;
  role: UserRole; 
}

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
  const [role, setRole] = useState<UserRole>(null);

  useEffect(() => {
    if (!auth) { 
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // TODO: Fetch user details (including role and percentage) from Firestore based on currentUser.uid
        // const userDocRef = doc(db, "users", currentUser.uid);
        // const userDocSnap = await getDoc(userDocRef);
        // if (userDocSnap.exists()) {
        //   const fetchedUserDetails = userDocSnap.data() as UserDetails;
        //   setUserDetails(fetchedUserDetails);
        //   setRole(fetchedUserDetails.role);
        // } else {
        //   // Handle case where user exists in Auth but not Firestore (e.g. new registration step or error)
        //   console.warn(`User ${currentUser.uid} not found in Firestore.`);
        //   setUserDetails(null);
        //   setRole(null); 
        // }

        // Simulating role detection for now based on email (placeholder)
        // Replace this with actual Firestore role fetching
        const email = currentUser.email || '';
        if (email.includes('admin@mashupmusic.com')) {
          setRole('admin');
        } else if (email.includes('partner@mashupmusic.com') || email === 'caiozz_lj@hotmail.com') { // Example partner
          setRole('partner');
        } else if (email.includes('dj@mashupmusic.com')) { // Example DJ
          setRole('dj');
        } else {
          setRole(null); // Default or unassigned role
        }

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
     return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg font-semibold">Initializing Firebase...</p>
        <p className="mt-2 text-sm text-muted-foreground">
          If this message persists, it likely means Firebase could not initialize.
          This is often due to missing or incorrect Firebase configuration.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Please check your browser&apos;s developer console for detailed error messages
          and ensure your Firebase environment variables (e.g., <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>)
          are correctly set up in a <code>.env.local</code> file at the root of your project.
        </p>
      </div>
    );
  }


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
