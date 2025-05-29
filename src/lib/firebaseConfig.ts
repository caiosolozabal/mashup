// src/lib/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAyn2ykNxbhRP57PmDnBIualPsfF_0ePAg",
  authDomain: "mashup-rj.firebaseapp.com",
  projectId: "mashup-rj",
  storageBucket: "mashup-rj.firebasestorage.app",
  messagingSenderId: "666727460571",
  appId: "1:666727460571:web:03591a0268c6405ad9a6fe"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, app };