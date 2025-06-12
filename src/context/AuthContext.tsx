
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
    if (!auth) { 
      // If Firebase auth service itself isn't available (e.g., due to init error in firebase.ts),
      // `loading` will remain true, and the message in the render block below will be shown.
      // No need to call setLoading(false) here, as that would hide the guidance.
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
        if (currentUser.email === 'caiozz_lj@hotmail.com' || currentUser.email?.includes('admin')) {
          setRole('admin');
        } else if (currentUser.email?.includes('dj')) {
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

  // This screen now correctly persists if `auth` is not initialized due to errors in firebase.ts,
  // because `loading` will remain `true` as `onAuthStateChanged` (which sets it to false) is not called.
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
