import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useResetPassword } from "@/services/AuthService";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { mutate: resetPassword, isPending } = useResetPassword();

  const handleSubmit = () => {
    if (!password) {
      return toast.error("Vui lòng nhập mật khẩu mới");
    }
    if (password.length < 8) {
      return toast.error("Mật khẩu phải từ 8 ký tự trở lên!");
    }
    if (password !== confirm) {
      return toast.error("Mật khẩu nhập lại không khớp!");
    }
    if (!token) {
      return toast.error("Token không hợp lệ hoặc đã hết hạn!");
    }

    resetPassword(
      { token, newPassword: password },
      {
        onSuccess: () => {
          toast.success("Đặt lại mật khẩu thành công!");
          setTimeout(() => (window.location.href = "/login"), 1200);
        },
        onError: () => toast.error("Không thể đặt lại mật khẩu!"),
      }
    );
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 px-4">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-5">
        <h1 className="text-xl font-bold text-center text-gray-900">
          Đặt lại mật khẩu mới
        </h1>

        {/* Mật khẩu mới */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Mật khẩu mới</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              className="h-12 pr-10"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span
              className="absolute right-3 top-3 cursor-pointer text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          {password && password.length < 8 && (
            <p className="text-xs text-red-500">
              Mật khẩu phải từ 8 ký tự trở lên!
            </p>
          )}
        </div>

        {/* Nhập lại mật khẩu */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Nhập lại mật khẩu</label>
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              className="h-12 pr-10"
              placeholder="********"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <span
              className="absolute right-3 top-3 cursor-pointer text-gray-500"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? "🙈" : "👁️"}
            </span>
          </div>

          {confirm && password !== confirm && (
            <p className="text-xs text-red-500">
              Mật khẩu nhập lại không khớp!
            </p>
          )}
        </div>

        {/* Submit */}
        <Button
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white"
          disabled={isPending}
          onClick={handleSubmit}
        >
          {isPending ? "Đang xử lý..." : "Cập nhật mật khẩu"}
        </Button>
      </div>
    </div>
  );
}
