import { type User, onAuthStateChanged } from "firebase/auth";
import React, { createContext, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

import { type AuthContext as RouterAuthContext } from "./context";

export const AuthReactContext = createContext<RouterAuthContext>({
  loading: true,
  user: null,
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

    return () => { unsubscribe(); };
  }, []);

  return (
    <AuthReactContext.Provider value={{ loading, user }}>
      {children}
    </AuthReactContext.Provider>
  );
};
