
import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { User, Level } from '../types';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  linkWithCredential,
  linkWithPopup,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<{ needsProfileCompletion: boolean; googleUser?: any }>;
  signup: (data: { name: string; email: string; pass?: string; level: Level; username: string; matricNumber: string; avatarUrl?: string; googleUid?: string }) => Promise<void>;
  logout: () => Promise<void>;
  toggleBookmark: (questionId: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  isPasswordAccount: boolean;
  isGoogleAccount: boolean;
  addPassword: (password: string) => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// Helper to translate technical errors into friendly English
const getFriendlyErrorMessage = (code: string) => {
    switch (code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return "The email or password you entered is incorrect.";
        case 'auth/email-already-in-use':
            return "An account with this email already exists.";
        case 'auth/popup-closed-by-user':
            return "Sign-in was cancelled. Please try again.";
        case 'auth/network-request-failed':
            return "Connection error. Please check your internet.";
        case 'auth/weak-password':
            return "Your password is too weak. Try at least 6 characters.";
        case 'auth/too-many-requests':
            return "Too many attempts. Please try again later.";
        case 'auth/user-disabled':
            return "This account has been suspended. Please contact the PRO.";
        case 'auth/operation-not-allowed':
            return "This sign-in method is currently disabled.";
        default:
            return "Something went wrong. Please try again later.";
    }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const isSigningIn = useRef(false);

  const isPasswordAccount = auth.currentUser?.providerData.some(p => p.providerId === 'password') || false;
  const isGoogleAccount = auth.currentUser?.providerData.some(p => p.providerId === 'google.com') || false;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser({ ...userData, id: firebaseUser.uid });
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            lastActive: new Date().toISOString()
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, pass);
      showNotification("Welcome back!", "success");
    } catch (error: any) {
      showNotification(getFriendlyErrorMessage(error.code), "error");
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    if (isSigningIn.current) throw new Error("Auth in progress");

    try {
      isSigningIn.current = true;
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (!userDoc.exists()) {
        return { needsProfileCompletion: true, googleUser: result.user };
      }
      
      showNotification("Signed in successfully with Google", "success");
      return { needsProfileCompletion: false };
    } catch (error: any) {
      showNotification(getFriendlyErrorMessage(error.code), "error");
      throw error;
    } finally {
      isSigningIn.current = false;
    }
  };

  const signup = async (data: { name: string; email: string; pass?: string; level: Level; username: string; matricNumber: string; avatarUrl?: string; googleUid?: string }) => {
    try {
      let uid = data.googleUid;
      
      // If not a Google user completing profile, create new Firebase user
      if (!uid && data.pass) {
          const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, data.email, data.pass);
          uid = firebaseUser.uid;
          await updateProfile(firebaseUser, { displayName: data.name, photoURL: data.avatarUrl });
      }

      if (!uid) throw new Error("Authentication failed during signup.");

      const userData: User = {
        id: uid,
        name: data.name,
        email: data.email,
        username: data.username,
        matricNumber: data.matricNumber,
        level: data.level,
        role: 'student',
        avatarUrl: data.avatarUrl || '',
        contributionPoints: 0,
        savedQuestions: [],
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        badges: []
      };
      
      await setDoc(doc(db, 'users', uid), userData);
      setUser(userData);
      showNotification("Your account has been created!", "success");
    } catch (error: any) {
      showNotification(getFriendlyErrorMessage(error.code), "error");
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    showNotification("Logged out successfully", "info");
  };

  const addPassword = async (password: string) => {
    if (!auth.currentUser) return;
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, password);
      await linkWithCredential(auth.currentUser, credential);
      showNotification("Password added! You can now sign in with email/password.", "success");
    } catch (error: any) {
      showNotification(getFriendlyErrorMessage(error.code), "error");
      throw error;
    }
  };

  const linkGoogleAccount = async () => {
    if (!auth.currentUser) return;
    try {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(auth.currentUser, provider);
      showNotification("Google account linked successfully!", "success");
    } catch (error: any) {
      showNotification(getFriendlyErrorMessage(error.code), "error");
      throw error;
    }
  };

  const toggleBookmark = async (questionId: string) => {
    if (!user) return;
    const isBookmarked = user.savedQuestions?.includes(questionId);
    const userRef = doc(db, 'users', user.id);
    try {
      if (isBookmarked) {
        await updateDoc(userRef, { savedQuestions: arrayRemove(questionId) });
        setUser({ ...user, savedQuestions: user.savedQuestions?.filter(id => id !== questionId) });
      } else {
        await updateDoc(userRef, { savedQuestions: arrayUnion(questionId) });
        setUser({ ...user, savedQuestions: [...(user.savedQuestions || []), questionId] });
      }
    } catch (e) {
      showNotification("Couldn't update bookmarks.", "error");
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) setUser({ ...user, ...updates });
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, login, loginWithGoogle, signup, logout, 
      toggleBookmark, updateUser, isPasswordAccount, isGoogleAccount,
      addPassword, linkGoogleAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Wrap the Firebase popup for reliability
async function signInPopup(auth: any, provider: any) {
    try {
        return await signInWithPopup(auth, provider);
    } catch (e: any) {
        if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
            throw e;
        }
        // Attempt redirect if popup is blocked
        console.warn("Popup blocked, fallback could be implemented here.");
        throw e;
    }
}
