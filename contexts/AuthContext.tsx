
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Level } from '../types';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
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
                    name: userData.name || 'User',
                    username: userData.username || '',
                    matricNumber: userData.matricNumber || '',
                    role: userData.role || 'student',
                    level: userData.level || 100,
                    avatarUrl: userData.avatarUrl || firebaseUser.photoURL
                });
            } else {
                // Handle case where user exists in Auth but not in Firestore (e.g. newly google created)
                const generatedUsername = firebaseUser.email?.split('@')[0] || `user_${Math.floor(Math.random() * 1000)}`;
                const newUser = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || 'User',
                    username: generatedUsername,
                    role: 'student' as const,
                    level: 100 as Level,
                    avatarUrl: firebaseUser.photoURL || undefined
                };
                setUser(newUser);
                // Optionally create the doc here if desired, otherwise Login logic handles it
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            showNotification("Failed to load user profile", "error");
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
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
           // New Google User
           await setDoc(doc(db, 'users', firebaseUser.uid), {
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email,
            role: 'student', // Default role
            level: 100,
            username: firebaseUser.email?.split('@')[0].substring(0, 30) || `user${Math.floor(Math.random() * 1000)}`,
            createdAt: new Date().toISOString()
          });
          showNotification("Account created with Google!", "success");
        } else {
          showNotification("Welcome back!", "success");
        }
    } catch (error: any) {
        throw error;
    }
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
      if (!username || username.length < 3) return false;
      const q = query(collection(db, 'users'), where('username', '==', username));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
  };

  const signup = async (data: { name: string; email: string; pass: string; level: Level; username: string; matricNumber: string }) => {
      try {
          const isAvailable = await checkUsernameAvailability(data.username);
          if (!isAvailable) {
              throw new Error("Username is already taken");
          }

          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.pass);
          const firebaseUser = userCredential.user;

          const newUser: User = {
            id: firebaseUser.uid,
            email: data.email,
            name: data.name,
            role: 'student', // ALWAYS DEFAULT TO STUDENT
            level: data.level,
            username: data.username,
            matricNumber: data.matricNumber
          };

          // Create user document in Firestore
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            ...newUser,
            createdAt: new Date().toISOString()
          });

          // Update local state
          setUser(newUser);
          showNotification("Account created successfully!", "success");
      } catch (error: any) {
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
