
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

const provideEnvInstructions = () => {
  console.error(
    "----------------------------------------------------------------------------------\n" +
    "IMPORTANT: Firebase Initialization Issue\n" +
    "----------------------------------------------------------------------------------\n" +
    "There seems to be a problem with your Firebase project configuration. This is often\n" +
    "due to missing or incorrect Firebase credentials in your environment variables.\n\n" +
    "Please take the following steps:\n" +
    "1. Ensure you have a `.env.local` file in the root directory of your project.\n" +
    "2. This file should contain your Firebase project's specific credentials. It should\n" +
    "   look similar to this (replace 'YOUR_...' with your actual values from your Firebase project settings):\n\n" +
    '   NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"\n' +
    '   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"\n' +
    '   NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"\n' +
    '   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"\n' +
    '   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"\n' +
    '   NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"\n\n' +
    "3. You can find these values in your Firebase project settings (Project settings -> General tab -> Your apps -> SDK setup and configuration).\n" +
    "4. If the file and variables are present, double-check for any typos or inaccuracies.\n" +
    "5. Also, ensure that the necessary services (like Authentication) are enabled for your\n" +
    "   project in the Firebase console.\n\n" +
    "The application might not function correctly until this is resolved. Check the browser's developer console for more specific error messages from Firebase.\n" +
    "----------------------------------------------------------------------------------"
  );
};

if (typeof window !== 'undefined') {
  if (!firebaseConfig.apiKey) {
    console.error('Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing or empty in your environment variables.');
    provideEnvInstructions();
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
      provideEnvInstructions();
      // `auth` will implicitly be `undefined` if `getAuth(app)` or other calls fail.
      // AuthContext is designed to handle `auth` being undefined/falsy.
    }
  }
}

// @ts-ignore
export { app, auth, db, storage };
