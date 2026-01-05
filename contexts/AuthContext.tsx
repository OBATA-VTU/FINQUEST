
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
  linkWithPopup,
  EmailAuthProvider,
  linkWithCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<boolean>; 
  signup: (data: { name: string; email: string; pass: string; level: Level; username: string; matricNumber: string; avatarUrl?: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  toggleBookmark: (questionId: string) => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  addPassword: (password: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void; // For real-time UI updates
  isPasswordAccount: boolean;
  isGoogleAccount: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const sanitizeData = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

const getFriendlyErrorMessage = (error: any): string => {
    const code = error.code || '';
    const msg = error.message || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Incorrect email or password.';
    if (code === 'auth/email-already-in-use') return 'Email already registered. Please log in.';
    if (code === 'auth/weak-password') return 'Password should be at least 6 characters.';
    return msg.replace('Firebase:', '').trim() || 'An unexpected error occurred.';
};

const INACTIVITY_LIMIT = 30 * 60 * 1000; 
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const [isPasswordAccount, setIsPasswordAccount] = useState(false);
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  
  const idleTimerRef = useRef<any>(null);
  const heartbeatTimerRef = useRef<any>(null);
  const lastInteractionRef = useRef<number>(Date.now());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsPasswordAccount(firebaseUser.providerData.some(p => p.providerId === 'password'));
        setIsGoogleAccount(firebaseUser.providerData.some(p => p.providerId === 'google.com'));
        try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // CHECK IF BANNED
                if (userData.isBanned) {
                    await signOut(auth);
                    showNotification("Account suspended. Contact Admin.", "error");
                    setUser(null);
                    setLoading(false);
                    return;
                }

                setUser({
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: userData.name || firebaseUser.displayName || 'User',
                    username: userData.username || '',
                    matricNumber: userData.matricNumber || '',
                    role: userData.role || 'student',
                    level: userData.level || 100,
                    avatarUrl: userData.avatarUrl || firebaseUser.photoURL,
                    contributionPoints: userData.contributionPoints || 0,
                    savedQuestions: userData.savedQuestions || [],
                    createdAt: userData.createdAt,
                    lastActive: userData.lastActive,
                    isVerified: userData.isVerified,
                    isBanned: userData.isBanned,
                    badges: userData.badges || []
                });
            } else {
                const newUser = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || 'User',
                    username: '', 
                    role: 'student' as const,
                    level: 100 as Level,
                    avatarUrl: firebaseUser.photoURL || undefined,
                    savedQuestions: [],
                    badges: []
                };
                setUser(newUser);
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
             setUser({
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || 'User',
                    username: 'error',
                    role: 'student',
                    level: 100,
                    savedQuestions: []
                });
        }
      } else {
        setUser(null);
        setIsPasswordAccount(false);
        setIsGoogleAccount(false);
      }
      setLoading(false);
    });

    return () => {
        unsubscribe();
    };
  }, [showNotification]);

  useEffect(() => {
      if (!user) return;

      const updateActivity = () => { lastInteractionRef.current = Date.now(); };

      const handleHeartbeat = async () => {
          if (!auth.currentUser) return;
          try {
              // Also check banned status during heartbeat to ensure quick logout
              const userRef = doc(db, 'users', auth.currentUser.uid);
              const snap = await getDoc(userRef);
              if (snap.exists() && snap.data().isBanned) {
                  logout();
                  showNotification("Session terminated by administrator.", "error");
                  return;
              }
              await updateDoc(userRef, { lastActive: new Date().toISOString() });
          } catch (e) { console.warn("Heartbeat failed", e); }
      };

      const checkInactivity = () => {
          if (Date.now() - lastInteractionRef.current > INACTIVITY_LIMIT) {
              showNotification("Session expired due to inactivity.", "warning");
              logout(); 
          }
      };

      window.addEventListener('mousemove', updateActivity);
      window.addEventListener('keydown', updateActivity);
      window.addEventListener('click', updateActivity);
      
      handleHeartbeat();

      idleTimerRef.current = setInterval(checkInactivity, 60 * 1000); 
      heartbeatTimerRef.current = setInterval(handleHeartbeat, HEARTBEAT_INTERVAL);

      return () => {
          window.removeEventListener('mousemove', updateActivity);
          window.removeEventListener('keydown', updateActivity);
          window.removeEventListener('click', updateActivity);
          
          if (idleTimerRef.current) clearInterval(idleTimerRef.current);
          if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      };
  }, [user?.id]);

  const updateUser = (updates: Partial<User>) => {
      if (user) {
          setUser(prevUser => ({ ...prevUser!, ...updates }));
      }
  };

  const login = async (email: string, pass: string) => {
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        // Auth state listener handles the rest
    } catch (error: any) {
        throw error;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;
        let isIncompleteProfile = false;

        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().isBanned) {
            await signOut(auth);
            throw new Error("Account suspended.");
        }
        
        if (!userDoc.exists()) {
           const cleanData = sanitizeData({
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email,
            role: 'student',
            level: 100,
            createdAt: new Date().toISOString(),
            photoURL: firebaseUser.photoURL,
            savedQuestions: [],
            lastActive: new Date().toISOString(),
            badges: []
          });

          await setDoc(userRef, cleanData);
          showNotification("Account created! Please complete your profile.", "success");
          isIncompleteProfile = true;
        } else {
          const data = userDoc.data();
          if (!data.matricNumber || !data.username) {
              isIncompleteProfile = true;
              showNotification("Profile incomplete.", "info");
          } else {
              showNotification("Welcome back!", "success");
          }
        }
        
        return isIncompleteProfile;
    } catch (error: any) {
        console.error("Google Sign-in Error:", error);
        if (error.code === 'auth/unauthorized-domain') {
            showNotification(`Domain unauthorized in Firebase console.`, 'error');
        } else if (error.code !== 'auth/popup-closed-by-user') {
            showNotification(getFriendlyErrorMessage(error), "error");
        }
        throw error;
    }
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
      if (!username || username.length < 3) return false;
      const cleanName = username.trim().toLowerCase();
      try {
        const q = query(collection(db, 'users'), where('username', '==', cleanName));
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty;
      } catch (error: any) {
          return true; // Optimistic fallback
      }
  };

  const signup = async (data: { name: string; email: string; pass: string; level: Level; username: string; matricNumber: string; avatarUrl?: string }) => {
      try {
          const cleanUsername = data.username.trim().toLowerCase();
          await checkUsernameAvailability(cleanUsername); // Just to verify, though handled in UI
          
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.pass);
          const firebaseUser = userCredential.user;

          try {
            await updateProfile(firebaseUser, {
              displayName: data.name,
              photoURL: data.avatarUrl || null
            });
          } catch(e) {}

          const newUser: User = {
            id: firebaseUser.uid,
            email: data.email,
            name: data.name,
            role: 'student', 
            level: data.level,
            username: cleanUsername,
            matricNumber: data.matricNumber || '',
            avatarUrl: data.avatarUrl,
            savedQuestions: [],
            badges: [],
            lastActive: new Date().toISOString()
          };

          await setDoc(doc(db, 'users', firebaseUser.uid), sanitizeData({...newUser, createdAt: new Date().toISOString()}));
          setUser(newUser);
          showNotification("Account created successfully!", "success");
      } catch (error: any) {
          throw error;
      }
  };

  const logout = async () => {
    try {
        await signOut(auth);
        setUser(null);
    } catch (e) {
        console.error("Logout failed", e);
    }
  };

  const toggleBookmark = async (questionId: string) => {
      if (!user) return;
      const currentSaved = user.savedQuestions || [];
      const userBadges = user.badges || [];
      let newSaved: string[];

      const isBookmarking = !currentSaved.includes(questionId);

      if (isBookmarking) {
          newSaved = [...currentSaved, questionId];
          showNotification("Bookmark saved", "success");
      } else {
          newSaved = currentSaved.filter(id => id !== questionId);
          showNotification("Bookmark removed", "info");
      }

      // Optimistically update local state first for instant UI feedback
      updateUser({ savedQuestions: newSaved });

      const userRef = doc(db, 'users', user.id);
      try {
          await updateDoc(userRef, { savedQuestions: newSaved });

          // Check for new bookmark-related badges
          if (isBookmarking) {
              const newBadgeAwards: string[] = [];
              if (newSaved.length >= 1 && !userBadges.includes('BOOKWORM_1')) newBadgeAwards.push('BOOKWORM_1');
              if (newSaved.length >= 10 && !userBadges.includes('BOOKWORM_10')) newBadgeAwards.push('BOOKWORM_10');

              if (newBadgeAwards.length > 0) {
                  const allBadges = [...new Set([...userBadges, ...newBadgeAwards])];
                  await updateDoc(userRef, { badges: allBadges });
                  updateUser({ badges: allBadges }); // Update context state
                  showNotification(`Unlocked: ${newBadgeAwards.map(b => b.replace(/_/g, ' ')).join(', ')}`, "success");
              }
          }
      } catch (e) {
          showNotification("Failed to sync bookmark", "error");
          // Revert optimistic update on failure
          updateUser({ savedQuestions: currentSaved });
      }
  };

  const linkGoogleAccount = async () => {
    if (!auth.currentUser) throw new Error("No user is logged in.");
    try {
        const provider = new GoogleAuthProvider();
        await linkWithPopup(auth.currentUser, provider);
        showNotification("Google account linked successfully!", "success");
        setIsGoogleAccount(true); // Force UI update
    } catch (error: any) {
        if (error.code === 'auth/credential-already-in-use') {
            showNotification("This Google account is already linked to another user.", "error");
        } else {
            showNotification(getFriendlyErrorMessage(error), "error");
        }
        throw error;
    }
  };

  const addPassword = async (password: string) => {
    if (!auth.currentUser || !auth.currentUser.email) {
        throw new Error("No user is logged in or user has no email.");
    }
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");

    try {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
        await linkWithCredential(auth.currentUser, credential);
        showNotification("Password added successfully!", "success");
        setIsPasswordAccount(true); // Force UI update
    } catch (error: any) {
        showNotification(getFriendlyErrorMessage(error), "error");
        throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    signup,
    logout,
    checkUsernameAvailability,
    toggleBookmark,
    linkGoogleAccount,
    addPassword,
    updateUser,
    isPasswordAccount,
    isGoogleAccount,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
