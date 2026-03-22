import { useState, useEffect } from "react";
import { auth } from "../index"; // Ensure this points to your new hub
import { onAuthStateChanged, User } from "firebase/auth";

export function useAuth() {
  // Add <User | null> so TypeScript knows the user is coming
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading };
}