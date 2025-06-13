
'use client';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Ensure firebase is initialized before auth is imported
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserDetails } from '@/lib/types';


// Define user roles for Mashup Music
export type UserRole = 'admin' | 'partner' | 'dj' | null;

interface AuthContextType {
  user: User | null;
  userDetails: UserDetails | null; 
  loading: boolean;
  role: UserRole; // Kept for convenience, derived from userDetails.role
  dj_percentual: number | null; // Kept for convenience, derived from userDetails.dj_percentual
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userDetails: null,
  loading: true,
  role: null, 
  dj_percentual: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  // role and dj_percentual will be derived from userDetails but kept for quick access
  const [role, setRole] = useState<UserRole>(null);
  const [djPercentual, setDjPercentual] = useState<number | null>(null);


  useEffect(() => {
    if (!auth || !db) { 
      setLoading(false); // Ensure loading stops if Firebase isn't initialized
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const fetchedUserDetails = userDocSnap.data() as UserDetails;
            setUserDetails(fetchedUserDetails);
            setRole(fetchedUserDetails.role);
            setDjPercentual(fetchedUserDetails.dj_percentual ?? null);
          } else {
            // User exists in Auth but not Firestore (e.g. first login)
            // Create a default user profile
            const newUserDetails: UserDetails = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'New User',
              role: 'dj', // Default role
              dj_percentual: 0.7, // Default percentage (70%)
            };
            await setDoc(userDocRef, { ...newUserDetails, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            setUserDetails(newUserDetails);
            setRole(newUserDetails.role);
            setDjPercentual(newUserDetails.dj_percentual ?? null);
            console.log(`New user profile created in Firestore for ${currentUser.uid}`);
          }
        } catch (error) {
          console.error("Error fetching/creating user document:", error);
          setUserDetails(null); // Fallback
          setRole(null);
          setDjPercentual(null);
        }
      } else {
        setUserDetails(null);
        setRole(null);
        setDjPercentual(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({
    user,
    userDetails,
    loading,
    role, // Derived from userDetails.role
    dj_percentual: djPercentual // Derived from userDetails.dj_percentual
  }), [user, userDetails, loading, role, djPercentual]);

  if (loading && typeof window !== 'undefined' && (!auth || !db)) {
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
