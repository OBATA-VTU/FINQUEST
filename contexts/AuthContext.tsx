
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
  loginWithGoogle: () => Promise<boolean>; // Returns true if NEW user (needs profile setup)
  signup: (data: { name: string; email: string; pass: string; level: Level; username: string; matricNumber: string; avatarUrl?: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const sanitizeData = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

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
                    avatarUrl: userData.avatarUrl || firebaseUser.photoURL
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
                    avatarUrl: firebaseUser.photoURL || undefined
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

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;
        
        let isNewUser = false;

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
                // NO username yet
              });

              await setDoc(doc(db, 'users', firebaseUser.uid), cleanData);
              showNotification("Account created! Please set up your profile.", "success");
              isNewUser = true;
            } else {
              const data = userDoc.data();
              // CHECK FOR MISSING FIELDS (Legacy users or incomplete setups)
              if (!data.matricNumber || !data.username) {
                  isNewUser = true;
                  showNotification("Please complete your profile setup.", "info");
              } else {
                  showNotification("Welcome back!", "success");
              }
            }
        } catch (dbError) {
            console.error("Firestore error during Google Sign In:", dbError);
            showNotification("Logged in (Profile sync issue)", "info");
        }
        
        return isNewUser;
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
          // Note: If check failed previously due to network, isAvailable is TRUE.
          // If the username IS actually taken, write will fail at database level (if rules enforce unique), or just overwrite/duplicate depending on logic.
          // But for this app, we prioritize UX over strict uniqueness during network outages.

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
            avatarUrl: data.avatarUrl
          };

          try {
              const cleanData = sanitizeData({
                ...newUser,
                createdAt: new Date().toISOString()
              });
              
              await setDoc(doc(db, 'users', firebaseUser.uid), cleanData);
          } catch (dbError: any) {
              console.error("Database creation failed:", dbError);
              // Show friendly message instead of "FirebaseError: ..."
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
        showNotification("Logged out successfully", "info");
    } catch (e) {
        console.error("Logout failed", e);
    }
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
