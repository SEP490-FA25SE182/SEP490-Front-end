import { useAuth } from "@/context/AuthContext";

export default function RoleGate({
  children,
  allow = ["customer","author"],
}: {
  children: React.ReactNode;
  allow?: string[];
}) {
  const { user } = useAuth();

  // ❌ Chưa login
  if (!user?.roleName) return null;

  const role = user.roleName.toLowerCase();

  const isAllowed = allow.some(r => role.includes(r));

  if (!isAllowed) return null;

  return <>{children}</>;
}
