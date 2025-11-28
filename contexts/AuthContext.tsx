
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Level } from '../types';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (name: string, email: string, pass: string, level: Level) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user details from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: userData.name || 'Student',
            role: userData.role || 'student',
            level: userData.level || 100,
            avatarUrl: userData.avatarUrl
          });
        } else {
          // Fallback if doc doesn't exist yet (rare race condition)
           setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: 'User',
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
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signup = async (name: string, email: string, pass: string, level: Level) => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;

      // Determine role (simple logic for demo, secure logic should be backend)
      const role = email.toLowerCase().includes('admin') || email === 'admin@aaua.edu.ng' ? 'admin' : 'student';

      // Create user document in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name,
        email,
        level,
        role,
        createdAt: new Date().toISOString()
      });

      // Update local state immediately for responsiveness
      setUser({
        id: firebaseUser.uid,
        email,
        name,
        role,
        level
      });
  };

  const logout = () => {
    signOut(auth);
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
