import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "@/firebase";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("User logged in:", result.user);
      alert("Đăng nhập thành công!");
    } catch (error) {
      console.error(error);
      alert("Sai email hoặc mật khẩu!");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log("Google User:", {
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
      });
    } catch (error) {
      console.error("Google Login Error:", error);
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
            <div className="space-y-1"> {/* Reduced space */}
              <Label htmlFor="email" className="text-xs font-normal text-gray-700"> {/* Reduced font size */}
                Địa chỉ Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 bg-slate-700 border-0 text-white placeholder:text-gray-400 text-sm"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1"> {/* Reduced space */}
              <Label htmlFor="password" className="text-xs font-normal text-gray-700"> {/* Reduced font size */}
                Mật khẩu
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 bg-slate-700 border-0 text-white placeholder:text-gray-400 pr-12 text-sm"
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="h-4 w-4"
                />
                <label
                  htmlFor="remember"
                  className="text-xs text-gray-700 cursor-pointer"
                >
                  Lưu thông tin của tôi
                </label>
              </div>
              <a href="#" className="text-xs text-indigo-600 hover:text-indigo-700"> {/* Reduced font size */}
                Bạn quên mật khẩu?
              </a>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium" 
            >
              Đăng nhập
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