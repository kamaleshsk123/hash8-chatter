import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
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
  registerWithEmail: (email: string, password: string) => Promise<void>;
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
    if (firebaseUser) {
      const userData: User = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || "Unknown User",
        email: firebaseUser.email || "",
        avatar: firebaseUser.photoURL || undefined,
        isOnline: true,
        lastSeen: new Date(),
      };
      setUser(userData);
    } else {
      setUser(null);
    }
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

  const registerWithEmail = async (email: string, password: string) => {
    const { registerWithEmail } = await import("@/services/firebase");
    try {
      await registerWithEmail(email, password);
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
