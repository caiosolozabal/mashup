
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDSCEY8ugpjMW-_UotWpwYp8ZWLziC0Vlk",
  authDomain: "listeiro-cf302.firebaseapp.com",
  projectId: "listeiro-cf302",
  storageBucket: "listeiro-cf302.firebasestorage.app",
  messagingSenderId: "782774474874",
  appId: "1:782774474874:web:520dd515bf8895bd4d03c3",
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (typeof window !== 'undefined') {
  // Check if any crucial config values are missing (they shouldn't be if hardcoded like this, but good for safety)
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error(
      "----------------------------------------------------------------------------------\n" +
      "IMPORTANT: Firebase Configuration Incomplete\n" +
      "----------------------------------------------------------------------------------\n" +
      "The Firebase configuration in `src/lib/firebase.ts` appears to be missing critical\n" +
      "values like apiKey or projectId. Please ensure these are correctly set.\n" +
      "----------------------------------------------------------------------------------"
    );
    // `app`, `auth`, etc., will remain uninitialized. AuthContext should handle `!auth`.
  } else {
    try {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }
      // These must be within the try block as they can also fail if `app` is not valid.
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
    } catch (error: any) {
      console.error('Firebase initialization failed. See details below.');
      console.error('Error Name:', error.name);
      console.error('Error Message:', error.message);
      if (error.code) { // Firebase errors usually have a code
        console.error('Error Code:', error.code);
      }
      console.error(
        "----------------------------------------------------------------------------------\n" +
        "Firebase Initialization Issue\n" +
        "----------------------------------------------------------------------------------\n" +
        "Ensure your Firebase project (listeiro-cf302) is correctly set up in the Firebase console\n" +
        "(e.g., Authentication, Firestore, Storage services are enabled) and that the\n" +
        "configuration values hardcoded in `src/lib/firebase.ts` are accurate for this project.\n" +
        "Check the browser's developer console for more specific error messages from Firebase.\n" +
        "----------------------------------------------------------------------------------"
      );
      // `auth` will implicitly be `undefined` if `getAuth(app)` or other calls fail.
      // AuthContext is designed to handle `auth` being undefined/falsy.
    }
  }
}

// @ts-ignore
export { app, auth, db, storage };

