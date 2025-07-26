import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { upsertUserProfile } from "@/services/firebase";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/services/firebase";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: Error | undefined;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    password: string,
    name?: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseUser, loading, error] = useAuthState(auth);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchAndSetUser = async () => {
      if (firebaseUser) {
        // Upsert user profile in Firestore
        await upsertUserProfile({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || "",
        });
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        let name = firebaseUser.displayName || "Unknown User";
        let avatar = firebaseUser.photoURL || undefined;
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.displayName) name = data.displayName;
          if (data.avatar) avatar = data.avatar;
        }
        // If avatar is missing, use first letter of name
        if (!avatar && name) {
          avatar = undefined; // Let UI fallback to first letter
        }
        const userData: User = {
          uid: firebaseUser.uid,
          name,
          email: firebaseUser.email || "",
          avatar,
          isOnline: true,
          lastSeen: new Date(),
        };
        setUser(userData);
      } else {
        setUser(null);
      }
    };
    fetchAndSetUser();
  }, [firebaseUser]);

  const signIn = async () => {
    const { signInWithGoogle } = await import("@/services/firebase");
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    const { signOutUser } = await import("@/services/firebase");
    try {
      await signOutUser();
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { signInWithEmail } = await import("@/services/firebase");
    try {
      await signInWithEmail(email, password);
    } catch (error) {
      console.error("Sign in with email error:", error);
      throw error;
    }
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    name?: string
  ) => {
    const { registerWithEmail } = await import("@/services/firebase");
    try {
      await registerWithEmail(email, password, name);
    } catch (error) {
      console.error("Register with email error:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    error,
    signIn,
    signOut,
    signInWithEmail,
    registerWithEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
