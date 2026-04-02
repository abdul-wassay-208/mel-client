import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { apiResetPassword } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const schema = useMemo(() => z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  }).superRefine((val, ctx) => {
    if (val.password !== val.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
    }
  }), []);

  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: Values) => {
    if (!token) {
      toast({ title: 'Invalid reset link', description: 'Token is missing.', variant: 'destructive' });
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await apiResetPassword(token, values.password);
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      navigate('/login');
    } catch (err) {
      toast({ title: 'Reset failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[420px] animate-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary shadow-elevated mb-5">
            <Activity className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight">MEL Platform</h1>
          <p className="text-[15px] text-muted-foreground mt-1.5">Monitoring, Evaluation & Learning</p>
        </div>

        <div className="card-elevated p-8">
          <div className="mb-7">
            <h2 className="text-lg font-semibold">Set a new password</h2>
            <p className="text-[13px] text-muted-foreground mt-1">Choose a strong password (min 8 characters).</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="field-label">New password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          className={cn("pl-11 pr-20 h-12 text-[15px]", fieldState.error && "border-destructive focus-visible:ring-destructive")}
                          disabled={submitting}
                        />
                        {fieldState.error && <AlertCircle className="absolute right-11 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-destructive" />}
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                          disabled={submitting}
                        >
                          {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="field-label">Confirm password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                        <Input
                          {...field}
                          type={showConfirm ? 'text' : 'password'}
                          className={cn("pl-11 pr-20 h-12 text-[15px]", fieldState.error && "border-destructive focus-visible:ring-destructive")}
                          disabled={submitting}
                        />
                        {fieldState.error && <AlertCircle className="absolute right-11 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-destructive" />}
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                          disabled={submitting}
                        >
                          {showConfirm ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-12 text-[15px] font-medium" disabled={submitting}>
                {submitting ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          </Form>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-[13px] text-muted-foreground hover:text-foreground mt-5 block text-center w-full transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

