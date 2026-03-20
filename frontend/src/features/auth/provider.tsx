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
    // E2E Mock Bypass
    if (typeof window !== "undefined" && localStorage.getItem("e2e-auth-bypass") === "true") {
      setUser({
        displayName: "あいでぃあ村民(E2E)",
        email: "e2e@example.com",
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=e2e",
        uid: "e2e-test-user-id",
      } as User);
      setLoading(false);
      return;
    }

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
