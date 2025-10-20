import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import { useForgotPassword } from '@/services/AuthService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { mutate: forgotPassword, isPending } = useForgotPassword();

  const validate = () => {
    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    forgotPassword(
      { email },
      {
        onSuccess: () => {
          toast.success('Email xác nhận đã được gửi. Vui lòng kiểm tra hộp thư của bạn.');
          // tùy chọn: chuyển hướng hoặc reset form
          setEmail('');
        },
        onError: (err) => {
          console.error('Forgot password error:', err);
          toast.error('Gửi email thất bại. Vui lòng thử lại.');
        },
      }
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="./book-hero.webp"
          alt="Books"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      <div className="flex flex-col justify-center w-full lg:w-1/2 px-4 sm:px-8 md:px-12 lg:px-16 bg-white overflow-y-auto">
        <div className="w-full max-w-md mx-auto py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center">
            Bạn quên mật khẩu?
          </h1>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Nhập email được đăng ký với tài khoản của bạn để nhận mã đặt lại mật khẩu.
            </p>

            <div className="space-y-2">
              <Label htmlFor="email">Email của bạn</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="h-12 bg-slate-700 border-0 text-white placeholder:text-gray-400"
                placeholder="you@example.com"
              />
              {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
            >
              {isPending ? 'Đang gửi...' : 'Nhận mã xác nhận'}
            </Button>

            <div className="text-center text-xs text-gray-600">
              Bạn nhớ mật khẩu rồi?{' '}
              <a href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Quay lại đăng nhập
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
