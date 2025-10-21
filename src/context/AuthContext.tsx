import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "@/firebase";
import { onIdTokenChanged } from "firebase/auth";

interface UserInfo {
  fullName: string;
  email: string;
  avatarUrl: string;
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
  setUser: () => {},
  setToken: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Theo dõi Firebase token thay đổi
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        setUser({
          fullName: firebaseUser.displayName || "Người dùng",
          email: firebaseUser.email || "",
          avatarUrl:
            firebaseUser.photoURL ||
            "https://avatar.iran.liara.run/public/boy?username=default",
        });
      } else {
        setToken(null);
        setUser(null);
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
