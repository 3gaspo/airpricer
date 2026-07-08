import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword as fbSignIn, 
  createUserWithEmailAndPassword as fbSignUp, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { auth, firebaseReady } from "../lib/firebase";

export interface UserProfile {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isDevMode: boolean;
  error: string | null;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isDevMode = !firebaseReady;

  useEffect(() => {
    if (!isDevMode && auth) {
      // Firebase auth listener
      const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }, (err) => {
        console.error("Auth error:", err);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Local storage auth listener fallback
      const activeUser = localStorage.getItem("airpricer_active_user");
      if (activeUser) {
        try {
          setUser(JSON.parse(activeUser));
        } catch {
          setUser(null);
        }
      } else {
        // Auto sign-in a local default dev user so they can interact with the app immediately
        const defaultDevUser = { uid: "dev-user-id", email: "gberthelier.projet@gmail.com" };
        localStorage.setItem("airpricer_active_user", JSON.stringify(defaultDevUser));
        setUser(defaultDevUser);
      }
      setLoading(false);
    }
  }, [isDevMode]);

  const signIn = async (email: string, pass: string) => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!isDevMode && auth) {
      try {
        await fbSignIn(auth, email, pass);
      } catch (err: any) {
        const msg = err?.message || "Invalid credentials";
        setError(msg);
        throw new Error(msg);
      }
    } else {
      // Local dev check - accept ANY credentials in Dev mode!
      const finalEmail = email.trim() || "gberthelier.projet@gmail.com";
      const finalPass = pass || "password";
      
      const localUsersStr = localStorage.getItem("airpricer_local_users") || "[]";
      let users = [];
      try {
        users = JSON.parse(localUsersStr);
        if (!Array.isArray(users)) users = [];
      } catch {
        users = [];
      }
      
      let found = users.find((u: any) => u && typeof u.email === "string" && u.email.trim().toLowerCase() === finalEmail.toLowerCase());
      if (!found) {
        // If the user doesn't exist, create them dynamically on the fly
        const newUid = "dev-user-" + Math.random().toString(36).substr(2, 9);
        found = { uid: newUid, email: finalEmail, password: finalPass };
        users.push(found);
        localStorage.setItem("airpricer_local_users", JSON.stringify(users));
      }
      
      const uProfile = { uid: found.uid, email: found.email };
      localStorage.setItem("airpricer_active_user", JSON.stringify(uProfile));
      setUser(uProfile);
    }
  };

  const signUp = async (email: string, pass: string) => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!isDevMode && auth) {
      try {
        await fbSignUp(auth, email, pass);
      } catch (err: any) {
        const msg = err?.message || "Failed to create account";
        setError(msg);
        throw new Error(msg);
      }
    } else {
      // Local dev signup
      const localUsersStr = localStorage.getItem("airpricer_local_users") || "[]";
      let users = [];
      try {
        users = JSON.parse(localUsersStr);
        if (!Array.isArray(users)) users = [];
      } catch {
        users = [];
      }
      
      if (users.some((u: any) => u && typeof u.email === "string" && u.email.trim().toLowerCase() === cleanEmail)) {
        const msg = "Email already in use";
        setError(msg);
        throw new Error(msg);
      }
      const newUid = "dev-user-" + Math.random().toString(36).substr(2, 9);
      const newUser = { uid: newUid, email: email.trim(), password: pass };
      users.push(newUser);
      localStorage.setItem("airpricer_local_users", JSON.stringify(users));
      
      const uProfile = { uid: newUid, email: email.trim() };
      localStorage.setItem("airpricer_active_user", JSON.stringify(uProfile));
      setUser(uProfile);
    }
  };

  const signOut = async () => {
    setError(null);
    if (!isDevMode && auth) {
      try {
        await fbSignOut(auth);
      } catch (err: any) {
        console.error("Sign out error:", err);
      }
    } else {
      localStorage.removeItem("airpricer_active_user");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDevMode, error, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
