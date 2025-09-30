import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

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

  const handleSubmit = () => {
    console.log('Register attempt:', formData);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-8 sm:px-12 md:px-16 lg:px-20 xl:px-24 bg-white overflow-y-auto">
        <div className="w-full max-w-md mx-auto py-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
            Rất vui vì gặp bạn!
          </h1>

          <div className="space-y-5">
            {/* Google Sign Up Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-white bg-slate-700 hover:bg-slate-800 hover:text-white border-0 text-base"
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

            <div className="text-center text-sm text-gray-600">
              Hoặc tiếp tục với
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-normal text-gray-700">
                Tên của bạn
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="john@example.com"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="h-12 bg-slate-700 border-0 text-white placeholder:text-gray-400"
              />
            </div>

            {/* Gender and Birth Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm font-normal text-gray-700">
                  Giới tính
                </Label>
                <Input
                  id="gender"
                  type="text"
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="h-12 bg-slate-700 border-0 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="text-sm font-normal text-gray-700">
                  Ngày sinh
                </Label>
                <Input
                  id="birthDate"
                  type="text"
                  value={formData.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  className="h-12 bg-slate-700 border-0 text-white placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-normal text-gray-700">
                Địa chỉ Mail của bạn
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="h-12 bg-slate-700 border-0 text-white placeholder:text-gray-400"
              />
            </div>

            {/* Phone Input */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-normal text-gray-700">
                Cho xin cái số phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="h-12 bg-slate-700 border-0 text-white placeholder:text-gray-400"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-normal text-gray-700">
                Nhập mật khẩu dỏ
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu của bạn"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="h-12 bg-slate-700 border-0 text-white placeholder:text-gray-400 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={formData.agreeTerms}
                onCheckedChange={(checked) => handleChange('agreeTerms', checked as boolean)}
                className="mt-1"
              />
              <label
                htmlFor="terms"
                className="text-sm text-gray-700 cursor-pointer leading-tight"
              >
                Bạn muốn thử làm người vẽ truyện không?
              </label>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-medium"
            >
              Đăng ký
            </Button>

            {/* Sign In Link */}
            <div className="text-center text-sm text-gray-600">
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