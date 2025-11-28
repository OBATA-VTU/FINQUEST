
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
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
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (data: { name: string; email: string; pass: string; level: Level; username: string; matricNumber: string }) => Promise<void>;
  logout: () => void;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
            // Fetch user details from Firestore
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
                    avatarUrl: userData.avatarUrl || firebaseUser.photoURL
                });
            } else {
                // Handle case where user exists in Auth but not in Firestore
                const newUser = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || 'User',
                    username: firebaseUser.email?.split('@')[0] || 'user',
                    role: 'student' as const,
                    level: 100 as Level,
                    avatarUrl: firebaseUser.photoURL || undefined
                };
                setUser(newUser);
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            // Fallback: Set user with basic auth info if Firestore fails
             setUser({
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || 'User',
                    username: 'error_loading_profile',
                    role: 'student',
                    level: 100
                });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [showNotification]);

  const login = async (email: string, pass: string) => {
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        showNotification("Login successful!", "success");
    } catch (error: any) {
        throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;
        
        // Check if doc exists
        try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
               // New Google User - Create Doc
               // Sanitize data to ensure no undefined values
               const cleanData = JSON.parse(JSON.stringify({
                name: firebaseUser.displayName || 'User',
                email: firebaseUser.email,
                role: 'student', // Default role
                level: 100,
                username: firebaseUser.email?.split('@')[0].substring(0, 30) || `user${Math.floor(Math.random() * 1000)}`,
                createdAt: new Date().toISOString()
              }));

              await setDoc(doc(db, 'users', firebaseUser.uid), cleanData);
              showNotification("Account created with Google!", "success");
            } else {
              showNotification("Welcome back!", "success");
            }
        } catch (dbError) {
            console.error("Firestore error during Google Sign In:", dbError);
            // Don't block login if DB fails, allow basic auth access
            showNotification("Logged in (Profile sync issue)", "info");
        }
    } catch (error: any) {
        throw error;
    }
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
      if (!username || username.length < 3) return false;
      try {
        const q = query(collection(db, 'users'), where('username', '==', username));
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty;
      } catch (error) {
          console.warn("Username check failed (likely permission issue for unauth users):", error);
          // If we can't check due to permissions, allow user to try submitting
          return true; 
      }
  };

  const signup = async (data: { name: string; email: string; pass: string; level: Level; username: string; matricNumber: string }) => {
      try {
          // Attempt check again, but ignore permission errors
          try {
             const isAvailable = await checkUsernameAvailability(data.username);
             if (!isAvailable) throw new Error("Username is already taken");
          } catch (e: any) {
              if (e.message === "Username is already taken") throw e;
          }

          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.pass);
          const firebaseUser = userCredential.user;

          // CRITICAL: Update the Auth Profile Display Name immediately
          // This ensures the name shows up even if Firestore fails
          await updateProfile(firebaseUser, {
              displayName: data.name
          });

          const newUser: User = {
            id: firebaseUser.uid,
            email: data.email,
            name: data.name,
            role: 'student', // ALWAYS DEFAULT TO STUDENT
            level: data.level,
            username: data.username,
            matricNumber: data.matricNumber || '' // Ensure string, never undefined
          };

          // Create user document in Firestore
          // We use JSON.parse(JSON.stringify(...)) as a quick way to strip 'undefined' values which crash Firestore
          try {
              const cleanData = JSON.parse(JSON.stringify({
                ...newUser,
                createdAt: new Date().toISOString()
              }));
              
              await setDoc(doc(db, 'users', firebaseUser.uid), cleanData);
              console.log("User document created successfully");
          } catch (dbError) {
              console.error("Database creation failed:", dbError);
              // Do NOT throw here. The user is Auth'd. Let them in, deal with profile later.
              // showNotification("Account created, but profile save failed.", "info");
          }

          // Update local state immediately for better UX
          setUser(newUser);
          showNotification("Account created successfully!", "success");
      } catch (error: any) {
          console.error("Signup flow failed:", error);
          throw error;
      }
  };

  const logout = () => {
    signOut(auth);
    setUser(null);
    showNotification("Logged out successfully", "info");
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    signup,
    logout,
    checkUsernameAvailability
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
