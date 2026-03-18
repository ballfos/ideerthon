import React, { createContext, useEffect, useState } from "react";
import { type User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { type AuthContext as RouterAuthContext } from "./context";

export const AuthReactContext = createContext<RouterAuthContext>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (error) => {
        console.error("Auth state change error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return (
    <AuthReactContext.Provider value={{ user, loading }}>
      {children}
    </AuthReactContext.Provider>
  );
};
