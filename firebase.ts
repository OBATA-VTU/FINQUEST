import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Use Environment Variables first, fallback to hardcoded (development) values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDQOg8iafqR-LEkFXj-03Ua2-Vci1tc7zY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "finquest-9668d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "finquest-9668d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "finquest-9668d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "482625346112",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:482625346112:web:714b74df1dba35733e9da5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-08M9R5SZG7"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { auth, db, storage };