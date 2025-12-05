import { createContext, useContext, useState, useEffect, useRef } from "react";
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
  isInitialized: boolean;
  setUser: (user: UserInfo | null) => void;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isInitialized: false,
  setUser: () => { },
  setToken: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const firebaseInitializedRef = useRef(false);


  // 🔹 Khôi phục user và token khi reload
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedToken) setToken(savedToken);
    setIsInitialized(true);
  }, []);

  // 🔹 Theo dõi Firebase token thay đổi
  useEffect(() => {
  const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
    if (!firebaseInitializedRef.current) {
      // ⛔ Chưa init xong — CHỈ ĐÁNH DẤU ĐÃ INIT
      firebaseInitializedRef.current = true;
      return;
    }

    if (firebaseUser) {
      const idToken = await firebaseUser.getIdToken();
      setToken(idToken);
      localStorage.setItem("token", idToken);
    } else {
      // ✔ Chỉ chạy khi chắc chắn là logout thật
      setToken(null);
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  });

  return () => unsubscribe();
}, []);

  return (
    <AuthContext.Provider value={{ user, token, isInitialized, setUser, setToken }}>
      {isInitialized ? children : <div>Loading...</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
