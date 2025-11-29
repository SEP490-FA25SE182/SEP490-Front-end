import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/firebase";
import { useLoginUser } from "@/services/AuthService";
import { getRoleById } from "@/services/RoleService";
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/components/ui/use-toast";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe] = useState(false);

  const { mutate: loginUser, isPending } = useLoginUser();

  const { setUser, setToken } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    loginUser(
      { email, password },
      {
        onSuccess: async (res) => {
          console.log("Login response:", res);

          if (res.token && res.user) {
            localStorage.setItem("token", res.token);

            if (rememberMe) {
              localStorage.setItem("rememberEmail", email);
            }

            if (res.user.roleId) {
              localStorage.setItem("userRole", res.user.roleId);
            }

            // persist backend user into AuthContext
            setUser({
              fullName: res.user.fullName || "",
              email: res.user.email || "",
              avatarUrl: (res.user as any).avatarUrl || "",
              userId: res.user.userId,
            });
            setToken(res.token);

            localStorage.setItem("user", JSON.stringify({
              fullName: res.user.fullName || "",
              email: res.user.email || "",
              avatarUrl: (res.user as any).avatarUrl || "",
              userId: res.user.userId,
            }));
            localStorage.setItem("token", res.token);

            toast({
              title: "Đăng nhập thành công",
              description: "Chào mừng bạn quay trở lại."
            });

            // điều hướng theo roleName (fetch role info)
            try {
              const roleId = res.user.roleId;
              if (roleId) {
                const roleResp = await axios.get(`http://localhost:8081/api/rookie/users/roles/${roleId}`);
                const role = roleResp.data;
                const roleName = (role?.roleName || '').toLowerCase();
                if (roleName.includes('author')) {
                  window.location.href = "/author/authorincome";
                  return;
                } else if (roleName.includes('admin')) {
                  window.location.href = "/admin/dashboard";
                  return;
                } 
                else if (roleName.includes('staff')) {
                  window.location.href = "/admin/dashboard";
                  return;
                }
                else if (roleName.includes('moderator')) {
                  window.location.href = "/moderator";
                  return;
                }
              }
            } catch (err) {
              console.warn('Không lấy được role info, chuyển về trang chính', err);
            }

            window.location.href = "/";
          } else {
            toast({
              title: "Đăng nhập thất bại",
              description: "Sai email hoặc mật khẩu.",
              variant: "destructive",
            });
          }
        },
        onError: (error: any) => {
          console.error("Login Error:", error);
          toast({
            title: "Đăng nhập thất bại",
            description: "Vui lòng thử lại sau.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken(); // ✅ Lấy idToken thật từ Firebase

      console.log("Google User:", {
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        idToken, // log thử
      });

      // temporarily set basic firebase info while backend responds
      setUser({
        fullName: user.displayName || "",
        email: user.email || "",
        avatarUrl: user.photoURL || "",
      });
      setToken(idToken);

      // ✅ Gửi token lên backend Spring Boot để xác thực và tạo tài khoản nếu cần
      const response = await axios.post("http://localhost:8081/api/rookie/users/auth/google", {
        idToken: idToken,
      });

      const res = response.data;
      console.log("Google Login Backend Response:", res);

      if (res.token && res.user) {
        localStorage.setItem("token", res.token);
        localStorage.setItem("userRole", res.user.roleId || "");

        // persist backend user into AuthContext (ensure userId present)
        setUser({
          fullName: res.user.fullName || user.displayName || "",
          email: res.user.email || user.email || "",
          avatarUrl: res.user.avatarUrl || user.photoURL || "",
          userId: res.user.userId,
        });
        setToken(res.token);

        localStorage.setItem("user", JSON.stringify({
          fullName: res.user.fullName || "",
          email: res.user.email || "",
          avatarUrl: (res.user as any).avatarUrl || "",
          userId: res.user.userId,
        }));
        localStorage.setItem("token", res.token);

        toast({
          title: "Đăng nhập Google thành công",
          description: `Chào mừng ${res.user.fullName || "bạn"}!`
        });

        try {
          const roleId = res.user.roleId;
          if (roleId) {
            const role = await getRoleById(roleId); // ✅ dùng service chuẩn
            const roleName = (role?.roleName || "").toLowerCase();

            if (roleName.includes("author")) {
              window.location.href = "/author/authorincome";
              return;
            } else if (roleName.includes("admin")) {
              window.location.href = "/admin/dashboard";
              return;
            } else if (roleName.includes("user") || roleName.includes("customer")) {
              window.location.href = "/";
              return;
            }
          }
        } catch (err) {
          console.warn("Không lấy được role info, chuyển về trang chính", err);
          window.location.href = "/";
        }
      }

    } catch (error) {
      console.error("Google Login Error:", error);
      toast({
        title: "Đăng nhập Google thất bại",
        description: "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Right side - Login Form */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-4 sm:px-8 md:px-12 lg:px-16 bg-white"> {/* Reduced padding */}
        <div className="w-full max-w-md mx-auto py-6"> {/* Added padding-y */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center"> {/* Reduced size and margin */}
            Mừng bạn quay lại!
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4"> {/* Reduced space between elements */}
            {/* Google Sign In Button */}
            <Button
              type="button"
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full h-10 text-white bg-slate-700 hover:bg-slate-800 hover:text-white border-0 text-sm"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>

            <div className="text-center text-xs text-gray-600"> {/* Reduced font size */}
              Hoặc tiếp tục với
            </div>

            {/* Email Input */}
            <div className="space-y-1">
              <Label
                htmlFor="email"
                className="text-xs font-normal text-gray-700"
              >
                Địa chỉ Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 bg-slate-700 border-0 text-white placeholder:text-gray-400 text-sm"
                required
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <Label
                htmlFor="password"
                className="text-xs font-normal text-gray-700"
              >
                Mật khẩu
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 bg-slate-700 border-0 text-white placeholder:text-gray-400 pr-12 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-end">
              <a
                href="/forgotpassword"
                className="text-xs text-indigo-600 hover:text-indigo-700"
              >
                Bạn quên mật khẩu?
              </a>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
              disabled={isPending}
            >
              {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>

            {/* Sign Up Link */}
            <div className="text-center text-xs text-gray-600"> {/* Reduced font size */}
              Bạn không có tài khoản?{' '}
              <a href="/signup" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Vào đây để đăng ký mới
              </a>
            </div>
          </form>

          {/* Footer Text */}
          <p className="mt-6 text-xs text-gray-600 text-center"> {/* Reduced margin and font size */}
            Trải nghiệm sách theo cách chưa từng có với công nghệ AR, tưởng thuật AI và kể chuyện nhập vai.
          </p>
        </div>
      </div>

      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="./book-hero.webp"
          alt="Books"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
    </div>
  );
}