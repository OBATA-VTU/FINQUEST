
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDQOg8iafqR-LEkFXj-03Ua2-Vci1tc7zY",
  authDomain: "finquest-9668d.firebaseapp.com",
  projectId: "finquest-9668d",
  storageBucket: "finquest-9668d.firebasestorage.app",
  messagingSenderId: "482625346112",
  appId: "1:482625346112:web:714b74df1dba35733e9da5",
  measurementId: "G-08M9R5SZG7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
