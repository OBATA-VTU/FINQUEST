
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Hardcoded configuration to ensure immediate functionality
const firebaseConfig = {
  apiKey: "AIzaSyDQOg8iafqR-LEkFXj-03Ua2-Vci1tc7zY",
  authDomain: "finquest-9668d.firebaseapp.com",
  projectId: "finquest-9668d",
  storageBucket: "finquest-9668d.firebasestorage.app",
  messagingSenderId: "482625346112",
  appId: "1:482625346112:web:714b74df1dba35733e9da5",
  measurementId: "G-08M9R5SZG7"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { auth, db, storage };
