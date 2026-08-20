
import React, { createContext, useState, useContext, ReactNode, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, Level } from '../types';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  linkWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, getDocFromServer } from 'firebase/firestore';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: { name: string; email: string; pass: string; level: Level; username: string; matricNumber: string; avatarUrl?: string }) => Promise<void>;
  logout: () => Promise<void>;
  toggleBookmark: (questionId: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  isPasswordAccount: boolean;
  addPassword: (password: string) => Promise<void>;
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

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity
const MAX_SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours max session
const ACTIVITY_STORAGE_KEY = 'finsa_last_activity';
const SESSION_START_KEY = 'finsa_session_start';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const isSigningIn = useRef(false);

  // Session activity tracking
  const updateActivity = () => {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
  };

  useEffect(() => {
    if (!user) {
        localStorage.removeItem(SESSION_START_KEY);
        return;
    }

    // Initial activity set
    updateActivity();
    if (!localStorage.getItem(SESSION_START_KEY)) {
        localStorage.setItem(SESSION_START_KEY, Date.now().toString());
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    const checkInterval = setInterval(async () => {
      const now = Date.now();
      const lastActivity = parseInt(localStorage.getItem(ACTIVITY_STORAGE_KEY) || '0');
      const sessionStart = parseInt(localStorage.getItem(SESSION_START_KEY) || '0');

      const isInactive = lastActivity && now - lastActivity > SESSION_TIMEOUT;
      const isDurationExceeded = sessionStart && now - sessionStart > MAX_SESSION_DURATION;

      if (isInactive || isDurationExceeded) {
        console.log(isInactive ? "Session expired due to inactivity" : "Session duration exceeded");
        await logout();
        sessionStorage.setItem('session_expired', 'true');
        window.location.href = '/login';
      }
    }, 30000); // Check every 30 seconds

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(checkInterval);
    };
  }, [user?.id]);

  const isPasswordAccount = auth.currentUser?.providerData.some(p => p.providerId === 'password') || false;

  const checkAndRefreshCredits = async (currentUser: User) => {
    const today = new Date().toLocaleDateString('en-CA'); 
    if (currentUser.lastCreditRefreshDate !== today) {
      try {
        const updates = { aiCredits: 1000, lastCreditRefreshDate: today };
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, updates);
        setUser(prev => prev && prev.id === currentUser.id ? { ...prev, ...updates } : prev);
      } catch (e: any) {
        console.error("Failed to refresh credits:", e.message || "Unknown error");
      }
    }
  };

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'config', 'health_check'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Firebase connection failed. Please ensure Firestore is provisioned.");
        }
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          let userData = userDoc.data() as User;
          const fullUser = { ...userData, id: firebaseUser.uid };
          setUser(fullUser);

          // Bootstrap Admin
          if (firebaseUser.email === 'ayubaboluwatife246@gmail.com') {
            await setDoc(doc(db, 'admins', firebaseUser.uid), { email: firebaseUser.email }, { merge: true });
            if (userData.role !== 'admin') {
              await updateDoc(userDocRef, { role: 'admin' });
              userData.role = 'admin';
            }
          }
          
          // Parallelize background updates
          const updates: any = { lastActive: new Date().toISOString() };
          if (!userData.avatarUrl) {
              updates.avatarUrl = firebaseUser.photoURL || getRandomAvatar();
          }
          
          // Fire and forget updates to avoid blocking UI
          updateDoc(userDocRef, updates).catch(e => console.error("Background update failed", e.message || "Unknown error"));
          checkAndRefreshCredits(fullUser).catch(e => console.error("Credit refresh failed", e.message || "Unknown error"));
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

  const login = useCallback(async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  }, []);

  const signup = useCallback(async (data: { name: string; email: string; pass: string; level: Level; username: string; matricNumber: string; avatarUrl?: string }) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, data.email, data.pass);
    const uid = firebaseUser.uid;

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
  }, [showNotification]);

  const logout = useCallback(async () => { await signOut(auth); setUser(null); }, []);

  const addPassword = useCallback(async (password: string) => {
    if (!auth.currentUser) return;
    const credential = EmailAuthProvider.credential(auth.currentUser.email!, password);
    await linkWithCredential(auth.currentUser, credential);
  }, []);

  const toggleBookmark = useCallback(async (questionId: string) => {
    if (!user) return;
    const isBookmarked = user.savedQuestions?.includes(questionId);
    const userRef = doc(db, 'users', user.id);
    if (isBookmarked) {
      await updateDoc(userRef, { savedQuestions: arrayRemove(questionId) });
      setUser(prev => prev ? ({ ...prev, savedQuestions: prev.savedQuestions?.filter(id => id !== questionId) }) : null);
    } else {
      await updateDoc(userRef, { savedQuestions: arrayUnion(questionId) });
      setUser(prev => prev ? ({ ...prev, savedQuestions: [...(prev.savedQuestions || []), questionId] }) : null);
    }
  }, [user]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const value = useMemo(() => ({ 
    user, loading, login, signup, logout, 
    toggleBookmark, updateUser, isPasswordAccount,
    addPassword
  }), [user, loading, login, signup, logout, 
       toggleBookmark, updateUser, isPasswordAccount,
       addPassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
