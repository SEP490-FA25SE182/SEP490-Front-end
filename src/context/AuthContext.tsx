import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "@/firebase";
import { onIdTokenChanged } from "firebase/auth";

interface UserInfo {
  fullName: string;
  email: string;
  avatarUrl: string;
  userId?: string;
}

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  setUser: (user: UserInfo | null) => void;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  setUser: () => { },
  setToken: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 🔹 Khôi phục user và token khi reload
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // 🔹 Theo dõi Firebase token thay đổi
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
      } else {
        setToken(null);
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
