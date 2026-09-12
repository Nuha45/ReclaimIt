import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';
import { authApi, getErrorMessage } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/browse';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      login(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-text-secondary mt-2">Sign in to your ReclaimIt account</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@university.edu"
              error={errors.email?.message}
              {...register('email')}
            />
            <PasswordInput
              label="Password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <div className="flex justify-end -mt-2">
              <Link to="/forgot-password" className="text-sm text-accent hover:underline font-medium">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-text-secondary mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-accent hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
