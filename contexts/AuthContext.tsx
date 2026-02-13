
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

const STOCK_AVATARS = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=facearea&facepad=2&w=256&h=256&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?fit=facearea&facepad=2&w=256&h=256&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=facearea&facepad=2&w=256&h=256&q=80",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?fit=facearea&facepad=2&w=256&h=256&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?fit=facearea&facepad=2&w=256&h=256&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?fit=facearea&facepad=2&w=256&h=256&q=80"
];

const getRandomAvatar = () => STOCK_AVATARS[Math.floor(Math.random() * STOCK_AVATARS.length)];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const isSigningIn = useRef(false);

  const isPasswordAccount = auth.currentUser?.providerData.some(p => p.providerId === 'password') || false;
  const isGoogleAccount = auth.currentUser?.providerData.some(p => p.providerId === 'google.com') || false;

  const checkAndRefreshCredits = async (currentUser: User) => {
    const today = new Date().toLocaleDateString('en-CA'); 
    if (currentUser.lastCreditRefreshDate !== today) {
      try {
        const updates = { aiCredits: 1000, lastCreditRefreshDate: today };
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, updates);
        setUser(prev => prev && prev.id === currentUser.id ? { ...prev, ...updates } : prev);
      } catch (e) {
        console.error("Failed to refresh credits:", e);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          if (!userData.avatarUrl) {
              const newAvatar = firebaseUser.photoURL || getRandomAvatar();
              await updateDoc(userDocRef, { avatarUrl: newAvatar });
              userData.avatarUrl = newAvatar;
          }
          const fullUser = { ...userData, id: firebaseUser.uid };
          setUser(fullUser);
          await checkAndRefreshCredits(fullUser);
          await updateDoc(userDocRef, { lastActive: new Date().toISOString() });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => { checkAndRefreshCredits(user); }, 30000);
    return () => clearInterval(interval);
  }, [user?.id, user?.lastCreditRefreshDate]);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const loginWithGoogle = async () => {
    if (isSigningIn.current) throw new Error("Auth in progress");
    isSigningIn.current = true;
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      return { needsProfileCompletion: !userDoc.exists(), googleUser: result.user };
    } finally {
      isSigningIn.current = false;
    }
  };

  const signup = async (data: { name: string; email: string; pass?: string; level: Level; username: string; matricNumber: string; avatarUrl?: string; googleUid?: string }) => {
    let uid = data.googleUid;
    if (!uid && data.pass) {
        const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, data.email, data.pass);
        uid = firebaseUser.uid;
    }
    if (!uid) throw new Error("Authentication failed.");

    // Verification Logic: Auto-verify if matric number starts with 230602
    const isAutoVerified = data.matricNumber.trim().startsWith('230602');

    const userData: User = {
      id: uid,
      name: data.name,
      email: data.email,
      username: data.username.toLowerCase().trim(),
      matricNumber: data.matricNumber.toUpperCase().trim(),
      level: data.level,
      role: 'student',
      avatarUrl: data.avatarUrl || getRandomAvatar(),
      contributionPoints: 0,
      aiCredits: 1000, 
      lastCreditRefreshDate: new Date().toLocaleDateString('en-CA'),
      savedQuestions: [],
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      badges: [],
      isVerified: isAutoVerified
    };
    await setDoc(doc(db, 'users', uid), userData);
    setUser(userData);
    
    if (isAutoVerified) {
        showNotification("Identity verified automatically based on departmental records!", "success");
    }
  };

  const logout = async () => { await signOut(auth); setUser(null); };

  const addPassword = async (password: string) => {
    if (!auth.currentUser) return;
    const credential = EmailAuthProvider.credential(auth.currentUser.email!, password);
    await linkWithCredential(auth.currentUser, credential);
  };

  const linkGoogleAccount = async () => {
    if (!auth.currentUser) return;
    const provider = new GoogleAuthProvider();
    await linkWithPopup(auth.currentUser, provider);
  };

  const toggleBookmark = async (questionId: string) => {
    if (!user) return;
    const isBookmarked = user.savedQuestions?.includes(questionId);
    const userRef = doc(db, 'users', user.id);
    if (isBookmarked) {
      await updateDoc(userRef, { savedQuestions: arrayRemove(questionId) });
      setUser({ ...user, savedQuestions: user.savedQuestions?.filter(id => id !== questionId) });
    } else {
      await updateDoc(userRef, { savedQuestions: arrayUnion(questionId) });
      setUser({ ...user, savedQuestions: [...(user.savedQuestions || []), questionId] });
    }
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
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
