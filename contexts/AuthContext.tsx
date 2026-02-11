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

// Random Professional Avatar Pool (Finance/Professional focused)
const STOCK_AVATARS = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=facearea&facepad=2&w=256&h=256&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?fit=facearea&facepad=2&w=256&h=256&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=facearea&facepad=2&w=256&h=256&q=80",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?fit=facearea&facepad=2&w=256&h=256&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?fit=facearea&facepad=2&w=256&h=256&q=80"
];

const getRandomAvatar = () => STOCK_AVATARS[Math.floor(Math.random() * STOCK_AVATARS.length)];

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
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          
          // CRITICAL FIX: Ensure user has an avatar. If missing, assign a random professional stock photo.
          // This applies to existing users who missed the prompt.
          if (!userData.avatarUrl) {
              const newAvatar = firebaseUser.photoURL || getRandomAvatar();
              await updateDoc(userDocRef, { avatarUrl: newAvatar });
              userData.avatarUrl = newAvatar;
          }

          setUser({ ...userData, id: firebaseUser.uid });
          await updateDoc(userDocRef, {
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
      
      const result = await signInWithPopup(auth, provider);
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
      
      if (!uid && data.pass) {
          const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, data.email, data.pass);
          uid = firebaseUser.uid;
          await updateProfile(firebaseUser, { displayName: data.name, photoURL: data.avatarUrl });
      }

      if (!uid) throw new Error("Authentication failed during signup.");

      // AUTO-GENERATION: If no avatar provided (Google or Manual), use a random stock photo
      const finalAvatar = data.avatarUrl || getRandomAvatar();

      const userData: User = {
        id: uid,
        name: data.name,
        email: data.email,
        username: data.username,
        matricNumber: data.matricNumber,
        level: data.level,
        role: 'student',
        avatarUrl: finalAvatar,
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