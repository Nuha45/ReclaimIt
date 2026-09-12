import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { authApi, getErrorMessage } from '../lib/api';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const schema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token')?.trim() || '';

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!token) {
        setTokenValid(false);
        setChecking(false);
        return;
      }
      try {
        const { data } = await authApi.validateResetToken(token);
        if (!cancelled) setTokenValid(Boolean(data.valid));
      } catch {
        if (!cancelled) setTokenValid(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      toast.success(res.data.message);
      navigate('/login', { replace: true });
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
            <KeyRound className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Reset password</h1>
          <p className="text-text-secondary mt-2">Choose a new password for your account.</p>
        </div>

        <Card>
          {checking ? (
            <p className="text-sm text-text-secondary">Checking your reset link…</p>
          ) : !tokenValid ? (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary leading-relaxed">
                This reset link is invalid, expired, or has already been used. Request a new link to continue.
              </p>
              <Link to="/forgot-password">
                <Button className="w-full">Request new link</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <PasswordInput
                label="New password"
                placeholder="••••••••"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <PasswordInput
                label="Confirm new password"
                placeholder="••••••••"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <Button type="submit" className="w-full" loading={loading}>
                Update password
              </Button>
            </form>
          )}
        </Card>

        <p className="text-center text-sm text-text-secondary mt-6">
          <Link to="/login" className="text-accent hover:underline font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
