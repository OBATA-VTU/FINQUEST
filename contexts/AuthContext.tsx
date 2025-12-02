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
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<boolean>; // Returns true if NEW user (needs profile setup)
  signup: (data: { name: string; email: string; pass: string; level: Level; username: string; matricNumber: string; avatarUrl?: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  toggleBookmark: (questionId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const sanitizeData = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

// 30 Minutes Inactivity Limit
const INACTIVITY_LIMIT = 30 * 60 * 1000; 
// Update "Last Active" in DB every 5 minutes
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  
  // Refs for timers - using any to avoid NodeJS namespace issues in browser environment
  const idleTimerRef = useRef<any>(null);
  const heartbeatTimerRef = useRef<any>(null);
  const lastInteractionRef = useRef<number>(Date.now());

  // 1. Auth State Observer - Direct loading management without artificial delays
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
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
                    lastActive: userData.lastActive
                });
            } else {
                // If auth exists but no DB doc, treat as partial user
                const newUser = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || 'User',
                    username: '', // Explicitly empty to force setup
                    role: 'student' as const,
                    level: 100 as Level,
                    avatarUrl: firebaseUser.photoURL || undefined,
                    savedQuestions: []
                };
                setUser(newUser);
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            // Fallback
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
      }
      
      // Stop loading immediately after check
      setLoading(false);
    });

    return () => {
        unsubscribe();
    };
  }, [showNotification]);

  // 2. Auto Logout & Activity Tracking Logic
  useEffect(() => {
      if (!user) return;

      const updateActivity = () => {
          lastInteractionRef.current = Date.now();
      };

      const handleHeartbeat = async () => {
          if (!auth.currentUser) return;
          try {
              // Update lastActive timestamp in Firestore
              await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                  lastActive: new Date().toISOString()
              });
          } catch (e) {
              // Silent fail for heartbeat
              console.warn("Heartbeat failed", e); 
          }
      };

      const checkInactivity = () => {
          const now = Date.now();
          if (now - lastInteractionRef.current > INACTIVITY_LIMIT) {
              console.log("User inactive. Logging out.");
              showNotification("Session expired due to inactivity. Please login again.", "warning");
              logout(); 
          }
      };

      // Events to track activity
      window.addEventListener('mousemove', updateActivity);
      window.addEventListener('keydown', updateActivity);
      window.addEventListener('click', updateActivity);
      window.addEventListener('scroll', updateActivity);

      // Initial Heartbeat
      handleHeartbeat();

      // Timers
      idleTimerRef.current = setInterval(checkInactivity, 60 * 1000); // Check every minute
      heartbeatTimerRef.current = setInterval(handleHeartbeat, HEARTBEAT_INTERVAL); // Update DB every 5 mins

      return () => {
          window.removeEventListener('mousemove', updateActivity);
          window.removeEventListener('keydown', updateActivity);
          window.removeEventListener('click', updateActivity);
          window.removeEventListener('scroll', updateActivity);
          
          if (idleTimerRef.current) clearInterval(idleTimerRef.current);
          if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      };
  }, [user?.id]); // Re-run only when user changes (login/logout)

  const login = async (email: string, pass: string) => {
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        showNotification("Login successful!", "success");
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

        try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
               // New Google User - Create Basic Doc
               const cleanData = sanitizeData({
                name: firebaseUser.displayName || 'User',
                email: firebaseUser.email,
                role: 'student',
                level: 100,
                createdAt: new Date().toISOString(),
                photoURL: firebaseUser.photoURL,
                savedQuestions: [],
                lastActive: new Date().toISOString()
                // NO username yet
              });

              await setDoc(doc(db, 'users', firebaseUser.uid), cleanData);
              showNotification("Account created! Please complete your profile.", "success");
              isIncompleteProfile = true;
            } else {
              const data = userDoc.data();
              // STRICT CHECK FOR MISSING FIELDS
              if (!data.matricNumber || !data.username) {
                  isIncompleteProfile = true;
                  showNotification("Profile incomplete. Please finish setup.", "info");
              } else {
                  showNotification("Welcome back!", "success");
              }
            }
        } catch (dbError) {
            console.error("Firestore error during Google Sign In:", dbError);
            showNotification("Logged in (Profile sync issue)", "info");
        }
        
        return isIncompleteProfile;
    } catch (error: any) {
        console.error("Google Sign-in Error Full:", error);
        if (error.code === 'auth/unauthorized-domain') {
            throw new Error(`Domain not authorized. Add '${window.location.hostname}' to Firebase Console.`);
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
        // If snapshot is empty, username is available
        return querySnapshot.empty;
      } catch (error: any) {
          console.error("Username check failed:", error);
          // Optimistic: If we can't check due to network or permission, assume available
          // to avoid blocking the user from signing up.
          return true; 
      }
  };

  const signup = async (data: { name: string; email: string; pass: string; level: Level; username: string; matricNumber: string; avatarUrl?: string }) => {
      try {
          const cleanUsername = data.username.trim().toLowerCase();
          
          // Double check username availability
          const isAvailable = await checkUsernameAvailability(cleanUsername);
          
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.pass);
          const firebaseUser = userCredential.user;

          try {
            await updateProfile(firebaseUser, {
              displayName: data.name,
              photoURL: data.avatarUrl || null
            });
          } catch(e) { console.warn("Profile name update failed", e); }

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
            lastActive: new Date().toISOString()
          };

          try {
              const cleanData = sanitizeData({
                ...newUser,
                createdAt: new Date().toISOString()
              });
              
              await setDoc(doc(db, 'users', firebaseUser.uid), cleanData);
          } catch (dbError: any) {
              console.error("Database creation failed:", dbError);
              showNotification("Account created, but profile setup incomplete. Please update profile later.", "info");
          }

          setUser(newUser);
          showNotification("Account created successfully!", "success");
      } catch (error: any) {
          console.error("Signup flow failed:", error);
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
      let newSaved: string[];

      const isBookmarking = !currentSaved.includes(questionId);

      if (isBookmarking) {
          newSaved = [...currentSaved, questionId];
          showNotification("Bookmark saved", "success");
      } else {
          newSaved = currentSaved.filter(id => id !== questionId);
          showNotification("Bookmark removed", "info");
      }

      // Optimistic update
      setUser({ ...user, savedQuestions: newSaved });

      try {
          const userRef = doc(db, 'users', user.id);
          await updateDoc(userRef, { savedQuestions: newSaved });
      } catch (e) {
          console.error("Error updating bookmarks", e);
          showNotification("Failed to sync bookmark", "error");
          setUser(user); // Revert on failure
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
    toggleBookmark
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};