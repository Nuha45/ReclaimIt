import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import { authApi, getErrorMessage } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Please enter a valid email'),
    studentId: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.signup({
        name: data.name,
        email: data.email,
        password: data.password,
        studentId: data.studentId,
      });
      login(res.data.token, res.data.user);
      toast.success('Account created successfully!');
      navigate('/browse');
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
            <UserPlus className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Create account</h1>
          <p className="text-text-secondary mt-2">Join your campus lost & found community</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input label="Full Name" placeholder="John Doe" error={errors.name?.message} {...register('name')} />
            <Input
              label="Email"
              type="email"
              placeholder="you@university.edu"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Student ID"
              placeholder="Optional"
              hint="Helps verify your campus identity"
              error={errors.studentId?.message}
              {...register('studentId')}
            />
            <PasswordInput
              label="Password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <PasswordInput
              label="Confirm Password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-text-secondary mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
