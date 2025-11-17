import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/config";

export default function RoleGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isCustomer, setIsCustomer] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      // ❌ Chưa login → ẩn chatbox
      if (!user?.userId) return;

      // 🔹 Lấy roleId từ localStorage (login đã lưu)
      const roleId = localStorage.getItem("userRole");
      if (!roleId) return;

      try {
        const roleResp = await axios.get(
          `${API_BASE_URL}/users/roles/${roleId}`
        );
        const roleName = (roleResp.data.roleName || "").toLowerCase();

        if (roleName.includes("customer") || roleName.includes("user")) {
          setIsCustomer(true);
        }
      } catch (e) {
        console.warn("Không lấy được roleName");
      }
    };

    checkRole();
  }, [user]);

  if (!isCustomer) return null;
  return <>{children}</>;
}
