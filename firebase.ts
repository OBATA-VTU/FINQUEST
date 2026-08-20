import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions } from 'firebase/functions';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase using the provisioned config
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
// CRITICAL: Must use firestoreDatabaseId from config for correct routing
const db: Firestore = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
const storage: FirebaseStorage = getStorage(app);
const functions = getFunctions(app);

export { app, auth, db, storage, functions };
