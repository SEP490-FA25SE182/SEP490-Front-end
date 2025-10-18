import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from "sonner";

import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/firebase";
import { useRegisterUser, useGoogleAuth } from '@/services/AuthService';
import { useGetAllRoles } from '@/services/RoleService';

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    birthDate: '',
    email: '',
    phone: '',
    password: '',
    agreeTerms: false
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const { data: rolesData } = useGetAllRoles();
  const [customerRoleId, setCustomerRoleId] = useState<string>('');
  const [authorRoleId, setAuthorRoleId] = useState<string>('');

  useEffect(() => {
    if (rolesData && rolesData.length) {
      const lower = (s?: string) => (s || '').toLowerCase();
      const foundAuthor = rolesData.find(r => lower(r.roleName).includes('author') || lower(r.roleName) === 'author');
      const foundCustomer = rolesData.find(r => lower(r.roleName).includes('customer') || lower(r.roleName) === 'customer');
      setAuthorRoleId(foundAuthor?.roleId || '');
      setCustomerRoleId(foundCustomer?.roleId || '');
    }
  }, [rolesData]);

  useEffect(() => {
    console.log("Roles data:", rolesData);
    console.log("Author ID:", authorRoleId);
    console.log("Customer ID:", customerRoleId);
  }, [rolesData, authorRoleId, customerRoleId]);

  const { mutate: register, isPending } = useRegisterUser();
  const { mutate: googleAuth, isPending: googlePending } = useGoogleAuth();

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field === 'name' ? 'name' : field === 'email' ? 'email' : field === 'phone' ? 'phone' : field === 'password' ? 'password' : '']: '' }));
  };

  const validate = () => {
    const newErr = { name: '', email: '', phone: '', password: '' };
    if (!formData.name.trim()) newErr.name = 'Vui lòng nhập tên.';
    if (!formData.email.trim()) newErr.email = 'Vui lòng nhập email.';
    if (!formData.phone.trim()) newErr.phone = 'Vui lòng nhập số điện thoại.';
    if (!formData.password.trim()) newErr.password = 'Vui lòng nhập mật khẩu.';
    setErrors(newErr);
    return !(newErr.name || newErr.email || newErr.phone || newErr.password);
  };

  /** Xử lý đăng ký thường */
  const handleSubmit = () => {
    if (!validate()) return;

    const roleId = formData.agreeTerms ? authorRoleId : (customerRoleId || '');

    register(
      {
        fullName: formData.name,
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phone,
        roleId,
      },
      {
        onSuccess: (res) => {
          console.log("Register success:", res);
          toast.success("Đăng ký thành công!", {
            description: "Vui lòng đăng nhập để tiếp tục.",
          });
          window.location.href = "/login";
        },
        onError: (err) => {
          console.error("Register error:", err);
          toast.error("Đăng ký thất bại!", {
            description: "Vui lòng thử lại sau.",
          });
        },
      }
    );
  };

  /** Xử lý đăng nhập qua Google */
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Payload gửi lên backend
      const payload: any = {
        fullName: user.displayName || "",
        email: user.email || "",
        avatarUrl: user.photoURL || "",
        googleUid: user.uid || "",
        roleId: formData.agreeTerms ? authorRoleId : customerRoleId,
      };

      // Gọi API
      googleAuth(payload, {
        onSuccess: (res) => {
          console.log("Google Auth success:", res);
          localStorage.setItem("token", res.token || "");
          alert("Đăng nhập Google thành công!");
          // nếu backend trả user với roleId thì điều hướng có thể dựa vào đó; tạm mặc định về '/'
          window.location.href = "/";
        },
        onError: (err) => {
          console.error("Google Auth error:", err);
          alert("Đăng nhập Google thất bại!");
        },
      });
    } catch (error) {
      console.error("Google login error:", error);
      alert("Đăng nhập Google thất bại!");
    }
  };


  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="./book-hero.webp"
          alt="Books"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-4 sm:px-8 md:px-12 lg:px-16 bg-white overflow-y-auto">
        <div className="w-full max-w-md mx-auto py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center">
            Rất vui vì gặp bạn!
          </h1>

          <div className="space-y-4">
            {/* Google Sign Up Button */}
            <Button
              type="button"
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full h-10 text-white bg-slate-700 hover:bg-slate-800 hover:text-white border-0 text-sm"
              disabled={googlePending}
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
              {googlePending ? "Đang xử lý..." : "Google"}
            </Button>

            <div className="text-center text-xs text-gray-600">
              Hoặc tiếp tục với
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name">Tên của bạn</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="h-12 bg-slate-700 border-0 text-white placeholder:text-gray-400 text-sm"
              />
              {errors.name && <div className="text-red-600 text-xs mt-1">{errors.name}</div>}
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Địa chỉ Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="h-12 bg-slate-700 border-0 text-white placeholder:text-gray-400"
              />
              {errors.email && <div className="text-red-600 text-xs mt-1">{errors.email}</div>}
            </div>

            {/* Phone Input */}
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="h-12 bg-slate-700 border-0 text-white placeholder:text-gray-400"
              />
              {errors.phone && <div className="text-red-600 text-xs mt-1">{errors.phone}</div>}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="h-12 bg-slate-700 border-0 text-white placeholder:text-gray-400 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <div className="text-red-600 text-xs mt-1">{errors.password}</div>}
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={formData.agreeTerms}
                onCheckedChange={(checked) => handleChange('agreeTerms', checked as boolean)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-xs text-gray-700 cursor-pointer leading-tight">
                Bạn muốn thử làm người vẽ truyện không?
              </label>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
            >
              {isPending ? "Đang đăng ký..." : "Đăng ký"}
            </Button>

            {/* Sign In Link */}
            <div className="text-center text-xs text-gray-600">
              Bạn đã có tài khoản?{' '}
              <a href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Vậy quay lại đăng nhập đi!
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
