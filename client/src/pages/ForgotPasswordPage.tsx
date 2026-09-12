import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Mail } from 'lucide-react';
import { authApi, getErrorMessage } from '../lib/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: data.email });
      setSubmitted(true);
      toast.success(res.data.message);
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
            <Mail className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Forgot password</h1>
          <p className="text-text-secondary mt-2">
            Enter your registered email and we&apos;ll send you a reset link.
          </p>
        </div>

        <Card>
          {submitted ? (
            <p className="text-sm text-text-secondary leading-relaxed">
              If an account exists with that email, a password reset link has been sent. Check your inbox
              and spam folder.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Email"
                type="email"
                placeholder="you@university.edu"
                error={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" className="w-full" loading={loading}>
                Send reset link
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
