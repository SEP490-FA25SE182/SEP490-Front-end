import { createContext, useContext, useState, useEffect, useRef } from "react";
import { auth } from "@/firebase";
import { onIdTokenChanged } from "firebase/auth";
import { getUserByEmail, getRoleById } from "@/services/UserService";

interface UserInfo {
  fullName: string;
  email: string;
  avatarUrl: string;
  userId?: string;
  roleId?: string;
  roleName?: string;
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

  if (savedToken) setToken(savedToken);
  if (savedUser) setUser(JSON.parse(savedUser));

  // 🔥 Nếu không có firebaseUser thì vẫn phải cho app chạy tiếp
  setIsInitialized(true);
}, []);


  // 🔹 Theo dõi Firebase token thay đổi => Đồng bộ với backend
useEffect(() => {
  const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
    if (!firebaseInitializedRef.current) {
      firebaseInitializedRef.current = true;
      return;
    }

    // 🔹 User đã logout
    if (!firebaseUser) {
      setToken(null);
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsInitialized(true);
      return;
    }

    try {
      const idToken = await firebaseUser.getIdToken();
      setToken(idToken);
      localStorage.setItem("token", idToken);

      const email = firebaseUser.email;

      // ❗ Nếu Firebase không có email → không gọi BE
      if (!email) {
        setIsInitialized(true);
        return;
      }

      const backendUser = await getUserByEmail(email);
      const roleData = await getRoleById(backendUser.roleId);

      const userData = {
        userId: backendUser.userId,
        fullName: backendUser.fullName,
        email: backendUser.email,
        avatarUrl: backendUser.avatarUrl,
        roleId: backendUser.roleId,
        roleName: roleData.roleName,
      };

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (err) {
      console.error("❌ Không lấy được user backend", err);
    }

    // 🔥 ĐẢM BẢO CHẮC CHẮN SẼ SET Ở CUỐI CÙNG
    setIsInitialized(true);
  });

  return () => unsubscribe(); // giữ nguyên
}, []);




  return (
    <AuthContext.Provider value={{ user, token, isInitialized, setUser, setToken }}>
      {isInitialized ? children : <div>Loading...</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
