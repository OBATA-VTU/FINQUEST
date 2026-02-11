
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
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<{ needsProfileCompletion: boolean }>;
  signup: (data: { name: string; email: string; pass: string; level: Level; username: string; matricNumber: string; avatarUrl?: string }) => Promise<void>;
  logout: () => Promise<void>;
  toggleBookmark: (questionId: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  isPasswordAccount: boolean;
  isGoogleAccount: boolean;
  addPassword: (password: string) => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const isSigningIn = useRef(false); // Guard against concurrent auth calls

  const isPasswordAccount = auth.currentUser?.providerData.some(p => p.providerId === 'password') || false;
  const isGoogleAccount = auth.currentUser?.providerData.some(p => p.providerId === 'google.com') || false;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser({ ...userData, id: firebaseUser.uid });
          // Update last active
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
      showNotification(error.message || "Login failed", "error");
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    if (isSigningIn.current) {
        throw new Error("Authentication already in progress.");
    }

    try {
      isSigningIn.current = true;
      // Fix for "Missing Initial State": Ensure persistence is locked in
      await setPersistence(auth, browserLocalPersistence);
      
      const provider = new GoogleAuthProvider();
      // Forces the account selection screen and ensures a clean state
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (!userDoc.exists()) {
        return { needsProfileCompletion: true };
      }
      
      showNotification("Signed in with Google", "success");
      return { needsProfileCompletion: false };
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      
      if (error.code === 'auth/popup-closed-by-user') {
          showNotification("Login cancelled.", "info");
      } else if (error.code === 'auth/internal-error' || error.message.includes('sessionStorage')) {
          showNotification("Browser storage issue detected. Please refresh or check cookie settings.", "error");
      } else {
          showNotification(error.message || "Google Sign-In failed", "error");
      }
      throw error;
    } finally {
      isSigningIn.current = false;
    }
  };

  const signup = async (data: { name: string; email: string; pass: string; level: Level; username: string; matricNumber: string; avatarUrl?: string }) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, data.email, data.pass);
      await updateProfile(firebaseUser, { displayName: data.name, photoURL: data.avatarUrl });
      
      const userData: User = {
        id: firebaseUser.uid,
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
      
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      setUser(userData);
      showNotification("Account created successfully!", "success");
    } catch (error: any) {
      showNotification(error.message || "Registration failed", "error");
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
      showNotification("Password added successfully! You can now login with email/password.", "success");
    } catch (error: any) {
      showNotification(error.message || "Failed to add password", "error");
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
      showNotification(error.message || "Failed to link Google account", "error");
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
      showNotification("Failed to update bookmarks", "error");
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
